const express = require('express');
const router = express.Router();
const imageTagController = require('../controllers/imageTagController');
const { optionalAuth } = require('../middleware/auth');

// 应用可选认证中间件（允许未登录用户编辑标签）
router.use(optionalAuth);

// 更新图片标签
router.put('/:id/tags', imageTagController.updateImageTags);

// 获取图片标签
router.get('/:id/tags', imageTagController.getImageTags);

module.exports = router;