const express = require('express')
const router = express.Router()
const inspirationController = require('../controllers/inspirationController')
const { authenticateToken } = require('../middleware/auth')

// 获取灵感图片列表
router.get('/images', inspirationController.getImages)

// 获取图片统计信息
router.get('/stats', inspirationController.getStats)

// 获取热门标签
router.get('/tags/popular', inspirationController.getPopularTags)

// 获取单张图片详情
router.get('/images/:filename', inspirationController.getImageDetail)

// 获取图片文件
router.get('/files/:filename', inspirationController.getImageFile)

// 搜索图片
router.get('/search', inspirationController.searchImages)

// 收藏/取消收藏图片 (需要认证)
router.post('/favorite', authenticateToken, inspirationController.toggleFavorite)

// 获取用户收藏的图片 (需要认证)
router.get('/favorites', authenticateToken, inspirationController.getFavorites)

// 删除收藏的图片 (需要认证)
router.delete('/favorites/:imageId', authenticateToken, inspirationController.removeFavorite)

module.exports = router
