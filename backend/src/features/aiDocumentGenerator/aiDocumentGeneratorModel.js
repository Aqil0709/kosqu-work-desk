const { pool } = require('../../config/db');

const parseJson = (value, fallback) => {
  if (!value) return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const normalizeTenantId = (tenantId) => {
  const parsed = Number.parseInt(tenantId, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

const normalizeNullableInt = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const ensureSchema = async () => {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS ai_document_templates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NOT NULL DEFAULT 1,
      name VARCHAR(255) NOT NULL,
      document_type VARCHAR(100) DEFAULT 'custom',
      original_file_name VARCHAR(255),
      uploaded_file_path VARCHAR(500),
      schema_json LONGTEXT NOT NULL,
      status VARCHAR(50) DEFAULT 'active',
      created_by INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_ai_doc_templates_tenant_status (tenant_id, status),
      INDEX idx_ai_doc_templates_type (document_type)
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS ai_document_generated_documents (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NOT NULL DEFAULT 1,
      template_id INT NOT NULL,
      employee_id VARCHAR(50) NOT NULL,
      form_data_json LONGTEXT NOT NULL,
      generated_file_path VARCHAR(500) NULL,
      created_by INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_ai_doc_generated_tenant (tenant_id, created_at),
      INDEX idx_ai_doc_generated_employee (employee_id),
      CONSTRAINT fk_ai_generated_template
        FOREIGN KEY (template_id) REFERENCES ai_document_templates(id)
        ON DELETE CASCADE
    )
  `);
};

const mapTemplate = (row) => row && ({
  ...row,
  schema_json: parseJson(row.schema_json, {}),
});

const mapGenerated = (row) => row && ({
  ...row,
  form_data_json: parseJson(row.form_data_json, {}),
  schema_json: parseJson(row.schema_json, {}),
});

const createTemplate = async (tenantId, data) => {
  await ensureSchema();
  const safeTenantId = normalizeTenantId(tenantId);
  const [result] = await pool.execute(
    `INSERT INTO ai_document_templates
      (tenant_id, name, document_type, original_file_name, uploaded_file_path, schema_json, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      safeTenantId,
      data.name,
      data.document_type || 'custom',
      data.original_file_name || null,
      data.uploaded_file_path || null,
      JSON.stringify(data.schema_json),
      normalizeNullableInt(data.created_by),
    ]
  );
  return result.insertId;
};

const updateTemplate = async (tenantId, id, data) => {
  await ensureSchema();
  const safeTenantId = normalizeTenantId(tenantId);
  await pool.execute(
    `UPDATE ai_document_templates
     SET name = ?, document_type = ?, schema_json = ?
     WHERE id = ? AND tenant_id = ?`,
    [data.name, data.document_type || 'custom', JSON.stringify(data.schema_json), id, safeTenantId]
  );
};

const listTemplates = async (tenantId) => {
  await ensureSchema();
  const safeTenantId = normalizeTenantId(tenantId);
  const [rows] = await pool.execute(
    `SELECT id, name, document_type, original_file_name, schema_json, status, created_at, updated_at
     FROM ai_document_templates
     WHERE tenant_id = ? AND status = 'active'
     ORDER BY updated_at DESC`,
    [safeTenantId]
  );
  return rows.map(mapTemplate);
};

const getTemplate = async (tenantId, id) => {
  await ensureSchema();
  const safeTenantId = normalizeTenantId(tenantId);
  const [rows] = await pool.execute(
    `SELECT * FROM ai_document_templates WHERE id = ? AND tenant_id = ? AND status = 'active'`,
    [id, safeTenantId]
  );
  return mapTemplate(rows[0]);
};

const archiveTemplate = async (tenantId, id) => {
  await ensureSchema();
  const safeTenantId = normalizeTenantId(tenantId);
  await pool.execute(
    `UPDATE ai_document_templates SET status = 'archived' WHERE id = ? AND tenant_id = ?`,
    [id, safeTenantId]
  );
};

const createGeneratedDocument = async (tenantId, data) => {
  await ensureSchema();
  const safeTenantId = normalizeTenantId(tenantId);
  const [result] = await pool.execute(
    `INSERT INTO ai_document_generated_documents
      (tenant_id, template_id, employee_id, form_data_json, generated_file_path, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      safeTenantId,
      data.template_id,
      data.employee_id,
      JSON.stringify(data.form_data),
      data.generated_file_path || null,
      normalizeNullableInt(data.created_by),
    ]
  );
  return result.insertId;
};

const listGeneratedDocuments = async (tenantId, limit = 20) => {
  await ensureSchema();
  const safeTenantId = normalizeTenantId(tenantId);
  const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 20, 1), 100);
  const [rows] = await pool.execute(
    `SELECT gd.*, t.name AS template_name, t.document_type, t.schema_json,
            u.first_name, u.last_name, u.email
     FROM ai_document_generated_documents gd
     JOIN ai_document_templates t ON gd.template_id = t.id
     LEFT JOIN employee_details ed ON gd.employee_id = ed.id
     LEFT JOIN users u ON ed.employee_id = u.id
     WHERE gd.tenant_id = ?
     ORDER BY gd.created_at DESC
     LIMIT ${safeLimit}`,
    [safeTenantId]
  );
  return rows.map(mapGenerated);
};

module.exports = {
  ensureSchema,
  createTemplate,
  updateTemplate,
  listTemplates,
  getTemplate,
  archiveTemplate,
  createGeneratedDocument,
  listGeneratedDocuments,
};
