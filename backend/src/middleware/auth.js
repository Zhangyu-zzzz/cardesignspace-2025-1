const jwt = require('jsonwebtoken');
const { User } = require('../models/mysql');

// 加载环境变量
require('dotenv').config();
const JWT_SECRET = process.env.JWT_SECRET;

// 认证中间件
const authenticateToken = async (req, res, next) => {
  try {
    // 从请求头获取token
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: '未提供认证令牌'
      });
    }

    // 验证token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // 获取用户信息
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

    if (user.status !== 'active') {
      return res.status(401).json({
        status: 'error',
        message: '账号已被禁用'
      });
    }

    // 将用户信息添加到请求对象
    req.user = user;
    next();
  } catch (error) {
    console.error('Token验证失败:', error);
    return res.status(401).json({
      status: 'error',
      message: 'Invalid token. Please log in again.'
    });
  }
};

// 可选认证中间件，即使没有token也允许继续
const optionalAuth = async (req, res, next) => {
  try {
    // 从请求头获取token
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      // 没有token时继续执行，但req.user为undefined
      return next();
    }

    // 验证token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // 获取用户信息
    const user = await User.findByPk(decoded.userId);
    if (user && user.status === 'active') {
      // 将用户信息添加到请求对象
      req.user = user;
    }

    next();
  } catch (error) {
    console.error('Optional token验证失败:', error);
    // 即使验证失败也继续执行
    next();
  }
};

module.exports = {
  authenticateToken,
  optionalAuth
}; 