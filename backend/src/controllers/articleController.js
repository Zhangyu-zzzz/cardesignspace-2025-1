const { Article, ArticleComment, ArticleLike, User } = require('../models/mysql');
const { Op } = require('sequelize');
const { sequelize } = require('../config/mysql');
const logger = require('../config/logger');

// 获取所有文章
exports.getAllArticles = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      category, 
      featured,
      search,
      sortBy = 'publishedAt',
      sortOrder = 'desc',
      status = 'published'
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    // 构建查询条件
    const whereCondition = {
      status: status
    };
    
    // 分类筛选
    if (category && category !== 'all') {
      whereCondition.category = category;
    }
    
    // 推荐文章筛选
    if (featured !== undefined) {
      whereCondition.featured = featured === 'true';
    }
    
    // 搜索功能
    if (search) {
      whereCondition[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { subtitle: { [Op.like]: `%${search}%` } },
        { summary: { [Op.like]: `%${search}%` } },
        { tags: { [Op.like]: `%${search}%` } }
      ];
    }
    
    // 排序配置
    const orderOptions = [];
    if (sortBy === 'publishedAt') {
      orderOptions.push(['publishedAt', sortOrder.toUpperCase()]);
    } else if (sortBy === 'viewCount') {
      orderOptions.push(['viewCount', sortOrder.toUpperCase()]);
    } else if (sortBy === 'likeCount') {
      orderOptions.push(['likeCount', sortOrder.toUpperCase()]);
    } else {
      orderOptions.push(['publishedAt', 'DESC']);
    }
    
    const { count, rows } = await Article.findAndCountAll({
      where: whereCondition,
      include: [
        {
          model: User,
          as: 'Author',
          attributes: ['id', 'username', 'avatar', 'role']
        }
      ],
      order: orderOptions,
      limit: parseInt(limit),
      offset: offset,
      distinct: true
    });
    
    res.json({
      status: 'success',
      data: {
        articles: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
    
  } catch (error) {
    logger.error('获取文章列表失败:', error);
    res.status(500).json({
      status: 'error',
      message: '获取文章列表失败'
    });
  }
};

// 获取单篇文章详情
exports.getArticleById = async (req, res) => {
  try {
    const { id } = req.params;
    const { incrementView = true } = req.query;
    
    const article = await Article.findByPk(id, {
      include: [
        {
          model: User,
          as: 'Author',
          attributes: ['id', 'username', 'avatar', 'role']
        },
        {
          model: ArticleComment,
          as: 'Comments',
          where: { status: 'active' },
          required: false,
          include: [
            {
              model: User,
              as: 'User',
              attributes: ['id', 'username', 'avatar']
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
                  attributes: ['id', 'username', 'avatar']
                }
              ]
            }
          ]
        }
      ]
    });
    
    if (!article) {
      return res.status(404).json({
        status: 'error',
        message: '文章不存在'
      });
    }
    
    // 检查文章状态
    if (article.status !== 'published' && (!req.user || req.user.id !== article.authorId)) {
      return res.status(403).json({
        status: 'error',
        message: '无权访问此文章'
      });
    }
    
    // 增加浏览次数
    if (incrementView === 'true' || incrementView === true) {
      await article.increment('viewCount');
    }
    
    // 检查当前用户是否点赞了这篇文章
    let userLiked = false;
    if (req.user) {
      const like = await ArticleLike.findOne({
        where: {
          articleId: id,
          userId: req.user.id,
          type: 'like'
        }
      });
      userLiked = !!like;
    }
    
    res.json({
      status: 'success',
      data: {
        article,
        userLiked
      }
    });
    
  } catch (error) {
    logger.error('获取文章详情失败:', error);
    res.status(500).json({
      status: 'error',
      message: '获取文章详情失败'
    });
  }
};

// 创建文章
exports.createArticle = async (req, res) => {
  try {
    const {
      title,
      subtitle,
      content,
      summary,
      category,
      tags,
      coverImage,
      status = 'draft',
      featured = false,
      seoTitle,
      seoDescription,
      seoKeywords
    } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({
        status: 'error',
        message: '标题和内容不能为空'
      });
    }
    
    // 计算预计阅读时间（基于内容长度）
    const readingTime = Math.ceil(content.replace(/<[^>]*>/g, '').length / 200);
    
    const articleData = {
      title,
      subtitle,
      content,
      summary,
      authorId: req.user.id,
      category,
      tags: Array.isArray(tags) ? tags : [],
      coverImage,
      status,
      featured,
      readingTime,
      seoTitle,
      seoDescription,
      seoKeywords
    };
    
    // 如果是发布状态，设置发布时间
    if (status === 'published') {
      articleData.publishedAt = new Date();
    }
    
    const article = await Article.create(articleData);
    
    // 获取完整的文章信息（包含作者信息）
    const fullArticle = await Article.findByPk(article.id, {
      include: [
        {
          model: User,
          as: 'Author',
          attributes: ['id', 'username', 'avatar', 'role']
        }
      ]
    });
    
    res.status(201).json({
      status: 'success',
      message: '文章创建成功',
      data: fullArticle
    });
    
  } catch (error) {
    logger.error('创建文章失败:', error);
    res.status(500).json({
      status: 'error',
      message: '创建文章失败'
    });
  }
};

