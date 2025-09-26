const Image = require('../models/mysql/Image');
const Model = require('../models/mysql/Model');
const Brand = require('../models/mysql/Brand');
const { Op } = require('sequelize');
const { sequelize } = require('../config/mysql');
const logger = require('../../utils/logger');

// 获取需要打标签的图片列表
exports.getImagesForTagging = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      modelId,
      hasTags,
      search
    } = req.query;

    const offset = (page - 1) * limit;
    const whereCondition = {};

    // 筛选条件
    if (modelId) {
      whereCondition.modelId = modelId;
    }
    
    if (hasTags === 'true') {
      whereCondition[Op.and] = [
        { tags: { [Op.ne]: null } },
        { tags: { [Op.ne]: '[]' } },
        { tags: { [Op.ne]: [] } },
        sequelize.literal('JSON_LENGTH(tags) > 0')
      ];
    } else if (hasTags === 'false') {
      whereCondition[Op.or] = [
        { tags: null },
        { tags: '[]' },
        { tags: [] },
        sequelize.literal('JSON_LENGTH(tags) = 0 OR JSON_LENGTH(tags) IS NULL')
      ];
    }
    
    if (search) {
      whereCondition[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { filename: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: images } = await Image.findAndCountAll({
      where: whereCondition,
      include: [
        {
          model: Model,
          attributes: ['id', 'name', 'type', 'styleTags'],
          include: [{
            model: Brand,
            attributes: ['id', 'name']
          }]
        }
      ],
      order: [['uploadDate', 'DESC']],
      limit: parseInt(limit),
      offset: offset
    });

    res.json({
      status: 'success',
      data: {
        images,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
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

// 更新图片标签
exports.updateImageTags = async (req, res) => {
  try {
    const { id } = req.params;
    const { tags } = req.body;

    const image = await Image.findByPk(id);
    if (!image) {
      return res.status(404).json({
        status: 'error',
        message: '图片不存在'
      });
    }

    // 更新标签
    await image.update({ tags: tags || [] });

    res.json({
      status: 'success',
      message: '标签更新成功',
      data: image
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

// 更新车型分类
exports.updateModelType = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.body;

    const model = await Model.findByPk(id);
    if (!model) {
      return res.status(404).json({
        status: 'error',
        message: '车型不存在'
      });
    }

    // 验证车型类型
    const validTypes = ['轿车', 'SUV', 'MPV', 'WAGON', 'SHOOTINGBRAKE', '皮卡', '跑车', 'Hatchback', '其他'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        status: 'error',
        message: '无效的车型类型',
        validTypes
      });
    }

    // 获取该车型的所有图片数量
    const imageCount = await Image.count({
      where: { modelId: id }
    });

    // 更新车型类型
    await model.update({ type });

    res.json({
      status: 'success',
      message: `车型分类更新成功！该车型共有 ${imageCount} 张图片，所有图片的车型分类已同步更新。`,
      data: {
        model,
        imageCount
      }
    });

  } catch (error) {
    logger.error('更新车型分类失败:', error);
    res.status(500).json({
      status: 'error',
      message: '更新车型分类失败',
      details: error.message
    });
  }
};

// 批量更新图片标签
exports.batchUpdateImageTags = async (req, res) => {
  try {
    const { imageIds, tags } = req.body;

    if (!Array.isArray(imageIds) || imageIds.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: '请提供有效的图片ID列表'
      });
    }

    // 批量更新
    await Image.update(
      { tags: tags || [] },
      { where: { id: { [Op.in]: imageIds } } }
    );

    res.json({
      status: 'success',
      message: `成功更新 ${imageIds.length} 张图片的标签`
    });

  } catch (error) {
    logger.error('批量更新图片标签失败:', error);
    res.status(500).json({
      status: 'error',
      message: '批量更新图片标签失败',
      details: error.message
    });
  }
};

// 获取车型类型统计
exports.getModelTypeStats = async (req, res) => {
  try {
    const stats = await Model.findAll({
      attributes: [
        'type',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['type'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']]
    });

    res.json({
      status: 'success',
      data: stats
    });

  } catch (error) {
    logger.error('获取车型类型统计失败:', error);
    res.status(500).json({
      status: 'error',
      message: '获取车型类型统计失败',
      details: error.message
    });
  }
};

// 获取标签统计
exports.getTagStats = async (req, res) => {
  try {
    const images = await Image.findAll({
      attributes: ['tags'],
      where: {
        tags: { [Op.ne]: null },
        tags: { [Op.ne]: '[]' },
        tags: { [Op.ne]: [] }
      }
    });

    const tagCounts = {};
    images.forEach(image => {
      if (Array.isArray(image.tags)) {
        image.tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });

    const sortedTags = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);

    res.json({
      status: 'success',
      data: sortedTags
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

// 更新车型风格标签
exports.updateModelStyleTags = async (req, res) => {
  try {
    const { id } = req.params;
    const { styleTags } = req.body;

    const model = await Model.findByPk(id);
    if (!model) {
      return res.status(404).json({
        status: 'error',
        message: '车型不存在'
      });
    }

    // 验证风格标签格式
    if (!Array.isArray(styleTags)) {
      return res.status(400).json({
        status: 'error',
        message: '风格标签必须是数组格式'
      });
    }

    // 更新风格标签
    await model.update({ styleTags });

    res.json({
      status: 'success',
      message: '风格标签更新成功',
      data: model
    });

  } catch (error) {
    logger.error('更新风格标签失败:', error);
    res.status(500).json({
      status: 'error',
      message: '更新风格标签失败',
      details: error.message
    });
  }
};

// 批量更新车型风格标签
exports.batchUpdateModelStyleTags = async (req, res) => {
  try {
    const { modelIds, styleTags } = req.body;

    if (!Array.isArray(modelIds) || modelIds.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: '请提供有效的车型ID列表'
      });
    }

    if (!Array.isArray(styleTags)) {
      return res.status(400).json({
        status: 'error',
        message: '风格标签必须是数组格式'
      });
    }

    // 批量更新
    await Model.update(
      { styleTags },
      { where: { id: { [Op.in]: modelIds } } }
    );

    res.json({
      status: 'success',
      message: `成功更新 ${modelIds.length} 个车型的风格标签`
    });

  } catch (error) {
    logger.error('批量更新风格标签失败:', error);
    res.status(500).json({
      status: 'error',
      message: '批量更新风格标签失败',
      details: error.message
    });
  }
};

// 获取风格标签统计
exports.getStyleTagStats = async (req, res) => {
  try {
    const models = await Model.findAll({
      attributes: ['styleTags'],
      where: {
        styleTags: { [Op.ne]: null },
        styleTags: { [Op.ne]: '[]' },
        styleTags: { [Op.ne]: [] }
      }
    });

    const styleTagCounts = {};
    models.forEach(model => {
      if (Array.isArray(model.styleTags)) {
        model.styleTags.forEach(tag => {
          styleTagCounts[tag] = (styleTagCounts[tag] || 0) + 1;
        });
      }
    });

    const sortedStyleTags = Object.entries(styleTagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);

    res.json({
      status: 'success',
      data: sortedStyleTags
    });

  } catch (error) {
    logger.error('获取风格标签统计失败:', error);
    res.status(500).json({
      status: 'error',
      message: '获取风格标签统计失败',
      details: error.message
    });
  }
};

// 获取风格标签选项
exports.getStyleTagOptions = async (req, res) => {
  try {
    const styleTagOptions = {
      '外型风格': [
        '流线型 (Streamline)',
        '泪滴型 (Tear-drop)',
        '尾鳍设计 (Tailfin)',
        '艺术装饰 (Art Deco)',
        '肌肉车 (Muscle Car)',
        '欧洲优雅风 (European Elegance)',
        '楔形设计 (Wedge Shape)',
        '方正功能主义 (Boxy Utilitarian)',
        '新边缘设计 (New Edge)',
        '有机设计 (Organic Design)',
        '雕塑感曲面 (Sculptural Surfaces)',
        '复古未来主义 (Retro-futurism)',
        '纯净极简 (Pure Design / Minimalism)',
        '越野风格 (Off-road)',
        '低趴改装 (Lowrider)',
        '未来主义 (Futurism)',
        '太空时代 (Space Age)'
      ],
      '内饰风格': [
        '艺术装饰 (Art Deco)',
        '镀铬风 (Chrome Accents)',
        '怀旧复古 (Retro Classic)',
        '运动座舱 (Sporty)',
        '极简主义 (Minimalist)',
        '高级简约风 (Premium Simplicity)',
        '奢华定制 (Bespoke Luxury)',
        '新豪华主义 (New Luxury)',
        '太空舱设计 (Space Capsule)',
        '波普艺术 (Pop Art)',
        '家居化 (Homing)',
        '科技感 (Tech-focused)'
      ]
    };

    res.json({
      status: 'success',
      data: styleTagOptions
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
