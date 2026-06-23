import api from './api';

export const aiDocumentGeneratorAPI = {
  analyze: (file, documentType = 'custom') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);

    return api.post('/ai-document-generator/templates/analyze', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  listTemplates: () => api.get('/ai-document-generator/templates'),
  getTemplate: (id) => api.get(`/ai-document-generator/templates/${id}`),
  createTemplate: (payload) => api.post('/ai-document-generator/templates', payload),
  updateTemplate: (id, payload) => api.put(`/ai-document-generator/templates/${id}`, payload),
  deleteTemplate: (id) => api.delete(`/ai-document-generator/templates/${id}`),
  recordGeneratedDocument: (templateId, payload) => api.post(`/ai-document-generator/templates/${templateId}/generate`, payload),
  listGeneratedDocuments: (limit = 20) => api.get(`/ai-document-generator/generated?limit=${limit}`),
};

export default aiDocumentGeneratorAPI;
