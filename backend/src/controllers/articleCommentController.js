const { ArticleComment, User, Article } = require('../models/mysql');
const { Op } = require('sequelize');
const logger = require('../config/logger');

// 获取文章评论
exports.getArticleComments = async (req, res) => {
  try {
    const { articleId } = req.params;
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    const offset = (page - 1) * limit;
    
    // 验证文章是否存在
    const article = await Article.findByPk(articleId);
    if (!article) {
      return res.status(404).json({
        status: 'error',
        message: '文章不存在'
      });
    }
    
    const { count, rows } = await ArticleComment.findAndCountAll({
      where: {
        articleId: articleId,
        parentId: null, // 只获取顶级评论
        status: 'active'
      },
      include: [
        {
          model: User,
          as: 'User',
          attributes: ['id', 'username', 'avatar', 'role']
        },
        {
          model: ArticleComment,
          as: 'Replies',
          where: { status: 'active' },
          required: false,
          include: [
            {
              model: User,
              as: 'User',
              attributes: ['id', 'username', 'avatar', 'role']
            }
          ],
          order: [['createdAt', 'ASC']]
        }
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: offset,
      distinct: true
    });
    
    res.json({
      status: 'success',
      data: {
        comments: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
    
  } catch (error) {
    logger.error('获取文章评论失败:', error);
    res.status(500).json({
      status: 'error',
      message: '获取文章评论失败'
    });
  }
};

// 创建评论
exports.createComment = async (req, res) => {
  try {
    const { articleId } = req.params;
    const { content, parentId } = req.body;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        status: 'error',
        message: '评论内容不能为空'
      });
    }
    
    // 验证文章是否存在且已发布
    const article = await Article.findByPk(articleId);
    if (!article) {
      return res.status(404).json({
        status: 'error',
        message: '文章不存在'
      });
    }
    
    if (article.status !== 'published') {
      return res.status(403).json({
        status: 'error',
        message: '无法评论未发布的文章'
      });
    }
    
    // 如果是回复评论，验证父评论是否存在
    if (parentId) {
      const parentComment = await ArticleComment.findByPk(parentId);
      if (!parentComment || parentComment.articleId !== parseInt(articleId)) {
        return res.status(400).json({
          status: 'error',
          message: '父评论不存在或不属于当前文章'
        });
      }
    }
    
    // 创建评论
    const comment = await ArticleComment.create({
      articleId: articleId,
      userId: req.user.id,
      parentId: parentId || null,
      content: content.trim(),
      ipAddress: req.ip
    });
    
    // 更新文章评论数
    if (!parentId) {
      await article.increment('commentCount');
    } else {
      // 更新父评论的回复数
      await ArticleComment.increment('replyCount', {
        where: { id: parentId }
      });
    }
    
    // 获取完整的评论信息
    const fullComment = await ArticleComment.findByPk(comment.id, {
      include: [
        {
          model: User,
          as: 'User',
          attributes: ['id', 'username', 'avatar', 'role']
        }
      ]
    });
    
    res.status(201).json({
      status: 'success',
      message: '评论创建成功',
      data: fullComment
    });
    
  } catch (error) {
    logger.error('创建评论失败:', error);
    res.status(500).json({
      status: 'error',
      message: '创建评论失败'
    });
  }
};

// 更新评论
exports.updateComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        status: 'error',
        message: '评论内容不能为空'
      });
    }
    
    const comment = await ArticleComment.findByPk(id);
    
    if (!comment) {
      return res.status(404).json({
        status: 'error',
        message: '评论不存在'
      });
    }
    
    // 检查权限（只有评论作者或管理员可以编辑）
    if (comment.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: '无权编辑此评论'
      });
    }
    
    // 检查评论创建时间，超过一定时间不允许编辑（可选）
    const hoursSinceCreation = (new Date() - new Date(comment.createdAt)) / (1000 * 60 * 60);
    if (hoursSinceCreation > 24 && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: '评论创建超过24小时，无法编辑'
      });
    }
    
    await comment.update({
      content: content.trim()
    });
    
    // 获取更新后的完整评论信息
    const updatedComment = await ArticleComment.findByPk(id, {
      include: [
        {
          model: User,
          as: 'User',
          attributes: ['id', 'username', 'avatar', 'role']
        }
      ]
    });
    
    res.json({
      status: 'success',
      message: '评论更新成功',
      data: updatedComment
    });
    
  } catch (error) {
    logger.error('更新评论失败:', error);
    res.status(500).json({
      status: 'error',
      message: '更新评论失败'
    });
  }
};

// 删除评论
exports.deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    
    const comment = await ArticleComment.findByPk(id, {
      include: [
        {
          model: Article,
          attributes: ['id', 'commentCount']
        }
      ]
    });
    
    if (!comment) {
      return res.status(404).json({
        status: 'error',
        message: '评论不存在'
      });
    }
    
    // 检查权限
    if (comment.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: '无权删除此评论'
      });
    }
    
    // 软删除：更新状态为deleted
    await comment.update({ status: 'deleted' });
    
    // 更新相关计数
    if (!comment.parentId) {
      // 顶级评论，减少文章评论数
      await Article.decrement('commentCount', {
        where: { id: comment.articleId }
      });
    } else {
      // 回复评论，减少父评论回复数
      await ArticleComment.decrement('replyCount', {
        where: { id: comment.parentId }
      });
    }
    
    res.json({
      status: 'success',
      message: '评论删除成功'
    });
    
  } catch (error) {
    logger.error('删除评论失败:', error);
    res.status(500).json({
      status: 'error',
      message: '删除评论失败'
    });
  }
};

// 点赞评论
exports.likeComment = async (req, res) => {
  try {
    const { id } = req.params;
    
    const comment = await ArticleComment.findByPk(id);
    
    if (!comment) {
      return res.status(404).json({
        status: 'error',
        message: '评论不存在'
      });
    }
    
    if (comment.status !== 'active') {
      return res.status(403).json({
        status: 'error',
        message: '无法点赞此评论'
      });
    }
    
    // 这里可以扩展为更详细的点赞系统，类似文章点赞
    // 暂时简单增加点赞数
    await comment.increment('likeCount');
    
    res.json({
      status: 'success',
      message: '点赞成功',
      data: {
        likeCount: comment.likeCount + 1
      }
    });
    
  } catch (error) {
    logger.error('点赞评论失败:', error);
    res.status(500).json({
      status: 'error',
      message: '点赞评论失败'
    });
  }
}; 