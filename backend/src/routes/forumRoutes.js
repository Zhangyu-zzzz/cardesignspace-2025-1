const express = require('express');
const router = express.Router();
const multer = require('multer');
const { Post, Comment, PostLike, PostFavorite, User, Image, Model, Brand } = require('../models/mysql');
const { authenticateToken } = require('../middleware/auth');
const { uploadToCOS } = require('../config/cos');
const { generateForumImagePath, isValidImageType, formatFileSize } = require('../../utils/forumUtils');
const { Sequelize } = require('sequelize');
const { sequelize } = require('../config/mysql');
const notificationService = require('../services/notificationService');

// 配置文件上传（内存存储，用于上传到COS）
const storage = multer.memoryStorage();

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB限制
    files: 9 // 最多9个文件
  },
  fileFilter: (req, file, cb) => {
    if (isValidImageType(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只能上传图片文件（JPEG, PNG, GIF, WebP, BMP）'));
    }
  }
});

// 获取论坛帖子（支持用户筛选和旧格式兼容）
router.get('/posts', async (req, res) => {
  try {
    const { page = 1, limit = 10, userId, filter = 'all', sortBy = 'createdAt', topic } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = {};
    let orderClause = [['createdAt', 'DESC']];
    let andConditions = [];
    
    // 默认只查询活跃状态的帖子
    whereClause.status = 'active';
    
    // 如果指定了用户ID，只获取该用户的帖子
    if (userId) {
      whereClause.userId = userId;
    }
    
    // 根据话题筛选
    if (topic) {
      // 处理中文字符编码问题
      let decodedTopic = topic;
      try {
        decodedTopic = decodeURIComponent(topic);
      } catch (e) {
        // 如果解码失败，使用原始字符串
      }
      console.log('原始话题:', topic);
      console.log('解码后话题:', decodedTopic);
      
      // 使用JSON查询
      andConditions.push(Sequelize.literal(`JSON_SEARCH(topics, 'one', '${decodedTopic}') IS NOT NULL`));
    }
    
    // 根据filter条件调整查询（新格式）
    if (filter !== 'all') {
      switch (filter) {
        case 'images':
          andConditions.push(Sequelize.literal("JSON_LENGTH(images) > 0"));
          break;
        case 'popular':
          orderClause = [['likesCount', 'DESC'], ['createdAt', 'DESC']];
          break;
      }
    }
    
    // 如果有AND条件，添加到whereClause
    if (andConditions.length > 0) {
      whereClause[Sequelize.Op.and] = andConditions;
    }
    
    // 兼容旧的sortBy参数（用于Forum页面）
    if (sortBy && !userId) {
      switch (sortBy) {
        case 'createdAt':
          orderClause = [['createdAt', 'DESC']];
          break;
        case 'likesCount':
          orderClause = [['likesCount', 'DESC'], ['createdAt', 'DESC']];
          break;
      }
    }
    
    const posts = await Post.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          foreignKey: 'userId',
          attributes: ['id', 'username', 'email', 'avatar'],
        },
        {
          model: PostLike,
          as: 'PostLikes',
          attributes: ['userId'],
        },
        {
          model: PostFavorite,
          as: 'PostFavorites',
          attributes: ['userId'],
        },
        {
          model: Comment,
          as: 'Comments',
          include: [
            {
              model: User,
              foreignKey: 'userId',
              attributes: ['id', 'username', 'avatar'],
            }
          ],
          where: { parentId: null }, // 只获取顶级评论
          required: false,
          order: [['createdAt', 'ASC']]
        }
      ],
      order: orderClause,
      limit: parseInt(limit),
      offset: offset,
      distinct: true,
    });

    // 格式化返回数据
    const formattedPosts = posts.map(post => ({
      id: post.id,
      content: post.content,
      images: post.images || [],
      topics: post.topics || [],
      likesCount: post.PostLikes?.length || 0,
      commentsCount: post.commentsCount || 0,
      favoritesCount: post.PostFavorites?.length || 0,
      createdAt: post.createdAt,
      User: post.User,
      liked: post.PostLikes?.some(like => like.userId === req.user?.id) || false,
      favorited: post.PostFavorites?.some(favorite => favorite.userId === req.user?.id) || false,
      Comments: post.Comments || []
    }));

    // 检查是否还有更多数据
    const totalCount = await Post.count({ where: whereClause });
    const hasMore = offset + parseInt(limit) < totalCount;
    const totalPages = Math.ceil(totalCount / parseInt(limit));

    // 兼容两种返回格式
    if (userId && userId !== 'undefined') {
      // 新格式（用于Profile页面）
      res.json({
        status: 'success',
        data: {
          posts: formattedPosts,
          hasMore,
          total: totalCount,
          page: parseInt(page),
          limit: parseInt(limit)
        }
      });
    } else {
      // 旧格式（用于Forum页面）
      res.json({
        success: true,
        data: formattedPosts,
        total: totalCount,
        currentPage: parseInt(page),
        totalPages: totalPages
      });
    }
  } catch (error) {
    console.error('获取帖子失败:', error);
    res.status(500).json({
      status: 'error',
      message: '获取帖子失败',
      error: error.message
    });
  }
});

