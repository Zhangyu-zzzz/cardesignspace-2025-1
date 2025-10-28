const { Op } = require('sequelize');
const { Feedback } = require('../models/mysql');
const User = require('../models/mysql/User');

/**
 * 提交用户反馈
 */
exports.submitFeedback = async (req, res) => {
  try {
    const {
      type,
      rating,
      contact,
      content,
      userId,
      userAgent,
      pageUrl,
      timestamp
    } = req.body;

    // 验证必填字段
    if (!type || !content) {
      return res.status(400).json({
        status: 'error',
        message: '反馈类型和内容不能为空'
      });
    }

    // 验证反馈类型
    const validTypes = ['feature', 'ui', 'performance', 'bug', 'other'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        status: 'error',
        message: '无效的反馈类型'
      });
    }

    // 验证评分范围（如果提供了评分）
    if (rating !== undefined && rating !== null && (rating < 1 || rating > 5)) {
      return res.status(400).json({
        status: 'error',
        message: '评分必须在1-5之间'
      });
    }

    // 验证内容长度
    if (content.length < 10) {
      return res.status(400).json({
        status: 'error',
        message: '反馈内容至少需要10个字符'
      });
    }

    // 验证联系方式格式（如果提供）
    if (contact) {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      const qqRegex = /^\d{5,11}$/;
      
      if (!emailRegex.test(contact) && !qqRegex.test(contact)) {
        return res.status(400).json({
          status: 'error',
          message: '请输入有效的邮箱或QQ号'
        });
      }
    }

    // 创建反馈记录
    const feedback = await Feedback.create({
      type,
      rating: rating ? parseInt(rating) : 5, // 默认5星
      contact: contact || null,
      content,
      userId: userId || null,
      userAgent: userAgent || req.headers['user-agent'],
      pageUrl: pageUrl || req.headers.referer,
      ipAddress: req.ip || req.connection.remoteAddress,
      status: 'pending',
      createdAt: timestamp ? new Date(timestamp) : new Date()
    });

    console.log('新反馈提交:', {
      id: feedback.id,
      type: feedback.type,
      rating: feedback.rating,
      userId: feedback.userId,
      hasContact: !!feedback.contact
    });

    res.json({
      status: 'success',
      message: '反馈提交成功，感谢您的建议！',
      data: {
        id: feedback.id,
        submittedAt: feedback.createdAt
      }
    });

  } catch (error) {
    console.error('提交反馈失败:', error);
    res.status(500).json({
      status: 'error',
      message: '提交失败，请稍后重试',
      details: error.message
    });
  }
};

/**
 * 获取反馈列表（管理员）
 */
exports.getFeedbackList = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      status = 'all',
      rating,
      startDate,
      endDate,
      search
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    // 类型筛选
    if (type && type !== 'all') {
      where.type = type;
    }

    // 状态筛选
    if (status && status !== 'all') {
      where.status = status;
    }

    // 评分筛选
    if (rating) {
      where.rating = parseInt(rating);
    }

    // 日期范围筛选
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        where.createdAt[Op.lte] = new Date(endDate);
      }
    }

    // 搜索筛选
    if (search) {
      where[Op.or] = [
        { content: { [Op.like]: `%${search}%` } },
        { contact: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await Feedback.findAndCountAll({
      where,
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'email'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      status: 'success',
      data: {
        feedbacks: rows,
        pagination: {
          current: parseInt(page),
          pageSize: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      }
    });

  } catch (error) {
    console.error('获取反馈列表失败:', error);
    res.status(500).json({
      status: 'error',
      message: '获取反馈列表失败',
      details: error.message
    });
  }
};

/**
 * 获取反馈详情（管理员）
 */
exports.getFeedbackDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const feedback = await Feedback.findByPk(id, {
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'email'],
          required: false
        }
      ]
    });

    if (!feedback) {
      return res.status(404).json({
        status: 'error',
        message: '反馈不存在'
      });
    }

    res.json({
      status: 'success',
      data: feedback
    });

  } catch (error) {
    console.error('获取反馈详情失败:', error);
    res.status(500).json({
      status: 'error',
      message: '获取反馈详情失败',
      details: error.message
    });
  }
};

