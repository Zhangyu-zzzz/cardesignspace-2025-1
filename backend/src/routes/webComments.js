const express = require('express');
const router = express.Router();
const webCommentController = require('../controllers/webCommentController');
const { optionalAuth, authenticateToken } = require('../middleware/auth');
const { restrictTo } = require('../middleware/authMiddleware');

// 提交网站优化意见（不需要认证，允许匿名用户提交）
router.post('/', webCommentController.submitWebComment);

// 获取网站优化意见列表（需要管理员权限）
router.get('/', authenticateToken, restrictTo('admin'), webCommentController.getWebCommentList);

// 获取网站优化意见详情（需要管理员权限）
router.get('/:id', authenticateToken, restrictTo('admin'), webCommentController.getWebCommentDetail);

// 更新网站优化意见状态（需要管理员权限）
router.put('/:id/status', authenticateToken, restrictTo('admin'), webCommentController.updateWebCommentStatus);

// 回复网站优化意见（需要管理员权限）
router.put('/:id/reply', authenticateToken, restrictTo('admin'), webCommentController.replyWebComment);

// 删除网站优化意见（需要管理员权限）
router.delete('/:id', authenticateToken, restrictTo('admin'), webCommentController.deleteWebComment);

module.exports = router;

