import { useEffect, useMemo, useState } from 'react';
import { HiOutlineDocumentText, HiOutlineArrowDownTray, HiOutlinePencilSquare, HiOutlineTrash, HiOutlineSparkles } from 'react-icons/hi2';
import aiDocumentGeneratorAPI from '../../../services/aiDocumentGeneratorAPI';
import aiDocumentPDFService from '../../../services/aiDocumentPDFService';
import './AiDocumentGenerator.css';

const documentTypes = [
  { value: 'custom', label: 'Custom Document' },
  { value: 'salary_slip', label: 'Salary Slip' },
  { value: 'resignation_letter', label: 'Resignation Letter' },
  { value: 'offer_letter', label: 'Offer Letter' },
  { value: 'experience_letter', label: 'Experience Letter' },
  { value: 'increment_letter', label: 'Increment Letter' },
  { value: 'declaration_form', label: 'Declaration Form' },
];

const fieldTypes = ['text', 'number', 'date', 'email', 'tel', 'dropdown', 'checkbox', 'textarea', 'table', 'signature', 'file'];

const normalizeSchema = (schema) => ({
  document_title: schema?.document_title || 'AI Document Template',
  document_type: schema?.document_type || 'custom',
  sections: schema?.sections?.length ? schema.sections : [{ section_title: 'Document Details', order: 1, fields: [] }],
  content_blocks: schema?.content_blocks || [],
});

