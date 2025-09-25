const { Op } = require('sequelize');
const Image = require('../models/mysql/Image');
const Tag = require('../models/mysql/Tag');
const ImageTag = require('../models/mysql/ImageTag');

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
