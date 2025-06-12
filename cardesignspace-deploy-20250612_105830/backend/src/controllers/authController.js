const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models/mysql');
const { Image } = require('../models/mysql');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');
const logger = require('../config/logger');
const activityService = require('../services/activityService');

// 加载环境变量
require('dotenv').config();
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

class AuthController {
  // 用户注册
  async register(req, res) {
    try {
      const { username, email, password } = req.body;

      // 验证必填字段
      if (!username || !email || !password) {
        return res.status(400).json({
          status: 'error',
          message: '用户名、邮箱和密码都是必填的'
        });
      }

      // 验证密码长度
      if (password.length < 6) {
        return res.status(400).json({
          status: 'error',
          message: '密码长度至少6位'
        });
      }

      // 检查用户是否已存在
      const existingUser = await User.findOne({
        where: {
          [Op.or]: [
            { username },
            { email }
          ]
        }
      });

      if (existingUser) {
        return res.status(400).json({
          status: 'error',
          message: '用户名或邮箱已存在'
        });
      }

      // 加密密码
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // 创建用户
      const user = await User.create({
        username,
        email,
        password: hashedPassword,
        points: 100 // 注册赠送100积分
      });

      // 生成JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          username: user.username,
          role: user.role 
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      // 记录注册活动
      try {
        await activityService.recordRegisterActivity(user.id, user.username);
      } catch (activityError) {
        console.error('记录注册活动失败:', activityError);
        // 活动记录失败不影响注册成功
      }

      res.status(201).json({
        status: 'success',
        message: '注册成功',
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            points: user.points,
            avatar: user.avatar,
            role: user.role,
            status: user.status
          },
          token
        }
      });

    } catch (error) {
      console.error('注册失败:', error);
      res.status(500).json({
        status: 'error',
        message: '注册失败，请稍后重试'
      });
    }
  }

  // 用户登录
  async login(req, res) {
    try {
      const { username, password } = req.body;

      // 验证必填字段
      if (!username || !password) {
        return res.status(400).json({
          status: 'error',
          message: '用户名和密码都是必填的'
        });
      }

      // 查找用户（支持用户名或邮箱登录）
      const user = await User.findOne({
        where: {
          [Op.or]: [
            { username },
            { email: username }
          ]
        }
      });

      if (!user) {
        return res.status(401).json({
          status: 'error',
          message: '用户名或密码错误'
        });
      }

      // 检查用户状态
      if (user.status !== 'active') {
        return res.status(401).json({
          status: 'error',
          message: '账户已被禁用，请联系管理员'
        });
      }

      // 验证密码
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          status: 'error',
          message: '用户名或密码错误'
        });
      }

      // 生成JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          username: user.username,
          role: user.role 
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      // 记录登录活动
      try {
        await activityService.recordLoginActivity(user.id, user.username, {
          loginTime: new Date(),
          userAgent: req.headers['user-agent'],
          ip: req.ip
        });
        
        // 给用户加1积分
        await this.updateUserPoints(user.id, 1);
      } catch (activityError) {
        console.error('记录登录活动失败:', activityError);
        // 活动记录失败不影响登录成功
      }

      res.json({
        status: 'success',
        message: '登录成功',
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            points: user.points,
            avatar: user.avatar,
            role: user.role,
            status: user.status
          },
          token
        }
      });

    } catch (error) {
      console.error('登录失败:', error);
      res.status(500).json({
        status: 'error',
        message: '登录失败，请稍后重试'
      });
    }
  }

  // 获取当前用户信息
  async getCurrentUser(req, res) {
    try {
      const user = await User.findByPk(req.user.id, {
        attributes: { exclude: ['password'] }
      });

      if (!user) {
        return res.status(404).json({
          status: 'error',
          message: '用户不存在'
        });
      }

      res.json({
        status: 'success',
        data: user
      });

    } catch (error) {
      console.error('获取用户信息失败:', error);
      res.status(500).json({
        status: 'error',
        message: '获取用户信息失败'
      });
    }
  }

  // 更新用户积分
  async updateUserPoints(userId, pointsToAdd) {
    try {
      const user = await User.findByPk(userId);
      if (user) {
        user.points += pointsToAdd;
        await user.save();
        return user.points;
      }
      return null;
    } catch (error) {
      console.error('更新用户积分失败:', error);
      return null;
    }
  }

  // 用户登出
  async logout(req, res) {
    try {
      // 记录登出活动（如果用户已登录）
      if (req.user && req.user.id) {
        try {
          await activityService.recordLogoutActivity(req.user.id, req.user.username || '未知用户');
        } catch (activityError) {
          console.error('记录登出活动失败:', activityError);
          // 活动记录失败不影响登出成功
        }
      }

      // JWT无状态，前端删除token即可
      res.json({
        status: 'success',
        message: '登出成功'
      });
    } catch (error) {
      console.error('登出失败:', error);
      res.status(500).json({
        status: 'error',
        message: '登出失败'
      });
    }
  }

  // 更新个人资料
  async updateProfile(req, res) {
    try {
      const { username, email } = req.body;
      const userId = req.user.id;

      // 验证必填字段
      if (!username || !email) {
        return res.status(400).json({
          status: 'error',
          message: '用户名和邮箱都是必填的'
        });
      }

      // 检查用户名是否已被其他用户使用
      const existingUser = await User.findOne({
        where: {
          [Op.and]: [
            { 
              [Op.or]: [
                { username },
                { email }
              ]
            },
            { id: { [Op.ne]: userId } }
          ]
        }
      });

      if (existingUser) {
        return res.status(400).json({
          status: 'error',
          message: '用户名或邮箱已被使用'
        });
      }

      // 更新用户信息
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          status: 'error',
          message: '用户不存在'
        });
      }

      // 记录变更内容
      const changes = [];
      if (user.username !== username) {
        changes.push('用户名');
      }
      if (user.email !== email) {
        changes.push('邮箱');
      }

      user.username = username;
      user.email = email;
      await user.save();

      // 记录资料更新活动
      if (changes.length > 0) {
        try {
          await activityService.recordProfileUpdateActivity(user.id, user.username, changes);
        } catch (activityError) {
          console.error('记录资料更新活动失败:', activityError);
          // 活动记录失败不影响更新成功
        }
      }

      res.json({
        status: 'success',
        message: '资料更新成功',
        data: {
          id: user.id,
          username: user.username,
          email: user.email,
          points: user.points,
          avatar: user.avatar,
          role: user.role,
          status: user.status,
          createdAt: user.createdAt
        }
      });

    } catch (error) {
      console.error('更新资料失败:', error);
      res.status(500).json({
        status: 'error',
        message: '更新资料失败'
      });
    }
  }

  // 上传头像
  async uploadAvatar(req, res) {
    try {
      const userId = req.user.id;
      
      if (!req.file) {
        return res.status(400).json({
          status: 'error',
          message: '请选择头像文件'
        });
      }

      // 集成腾讯云COS上传
      const { uploadToCOS } = require("../config/cos");
      
      // 生成头像存储路径
      const ext = req.file.originalname.split('.').pop();
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      const avatarKey = `avatars/${userId}/${timestamp}_${random}.${ext}`;

      try {
        // 上传到腾讯云COS
        const cosResult = await uploadToCOS(
          req.file.buffer,
          avatarKey,
          req.file.mimetype
        );

        // 更新用户头像
        const user = await User.findByPk(userId);
        if (!user) {
          return res.status(404).json({
            status: 'error',
            message: '用户不存在'
          });
        }

        user.avatar = cosResult.url;
        await user.save();

        res.json({
          status: 'success',
          message: '头像更新成功',
          data: {
            id: user.id,
            username: user.username,
            email: user.email,
            points: user.points,
            avatar: user.avatar,
            role: user.role,
            status: user.status,
            createdAt: user.createdAt
          }
        });

      } catch (cosError) {
        console.error('头像上传到COS失败:', cosError);
        return res.status(500).json({
          status: 'error',
          message: '头像上传失败',
          details: cosError.message
        });
      }

    } catch (error) {
      console.error('头像上传失败:', error);
      res.status(500).json({
        status: 'error',
        message: '头像上传失败'
      });
    }
  }

  // 获取用户统计信息
  async getUserStats(req, res) {
    try {
      const userId = req.user.id;

      // 查询用户上传的图片数量
      const uploadCount = await Image.count({
        where: { userId }
      });

      // 查询用户图片的总浏览数（目前没有views字段，使用模拟数据）
      const viewCount = uploadCount * 15; // 基于上传数量的合理估算

      // 查询用户获得的点赞数（目前模拟，可以后续添加点赞表）
      const likeCount = Math.floor(uploadCount * 2.5); // 基于上传数量的合理估算

      // 计算用户排名（基于积分）
      const user = await User.findByPk(userId);
      const higherRankCount = await User.count({
        where: {
          points: { [Op.gt]: user.points }
        }
      });
      const rank = higherRankCount + 1;

      // 获取总用户数
      const totalUsers = await User.count();

      res.json({
        status: 'success',
        data: {
          uploadCount,
          viewCount,
          likeCount,
          rank,
          totalUsers,
          percentile: Math.round((1 - (rank - 1) / totalUsers) * 100)
        }
      });

    } catch (error) {
      console.error('获取用户统计失败:', error);
      res.status(500).json({
        status: 'error',
        message: '获取用户统计失败'
      });
    }
  }

  // 获取最近活动
  async getRecentActivity(req, res) {
    try {
      const userId = req.user.id;

      // 从UserActivity表获取用户活动
      const activities = await activityService.getUserRecentActivities(userId, 10);

      // 如果没有活动记录，提供一些默认信息
      if (activities.length === 0) {
        const user = await User.findByPk(userId);
        const daysSinceRegistration = Math.floor((new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24));
        
        if (daysSinceRegistration <= 7) {
          activities.push({
            id: 'register',
            type: 'register',
            title: '欢迎加入',
            description: '成功注册汽车图库账户',
            createdAt: user.createdAt
          });
        }
      }

      res.json({
        status: 'success',
        data: activities
      });

    } catch (error) {
      console.error('获取最近活动失败:', error);
      res.status(500).json({
        status: 'error',
        message: '获取最近活动失败'
      });
    }
  }

  // 获取积分历史记录
  async getPointsHistory(req, res) {
    try {
      const userId = req.user.id;

      // 由于目前没有积分记录表，这里生成模拟数据
      // 实际项目中应该有专门的积分记录表
      const user = await User.findByPk(userId);
      const registrationDate = new Date(user.createdAt);
      
      const pointsHistory = [];

      // 添加注册奖励记录
      pointsHistory.push({
        id: 1,
        description: '注册奖励',
        points: 100,
        createdAt: registrationDate
      });

      // 查询用户上传的图片，为每个图片生成积分记录
      const images = await Image.findAll({
        where: { userId },
        order: [['createdAt', 'ASC']],
        attributes: ['id', 'title', 'createdAt']
      });

      images.forEach((image, index) => {
        pointsHistory.push({
          id: index + 2,
          description: `上传图片：${image.title || '无标题'}`,
          points: 10,
          createdAt: image.createdAt
        });
      });

      // 按时间倒序排列
      pointsHistory.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      res.json({
        status: 'success',
        data: pointsHistory.slice(0, 20) // 最多返回20条记录
      });

    } catch (error) {
      console.error('获取积分历史失败:', error);
      res.status(500).json({
        status: 'error',
        message: '获取积分历史失败'
      });
    }
  }

  // 获取用户成就
  async getUserAchievements(req, res) {
    try {
      const userId = req.user.id;
      
      // 获取用户统计信息
      const [user] = await sequelize.query(
        'SELECT points FROM users WHERE id = ?',
        { 
          replacements: [userId],
          type: sequelize.QueryTypes.SELECT
        }
      );
      
      const [uploadCount] = await sequelize.query(
        'SELECT COUNT(*) as count FROM images WHERE userId = ?',
        { 
          replacements: [userId],
          type: sequelize.QueryTypes.SELECT
        }
      );
      
      // 目前没有views字段，使用基于上传数量的估算
      const totalViews = { total: uploadCount.count * 15 };
      
      // 定义成就规则
      const achievements = [
        {
          id: 1,
          name: '初来乍到',
          description: '成功注册账号',
          icon: 'el-icon-user',
          condition: 'register',
          requirement: 1,
          unlocked: true // 注册就解锁
        },
        {
          id: 2,
          name: '上传新手',
          description: '上传第一张图片',
          icon: 'el-icon-upload',
          condition: 'upload',
          requirement: 1,
          unlocked: uploadCount.count >= 1
        },
        {
          id: 3,
          name: '上传达人',
          description: '上传10张图片',
          icon: 'el-icon-upload2',
          condition: 'upload',
          requirement: 10,
          unlocked: uploadCount.count >= 10
        },
        {
          id: 4,
          name: '上传大师',
          description: '上传50张图片',
          icon: 'el-icon-folder-opened',
          condition: 'upload',
          requirement: 50,
          unlocked: uploadCount.count >= 50
        },
        {
          id: 5,
          name: '人气新星',
          description: '图片获得100次浏览',
          icon: 'el-icon-view',
          condition: 'views',
          requirement: 100,
          unlocked: totalViews.total >= 100
        },
        {
          id: 6,
          name: '人气王',
          description: '图片获得1000次浏览',
          icon: 'el-icon-star-on',
          condition: 'views',
          requirement: 1000,
          unlocked: totalViews.total >= 1000
        },
        {
          id: 7,
          name: '积分达人',
          description: '积分达到500',
          icon: 'el-icon-coin',
          condition: 'points',
          requirement: 500,
          unlocked: user.points >= 500
        },
        {
          id: 8,
          name: '积分大师',
          description: '积分达到1000',
          icon: 'el-icon-trophy',
          condition: 'points',
          requirement: 1000,
          unlocked: user.points >= 1000
        }
      ];
      
      // 计算解锁的成就数量
      const unlockedCount = achievements.filter(a => a.unlocked).length;
      
      res.json({
        status: 'success',
        data: {
          achievements,
          unlockedCount,
          totalCount: achievements.length,
          completionRate: Math.round((unlockedCount / achievements.length) * 100)
        }
      });
    } catch (error) {
      console.error('获取用户成就失败:', error);
      res.status(500).json({
        status: 'error',
        message: '获取成就信息失败'
      });
    }
  }

  // 更新用户排名
  async updateUserRank(req, res) {
    try {
      const userId = req.user.id;
      
      // 获取用户当前积分
      const [user] = await sequelize.query(
        'SELECT points FROM users WHERE id = ?',
        { 
          replacements: [userId],
          type: sequelize.QueryTypes.SELECT
        }
      );
      
      // 计算用户排名
      const [rankResult] = await sequelize.query(
        'SELECT COUNT(*) + 1 as rank FROM users WHERE points > ?',
        { 
          replacements: [user.points],
          type: sequelize.QueryTypes.SELECT
        }
      );
      
      // 获取总用户数
      const [totalUsers] = await sequelize.query(
        'SELECT COUNT(*) as total FROM users',
        { type: sequelize.QueryTypes.SELECT }
      );
      
      res.json({
        status: 'success',
        data: {
          rank: rankResult.rank,
          totalUsers: totalUsers.total,
          percentile: Math.round((1 - (rankResult.rank - 1) / totalUsers.total) * 100)
        }
      });
    } catch (error) {
      console.error('获取用户排名失败:', error);
      res.status(500).json({
        status: 'error',
        message: '获取排名信息失败'
      });
    }
  }
}

module.exports = new AuthController(); 