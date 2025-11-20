const express = require('express');
const router = express.Router();
const crawlerController = require('../controllers/crawlerController');
const { authenticateToken } = require('../middleware/auth');
const { restrictTo } = require('../middleware/authMiddleware');

// 所有路由都需要认证，且只有管理员和编辑者可以访问
router.use(authenticateToken);
router.use(restrictTo('admin', 'editor'));

// 监控页面管理
router.get('/pages', crawlerController.getMonitoredPages);
router.get('/pages/:id', crawlerController.getMonitoredPage);
router.post('/pages', crawlerController.createMonitoredPage);
router.put('/pages/:id', crawlerController.updateMonitoredPage);
router.delete('/pages/:id', crawlerController.deleteMonitoredPage);

// 抓取操作
router.post('/pages/:id/trigger', crawlerController.triggerCrawl);

// 抓取历史
router.get('/history', crawlerController.getCrawlHistory);

module.exports = router;

