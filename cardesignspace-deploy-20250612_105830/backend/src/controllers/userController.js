const { User } = require('../models');
const logger = require('../config/logger');
const { Op } = require('sequelize');

// 获取所有用户（管理员功能）
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] }
    });
    
    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    logger.error(`获取用户列表失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: '获取用户列表失败',
      error: error.message
    });
  }
};

// 更新个人资料
exports.updateProfile = async (req, res) => {
  try {
    const user = req.user;
    const { username, email, avatar } = req.body;
    
    // 检查用户名或邮箱是否已被其他用户使用
    if (username || email) {
      const existingUser = await User.findOne({
        where: {
          id: { [Op.ne]: user.id },
          [Op.or]: [
            username ? { username } : null,
            email ? { email } : null
          ].filter(Boolean)
        }
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: '用户名或邮箱已被使用'
        });
      }
    }
    
    // 更新用户资料
    const updatedUser = await user.update({
      username: username || user.username,
      email: email || user.email,
      avatar: avatar || user.avatar
    });
    
    res.status(200).json({
      success: true,
      message: '个人资料更新成功',
      data: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        avatar: updatedUser.avatar,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt
      }
    });
  } catch (error) {
    logger.error(`更新个人资料失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: '更新个人资料失败',
      error: error.message
    });
  }
};

// 更新密码
exports.updatePassword = async (req, res) => {
  try {
    const user = req.user;
    const { currentPassword, newPassword } = req.body;
    
    // 验证当前密码
    const isMatch = await user.comparePassword(currentPassword);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: '当前密码不正确'
      });
    }
    
    // 更新密码
    user.password = newPassword;
    await user.save();
    
    res.status(200).json({
      success: true,
      message: '密码更新成功'
    });
  } catch (error) {
    logger.error(`更新密码失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: '更新密码失败',
      error: error.message
    });
  }
};

// 管理员更新用户
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, role, status } = req.body;
    
    const user = await User.findByPk(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '未找到该用户'
      });
    }
    
    // 检查用户名或邮箱是否已被其他用户使用
    if (username || email) {
      const existingUser = await User.findOne({
        where: {
          id: { [Op.ne]: id },
          [Op.or]: [
            username ? { username } : null,
            email ? { email } : null
          ].filter(Boolean)
        }
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: '用户名或邮箱已被使用'
        });
      }
    }
    
    // 更新用户资料
    const updatedUser = await user.update({
      username: username || user.username,
      email: email || user.email,
      role: role || user.role,
      status: status || user.status
    });
    
    res.status(200).json({
      success: true,
      message: '用户更新成功',
      data: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        status: updatedUser.status,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt
      }
    });
  } catch (error) {
    logger.error(`管理员更新用户失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: '更新用户失败',
      error: error.message
    });
  }
};

// 管理员删除用户
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findByPk(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '未找到该用户'
      });
    }
    
    // 不允许删除管理员账号
    if (user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: '无法删除管理员账号'
      });
    }
    
    // 软删除：将状态设为inactive
    await user.update({ status: 'inactive' });
    
    res.status(200).json({
      success: true,
      message: '用户已成功删除'
    });
  } catch (error) {
    logger.error(`删除用户失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: '删除用户失败',
      error: error.message
    });
  }
}; 