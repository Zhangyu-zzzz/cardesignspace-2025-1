const express = require('express');
const router = express.Router();
const imageTagController = require('../controllers/imageTagController');
const { optionalAuth } = require('../middleware/auth');

// 应用可选认证中间件（允许未登录用户编辑标签）
router.use(optionalAuth);

// 获取图片列表（用于标签管理页面）
router.get('/images', imageTagController.getImagesForTagging);

// 获取标签统计
router.get('/stats/tags', imageTagController.getTagStats);

// 获取风格标签选项
router.get('/style-tag-options', imageTagController.getStyleTagOptions);

// 更新图片标签
router.put('/images/:id/tags', imageTagController.updateImageTags);

// 获取图片标签
router.get('/images/:id/tags', imageTagController.getImageTags);

module.exports = router;