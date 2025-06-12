const express = require('express');
const router = express.Router();
const notificationService = require('../services/notificationService');
const { authenticateToken } = require('../middleware/auth');

// 获取用户通知列表
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, isRead, type } = req.query;

    const result = await notificationService.getUserNotifications(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      isRead: isRead !== undefined ? isRead === 'true' : null,
      type
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('获取通知列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取通知列表失败'
    });
  }
});

// 获取未读通知数量
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await notificationService.getUnreadCount(userId);

    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    console.error('获取未读通知数量失败:', error);
    res.status(500).json({
      success: false,
      message: '获取未读通知数量失败'
    });
  }
});

// 标记单个通知为已读
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = parseInt(req.params.id);

    const success = await notificationService.markAsRead(notificationId, userId);

    if (success) {
      res.json({
        success: true,
        message: '通知已标记为已读'
      });
    } else {
      res.status(404).json({
        success: false,
        message: '通知不存在或无权操作'
      });
    }
  } catch (error) {
    console.error('标记通知已读失败:', error);
    res.status(500).json({
      success: false,
      message: '标记通知已读失败'
    });
  }
});

// 标记所有通知为已读
router.put('/read-all', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await notificationService.markAllAsRead(userId);

    res.json({
      success: true,
      data: { count },
      message: `已标记 ${count} 条通知为已读`
    });
  } catch (error) {
    console.error('标记所有通知已读失败:', error);
    res.status(500).json({
      success: false,
      message: '标记所有通知已读失败'
    });
  }
});

// 删除通知
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = parseInt(req.params.id);

    const success = await notificationService.deleteNotification(notificationId, userId);

    if (success) {
      res.json({
        success: true,
        message: '通知已删除'
      });
    } else {
      res.status(404).json({
        success: false,
        message: '通知不存在或无权操作'
      });
    }
  } catch (error) {
    console.error('删除通知失败:', error);
    res.status(500).json({
      success: false,
      message: '删除通知失败'
    });
  }
});

module.exports = router; 