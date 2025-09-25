const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { dualAuthenticate } = require('../middleware/oidcAuth');
const { getQueue, isQueueEnabled } = require('../services/queueService');

// 特性开关：默认关闭
const INGEST_ENABLED = process.env.INGEST_ENABLED === 'true';

// 仅在开启时注册路由，避免影响现有前端
router.use((req, res, next) => {
  if (!INGEST_ENABLED) {
    return res.status(404).json({ success: false, message: 'Not Found' });
  }
  next();
});

// 基础限流，保护后端
const ingestLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false
});

// 摄取接口：接受 dcd_crawler 提交的图片元数据或任务
router.post('/images', dualAuthenticate, ingestLimiter, async (req, res) => {
  try {
    if (!isQueueEnabled) {
      return res.status(503).json({ success: false, message: '队列未启用' });
    }
    const payload = req.body;
    if (!payload || !Array.isArray(payload) || payload.length === 0) {
      return res.status(400).json({ success: false, message: 'payload 必须为非空数组' });
    }

    const queue = getQueue('image_ingest');
    const jobs = await Promise.all(
      payload.map((item) => queue.add('ingest', item, { removeOnComplete: 50, removeOnFail: 100 }))
    );
    res.json({ success: true, queued: jobs.length });
  } catch (err) {
    console.error('摄取失败:', err);
    res.status(500).json({ success: false, message: '摄取失败' });
  }
});

// 摄取接口：提交图像处理任务（如抠图）
router.post('/image-tasks', dualAuthenticate, ingestLimiter, async (req, res) => {
  try {
    if (!isQueueEnabled) {
      return res.status(503).json({ success: false, message: '队列未启用' });
    }
    const payload = req.body;
    if (!payload || !payload.type) {
      return res.status(400).json({ success: false, message: '缺少任务类型' });
    }
    const queue = getQueue('image_tasks');
    const job = await queue.add(payload.type, payload, { removeOnComplete: 50, removeOnFail: 100 });
    res.json({ success: true, jobId: job.id });
  } catch (err) {
    console.error('提交任务失败:', err);
    res.status(500).json({ success: false, message: '提交任务失败' });
  }
});

module.exports = router;