const AiDocumentGenerator = () => {
  const [file, setFile] = useState(null);
  const [documentType, setDocumentType] = useState('custom');
  const [templateName, setTemplateName] = useState('');
  const [schema, setSchema] = useState(null);
  const [uploadedFileInfo, setUploadedFileInfo] = useState(null);
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [recentDocuments, setRecentDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selectedSchema = useMemo(() => (schema ? normalizeSchema(schema) : null), [schema]);

  const loadData = async () => {
    const templatesRes = await aiDocumentGeneratorAPI.listTemplates();
    setTemplates(templatesRes.data.templates || []);

    try {
      const generatedRes = await aiDocumentGeneratorAPI.listGeneratedDocuments(20);
      setRecentDocuments(generatedRes.data.documents || []);
    } catch (err) {
      console.error('Failed to load recently generated AI documents:', err);
      setRecentDocuments([]);
    }
  };

  useEffect(() => {
    loadData().catch((err) => setError(err.response?.data?.message || 'Failed to load AI document data.'));
  }, []);

  const handleAnalyze = async () => {
    if (!file) {
      setError('Please select a Word document first.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const res = await aiDocumentGeneratorAPI.analyze(file, documentType);
      const nextSchema = normalizeSchema(res.data.schema);
      setSchema(nextSchema);
      setTemplateName(nextSchema.document_title || file.name.replace(/\.docx$/i, ''));
      setUploadedFileInfo(res.data.file);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to analyze document.');
    } finally {
      setLoading(false);
    }
  };

  const updateSection = (sectionIndex, changes) => {
    setSchema((prev) => {
      const next = normalizeSchema(prev);
      next.sections = next.sections.map((section, index) => index === sectionIndex ? { ...section, ...changes } : section);
      return { ...next };
    });
  };

  const updateField = (sectionIndex, fieldIndex, changes) => {
    setSchema((prev) => {
      const next = normalizeSchema(prev);
      const section = next.sections[sectionIndex];
      const fields = section.fields.map((field, index) => index === fieldIndex ? { ...field, ...changes } : field);
      next.sections[sectionIndex] = { ...section, fields };
      return { ...next };
    });
  };

  const addField = (sectionIndex) => {
    setSchema((prev) => {
      const next = normalizeSchema(prev);
      const section = next.sections[sectionIndex];
      next.sections[sectionIndex] = {
        ...section,
        fields: [
          ...section.fields,
          {
            label: 'New Field',
            key: `new_field_${section.fields.length + 1}`,
            type: 'text',
            required: false,
            placeholder: '',
            options: [],
            validation: {},
          },
        ],
      };
      return { ...next };
    });
  };

  const removeField = (sectionIndex, fieldIndex) => {
    setSchema((prev) => {
      const next = normalizeSchema(prev);
      const section = next.sections[sectionIndex];
      next.sections[sectionIndex] = {
        ...section,
        fields: section.fields.filter((_, index) => index !== fieldIndex),
      };
      return { ...next };
    });
  };

  const addSection = () => {
    setSchema((prev) => {
      const next = normalizeSchema(prev);
      next.sections.push({ section_title: 'New Section', order: next.sections.length + 1, fields: [] });
      return { ...next };
    });
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim() || !selectedSchema) {
      setError('Template name and analyzed schema are required.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        name: templateName.trim(),
        document_type: selectedSchema.document_type || documentType,
        schema_json: { ...selectedSchema, document_title: templateName.trim() },
        original_file_name: uploadedFileInfo?.original_name || file?.name,
        uploaded_file_path: uploadedFileInfo?.path,
      };

      if (editingTemplateId) {
        await aiDocumentGeneratorAPI.updateTemplate(editingTemplateId, payload);
      } else {
        await aiDocumentGeneratorAPI.createTemplate(payload);
      }

      setSchema(null);
      setFile(null);
      setTemplateName('');
      setUploadedFileInfo(null);
      setEditingTemplateId(null);
      await loadData();
      alert(editingTemplateId ? 'AI document template updated successfully.' : 'AI document template saved successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save template.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('Archive this AI document template?')) return;
    await aiDocumentGeneratorAPI.deleteTemplate(templateId);
    await loadData();
  };

  const handleEditTemplate = (template) => {
    const nextSchema = normalizeSchema(template.schema_json);
    setEditingTemplateId(template.id);
    setTemplateName(template.name || nextSchema.document_title || '');
    setDocumentType(template.document_type || nextSchema.document_type || 'custom');
    setSchema({
      ...nextSchema,
      document_title: template.name || nextSchema.document_title,
      document_type: template.document_type || nextSchema.document_type || 'custom',
    });
    setUploadedFileInfo({
      original_name: template.original_file_name,
      path: template.uploaded_file_path,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDownloadRecent = async (item) => {
    await aiDocumentPDFService.download(
      item.schema_json,
      item.form_data_json,
      `${item.template_name}_${item.first_name || 'Employee'}_${item.last_name || ''}`.replace(/\s+/g, '_')
    );
  };

  return (
    <div className="ai-doc-page-shell">
      <div className="ai-doc-header">
        <div>
          <h1>AI Document Generator</h1>
          <p>Upload Word documents, convert them to reusable employee document templates, and track generated documents.</p>
        </div>
      </div>

      {error && <div className="ai-doc-error">{error}</div>}

      <div className="ai-doc-layout">
        <section className="ai-doc-panel">
          <div className="ai-doc-panel-title">
            <div className="ai-doc-title-icon"><HiOutlineSparkles /></div>
            <div>
              <h2>Create Template</h2>
              <p>Upload a Word file and convert it into a reusable employee document form.</p>
            </div>
          </div>
          <div className="ai-doc-form-group">
            <label>Document Type</label>
            <select value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
              {documentTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
          </div>

          <label className="ai-doc-upload-box">
            <input
              type="file"
              accept=".docx"
              style={{ display: 'none' }}
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <strong>{file ? file.name : 'Choose Word document'}</strong>
            <div>Only .docx files up to 10MB</div>
          </label>

          <div className="ai-doc-actions">
            <button className="ai-doc-btn primary" onClick={handleAnalyze} disabled={loading}>
              {loading ? 'Analyzing...' : 'Analyze Document'}
            </button>
          </div>
        </section>

        <section className="ai-doc-panel">
          <div className="ai-doc-panel-title">
            <div className="ai-doc-title-icon"><HiOutlineDocumentText /></div>
            <div>
              <h2>Template Preview & Edit</h2>
              <p>Review the AI generated fields before saving this document template.</p>
            </div>
          </div>
          {!selectedSchema ? (
            <div className="ai-doc-empty">Upload and analyze a Word document to edit the generated template.</div>
          ) : (
            <>
              <div className="ai-doc-form-group">
                <label>Template Name</label>
                <input value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
              </div>
              {(selectedSchema.sections || []).map((section, sectionIndex) => (
                <div key={`${section.section_title}-${sectionIndex}`} className="ai-doc-editor-section">
                  <div className="ai-doc-section-header">
                    <div className="ai-doc-form-group compact">
                      <label>Section Title</label>
                      <input
                        value={section.section_title}
                        onChange={(e) => updateSection(sectionIndex, { section_title: e.target.value })}
                      />
                    </div>
                    <span className="ai-doc-count-pill">{section.fields?.length || 0} fields</span>
                  </div>
                  <div className="ai-doc-fields">
                    {(section.fields || []).map((field, fieldIndex) => (
                      <div key={`${field.key}-${fieldIndex}`} className="ai-doc-field-row">
                        <div className="ai-doc-field-main">
                          <label>Field Label</label>
                          <input
                            value={field.label}
                            onChange={(e) => updateField(sectionIndex, fieldIndex, {
                              label: e.target.value,
                              key: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''),
                            })}
                          />
                          <span>{field.key}</span>
                        </div>
                        <div className="ai-doc-field-meta">
                          <label>Type</label>
                          <select
                            value={field.type}
                            onChange={(e) => updateField(sectionIndex, fieldIndex, { type: e.target.value })}
                          >
                            {fieldTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                          </select>
                        </div>
                        <label className="ai-doc-required-toggle">
                          <input
                            type="checkbox"
                            checked={Boolean(field.required)}
                            onChange={(e) => updateField(sectionIndex, fieldIndex, { required: e.target.checked })}
                          />
                          <span>Required</span>
                        </label>
                        <button className="ai-doc-icon-btn danger" type="button" onClick={() => removeField(sectionIndex, fieldIndex)} title="Remove field">
                          <HiOutlineTrash />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button className="ai-doc-btn" type="button" onClick={() => addField(sectionIndex)}>Add Field</button>
                </div>
              ))}
              <div className="ai-doc-actions">
                <button className="ai-doc-btn" type="button" onClick={addSection}>Add Section</button>
                <button className="ai-doc-btn success" type="button" onClick={handleSaveTemplate} disabled={saving}>
                  {saving ? 'Saving...' : editingTemplateId ? 'Update Template' : 'Save Template'}
                </button>
              </div>
            </>
          )}
        </section>
      </div>

      <div className="ai-doc-bottom-layout" style={{ marginTop: 24 }}>
        <section className="ai-doc-panel">
          <h2>Saved Templates</h2>
          <div className="ai-doc-grid">
            {templates.length === 0 ? <div className="ai-doc-empty">No AI templates saved yet.</div> : templates.map((template) => (
              <div className="ai-doc-template-card" key={template.id}>
                <h4>{template.name}</h4>
                <p>{template.document_type || 'custom'} | {new Date(template.updated_at || template.created_at).toLocaleDateString('en-IN')}</p>
                <div className="ai-doc-actions">
                  <button className="ai-doc-btn" onClick={() => handleEditTemplate(template)}>
                    <HiOutlinePencilSquare /> Edit
                  </button>
                  <button className="ai-doc-btn danger" onClick={() => handleDeleteTemplate(template.id)}>
                    <HiOutlineTrash /> Archive
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="ai-doc-panel">
          <h2>Recently Generated Documents</h2>
          {recentDocuments.length === 0 ? (
            <div className="ai-doc-empty">No documents generated from AI templates yet.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="ai-doc-recent-table">
                <thead>
                  <tr>
                    <th>Template</th>
                    <th>Employee</th>
                    <th>Generated On</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDocuments.map((item) => (
                    <tr key={item.id}>
                      <td>{item.template_name}</td>
                      <td>{`${item.first_name || ''} ${item.last_name || ''}`.trim() || item.email || item.employee_id}</td>
                      <td>{new Date(item.created_at).toLocaleString('en-IN')}</td>
                      <td>
                        <button className="ai-doc-btn" onClick={() => handleDownloadRecent(item)}>
                          <HiOutlineArrowDownTray /> Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AiDocumentGenerator;
