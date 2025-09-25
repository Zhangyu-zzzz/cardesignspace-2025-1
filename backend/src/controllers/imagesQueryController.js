const { Op } = require('sequelize');
const { Image, ImageCuration, ImageAsset } = require('../models/mysql');

// 通用图片列表：支持 sort=default|latest|curated
exports.listImages = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      brandId,
      modelId,
      category,
      sort = 'default'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = {};
    if (modelId) where.modelId = modelId;
    if (category) where.category = category;

    const include = [
      { model: ImageAsset, as: 'Assets', required: false }
    ];

    if (sort === 'curated') {
      include.push({
        model: ImageCuration,
        as: 'Curation',
        required: false,
        where: {
          isCurated: true,
          [Op.or]: [{ validUntil: null }, { validUntil: { [Op.gt]: new Date() } }]
        }
      });
    }

    let order = [['uploadDate', 'DESC']];
    if (sort === 'latest') order = [['uploadDate', 'DESC']];
    if (sort === 'curated') {
      order = [
        [{ model: ImageCuration, as: 'Curation' }, 'isCurated', 'DESC'],
        [{ model: ImageCuration, as: 'Curation' }, 'curationScore', 'DESC'],
        ['uploadDate', 'DESC']
      ];
    }

    const { count, rows } = await Image.findAndCountAll({
      where,
      include,
      order,
      limit: parseInt(limit),
      offset
    });

    res.json({
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
    console.error('获取图片列表失败:', err);
    res.status(500).json({ success: false, message: '获取图片列表失败', error: err.message });
  }
};


