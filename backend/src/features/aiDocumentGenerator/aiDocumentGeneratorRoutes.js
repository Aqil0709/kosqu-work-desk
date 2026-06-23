const express = require('express');
const router = express.Router();
const controller = require('./aiDocumentGeneratorController');
const { verifyToken } = require('../../middleware/auth.middleware');
const requireModuleAccess = require('../../middleware/requireModuleAccess');
const model = require('./aiDocumentGeneratorModel');

router.use(verifyToken);

const canReadDocuments = requireModuleAccess('ai_document_generator', 'read');
const canWriteDocuments = requireModuleAccess('ai_document_generator', 'write');

router.post('/templates/analyze', canWriteDocuments, controller.upload.single('file'), controller.analyzeUpload);
router.get('/templates', canReadDocuments, controller.listTemplates);
router.post('/templates', canWriteDocuments, controller.createTemplate);
router.get('/templates/:id', canReadDocuments, controller.getTemplate);
router.put('/templates/:id', canWriteDocuments, controller.updateTemplate);
router.delete('/templates/:id', canWriteDocuments, controller.deleteTemplate);
router.post('/templates/:id/generate', canWriteDocuments, controller.createGeneratedDocument);
router.get('/generated', canReadDocuments, controller.listGeneratedDocuments);

module.exports = router;
module.exports.ensureSchema = () => model.ensureSchema();
