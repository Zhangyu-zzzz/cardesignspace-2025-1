const express = require('express');
const router = express.Router();
const imageController = require('../controllers/imageController');
const authMiddleware = require('../middleware/authMiddleware');

// 获取车型的图片
router.get('/car/:carId', imageController.getImagesByCarId);

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

module.exports = router; 