// 更新文章
exports.updateArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const article = await Article.findByPk(id);
    
    if (!article) {
      return res.status(404).json({
        status: 'error',
        message: '文章不存在'
      });
    }
    
    // 检查权限（只有作者或管理员可以编辑）
    if (article.authorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: '无权编辑此文章'
      });
    }
    
    // 如果状态改为发布且之前不是发布状态，设置发布时间
    if (updateData.status === 'published' && article.status !== 'published') {
      updateData.publishedAt = new Date();
    }
    
    // 更新阅读时间
    if (updateData.content) {
      updateData.readingTime = Math.ceil(updateData.content.replace(/<[^>]*>/g, '').length / 200);
    }
    
    await article.update(updateData);
    
    // 获取更新后的完整文章信息
    const updatedArticle = await Article.findByPk(id, {
      include: [
        {
          model: User,
          as: 'Author',
          attributes: ['id', 'username', 'avatar', 'role']
        }
      ]
    });
    
    res.json({
      status: 'success',
      message: '文章更新成功',
      data: updatedArticle
    });
    
  } catch (error) {
    logger.error('更新文章失败:', error);
    res.status(500).json({
      status: 'error',
      message: '更新文章失败'
    });
  }
};

// 删除文章
exports.deleteArticle = async (req, res) => {
  try {
    const { id } = req.params;
    
    const article = await Article.findByPk(id);
    
    if (!article) {
      return res.status(404).json({
        status: 'error',
        message: '文章不存在'
      });
    }
    
    // 检查权限
    if (article.authorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: '无权删除此文章'
      });
    }
    
    // 软删除：更新状态为deleted
    await article.update({ status: 'deleted' });
    
    res.json({
      status: 'success',
      message: '文章删除成功'
    });
    
  } catch (error) {
    logger.error('删除文章失败:', error);
    res.status(500).json({
      status: 'error',
      message: '删除文章失败'
    });
  }
};

// 点赞/取消点赞文章
exports.toggleLikeArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const article = await Article.findByPk(id);
    
    if (!article) {
      return res.status(404).json({
        status: 'error',
        message: '文章不存在'
      });
    }
    
    // 查找是否已经点赞
    const existingLike = await ArticleLike.findOne({
      where: {
        articleId: id,
        userId: userId
      }
    });
    
    if (existingLike) {
      // 已点赞，取消点赞
      await existingLike.destroy();
      await article.decrement('likeCount');
      
      res.json({
        status: 'success',
        message: '取消点赞成功',
        data: { liked: false }
      });
    } else {
      // 未点赞，添加点赞
      await ArticleLike.create({
        articleId: id,
        userId: userId,
        type: 'like'
      });
      await article.increment('likeCount');
      
      res.json({
        status: 'success',
        message: '点赞成功',
        data: { liked: true }
      });
    }
    
  } catch (error) {
    logger.error('点赞操作失败:', error);
    res.status(500).json({
      status: 'error',
      message: '点赞操作失败'
    });
  }
};

// 获取文章分类统计
exports.getCategoryStats = async (req, res) => {
  try {
    const stats = await Article.findAll({
      attributes: [
        'category',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: {
        status: 'published'
      },
      group: ['category'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']]
    });
    
    res.json({
      status: 'success',
      data: stats
    });
    
  } catch (error) {
    logger.error('获取分类统计失败:', error);
    res.status(500).json({
      status: 'error',
      message: '获取分类统计失败'
    });
  }
};

// 获取热门文章
exports.getPopularArticles = async (req, res) => {
  try {
    const { limit = 5, period = 'all' } = req.query;
    
    let whereCondition = {
      status: 'published'
    };
    
    // 时间范围筛选
    if (period === 'week') {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      whereCondition.publishedAt = { [Op.gte]: weekAgo };
    } else if (period === 'month') {
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      whereCondition.publishedAt = { [Op.gte]: monthAgo };
    }
    
    const articles = await Article.findAll({
      where: whereCondition,
      include: [
        {
          model: User,
          as: 'Author',
          attributes: ['id', 'username', 'avatar']
        }
      ],
      order: [
        ['viewCount', 'DESC'],
        ['likeCount', 'DESC'],
        ['publishedAt', 'DESC']
      ],
      limit: parseInt(limit)
    });
    
    res.json({
      status: 'success',
      data: articles
    });
    
  } catch (error) {
    logger.error('获取热门文章失败:', error);
    res.status(500).json({
      status: 'error',
      message: '获取热门文章失败'
    });
  }
};

// 获取用户草稿文章
exports.getUserDrafts = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const drafts = await Article.findAll({
      where: {
        authorId: userId,
        status: 'draft'
      },
      include: [
        {
          model: User,
          as: 'Author',
          attributes: ['id', 'username', 'avatar']
        }
      ],
      order: [['updatedAt', 'DESC']]
    });
    
    res.json({
      status: 'success',
      data: {
        drafts: drafts
      }
    });
    
  } catch (error) {
    logger.error('获取用户草稿失败:', error);
    res.status(500).json({
      status: 'error',
      message: '获取用户草稿失败'
    });
  }
}; 