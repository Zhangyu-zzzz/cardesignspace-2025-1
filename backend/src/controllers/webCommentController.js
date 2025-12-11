const { Op } = require('sequelize');
const { WebComment } = require('../models/mysql');
const User = require('../models/mysql/User');

/**
 * 提交网站优化意见
 */
exports.submitWebComment = async (req, res) => {
  try {
    const {
      content,
      userId,
      userAgent,
      pageUrl,
      timestamp
    } = req.body;

    // 验证必填字段
    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        status: 'error',
        message: '意见内容不能为空'
      });
    }

    // 验证内容长度
    if (content.trim().length < 5) {
      return res.status(400).json({
        status: 'error',
        message: '意见内容至少需要5个字符'
      });
    }

    if (content.trim().length > 2000) {
      return res.status(400).json({
        status: 'error',
        message: '意见内容不能超过2000个字符'
      });
    }

    // 创建意见记录
    const webComment = await WebComment.create({
      content: content.trim(),
      userId: userId || null,
      userAgent: userAgent || req.headers['user-agent'],
      pageUrl: pageUrl || req.headers.referer,
      ipAddress: req.ip || req.connection.remoteAddress,
      status: 'pending',
      createdAt: timestamp ? new Date(timestamp) : new Date()
    });

    console.log('新网站优化意见提交:', {
      id: webComment.id,
      userId: webComment.userId,
      contentLength: webComment.content.length
    });

    res.json({
      status: 'success',
      message: '意见提交成功，感谢您的建议！',
      data: {
        id: webComment.id,
        submittedAt: webComment.createdAt
      }
    });

  } catch (error) {
    console.error('提交网站优化意见失败:', error);
    console.error('错误堆栈:', error.stack);
    
    // 如果是数据库错误，提供更详细的错误信息
    if (error.name === 'SequelizeDatabaseError') {
      console.error('数据库错误:', error.message);
      return res.status(500).json({
        status: 'error',
        message: '数据库操作失败，请检查表是否存在',
        details: error.message
      });
    }
    
    res.status(500).json({
      status: 'error',
      message: '提交失败，请稍后重试',
      details: error.message
    });
  }
};

/**
 * 获取网站优化意见列表（管理员）
 */
exports.getWebCommentList = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status = 'all',
      startDate,
      endDate,
      search
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    // 状态筛选
    if (status && status !== 'all') {
      where.status = status;
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
      where.content = { [Op.like]: `%${search}%` };
    }

    const { count, rows } = await WebComment.findAndCountAll({
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
        comments: rows,
        pagination: {
          current: parseInt(page),
          pageSize: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      }
    });

  } catch (error) {
    console.error('获取网站优化意见列表失败:', error);
    res.status(500).json({
      status: 'error',
      message: '获取意见列表失败',
      details: error.message
    });
  }
};

/**
 * 获取网站优化意见详情（管理员）
 */
exports.getWebCommentDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const webComment = await WebComment.findByPk(id, {
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'email'],
          required: false
        }
      ]
    });

    if (!webComment) {
      return res.status(404).json({
        status: 'error',
        message: '意见不存在'
      });
    }

    res.json({
      status: 'success',
      data: webComment
    });

  } catch (error) {
    console.error('获取网站优化意见详情失败:', error);
    res.status(500).json({
      status: 'error',
      message: '获取意见详情失败',
      details: error.message
    });
  }
};

/**
 * 更新网站优化意见状态（管理员）
 */
exports.updateWebCommentStatus = async (req, res) => {
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

    const webComment = await WebComment.findByPk(id);
    if (!webComment) {
      return res.status(404).json({
        status: 'error',
        message: '意见不存在'
      });
    }

    await webComment.update({ 
      status,
      updatedAt: new Date()
    });

    res.json({
      status: 'success',
      message: '状态更新成功',
      data: {
        id: webComment.id,
        status: webComment.status
      }
    });

  } catch (error) {
    console.error('更新网站优化意见状态失败:', error);
    res.status(500).json({
      status: 'error',
      message: '更新状态失败',
      details: error.message
    });
  }
};

/**
 * 回复网站优化意见（管理员）
 */
exports.replyWebComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reply } = req.body;

    if (!reply || reply.trim().length === 0) {
      return res.status(400).json({
        status: 'error',
        message: '回复内容不能为空'
      });
    }

    const webComment = await WebComment.findByPk(id);
    if (!webComment) {
      return res.status(404).json({
        status: 'error',
        message: '意见不存在'
      });
    }

    await webComment.update({ 
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
        id: webComment.id,
        reply: webComment.reply,
        repliedAt: webComment.repliedAt
      }
    });

  } catch (error) {
    console.error('回复网站优化意见失败:', error);
    res.status(500).json({
      status: 'error',
      message: '回复失败',
      details: error.message
    });
  }
};

/**
 * 删除网站优化意见（管理员）
 */
exports.deleteWebComment = async (req, res) => {
  try {
    const { id } = req.params;

    const webComment = await WebComment.findByPk(id);
    if (!webComment) {
      return res.status(404).json({
        status: 'error',
        message: '意见不存在'
      });
    }

    await webComment.destroy();

    res.json({
      status: 'success',
      message: '意见删除成功'
    });

  } catch (error) {
    console.error('删除网站优化意见失败:', error);
    res.status(500).json({
      status: 'error',
      message: '删除失败',
      details: error.message
    });
  }
};