// 获取用户统计数据
router.get('/user-stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // 获取用户发帖数量
    const postsCount = await Post.count({
      where: { userId }
    });
    
    // 获取用户获得的点赞数（需要查询该用户的所有帖子的点赞数）
    const userPosts = await Post.findAll({
      where: { userId },
      attributes: ['id']
    });
    
    const postIds = userPosts.map(post => post.id);
    const likesCount = postIds.length > 0 ? await PostLike.count({
      where: { postId: postIds }
    }) : 0;
    
    // 获取用户评论数
    const commentsCount = await Comment.count({
      where: { userId }
    });
    
    res.json({
      status: 'success',
      data: {
        postsCount,
        likesCount,
        commentsCount
      }
    });
  } catch (error) {
    console.error('获取用户统计失败:', error);
    res.status(500).json({
      status: 'error',
      message: '获取用户统计失败',
      error: error.message
    });
  }
});

// 获取单个帖子详情
router.get('/posts/:id', async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id, {
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'avatar']
        },
        {
          model: Comment,
          as: 'Comments',
          where: { status: 'active', parentId: null },
          required: false,
          include: [
            {
              model: User,
              attributes: ['id', 'username', 'avatar']
            },
            {
              model: Comment,
              as: 'Replies',
              where: { status: 'active' },
              required: false,
              include: [
                {
                  model: User,
                  attributes: ['id', 'username', 'avatar']
                },
                {
                  model: Comment,
                  as: 'Replies',
                  where: { status: 'active' },
                  required: false,
                  include: [
                    {
                      model: User,
                      attributes: ['id', 'username', 'avatar']
                    },
                    {
                      model: Comment,
                      as: 'Replies',
                      where: { status: 'active' },
                      required: false,
                      include: [
                        {
                          model: User,
                          attributes: ['id', 'username', 'avatar']
                        }
                      ],
                      order: [['createdAt', 'ASC']]
                    }
                  ],
                  order: [['createdAt', 'ASC']]
                }
              ],
              order: [['createdAt', 'ASC']]
            }
          ],
          order: [['createdAt', 'ASC']]
        }
      ]
    });

    if (!post) {
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }

    res.json({ success: true, data: post });
  } catch (error) {
    console.error('获取帖子详情失败:', error);
    res.status(500).json({ success: false, message: '获取帖子详情失败' });
  }
});

