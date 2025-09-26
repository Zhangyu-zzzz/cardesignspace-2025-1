const express = require('express');
const router = express.Router();
const variantProcessor = require('../services/variantBackgroundProcessor');
const logger = require('../config/logger');

// 获取后台处理器状态
router.get('/status', (req, res) => {
  try {
    const status = variantProcessor.getStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('获取后台处理器状态失败:', error);
    res.status(500).json({
      success: false,
      message: '获取状态失败'
    });
  }
});

// 手动触发变体处理
router.post('/trigger', async (req, res) => {
  try {
    await variantProcessor.triggerProcessing();
    res.json({
      success: true,
      message: '变体处理已触发'
    });
  } catch (error) {
    logger.error('手动触发变体处理失败:', error);
    res.status(500).json({
      success: false,
      message: '触发处理失败'
    });
  }
});

// 停止后台处理器
router.post('/stop', (req, res) => {
  try {
    variantProcessor.stop();
    res.json({
      success: true,
      message: '后台处理器已停止'
    });
  } catch (error) {
    logger.error('停止后台处理器失败:', error);
    res.status(500).json({
      success: false,
      message: '停止处理器失败'
    });
  }
});

// 启动后台处理器
router.post('/start', (req, res) => {
  try {
    variantProcessor.start();
    res.json({
      success: true,
      message: '后台处理器已启动'
    });
  } catch (error) {
    logger.error('启动后台处理器失败:', error);
    res.status(500).json({
      success: false,
      message: '启动处理器失败'
    });
  }
});

module.exports = router;
