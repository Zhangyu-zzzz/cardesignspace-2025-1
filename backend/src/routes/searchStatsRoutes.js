const express = require('express');
const router = express.Router();
const searchStatsController = require('../controllers/searchStatsController');
const { protect } = require('../middleware/authMiddleware');

// 公开路由
router.post('/record', searchStatsController.recordSearch);
router.get('/popular', searchStatsController.getPopularSearches);

// 需要认证的管理路由
router.get('/all', protect, searchStatsController.getAllStats);
router.get('/history', protect, searchStatsController.getSearchHistory);
router.get('/analytics', protect, searchStatsController.getSearchAnalytics);
router.delete('/clean', protect, searchStatsController.cleanOldStats);
router.delete('/clean-history', protect, searchStatsController.cleanOldHistory);

module.exports = router;

