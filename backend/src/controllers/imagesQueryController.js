const { Op } = require('sequelize');
const { Image, ImageCuration, ImageAsset } = require('../models/mysql');

// 从文件名中提取数字的辅助函数
function extractNumberFromFilename(filename) {
  if (!filename) return null;
  
  // 匹配文件名开头的数字，支持前导零
  const match = filename.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

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

    let order = [['uploadDate', 'DESC']];  // 默认按时间排序，后续在应用层进行数字排序
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

    // 按文件名中的数字进行排序（精选图片保持优先）
    const sortedRows = rows.sort((a, b) => {
      // 精选图片优先
      const aCurated = a.Curation?.isCurated || false;
      const bCurated = b.Curation?.isCurated || false;
      
      if (aCurated && !bCurated) return -1;
      if (!aCurated && bCurated) return 1;
      
      // 如果都是精选图片，按精选分数排序
      if (aCurated && bCurated) {
        const aScore = a.Curation?.curationScore || 0;
        const bScore = b.Curation?.curationScore || 0;
        if (aScore !== bScore) return bScore - aScore;
      }
      
      // 按文件名中的数字排序
      const aNum = extractNumberFromFilename(a.filename);
      const bNum = extractNumberFromFilename(b.filename);
      
      if (aNum !== null && bNum !== null) {
        return aNum - bNum; // 数字升序：01, 02, 03, ..., 37
      }
      
      // 如果无法提取数字，按文件名字母排序
      return (a.filename || '').localeCompare(b.filename || '');
    });

    res.json({
      success: true,
      data: sortedRows,
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