// 创建新帖子（支持腾讯云COS图片上传）
router.post('/posts', authenticateToken, upload.array('images', 9), async (req, res) => {
  try {
    const { content, topics } = req.body;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '帖子内容不能为空'
      });
    }

    console.log('收到发帖请求:', {
      content: content.substring(0, 50) + '...',
      topics: topics,
      userId: req.user.id,
      filesCount: req.files ? req.files.length : 0
    });

    let imageUrls = [];
    
    // 处理图片上传
    if (req.files && req.files.length > 0) {
      console.log(`开始上传 ${req.files.length} 张图片到腾讯云COS...`);
      
      for (const file of req.files) {
        try {
          const imagePath = generateForumImagePath(file.originalname, req.user.id);
          console.log('生成的图片路径:', imagePath);
          
          const result = await uploadToCOS(file.buffer, imagePath, file.mimetype);
          console.log('COS上传结果:', result);
          
          if (result && result.url) {
            imageUrls.push(result.url);
            console.log('图片上传成功:', result.url);
          } else if (result && result.Location) {
            const imageUrl = `https://${result.Location}`;
            imageUrls.push(imageUrl);
            console.log('图片上传成功(兼容模式):', imageUrl);
          } else {
            console.error('图片上传失败 - 无效的响应:', result);
            throw new Error('图片上传失败');
          }
        } catch (uploadError) {
          console.error('图片上传到COS失败:', uploadError);
          return res.status(500).json({
            success: false,
            message: `图片上传失败: ${uploadError.message}`
          });
        }
      }
    }

    // 处理话题
    let parsedTopics = [];
    if (topics) {
      try {
        parsedTopics = JSON.parse(topics);
        // 确保话题是数组且不超过3个
        if (Array.isArray(parsedTopics)) {
          parsedTopics = parsedTopics.slice(0, 3);
        } else {
          parsedTopics = [];
        }
      } catch (e) {
        console.log('话题解析失败，使用空数组');
        parsedTopics = [];
      }
    }

    // 创建帖子
    const post = await Post.create({
      userId: req.user.id,
      content: content.trim(),
      images: imageUrls,
      topics: parsedTopics,
      likesCount: 0,
      commentsCount: 0
    });

    console.log('帖子创建成功:', {
      postId: post.id,
      userId: req.user.id,
      imagesCount: imageUrls.length,
      topicsCount: parsedTopics.length
    });

    res.json({
      success: true,
      message: '帖子发布成功',
      data: {
        id: post.id,
        content: post.content,
        images: post.images,
        topics: post.topics,
        createdAt: post.createdAt
      }
    });

  } catch (error) {
    console.error('发布帖子失败:', error);
    res.status(500).json({
      success: false,
      message: '发布帖子失败',
      error: error.message
    });
  }
});

// 点赞/取消点赞帖子
router.post('/posts/:id/like', authenticateToken, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    // 检查帖子是否存在
    const post = await Post.findByPk(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }

    // 检查是否已经点赞
    const existingLike = await PostLike.findOne({
      where: { postId, userId }
    });

    if (existingLike) {
      // 取消点赞
      await existingLike.destroy();
      await post.decrement('likesCount');
      res.json({ success: true, message: '取消点赞成功', liked: false });
    } else {
      // 点赞
      await PostLike.create({ postId, userId });
      await post.increment('likesCount');
      
      // 创建点赞通知（异步执行，不影响主流程）
      try {
        await notificationService.createLikeNotification(postId, userId);
      } catch (notificationError) {
        console.error('创建点赞通知失败:', notificationError);
        // 通知失败不影响点赞操作
      }
      
      res.json({ success: true, message: '点赞成功', liked: true });
    }
  } catch (error) {
    console.error('点赞操作失败:', error);
    res.status(500).json({ success: false, message: '点赞操作失败' });
  }
});

// 添加评论
router.post('/posts/:id/comments', authenticateToken, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;
    const { content, parentId = null } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, message: '评论内容不能为空' });
    }

    // 检查帖子是否存在
    const post = await Post.findByPk(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }

    const comment = await Comment.create({
      postId,
      userId,
      content: content.trim(),
      parentId
    });

    // 更新帖子评论数
    await post.increment('commentsCount');

    const commentWithUser = await Comment.findByPk(comment.id, {
      include: [{
        model: User,
        attributes: ['id', 'username', 'avatar']
      }]
    });

    // 创建评论通知（异步执行，不影响主流程）
    try {
      await notificationService.createCommentNotification(postId, userId, content.trim());
    } catch (notificationError) {
      console.error('创建评论通知失败:', notificationError);
      // 通知失败不影响评论操作
    }

    res.status(201).json({ success: true, data: commentWithUser });
  } catch (error) {
    console.error('添加评论失败:', error);
    res.status(500).json({ success: false, message: '添加评论失败' });
  }
});

// 收藏/取消收藏帖子
router.post('/posts/:id/favorite', authenticateToken, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    // 检查帖子是否存在
    const post = await Post.findByPk(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }

    // 检查是否已经收藏
    const existingFavorite = await PostFavorite.findOne({
      where: { postId, userId }
    });

    if (existingFavorite) {
      // 取消收藏
      await existingFavorite.destroy();
      res.json({ success: true, message: '取消收藏成功', favorited: false });
    } else {
      // 收藏
      await PostFavorite.create({ postId, userId });
      res.json({ success: true, message: '收藏成功', favorited: true });
    }
  } catch (error) {
    console.error('收藏操作失败:', error);
    res.status(500).json({ success: false, message: '收藏操作失败' });
  }
});

