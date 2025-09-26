const { Op } = require('sequelize');
const Image = require('../models/mysql/Image');
const Tag = require('../models/mysql/Tag');
const ImageTag = require('../models/mysql/ImageTag');
const Model = require('../models/mysql/Model');

// GET /api/images/:id/tags
exports.getImageTags = async (req, res) => {
  try {
    const { id } = req.params;
    const image = await Image.findByPk(id, {
      include: [
        {
          model: Tag,
          as: 'Tags',
          through: { attributes: ['source', 'confidence', 'weight', 'addedBy', 'createdAt'] },
        },
      ],
    });
    if (!image) return res.status(404).json({ success: false, message: '图片不存在' });
    res.json({ success: true, data: image.Tags });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/images/:id/tags  { tags: [{tagId?, name?}], source?, confidence?, weight? }
exports.addTagsToImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { tags = [], source = 'manual', confidence, weight } = req.body;

    const image = await Image.findByPk(id);
    if (!image) return res.status(404).json({ success: false, message: '图片不存在' });

    if (!Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({ success: false, message: 'tags 不能为空' });
    }

    const createdTagIds = [];
    for (const t of tags) {
      let tagId = t.tagId;
      if (!tagId && t.name) {
        // 如果只提供了名称，则查找或创建
        const [tag] = await Tag.findOrCreate({
          where: { name: t.name },
          defaults: { name: t.name, type: 'manual', status: 'active' },
        });
        tagId = tag.id;
      }
      if (!tagId) continue;

      await ImageTag.upsert({
        imageId: parseInt(id),
        tagId: parseInt(tagId),
        source: t.source || source,
        confidence: t.confidence ?? confidence,
        weight: t.weight ?? weight,
        addedBy: req.user ? req.user.id : null,
        createdAt: new Date(),
      });
      createdTagIds.push(parseInt(tagId));
    }

    if (createdTagIds.length > 0) {
      await Tag.increment('popularity', { by: 1, where: { id: { [Op.in]: createdTagIds } } });
    }

    const result = await Image.findByPk(id, { include: [{ model: Tag, as: 'Tags' }] });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/images/:id/tags/:tagId
exports.removeTagFromImage = async (req, res) => {
  try {
    const { id, tagId } = req.params;
    const deleted = await ImageTag.destroy({ where: { imageId: id, tagId } });
    if (!deleted) return res.status(404).json({ success: false, message: '未找到关联' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/image-tags/images - 获取图片列表
exports.getImages = async (req, res) => {
  try {
    const { page = 1, limit = 20, hasTags, modelId, search } = req.query;
    const offset = (page - 1) * limit;
    
    const whereClause = {};
    
    // 根据是否有标签过滤
    if (hasTags !== undefined && hasTags !== '') {
      if (hasTags === 'true') {
        whereClause[Op.and] = [
          { '$Tags.id$': { [Op.ne]: null } }
        ];
      } else if (hasTags === 'false') {
        whereClause[Op.and] = [
          { '$Tags.id$': { [Op.is]: null } }
        ];
      }
    }
    
    // 根据车型ID过滤
    if (modelId) {
      whereClause.modelId = modelId;
    }
    
    // 根据搜索关键词过滤
    if (search) {
      whereClause[Op.or] = [
        { filename: { [Op.like]: `%${search}%` } },
        { '$Tags.name$': { [Op.like]: `%${search}%` } }
      ];
    }
    
    const { count, rows } = await Image.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Tag,
          as: 'Tags',
          through: { attributes: [] },
          required: hasTags === 'true' ? true : false
        },
        {
          model: Model,
          as: 'Model',
          attributes: ['id', 'name', 'brandId']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      success: true,
      data: {
        images: rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (err) {
    console.error('获取图片列表失败:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/image-tags/stats/tags - 获取标签统计
exports.getTagStats = async (req, res) => {
  try {
    const stats = await Tag.findAll({
      attributes: [
        'id',
        'name',
        'type',
        'popularity',
        [ImageTag.sequelize.fn('COUNT', ImageTag.sequelize.col('ImageTags.id')), 'usageCount']
      ],
      include: [
        {
          model: ImageTag,
          as: 'ImageTags',
          attributes: [],
          required: false
        }
      ],
      group: ['Tag.id'],
      order: [['popularity', 'DESC']],
      limit: 50
    });
    
    res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    console.error('获取标签统计失败:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/image-tags/style-tag-options - 获取风格标签选项
exports.getStyleTagOptions = async (req, res) => {
  try {
    const styleTags = await Tag.findAll({
      where: {
        type: 'style',
        status: 'active'
      },
      attributes: ['id', 'name', 'description'],
      order: [['popularity', 'DESC']]
    });
    
    res.json({
      success: true,
      data: styleTags
    });
  } catch (err) {
    console.error('获取风格标签选项失败:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
