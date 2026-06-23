// backend/routes/clientRoutes.js
const express = require('express');
const clientController = require('../controllers/clientController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// All routes are protected
router.use(authMiddleware.verifyToken);

// ==================== ADMIN-ONLY ROUTES ====================
// All client management requires admin role

// GET /api/clients - Get all clients (ADMIN ONLY)
router.get('/', authMiddleware.requireAdmin, clientController.getAllClients);

// GET /api/clients/managers - Get managers list (ADMIN ONLY)
router.get('/managers', authMiddleware.requireAdmin, clientController.getManagers);

// GET /api/clients/industries - Get industries list (ADMIN ONLY)
router.get('/industries', authMiddleware.requireAdmin, clientController.getIndustries);

// POST /api/clients/industries - Add new industry (ADMIN ONLY)
router.post('/industries', authMiddleware.requireAdmin, clientController.addIndustry);

// GET /api/clients/:id - Get specific client (ADMIN ONLY)
router.get('/:id', authMiddleware.requireAdmin, clientController.getClient);

// POST /api/clients - Create new client (ADMIN ONLY)
router.post('/', authMiddleware.requireAdmin, clientController.createClient);

// PUT /api/clients/:id - Update client (ADMIN ONLY)
router.put('/:id', authMiddleware.requireAdmin, clientController.updateClient);

// DELETE /api/clients/:id - Delete client (ADMIN ONLY)
router.delete('/:id', authMiddleware.requireAdmin, clientController.deleteClient);

// POST /api/clients/:id/interactions - Add interaction (ADMIN ONLY)
router.post('/:id/interactions', authMiddleware.requireAdmin, clientController.addInteraction);

module.exports = router;