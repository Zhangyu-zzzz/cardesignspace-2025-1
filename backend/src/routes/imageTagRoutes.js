const express = require('express');
const router = express.Router();
const imageTagController = require('../controllers/imageTagController');
const { authenticateToken } = require('../middleware/auth');

// 获取图片列表（用于图片标签页面）
router.get('/images', imageTagController.getImages);

// 获取标签统计
router.get('/stats/tags', imageTagController.getTagStats);

// 获取风格标签选项
router.get('/style-tag-options', imageTagController.getStyleTagOptions);

// 获取图片的标签
router.get('/:id/tags', imageTagController.getImageTags);

// 为图片添加标签
router.post('/:id/tags', authenticateToken, imageTagController.addTagsToImage);

// 删除图片的标签
router.delete('/:id/tags/:tagId', authenticateToken, imageTagController.removeTagFromImage);

module.exports = router;
