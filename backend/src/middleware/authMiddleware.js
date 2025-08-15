const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const { User } = require('../models/mysql');

// 加载环境变量
require('dotenv').config();
const JWT_SECRET = process.env.JWT_SECRET;

// 保护路由，需要用户登录
exports.protect = async (req, res, next) => {
  try {
    // 从请求头中获取token
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: '未提供认证令牌'
      });
    }

    // 验证token
    const decoded = await promisify(jwt.verify)(token, JWT_SECRET);

    // 检查用户是否仍然存在
    const user = await User.findByPk(decoded.userId);
    if (!user) {
      console.log('❌ 认证失败 - 用户不存在:', {
        tokenUserId: decoded.userId,
        url: req.originalUrl,
        timestamp: new Date().toISOString()
      });
      return res.status(401).json({
        status: 'error',
        message: 'The user belonging to this token no longer exists.'
      });
    }

    // 4) 检查用户是否在令牌签发后更改了密码
    if (user.password_changed_at) {
      const changedTimestamp = parseInt(user.password_changed_at.getTime() / 1000, 10);
      
      if (decoded.iat < changedTimestamp) {
        return res.status(401).json({
          status: 'error',
          message: 'User recently changed password. Please log in again.'
        });
      }
    }

    // 授予访问权限
    req.user = user;
    next();
  } catch (error) {
    console.log('❌ JWT验证失败:', {
      error: error.message,
      url: req.originalUrl,
      timestamp: new Date().toISOString()
    });
    return res.status(401).json({
      status: 'error',
      message: 'Invalid token. Please log in again.'
    });
  }
};

// 限制特定角色访问
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to perform this action'
      });
    }
    next();
  };
};

// 添加别名导出以兼容其他文件的引用
exports.authMiddleware = exports.protect;
exports.adminMiddleware = exports.restrictTo('admin'); 