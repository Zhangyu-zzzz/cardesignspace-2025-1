const express = require('express');
const router = express.Router();
const seriesController = require('../controllers/seriesController');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

// 公开路由
router.get('/', seriesController.getAllSeries);
router.get('/:id', seriesController.getSeriesById);
router.get('/:id/models', seriesController.getSeriesModels);

// 需要管理员权限的路由
router.post('/', authMiddleware, adminMiddleware, seriesController.createSeries);
router.put('/:id', authMiddleware, adminMiddleware, seriesController.updateSeries);
router.delete('/:id', authMiddleware, adminMiddleware, seriesController.deleteSeries);

module.exports = router; 