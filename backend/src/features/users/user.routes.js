const { Router } = require('express');
const userController = require('./user.controller');
const authMiddleware = require('../../middleware/auth.middleware');
const requireAdmin = require('../../middleware/requireAdmin');

const router = Router();

// Flow: route -> controller -> service -> repository -> shared DB pool.
router.use(authMiddleware.verifyToken);
router.use(requireAdmin);

router.get('/', userController.listUsers);
router.get('/:id', userController.getUserById);
router.post('/', userController.createUser);
router.patch('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

module.exports = router;
