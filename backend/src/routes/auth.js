const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// 配置头像上传 - 使用内存存储
const avatarStorage = multer.memoryStorage();

const avatarUpload = multer({ 
  storage: avatarStorage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件'), false);
    }
  }
});

// 用户注册
router.post('/register', authController.register);

// 用户登录
router.post('/login', authController.login);

// 用户登出
router.post('/logout', authController.logout);

// 获取当前用户信息（需要认证）
router.get('/me', authenticateToken, authController.getCurrentUser);

// 更新个人资料（需要认证）
router.put('/profile', authenticateToken, authController.updateProfile);

// 上传头像（需要认证）
router.post('/upload-avatar', authenticateToken, avatarUpload.single('avatar'), authController.uploadAvatar);

// 获取用户统计信息（需要认证）
router.get('/user-stats', authenticateToken, authController.getUserStats);

// 获取最近活动（需要认证）
router.get('/recent-activity', authenticateToken, authController.getRecentActivity);

// 获取积分历史（需要认证）
router.get('/points-history', authenticateToken, authController.getPointsHistory);

// 获取用户成就
router.get('/achievements', authenticateToken, authController.getUserAchievements);

// 获取用户排名
router.get('/user-rank', authenticateToken, authController.updateUserRank);

module.exports = router; 