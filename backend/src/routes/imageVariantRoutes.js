const express = require('express');
const router = express.Router();
const imageVariantController = require('../controllers/imageVariantController');
const { authenticateToken } = require('../middleware/auth');

// 获取图片的最佳变体URL
router.get('/best/:imageId', imageVariantController.getBestImageUrl);

// 获取图片的所有变体信息
router.get('/variants/:imageId', imageVariantController.getImageVariants);

// 批量获取图片的最佳URL
router.post('/batch', imageVariantController.getBatchImageUrls);

// 获取变体统计信息（需要认证）
router.get('/stats', authenticateToken, imageVariantController.getVariantStats);

module.exports = router;
