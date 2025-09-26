const express = require('express');
const router = express.Router();
const imageTagController = require('../controllers/imageTagController');
const authMiddleware = require('../middleware/authMiddleware');

// 获取需要打标签的图片列表
router.get('/images', imageTagController.getImagesForTagging);

// 更新单张图片标签
router.put('/images/:id/tags', imageTagController.updateImageTags);

// 批量更新图片标签
router.put('/images/batch-tags', imageTagController.batchUpdateImageTags);

// 更新车型分类
router.put('/models/:id/type', imageTagController.updateModelType);

// 获取车型类型统计
router.get('/stats/model-types', imageTagController.getModelTypeStats);

// 获取标签统计
router.get('/stats/tags', imageTagController.getTagStats);

// 风格标签相关路由
// 更新车型风格标签
router.put('/models/:id/style-tags', imageTagController.updateModelStyleTags);

// 批量更新车型风格标签
router.put('/models/batch-style-tags', imageTagController.batchUpdateModelStyleTags);

// 获取风格标签统计
router.get('/stats/style-tags', imageTagController.getStyleTagStats);

// 获取风格标签选项
router.get('/style-tag-options', imageTagController.getStyleTagOptions);

module.exports = router;
