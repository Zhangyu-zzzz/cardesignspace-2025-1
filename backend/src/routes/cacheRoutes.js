const express = require('express');
const router = express.Router();
const { CacheService } = require('../services/cacheService');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../config/logger');

// 获取缓存统计信息
router.get('/stats', authenticateToken, (req, res) => {
  try {
    const stats = CacheService.getStats();
    res.json({
      status: 'success',
      data: stats
    });
  } catch (error) {
    logger.error('获取缓存统计失败:', error);
    res.status(500).json({
      status: 'error',
      message: '获取缓存统计失败',
      details: error.message
    });
  }
});

// 清空所有缓存
router.delete('/clear', authenticateToken, (req, res) => {
  try {
    const result = CacheService.flush();
    if (result) {
      logger.info('缓存已清空');
      res.json({
        status: 'success',
        message: '缓存已清空'
      });
    } else {
      res.status(500).json({
        status: 'error',
        message: '清空缓存失败'
      });
    }
  } catch (error) {
    logger.error('清空缓存失败:', error);
    res.status(500).json({
      status: 'error',
      message: '清空缓存失败',
      details: error.message
    });
  }
});

// 清空特定类型的缓存
router.delete('/clear/:type', authenticateToken, (req, res) => {
  try {
    const { type } = req.params;
    let result = false;
    
    switch (type) {
      case 'images':
        result = CacheService.invalidateImages();
        break;
      case 'brands':
        result = CacheService.del('brands:');
        break;
      case 'tags':
        result = CacheService.delPattern('popular_tags:');
        break;
      case 'styles':
        result = CacheService.del('style_tags:');
        break;
      default:
        return res.status(400).json({
          status: 'error',
          message: '无效的缓存类型'
        });
    }
    
    if (result) {
      logger.info(`缓存类型 ${type} 已清空`);
      res.json({
        status: 'success',
        message: `缓存类型 ${type} 已清空`
      });
    } else {
      res.status(500).json({
        status: 'error',
        message: `清空缓存类型 ${type} 失败`
      });
    }
  } catch (error) {
    logger.error('清空特定缓存失败:', error);
    res.status(500).json({
      status: 'error',
      message: '清空特定缓存失败',
      details: error.message
    });
  }
});

module.exports = router;
