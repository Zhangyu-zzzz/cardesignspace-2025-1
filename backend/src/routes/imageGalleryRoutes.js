const express = require('express');
const router = express.Router();
const imageGalleryController = require('../controllers/imageGalleryController');

// 获取筛选后的图片列表
router.get('/images', imageGalleryController.getFilteredImages);

// 获取筛选统计信息
router.get('/stats', imageGalleryController.getFilterStats);

// 获取热门标签
router.get('/popular-tags', imageGalleryController.getPopularTags);

// 获取图片详情
router.get('/images/:id', imageGalleryController.getImageDetail);

module.exports = router;

