const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const fieldKey = (label) => String(label || 'field')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '') || 'field';

const inferType = (label) => {
  const text = String(label).toLowerCase();
  if (text.includes('date')) return 'date';
  if (text.includes('salary') || text.includes('amount') || text.includes('ctc') || text.includes('total')) return 'number';
  if (text.includes('signature')) return 'signature';
  if (text.includes('email')) return 'email';
  if (text.includes('phone') || text.includes('mobile') || text.includes('contact')) return 'tel';
  if (text.includes('address') || text.includes('reason') || text.includes('description')) return 'textarea';
  return 'text';
};

const buildHeuristicSchema = (parsedData, fallbackType = 'custom') => {
  const labels = parsedData.detected_labels?.length
    ? parsedData.detected_labels
    : parsedData.paragraphs
      .filter((line) => line.includes(':'))
      .map((line) => line.split(':')[0]);

  const fields = Array.from(new Set(labels)).slice(0, 40).map((label) => ({
    label,
    key: fieldKey(label),
    type: inferType(label),
    required: !/middle|optional|alternate/i.test(label),
    placeholder: `Enter ${label}`,
    options: [],
    validation: {},
  }));

  if (!fields.some((field) => field.key === 'full_name')) {
    fields.unshift({
      label: 'Full Name',
      key: 'full_name',
      type: 'text',
      required: true,
      placeholder: 'Employee full name',
      options: [],
      validation: {},
    });
  }

  return {
    document_title: parsedData.title || 'AI Document Template',
    document_type: fallbackType,
    sections: [
      {
        section_title: 'Document Details',
        order: 1,
        fields,
      },
    ],
    content_blocks: buildContentBlocks(parsedData.raw_text || parsedData.paragraphs?.join('\n') || ''),
  };
};

const buildContentBlocks = (rawText) => String(rawText || '')
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean)
  .slice(0, 80)
  .map((line) => ({
    type: line.length < 80 && !line.includes(':') ? 'heading' : 'paragraph',
    text: line.replace(/_{3,}/g, '{{blank}}'),
  }));

const systemPrompt = `
You convert uploaded HR/business Word documents into reusable document templates.
Return only valid JSON. Do not include markdown.
Use this shape:
{
  "document_title": "",
  "document_type": "salary_slip | resignation_letter | offer_letter | experience_letter | increment_letter | declaration_form | custom",
  "sections": [
    {
      "section_title": "",
      "order": 1,
      "fields": [
        {
          "label": "",
          "key": "snake_case",
          "type": "text | number | date | email | tel | dropdown | checkbox | textarea | table | signature | file",
          "required": true,
          "placeholder": "",
          "options": [],
          "validation": {}
        }
      ]
    }
  ],
  "content_blocks": [
    { "type": "heading | paragraph | table | signature", "text": "Document text with {{field_key}} placeholders where fields should be inserted." }
  ]
}
Prefer employee-friendly field keys like full_name, email, phone, designation, joining_date, salary, department, address when applicable.
`;

const analyzeDocument = async (parsedData, documentType = 'custom') => {
  if (!process.env.OPENROUTER_API_KEY) {
    return buildHeuristicSchema(parsedData, documentType);
  }

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
      temperature: 0.1,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify({ documentType, parsedData }) },
      ],
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`OpenRouter API failed: ${response.status} ${message}`);
  }

  const result = await response.json();
  let content = result.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('AI returned an empty response.');
  if (content.startsWith('```json')) content = content.slice(7, -3).trim();
  if (content.startsWith('```')) content = content.slice(3, -3).trim();

  return JSON.parse(content);
};

module.exports = { analyzeDocument, buildHeuristicSchema };
