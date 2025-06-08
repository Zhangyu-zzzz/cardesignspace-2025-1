const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

// 只有管理员可以查看所有用户
router.get('/', authMiddleware, adminMiddleware, userController.getAllUsers);

// 更新自己的资料
router.put('/profile', authMiddleware, userController.updateProfile);

// 更新自己的密码
router.put('/password', authMiddleware, userController.updatePassword);

// 管理员可以更新、删除用户
router.put('/:id', authMiddleware, adminMiddleware, userController.updateUser);
router.delete('/:id', authMiddleware, adminMiddleware, userController.deleteUser);

module.exports = router;