// 获取用户收藏的帖子
router.get('/favorites', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const favorites = await PostFavorite.findAndCountAll({
      where: { userId },
      include: [
        {
          model: Post,
          include: [
            {
              model: User,
              attributes: ['id', 'username', 'avatar']
            },
            {
              model: PostLike,
              as: 'PostLikes',
              attributes: ['userId']
            },
            {
              model: PostFavorite,
              as: 'PostFavorites', 
              attributes: ['userId']
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: offset
    });

    const formattedFavorites = favorites.rows
      .filter(favorite => favorite.Post) // 过滤掉已删除的帖子
      .map(favorite => ({
        id: favorite.Post.id,
        content: favorite.Post.content,
        images: favorite.Post.images || [],
        topics: favorite.Post.topics || [],
        likesCount: favorite.Post.PostLikes?.length || 0,
        commentsCount: favorite.Post.commentsCount || 0,
        favoritesCount: favorite.Post.PostFavorites?.length || 0,
        createdAt: favorite.Post.createdAt,
        User: favorite.Post.User,
        liked: favorite.Post.PostLikes?.some(like => like.userId === userId) || false,
        favorited: true,
        favoritedAt: favorite.createdAt
      }));

    const hasMore = offset + parseInt(limit) < favorites.count;
    const totalPages = Math.ceil(favorites.count / parseInt(limit));

    res.json({
      success: true,
      data: {
        posts: formattedFavorites,
        hasMore,
        total: favorites.count,
        page: parseInt(page),
        totalPages
      }
    });
  } catch (error) {
    console.error('获取收藏帖子失败:', error);
    res.status(500).json({ success: false, message: '获取收藏帖子失败' });
  }
});

// 获取用户上传的汽车图片
router.get('/user-uploads', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 12 } = req.query;
    const offset = (page - 1) * limit;

    // 从images表获取用户上传的图片
    const uploads = await Image.findAndCountAll({
      where: { userId: userId },
      include: [
        {
          model: Model,
          attributes: ['id', 'name', 'type', 'brandId'],
          include: [
            {
              model: Brand,
              attributes: ['id', 'name', 'logo', 'country']
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: offset
    });

    const formattedUploads = uploads.rows.map(image => ({
      id: image.id,
      url: image.url || image.originalUrl,
      thumbnailUrl: image.thumbnailUrl,
      mediumUrl: image.mediumUrl,
      largeUrl: image.largeUrl,
      createdAt: image.createdAt,
      Model: image.Model
    }));

    const hasMore = offset + parseInt(limit) < uploads.count;
    const totalPages = Math.ceil(uploads.count / parseInt(limit));

    res.json({
      success: true,
      data: {
        uploads: formattedUploads,
        hasMore,
        total: uploads.count,
        page: parseInt(page),
        totalPages
      }
    });
  } catch (error) {
    console.error('获取用户上传失败:', error);
    res.status(500).json({ success: false, message: '获取用户上传失败' });
  }
});

// 获取用户获赞记录
router.get('/user-likes', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // 获取用户所有帖子的获赞记录
    const likes = await PostLike.findAndCountAll({
      include: [
        {
          model: Post,
          where: { userId: userId }, // 只获取当前用户的帖子
          include: [
            {
              model: User,
              attributes: ['id', 'username', 'avatar']
            }
          ]
        },
        {
          model: User,
          as: 'Liker', // 点赞的用户
          attributes: ['id', 'username', 'avatar']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: offset
    });

    const formattedLikes = likes.rows.map(like => ({
      id: like.id,
      postId: like.Post.id,
      postContent: like.Post.content.substring(0, 100) + (like.Post.content.length > 100 ? '...' : ''),
      postImages: like.Post.images || [],
      likedAt: like.createdAt,
      liker: {
        id: like.Liker.id,
        username: like.Liker.username,
        avatar: like.Liker.avatar
      }
    }));

    const hasMore = offset + parseInt(limit) < likes.count;
    const totalPages = Math.ceil(likes.count / parseInt(limit));

    res.json({
      success: true,
      data: {
        likes: formattedLikes,
        hasMore,
        total: likes.count,
        page: parseInt(page),
        totalPages
      }
    });
  } catch (error) {
    console.error('获取用户获赞记录失败:', error);
    res.status(500).json({ success: false, message: '获取用户获赞记录失败' });
  }
});

// 删除帖子
router.delete('/posts/:id', authenticateToken, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    const post = await Post.findByPk(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }

    // 检查权限：只有作者或管理员可以删除
    if (post.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '没有权限删除此帖子' });
    }

    await post.update({ status: 'deleted' });
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除帖子失败:', error);
    res.status(500).json({ success: false, message: '删除帖子失败' });
  }
});

