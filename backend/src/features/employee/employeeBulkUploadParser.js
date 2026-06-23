const path = require('path');
const { Readable } = require('stream');
const csvParser = require('csv-parser');
const XLSX = require('xlsx');
const {
  BULK_UPLOAD_COLUMNS,
  REQUIRED_BULK_UPLOAD_COLUMNS,
  MAX_BULK_UPLOAD_ROWS
} = require('./employeeBulkUploadConfig');

const normalizeHeader = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[\s-]+/g, '_');

const aliasToColumn = BULK_UPLOAD_COLUMNS.reduce((map, column) => {
  map.set(normalizeHeader(column.key), column.key);
  map.set(normalizeHeader(column.label), column.key);
  column.aliases.forEach((alias) => map.set(normalizeHeader(alias), column.key));
  return map;
}, new Map());

const canonicalizeHeader = (header) => aliasToColumn.get(normalizeHeader(header)) || null;

const parseCsvHeaderLine = (text) => {
  const firstLine = String(text || '').split(/\r?\n/).find((line) => line.trim() !== '') || '';
  const headers = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < firstLine.length; i += 1) {
    const char = firstLine[i];
    const next = firstLine[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      headers.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  headers.push(current.trim());
  return headers;
};

const validateHeaders = (headers) => {
  const errors = [];
  const canonicalHeaders = [];
  const seen = new Map();

  headers.forEach((header, index) => {
    if (!String(header || '').trim()) return;

    const canonical = canonicalizeHeader(header);
    if (!canonical) {
      // Unknown column — skip silently (don't fail the upload)
      return;
    }

    if (seen.has(canonical)) {
      errors.push(`Duplicate column "${header}" maps to "${canonical}"`);
      return;
    }

    seen.set(canonical, index);
    canonicalHeaders.push(canonical);
  });

  REQUIRED_BULK_UPLOAD_COLUMNS.forEach((requiredColumn) => {
    if (!seen.has(requiredColumn)) {
      errors.push(`Missing required column "${requiredColumn}"`);
    }
  });

  return { errors, canonicalHeaders };
};

const sanitizeCell = (value) => {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
};

const normalizeRows = (rawRows, headers) => rawRows
  .map((row, rowIndex) => {
    const normalized = {};
    headers.forEach((originalHeader) => {
      const canonical = canonicalizeHeader(originalHeader);
      if (!canonical) return;
      normalized[canonical] = sanitizeCell(row[originalHeader]);
    });

    return {
      rowNumber: rowIndex + 2,
      data: normalized
    };
  })
  .filter((row) => Object.values(row.data).some((value) => String(value || '').trim() !== ''));

const parseCsvBuffer = async (buffer) => {
  const text = buffer.toString('utf8').replace(/^\uFEFF/, '');
  const headers = parseCsvHeaderLine(text);
  const { errors } = validateHeaders(headers);
  if (errors.length > 0) return { headers, rows: [], errors };

  const rows = [];

  await new Promise((resolve, reject) => {
    Readable.from([text])
      .pipe(csvParser({ mapHeaders: ({ header }) => header.trim(), skipLines: 0 }))
      .on('data', (row) => rows.push(row))
      .on('error', reject)
      .on('end', resolve);
  });

  return {
    headers,
    rows: normalizeRows(rows, headers),
    errors: []
  };
};

const parseXlsxBuffer = (buffer) => {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { headers: [], rows: [], errors: ['Workbook does not contain any sheets'] };
  }

  const worksheet = workbook.Sheets[sheetName];
  const sheetRows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    raw: false,
    defval: '',
    dateNF: 'yyyy-mm-dd'
  });
  const firstNonEmptyIndex = sheetRows.findIndex((row) => row.some((cell) => String(cell || '').trim() !== ''));

  if (firstNonEmptyIndex === -1) {
    return { headers: [], rows: [], errors: ['Uploaded file is empty'] };
  }

  const headers = sheetRows[firstNonEmptyIndex].map((cell) => sanitizeCell(cell));
  const { errors } = validateHeaders(headers);
  if (errors.length > 0) return { headers, rows: [], errors };

  const rows = sheetRows.slice(firstNonEmptyIndex + 1).map((cells, index) => {
    const data = {};
    headers.forEach((header, headerIndex) => {
      const canonical = canonicalizeHeader(header);
      if (!canonical) return;
      data[canonical] = sanitizeCell(cells[headerIndex]);
    });
    return {
      rowNumber: firstNonEmptyIndex + index + 2,
      data
    };
  }).filter((row) => Object.values(row.data).some((value) => String(value || '').trim() !== ''));

  return { headers, rows, errors: [] };
};

const parseEmployeeUploadFile = async (file) => {
  if (!file || !file.buffer || file.buffer.length === 0) {
    return { headers: [], rows: [], errors: ['Please upload a non-empty file'] };
  }

  const extension = path.extname(file.originalname || '').toLowerCase();
  const parsed = extension === '.csv'
    ? await parseCsvBuffer(file.buffer)
    : parseXlsxBuffer(file.buffer);

  if (parsed.rows.length > MAX_BULK_UPLOAD_ROWS) {
    parsed.errors.push(`Maximum ${MAX_BULK_UPLOAD_ROWS} rows are allowed per upload`);
  }

  if (parsed.rows.length === 0 && parsed.errors.length === 0) {
    parsed.errors.push('Uploaded file does not contain employee rows');
  }

  return parsed;
};

module.exports = {
  parseEmployeeUploadFile,
  validateHeaders,
  canonicalizeHeader
};
