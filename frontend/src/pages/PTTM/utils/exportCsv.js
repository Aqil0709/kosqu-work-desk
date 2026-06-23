// frontend/src/pages/admin/PTTM/utils/exportCsv.js

export function exportCSV(rows, filename) {
  const content = rows.map(row => 
    row.map(val => {
      if (val === null || val === undefined) return '';
      let str = String(val).replace(/"/g, '""');
      if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        str = `"${str}"`;
      }
      return str;
    }).join(',')
  ).join('\n');

  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.click();
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function parseCSV(text) {
  const lines = [];
  let row = [""];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (c === '"') {
        if (next === '"') {
          row[row.length - 1] += '"';
          i++; // Skip next quote
        } else {
          inQuotes = false;
        }
      } else {
        row[row.length - 1] += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        row.push("");
      } else if (c === '\r' || c === '\n') {
        lines.push(row);
        row = [""];
        if (c === '\r' && next === '\n') {
          i++;
        }
      } else {
        row[row.length - 1] += c;
      }
    }
  }
  if (row.length > 1 || row[0] !== "") {
    lines.push(row);
  }

  // Convert array of arrays to array of objects
  if (lines.length === 0) return [];
  const headers = lines[0].map(h => h.trim());
  const results = [];
  for (let i = 1; i < lines.length; i++) {
    const r = lines[i];
    if (r.length < headers.length) continue;
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = r[j];
    }
    results.push(obj);
  }
  return results;
}