// 获取论坛统计数据
router.get('/stats', async (req, res) => {
  try {
    // 获取总帖子数
    const totalPosts = await Post.count({
      where: { status: 'active' }
    });

    // 获取注册用户数
    const totalUsers = await User.count();

    // 获取今日新帖数
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayPosts = await Post.count({
      where: {
        status: 'active',
        createdAt: {
          [Sequelize.Op.gte]: today
        }
      }
    });

    res.json({
      success: true,
      data: {
        posts: totalPosts,
        users: totalUsers,
        todayPosts: todayPosts
      }
    });
  } catch (error) {
    console.error('获取论坛统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取论坛统计失败',
      error: error.message
    });
  }
});

// 获取热门话题
router.get('/hot-topics', async (req, res) => {
  try {
    // 获取最近30天的帖子话题统计
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const posts = await Post.findAll({
      where: {
        status: 'active',
        createdAt: {
          [Sequelize.Op.gte]: thirtyDaysAgo
        },
        topics: {
          [Sequelize.Op.ne]: '[]'
        }
      },
      attributes: ['topics']
    });

    // 统计话题出现次数
    const topicCount = {};
    posts.forEach(post => {
      if (post.topics && Array.isArray(post.topics)) {
        post.topics.forEach(topic => {
          topicCount[topic] = (topicCount[topic] || 0) + 1;
        });
      }
    });

    // 排序并取前5个热门话题
    const hotTopics = Object.entries(topicCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    res.json({
      success: true,
      data: hotTopics
    });
  } catch (error) {
    console.error('获取热门话题失败:', error);
    res.status(500).json({
      success: false,
      message: '获取热门话题失败',
      error: error.message
    });
  }
});

// 获取活跃用户
router.get('/active-users', async (req, res) => {
  try {
    // 获取最近发帖最多的用户（最近30天）
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 使用原生SQL查询来避免关联问题
    const activeUsers = await sequelize.query(`
      SELECT 
        u.id,
        u.username,
        u.avatar,
        COUNT(p.id) as postsCount
      FROM users u
      INNER JOIN posts p ON u.id = p.userId
      WHERE p.status = 'active' 
        AND p.createdAt >= :thirtyDaysAgo
      GROUP BY u.id, u.username, u.avatar
      HAVING COUNT(p.id) > 0
      ORDER BY COUNT(p.id) DESC
      LIMIT 5
    `, {
      replacements: { thirtyDaysAgo },
      type: Sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: activeUsers.map(user => ({
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        postsCount: parseInt(user.postsCount)
      }))
    });
  } catch (error) {
    console.error('获取活跃用户失败:', error);
    res.status(500).json({
      success: false,
      message: '获取活跃用户失败',
      error: error.message
    });
  }
});

// 获取所有话题列表
router.get('/topics', async (req, res) => {
  try {
    // 获取所有帖子中使用过的话题
    const posts = await Post.findAll({
      where: {
        status: 'active',
        topics: {
          [Sequelize.Op.ne]: '[]'
        }
      },
      attributes: ['topics']
    });

    // 收集所有不重复的话题
    const allTopics = new Set();
    posts.forEach(post => {
      if (post.topics && Array.isArray(post.topics)) {
        post.topics.forEach(topic => {
          allTopics.add(topic);
        });
      }
    });

    // 如果没有话题，提供一些默认话题
    const defaultTopics = ['汽车摄影', '新车发布', '改装分享', '驾驶技巧', '维修保养', '购车心得', '自驾游', '汽车新闻'];
    const topicsList = allTopics.size > 0 ? Array.from(allTopics) : defaultTopics;

    res.json({
      success: true,
      data: topicsList.sort()
    });
  } catch (error) {
    console.error('获取话题列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取话题列表失败',
      error: error.message
    });
  }
});

// 获取用户公开资料
router.get('/user-profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // 查找用户，只返回存在的公开信息字段
    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'avatar', 'createdAt'] // 只包含确实存在的字段
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
    console.error('获取用户资料失败:', error);
    res.status(500).json({
      status: 'error',
      message: '获取用户资料失败',
      error: error.message
    });
  }
});

module.exports = router; 