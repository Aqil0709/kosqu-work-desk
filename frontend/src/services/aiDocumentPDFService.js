import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import brandingAPI from './brandingAPI';
import fallbackLogo from '../assets/img/company.png';
import { getWatermarkConfig, buildWatermarkLayer } from './documentWatermarkService';

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const formatLabel = (key) => String(key || '')
  .replace(/_/g, ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const replacePlaceholders = (text, data) => {
  let output = String(text || '');
  output = output.replace(/\{\{\s*blank\s*\}\}/g, '________________');
  output = output.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => escapeHtml(data[key] || ''));
  return output;
};

const getAllFields = (schema) => (schema?.sections || []).flatMap((section) => section.fields || []);

const buildHtml = ({ schema, formData, branding }) => {
  const fields = getAllFields(schema);
  const usedKeys = new Set();
  const blocks = schema?.content_blocks?.length ? schema.content_blocks : [];

  const body = blocks.length
    ? blocks.map((block) => {
      const text = replacePlaceholders(block.text, formData);
      fields.forEach((field) => {
        if (String(block.text || '').includes(`{{${field.key}}}`)) usedKeys.add(field.key);
      });
      if (block.type === 'heading') return `<h2>${text}</h2>`;
      if (block.type === 'signature') return `<div class="signature-line">${text || 'Signature: __________________'}</div>`;
      return `<p>${text}</p>`;
    }).join('')
    : '';

  const details = fields
    .filter((field) => !usedKeys.has(field.key) && field.type !== 'signature')
    .map((field) => `
      <tr>
        <td>${escapeHtml(field.label || formatLabel(field.key))}</td>
        <td>${escapeHtml(formData[field.key] || '')}</td>
      </tr>
    `).join('');

  return `
    <div class="ai-doc-page">
      <header>
        <img src="${branding.logo}" alt="Logo" />
        <div>
          <h1>${escapeHtml(branding.companyName)}</h1>
          <p>${escapeHtml(branding.companyAddress)}</p>
          <p>${escapeHtml(branding.companyEmail)} ${branding.companyPhone ? `| ${escapeHtml(branding.companyPhone)}` : ''}</p>
        </div>
      </header>
      <main>
        <h1 class="doc-title">${escapeHtml(schema?.document_title || 'Generated Document')}</h1>
        ${body}
        ${details ? `
          <table>
            <tbody>${details}</tbody>
          </table>
        ` : ''}
      </main>
    </div>
  `;
};

const getBranding = async () => {
  try {
    const res = await brandingAPI.get();
    const raw = res.data?.branding || {};
    return {
      companyName: raw.company_name || '',
      companyAddress: raw.company_address || '',
      companyEmail: raw.company_email || '',
      companyPhone: raw.company_phone || '',
      logo: raw.logo_url ? brandingAPI.getImageUrl(raw.logo_url) : fallbackLogo,
      _raw: raw, // kept for watermark config extraction
    };
  } catch {
    return {
      companyName: '',
      companyAddress: '',
      companyEmail: '',
      companyPhone: '',
      logo: fallbackLogo,
      _raw: {},
    };
  }
};

const renderPdf = async (schema, formData) => {
  const branding = await getBranding();
  const wmConfig = getWatermarkConfig(branding._raw);
  const wmLayer = buildWatermarkLayer(wmConfig);
  const wrapper = document.createElement('div');
  wrapper.style.position = 'absolute';
  wrapper.style.left = '-9999px';
  wrapper.style.top = '0';
  wrapper.style.width = '210mm';
  wrapper.style.background = '#fff';
  wrapper.innerHTML = `
    <style>
      .ai-doc-page { position:relative; width: 210mm; min-height: 297mm; padding: 14mm 18mm; box-sizing: border-box; font-family: Arial, sans-serif; color: #111827; background: #fff; overflow:hidden; }
      .ai-doc-page header { display: flex; gap: 18px; align-items: center; border-bottom: 3px solid #111827; padding-bottom: 12px; margin-bottom: 24px; }
      .ai-doc-page header img { width: 110px; max-height: 80px; object-fit: contain; }
      .ai-doc-page header h1 { margin: 0 0 6px; font-size: 20px; }
      .ai-doc-page header p { margin: 2px 0; font-size: 11px; color: #374151; }
      .ai-doc-page .doc-title { text-align: center; font-size: 20px; margin: 16px 0 24px; text-transform: uppercase; }
      .ai-doc-page h2 { font-size: 15px; margin: 18px 0 8px; color: #111827; }
      .ai-doc-page p { font-size: 12px; line-height: 1.65; margin: 8px 0; white-space: pre-wrap; }
      .ai-doc-page table { width: 100%; border-collapse: collapse; margin-top: 18px; font-size: 12px; }
      .ai-doc-page td { border: 1px solid #d1d5db; padding: 8px; vertical-align: top; }
      .ai-doc-page td:first-child { width: 34%; font-weight: 700; background: #f9fafb; }
      .signature-line { margin-top: 40px; font-size: 12px; }
      .ai-doc-content { position:relative; z-index:1; width:100%; }
    </style>
    ${(() => {
      // buildHtml wraps everything in .ai-doc-page — we inject watermark inside it
      const pageHtml = buildHtml({ schema, formData, branding });
      // Insert watermark layer right after the opening .ai-doc-page div tag
      return pageHtml.replace(
        /<div class="ai-doc-page">/,
        `<div class="ai-doc-page">${wmLayer}<div class="ai-doc-content">`
      ).replace(/<\/div>\s*$/, '</div></div>');
    })()}
  `;
  document.body.appendChild(wrapper);

  const canvas = await html2canvas(wrapper, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  });

  document.body.removeChild(wrapper);

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const imgData = canvas.toDataURL('image/png');
  const imgWidth = 210;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
  return pdf;
};

export const aiDocumentPDFService = {
  download: async (schema, formData, filename = 'AI_Document.pdf') => {
    const pdf = await renderPdf(schema, formData);
    pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
  },

  view: async (schema, formData) => {
    const pdf = await renderPdf(schema, formData);
    window.open(pdf.output('bloburl'), '_blank');
  },
};

export default aiDocumentPDFService;
