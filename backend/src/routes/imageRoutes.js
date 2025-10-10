const express = require('express');
const router = express.Router();
const imageController = require('../controllers/imageController');
const imagesQueryController = require('../controllers/imagesQueryController');
const authMiddleware = require('../middleware/authMiddleware');
const { authenticateToken } = require('../middleware/auth');

// 获取车型的图片
router.get('/car/:carId', imageController.getImagesByCarId);

// 获取车型的图片（新方法）
router.get('/model/:modelId', imageController.getImagesByModelId);

// 获取车型的缩略图（用于网格模式优化）
router.get('/model/:modelId/thumbnails', imageController.getThumbnailsByModelId);

// 获取单张图片详情
router.get('/:id', imageController.getImageById);

// 获取高清图片URL (需要登录)
router.get('/:id/hd-url', authMiddleware.protect, imageController.getHDImageUrl);

// 收藏图片 (需要登录)
router.post('/:id/favorite', authMiddleware.protect, imageController.favoriteImage);

// 取消收藏 (需要登录)
router.delete('/:id/favorite', authMiddleware.protect, imageController.unfavoriteImage);

// 获取热门图片
router.get('/popular', imageController.getPopularImages);

// 通用图片列表（支持排序：curated/latest/default）
router.get('/', imagesQueryController.listImages);

// === 标签相关路由已移至 imageTagRoutes.js ===

module.exports = router; 