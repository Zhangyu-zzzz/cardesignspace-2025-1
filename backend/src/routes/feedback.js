const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { optionalAuth, authenticateToken } = require('../middleware/auth');
const { restrictTo } = require('../middleware/authMiddleware');

// 提交反馈（不需要认证，允许匿名用户提交）
router.post('/', feedbackController.submitFeedback);

// 获取反馈列表（需要管理员权限）
router.get('/', authenticateToken, restrictTo('admin'), feedbackController.getFeedbackList);

// 获取反馈详情（需要管理员权限）
router.get('/:id', authenticateToken, restrictTo('admin'), feedbackController.getFeedbackDetail);

// 更新反馈状态（需要管理员权限）
router.put('/:id/status', authenticateToken, restrictTo('admin'), feedbackController.updateFeedbackStatus);

// 回复反馈（需要管理员权限）
router.put('/:id/reply', authenticateToken, restrictTo('admin'), feedbackController.replyFeedback);

// 删除反馈（需要管理员权限）
router.delete('/:id', authenticateToken, restrictTo('admin'), feedbackController.deleteFeedback);

// 获取反馈统计（需要管理员权限）
router.get('/stats/summary', authenticateToken, restrictTo('admin'), feedbackController.getFeedbackStats);

module.exports = router;
