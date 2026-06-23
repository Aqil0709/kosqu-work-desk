const mammoth = require('mammoth');

const labelRegex = /([A-Za-z][A-Za-z0-9\s/&().-]{1,80})\s*[::]\s*[_-]*/g;

const normalizeWhitespace = (value = '') => String(value).replace(/\s+/g, ' ').trim();

const parseDocx = async (filePath) => {
  const rawResult = await mammoth.extractRawText({ path: filePath });
  const htmlResult = await mammoth.convertToHtml({ path: filePath });

  const rawText = rawResult.value || '';
  const lines = rawText
    .split(/\r?\n/)
    .map(normalizeWhitespace)
    .filter(Boolean);

  const detectedLabels = [];
  for (const line of lines) {
    let match;
    while ((match = labelRegex.exec(line)) !== null) {
      const label = normalizeWhitespace(match[1]);
      if (label && !detectedLabels.includes(label)) detectedLabels.push(label);
    }
  }

  const headings = lines.filter((line) => {
    const words = line.split(' ');
    return words.length <= 8 && !line.includes(':') && /^[A-Z0-9\s/&().-]+$/.test(line);
  });

  return {
    title: lines[0] || '',
    headings,
    paragraphs: lines,
    detected_labels: detectedLabels,
    raw_text: rawText,
    html: htmlResult.value || '',
  };
};

module.exports = { parseDocx };
