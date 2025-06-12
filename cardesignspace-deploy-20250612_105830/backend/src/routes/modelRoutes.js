const express = require('express');
const router = express.Router();
const modelController = require('../controllers/modelController');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

// 公开路由
router.get('/', modelController.getAllModels);
router.get('/:id', modelController.getModelById);
router.get('/:id/images', modelController.getModelImages);

// 需要管理员权限的路由
router.post('/', authMiddleware, adminMiddleware, modelController.createModel);
router.put('/:id', authMiddleware, adminMiddleware, modelController.updateModel);
router.delete('/:id', authMiddleware, adminMiddleware, modelController.deleteModel);

module.exports = router; 