/**
 * 更新反馈状态（管理员）
 */
exports.updateFeedbackStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'processing', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: '无效的状态值'
      });
    }

    const feedback = await Feedback.findByPk(id);
    if (!feedback) {
      return res.status(404).json({
        status: 'error',
        message: '反馈不存在'
      });
    }

    await feedback.update({ 
      status,
      updatedAt: new Date()
    });

    res.json({
      status: 'success',
      message: '状态更新成功',
      data: {
        id: feedback.id,
        status: feedback.status
      }
    });

  } catch (error) {
    console.error('更新反馈状态失败:', error);
    res.status(500).json({
      status: 'error',
      message: '更新状态失败',
      details: error.message
    });
  }
};

/**
 * 回复反馈（管理员）
 */
exports.replyFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { reply } = req.body;

    if (!reply || reply.trim().length === 0) {
      return res.status(400).json({
        status: 'error',
        message: '回复内容不能为空'
      });
    }

    const feedback = await Feedback.findByPk(id);
    if (!feedback) {
      return res.status(404).json({
        status: 'error',
        message: '反馈不存在'
      });
    }

    await feedback.update({ 
      reply: reply.trim(),
      status: 'resolved',
      repliedAt: new Date(),
      repliedBy: req.user.id,
      updatedAt: new Date()
    });

    res.json({
      status: 'success',
      message: '回复成功',
      data: {
        id: feedback.id,
        reply: feedback.reply,
        repliedAt: feedback.repliedAt
      }
    });

  } catch (error) {
    console.error('回复反馈失败:', error);
    res.status(500).json({
      status: 'error',
      message: '回复失败',
      details: error.message
    });
  }
};

/**
 * 删除反馈（管理员）
 */
exports.deleteFeedback = async (req, res) => {
  try {
    const { id } = req.params;

    const feedback = await Feedback.findByPk(id);
    if (!feedback) {
      return res.status(404).json({
        status: 'error',
        message: '反馈不存在'
      });
    }

    await feedback.destroy();

    res.json({
      status: 'success',
      message: '反馈删除成功'
    });

  } catch (error) {
    console.error('删除反馈失败:', error);
    res.status(500).json({
      status: 'error',
      message: '删除失败',
      details: error.message
    });
  }
};

/**
 * 获取反馈统计（管理员）
 */
exports.getFeedbackStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        where.createdAt[Op.lte] = new Date(endDate);
      }
    }

    // 总体统计
    const totalCount = await Feedback.count({ where });
    
    // 按状态统计
    const statusStats = await Feedback.findAll({
      where,
      attributes: [
        'status',
        [Feedback.sequelize.fn('COUNT', Feedback.sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    // 按类型统计
    const typeStats = await Feedback.findAll({
      where,
      attributes: [
        'type',
        [Feedback.sequelize.fn('COUNT', Feedback.sequelize.col('id')), 'count']
      ],
      group: ['type'],
      raw: true
    });

    // 按评分统计
    const ratingStats = await Feedback.findAll({
      where,
      attributes: [
        'rating',
        [Feedback.sequelize.fn('COUNT', Feedback.sequelize.col('id')), 'count']
      ],
      group: ['rating'],
      raw: true
    });

    // 平均评分
    const avgRating = await Feedback.findOne({
      where,
      attributes: [
        [Feedback.sequelize.fn('AVG', Feedback.sequelize.col('rating')), 'avgRating']
      ],
      raw: true
    });

    res.json({
      status: 'success',
      data: {
        totalCount,
        avgRating: avgRating ? parseFloat(avgRating.avgRating).toFixed(2) : 0,
        statusStats: statusStats.reduce((acc, item) => {
          acc[item.status] = parseInt(item.count);
          return acc;
        }, {}),
        typeStats: typeStats.reduce((acc, item) => {
          acc[item.type] = parseInt(item.count);
          return acc;
        }, {}),
        ratingStats: ratingStats.reduce((acc, item) => {
          acc[item.rating] = parseInt(item.count);
          return acc;
        }, {})
      }
    });

  } catch (error) {
    console.error('获取反馈统计失败:', error);
    res.status(500).json({
      status: 'error',
      message: '获取统计失败',
      details: error.message
    });
  }
};
