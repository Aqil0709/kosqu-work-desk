const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { parseDocx } = require('./aiDocumentParser');
const { analyzeDocument } = require('./aiDocumentAnalyzer');
const model = require('./aiDocumentGeneratorModel');

const uploadRoot = path.join(__dirname, '..', 'uploads', 'ai-documents');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tenantId = req.tenantId || 1;
    const uploadDir = path.join(uploadRoot, String(tenantId));
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.originalname.toLowerCase().endsWith('.docx')) {
      return cb(new Error('Only .docx files are supported.'));
    }
    cb(null, true);
  },
});

const getTenantId = (req) => {
  const parsed = Number.parseInt(req.tenantId || req.user?.tenant_id, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};
const getUserId = (req) => req.user?.id || req.user?.employee_id || null;

const controller = {
  upload,

  analyzeUpload: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Document file is required.' });
      }

      const parsed = await parseDocx(req.file.path);
      const schema = await analyzeDocument(parsed, req.body.document_type || 'custom');

      return res.json({
        success: true,
        message: 'Document analyzed successfully.',
        file: {
          original_name: req.file.originalname,
          path: req.file.path,
        },
        parsed_summary: {
          title: parsed.title,
          detected_labels: parsed.detected_labels,
        },
        schema,
      });
    } catch (error) {
      console.error('AI document analyze error:', error);
      return res.status(500).json({ success: false, message: 'Something went wrong. Please contact administrator.' });
    }
  },

  createTemplate: async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const { name, document_type, schema_json, original_file_name, uploaded_file_path } = req.body;
      if (!name || !schema_json) {
        return res.status(400).json({ success: false, message: 'Template name and schema are required.' });
      }

      const id = await model.createTemplate(tenantId, {
        name,
        document_type,
        schema_json,
        original_file_name,
        uploaded_file_path,
        created_by: getUserId(req),
      });

      return res.status(201).json({ success: true, message: 'Template saved successfully.', id });
    } catch (error) {
      console.error('Create AI template error:', error);
      return res.status(500).json({ success: false, message: 'Something went wrong. Please contact administrator.' });
    }
  },

  listTemplates: async (req, res) => {
    try {
      const templates = await model.listTemplates(getTenantId(req));
      return res.json({ success: true, templates });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Something went wrong. Please contact administrator.' });
    }
  },

  getTemplate: async (req, res) => {
    try {
      const template = await model.getTemplate(getTenantId(req), req.params.id);
      if (!template) return res.status(404).json({ success: false, message: 'Template not found.' });
      return res.json({ success: true, template });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Something went wrong. Please contact administrator.' });
    }
  },

  updateTemplate: async (req, res) => {
    try {
      const { name, document_type, schema_json } = req.body;
      if (!name || !schema_json) {
        return res.status(400).json({ success: false, message: 'Template name and schema are required.' });
      }
      await model.updateTemplate(getTenantId(req), req.params.id, { name, document_type, schema_json });
      return res.json({ success: true, message: 'Template updated successfully.' });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Something went wrong. Please contact administrator.' });
    }
  },

  deleteTemplate: async (req, res) => {
    try {
      await model.archiveTemplate(getTenantId(req), req.params.id);
      return res.json({ success: true, message: 'Template archived successfully.' });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Something went wrong. Please contact administrator.' });
    }
  },

  createGeneratedDocument: async (req, res) => {
    try {
      const { employee_id, form_data, generated_file_path } = req.body;
      if (!employee_id || !form_data) {
        return res.status(400).json({ success: false, message: 'Employee and form data are required.' });
      }

      const template = await model.getTemplate(getTenantId(req), req.params.id);
      if (!template) return res.status(404).json({ success: false, message: 'Template not found.' });

      const id = await model.createGeneratedDocument(getTenantId(req), {
        template_id: req.params.id,
        employee_id,
        form_data,
        generated_file_path,
        created_by: getUserId(req),
      });

      return res.status(201).json({ success: true, message: 'Generated document recorded.', id, template });
    } catch (error) {
      console.error('Create generated AI document error:', error);
      return res.status(500).json({ success: false, message: 'Something went wrong. Please contact administrator.' });
    }
  },

  listGeneratedDocuments: async (req, res) => {
    try {
      const documents = await model.listGeneratedDocuments(getTenantId(req), req.query.limit || 20);
      return res.json({ success: true, documents });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Something went wrong. Please contact administrator.' });
    }
  },
};

module.exports = controller;
