const { Image, ImageCuration } = require('../models/mysql');
const { Op } = require('sequelize');

// 设置或更新精选
exports.setCuration = async (req, res) => {
  try {
    const imageId = parseInt(req.params.id);
    const { is_curated, curation_score = 0, reason = '', valid_until = null } = req.body;

    const image = await Image.findByPk(imageId);
    if (!image) {
      return res.status(404).json({ success: false, message: '图片不存在' });
    }

    const [curation, created] = await ImageCuration.findOrCreate({
      where: { imageId },
      defaults: {
        imageId,
        isCurated: !!is_curated,
        curationScore: Number(curation_score) || 0,
        curator: req.user?.username || 'system',
        reason: reason || '',
        validUntil: valid_until ? new Date(valid_until) : null
      }
    });

    if (!created) {
      curation.isCurated = !!is_curated;
      curation.curationScore = Number(curation_score) || 0;
      curation.reason = reason || '';
      curation.validUntil = valid_until ? new Date(valid_until) : null;
      curation.curator = req.user?.username || curation.curator || 'system';
      await curation.save();
    }

    return res.json({ success: true, data: curation });
  } catch (err) {
    console.error('设置精选失败:', err);
    return res.status(500).json({ success: false, message: '设置精选失败', error: err.message });
  }
};

// 取消精选
exports.deleteCuration = async (req, res) => {
  try {
    const imageId = parseInt(req.params.id);
    const curation = await ImageCuration.findOne({ where: { imageId } });
    if (!curation) {
      return res.status(404).json({ success: false, message: '未找到精选记录' });
    }
    await curation.destroy();
    return res.json({ success: true, message: '已取消精选' });
  } catch (err) {
    console.error('取消精选失败:', err);
    return res.status(500).json({ success: false, message: '取消精选失败', error: err.message });
  }
};

// 获取精选列表
exports.getCurations = async (req, res) => {
  try {
    const { page = 1, limit = 20, order = 'score_desc', expire = 'active' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where = { isCurated: true };
    const now = new Date();
    if (expire === 'active') {
      where[Op.or] = [{ validUntil: null }, { validUntil: { [Op.gt]: now } }];
    } else if (expire === 'expired') {
      where.validUntil = { [Op.lte]: now };
    }

    let orderBy = [['updatedAt', 'DESC']];
    if (order === 'score_desc') orderBy = [['curationScore', 'DESC']];
    if (order === 'score_asc') orderBy = [['curationScore', 'ASC']];

    const { count, rows } = await ImageCuration.findAndCountAll({
      where,
      include: [{ model: Image, as: 'Image' }],
      order: orderBy,
      limit: parseInt(limit),
      offset
    });

    return res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('获取精选列表失败:', err);
    return res.status(500).json({ success: false, message: '获取精选列表失败', error: err.message });
  }
};


