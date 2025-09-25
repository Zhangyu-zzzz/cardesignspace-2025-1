const { Op } = require('sequelize');
const { Tag, ImageTag, Image } = require('../models/mysql');

// GET /api/tags?category=&q=&limit=
exports.listTags = async (req, res) => {
  try {
    const { category, q, limit = 50 } = req.query;
    const where = { status: 'active' };
    if (category) where.category = category;
    if (q) where.name = { [Op.like]: `%${q}%` };

    const tags = await Tag.findAll({
      where,
      order: [['popularity', 'DESC'], ['name', 'ASC']],
      limit: parseInt(limit),
    });
    res.json({ success: true, data: tags });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 为图片追加标签
exports.addTagsToImage = async (req, res) => {
  try {
    const { id } = req.params; // imageId
    const { tags = [], source = 'manual', confidence = null, weight = null } = req.body;
    const image = await Image.findByPk(id);
    if (!image) return res.status(404).json({ success: false, message: '图片不存在' });
    for (const name of tags) {
      if (!name || typeof name !== 'string') continue;
      const [tag] = await Tag.findOrCreate({ where: { name: name.trim() }, defaults: { type: source } });
      await ImageTag.upsert({ imageId: image.id, tagId: tag.id, source, confidence, weight, addedBy: req.user ? req.user.id : null });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 从图片移除标签
exports.removeTagFromImage = async (req, res) => {
  try {
    const { id, tagId } = req.params;
    await ImageTag.destroy({ where: { imageId: id, tagId } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/tags  { name, category?, type?, parentId?, synonyms?, lang?, status? }
exports.createTag = async (req, res) => {
  try {
    const { name, category, type, parentId, synonyms, lang, status } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'name 必填' });
    const tag = await Tag.create({ name, category, type, parentId, synonyms, lang, status });
    res.json({ success: true, data: tag });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/tags/:id
exports.updateTag = async (req, res) => {
  try {
    const { id } = req.params;
    const tag = await Tag.findByPk(id);
    if (!tag) return res.status(404).json({ success: false, message: 'Tag 不存在' });
    await tag.update(req.body);
    res.json({ success: true, data: tag });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/tags/:id 软删除为 disabled
exports.deleteTag = async (req, res) => {
  try {
    const { id } = req.params;
    const tag = await Tag.findByPk(id);
    if (!tag) return res.status(404).json({ success: false, message: 'Tag 不存在' });
    await tag.update({ status: 'disabled' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


