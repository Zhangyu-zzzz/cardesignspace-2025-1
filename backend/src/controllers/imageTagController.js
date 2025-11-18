const Image = require('../models/mysql/Image');
const Model = require('../models/mysql/Model');
const Brand = require('../models/mysql/Brand');
const { Op } = require('sequelize');
const logger = require('../config/logger');

// 更新图片标签
exports.updateImageTags = async (req, res) => {
  try {
    const { id } = req.params;
    const { tags } = req.body;

    // 验证输入
    if (!tags || !Array.isArray(tags)) {
      return res.status(400).json({
        status: 'error',
        message: '标签必须是数组格式'
      });
    }

    // 验证标签内容
    const validTags = tags.filter(tag => 
      typeof tag === 'string' && 
      tag.trim().length > 0 && 
      tag.trim().length <= 50
    );

    if (validTags.length !== tags.length) {
      return res.status(400).json({
        status: 'error',
        message: '标签格式不正确，每个标签应为1-50个字符的字符串'
      });
    }

    // 查找图片
    const image = await Image.findByPk(id);
    if (!image) {
      return res.status(404).json({
        status: 'error',
        message: '图片不存在'
      });
    }

    // 更新标签
    const newTags = validTags.map(tag => tag.trim());
    console.log('准备更新标签:', {
      imageId: id,
      oldTags: image.tags,
      newTags: newTags
    });
    
    await image.update({
      tags: newTags
    });

    // 重新获取更新后的图片数据
    await image.reload();
    
    console.log('标签更新完成:', {
      imageId: id,
      updatedTags: image.tags
    });

    logger.info(`图片标签已更新: 图片ID=${id}, 标签数量=${validTags.length}`);

    res.json({
      status: 'success',
      message: '标签更新成功',
      data: {
        id: image.id,
        tags: image.tags
      }
    });

  } catch (error) {
    logger.error('更新图片标签失败:', error);
    res.status(500).json({
      status: 'error',
      message: '更新图片标签失败',
      details: error.message
    });
  }
};

// 获取图片标签
exports.getImageTags = async (req, res) => {
  try {
    const { id } = req.params;

    const image = await Image.findByPk(id, {
      attributes: ['id', 'tags']
    });

    if (!image) {
      return res.status(404).json({
        status: 'error',
        message: '图片不存在'
      });
    }

    res.json({
      status: 'success',
      data: {
        id: image.id,
        tags: image.tags || []
      }
    });

  } catch (error) {
    logger.error('获取图片标签失败:', error);
    res.status(500).json({
      status: 'error',
      message: '获取图片标签失败',
      details: error.message
    });
  }
};

// 获取图片列表（用于标签管理页面）
exports.getImagesForTagging = async (req, res) => {
  try {
    const { page = 1, limit = 20, modelId, hasTags, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // 构建查询条件
    const whereCondition = {};
    
    // 标签状态筛选
    if (hasTags === 'true') {
      whereCondition.tags = {
        [Op.ne]: null,
        [Op.not]: []
      };
    } else if (hasTags === 'false') {
      whereCondition[Op.or] = [
        { tags: null },
        { tags: [] }
      ];
    }

    // 搜索条件
    if (search) {
      whereCondition[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { filename: { [Op.like]: `%${search}%` } }
      ];
    }

    // 构建include条件
    const includeCondition = [{
      model: Model,
      attributes: ['id', 'name', 'type', 'styleTags'],
      include: [{
        model: Brand,
        attributes: ['id', 'name']
      }]
    }];

    // 如果指定了车型ID
    if (modelId) {
      includeCondition[0].where = { id: modelId };
    }

    // 查询图片
    const { count, rows: images } = await Image.findAndCountAll({
      where: whereCondition,
      include: includeCondition,
      limit: parseInt(limit),
      offset: offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      status: 'success',
      data: {
        images: images.map(img => ({
          id: img.id,
          url: img.url,
          title: img.title,
          filename: img.filename,
          tags: img.tags || [],
          model: img.Model ? {
            id: img.Model.id,
            name: img.Model.name,
            type: img.Model.type,
            styleTags: img.Model.styleTags || [],
            brand: img.Model.Brand ? {
              id: img.Model.Brand.id,
              name: img.Model.Brand.name
            } : null
          } : null
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / parseInt(limit))
        }
      }
    });

  } catch (error) {
    logger.error('获取图片列表失败:', error);
    res.status(500).json({
      status: 'error',
      message: '获取图片列表失败',
      details: error.message
    });
  }
};

// 获取标签统计
exports.getTagStats = async (req, res) => {
  try {
    // 获取所有图片的标签
    const images = await Image.findAll({
      attributes: ['tags'],
      where: {
        tags: {
          [Op.ne]: null
        }
      }
    });

    // 统计标签使用频率
    const tagCounts = {};
    images.forEach(image => {
      if (image.tags && Array.isArray(image.tags)) {
        image.tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });

    // 转换为数组并排序
    const tagStats = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);

    res.json({
      status: 'success',
      data: tagStats
    });

  } catch (error) {
    logger.error('获取标签统计失败:', error);
    res.status(500).json({
      status: 'error',
      message: '获取标签统计失败',
      details: error.message
    });
  }
};

// 获取风格标签选项
exports.getStyleTagOptions = async (req, res) => {
  try {
    // 获取所有车型的风格标签
    const models = await Model.findAll({
      attributes: ['styleTags'],
      where: {
        styleTags: {
          [Op.ne]: null
        }
      }
    });

    // 收集所有风格标签
    const styleTagsSet = new Set();
    models.forEach(model => {
      if (model.styleTags && Array.isArray(model.styleTags)) {
        model.styleTags.forEach(tag => {
          if (tag && typeof tag === 'string') {
            styleTagsSet.add(tag);
          }
        });
      }
    });

    // 预设的风格标签选项
    const presetStyleTags = [
      '运动', '商务', '豪华', '时尚', '经典', '现代', '复古', '未来感',
      '简约', '复杂', '优雅', '粗犷', '精致', '实用', '个性', '大众'
    ];

    // 合并预设标签和数据库中的标签
    const allStyleTags = Array.from(new Set([...presetStyleTags, ...Array.from(styleTagsSet)]));

    res.json({
      status: 'success',
      data: {
        options: allStyleTags.sort()
      }
    });

  } catch (error) {
    logger.error('获取风格标签选项失败:', error);
    res.status(500).json({
      status: 'error',
      message: '获取风格标签选项失败',
      details: error.message
    });
  }
};