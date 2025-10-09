const Image = require('../models/mysql/Image');
const ImageCuration = require('../models/mysql/ImageCuration');
const ImageAsset = require('../models/mysql/ImageAsset');
const UserFavorite = require('../models/mysql/UserFavorite');
const { sequelize } = require('../config/mysql');
const { Op } = require('sequelize');
const { chooseBestUrl } = require('../services/assetService');

// 获取车型的图片
exports.getImagesByCarId = async (req, res, next) => {
  try {
    const { carId } = req.params;
    const { page = 1, limit = 20, category } = req.query;
    
    const offset = (page - 1) * limit;
    
    // 构建查询条件
    const whereCondition = {
      model_id: carId,
      status: 1
    };
    
    if (category) {
      whereCondition.category = category;
    }
    
    // 查询图片
    const { count, rows: images } = await Image.findAndCountAll({
      where: whereCondition,
      include: [
        {
          model: ImageCuration,
          as: 'Curation',
          required: false,
          where: {
            isCurated: true,
            [Op.or]: [
              { validUntil: null },
              { validUntil: { [Op.gt]: new Date() } }
            ]
          }
        }
      ],
      order: [
        [{ model: ImageCuration, as: 'Curation' }, 'isCurated', 'DESC'],
        [{ model: ImageCuration, as: 'Curation' }, 'curationScore', 'DESC'],
        ['created_at', 'DESC']
      ],
      limit: parseInt(limit),
      offset: offset
    });
    
    // 获取用户是否收藏信息（如果用户已登录）
    if (req.user) {
      const imageIds = images.map(image => image.image_id);
      const favorites = await UserFavorite.findAll({
        where: {
          user_id: req.user.id,
          image_id: { [Op.in]: imageIds }
        }
      });
      
      const favoriteImageIds = favorites.map(fav => fav.image_id);
      
      // 添加收藏标记
      images.forEach(image => {
        image.dataValues.is_favorite = favoriteImageIds.includes(image.image_id);
      });
    }
    
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
    next(error);
  }
};

// 获取单张图片详情
exports.getImageById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // 从MySQL获取基本信息
    const image = await Image.findByPk(id, {
      include: [
        {
          model: sequelize.models.Model,
          attributes: ['model_id', 'name', 'year'],
          include: [
            {
              model: sequelize.models.Series,
              attributes: ['series_id', 'name'],
              include: [
                {
                  model: sequelize.models.Brand,
                  attributes: ['brand_id', 'name', 'logo_url']
                }
              ]
            }
          ]
        }
      ]
    });
    
    if (!image) {
      return res.status(404).json({
        status: 'error',
        message: 'Image not found'
      });
    }
    
    // 检查用户是否收藏
    let isFavorite = false;
    if (req.user) {
      const favorite = await UserFavorite.findOne({
        where: {
          user_id: req.user.id,
          image_id: id
        }
      });
      
      isFavorite = !!favorite;
    }
    
    // 增加浏览次数
    await Image.update(
      { view_count: sequelize.literal('view_count + 1') },
      { where: { image_id: id } }
    );
    
    res.json({
      status: 'success',
      data: {
        ...image.toJSON(),
        is_favorite: isFavorite
      }
    });
  } catch (error) {
    next(error);
  }
};

// 获取高清图片URL
exports.getHDImageUrl = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // 检查是否有权限获取高清图片（登录用户或会员）
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required to access HD images'
      });
    }
    
    const image = await Image.findByPk(id);
    
    if (!image) {
      return res.status(404).json({
        status: 'error',
        message: 'Image not found'
      });
    }
    
    // 普通用户可能只能访问中等分辨率
    // 会员可以访问最高分辨率
    const isPremium = req.user.membership_level > 0;
    const url = isPremium ? image.hd_url : image.medium_url;
    
    // 记录下载历史
    await sequelize.models.UserDownload.create({
      user_id: req.user.id,
      image_id: id,
      resolution: isPremium ? 'hd' : 'medium',
      download_time: new Date()
    });
    
    res.json({
      status: 'success',
      data: {
        url,
        expires_at: Date.now() + 3600000 // 链接有效期1小时
      }
    });
  } catch (error) {
    next(error);
  }
};

// 收藏图片
exports.favoriteImage = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }
    
    // 检查图片是否存在
    const image = await Image.findByPk(id);
    
    if (!image) {
      return res.status(404).json({
        status: 'error',
        message: 'Image not found'
      });
    }
    
    // 检查是否已收藏
    const existingFavorite = await UserFavorite.findOne({
      where: {
        user_id: req.user.id,
        image_id: id
      }
    });
    
    if (existingFavorite) {
      return res.status(409).json({
        status: 'error',
        message: 'Image already in favorites'
      });
    }
    
    // 添加收藏
    await UserFavorite.create({
      user_id: req.user.id,
      image_id: id,
      favorite_time: new Date()
    });
    
    // 更新图片收藏计数
    await Image.update(
      { favorite_count: sequelize.literal('favorite_count + 1') },
      { where: { image_id: id } }
    );
    
    res.json({
      status: 'success',
      message: 'Image added to favorites'
    });
  } catch (error) {
    next(error);
  }
};

// 取消收藏
exports.unfavoriteImage = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }
    
    // 检查是否已收藏
    const favorite = await UserFavorite.findOne({
      where: {
        user_id: req.user.id,
        image_id: id
      }
    });
    
    if (!favorite) {
      return res.status(404).json({
        status: 'error',
        message: 'Image not in favorites'
      });
    }
    
    // 删除收藏
    await favorite.destroy();
    
    // 更新图片收藏计数
    await Image.update(
      { favorite_count: sequelize.literal('favorite_count - 1') },
      { 
        where: { 
          image_id: id,
          favorite_count: { [Op.gt]: 0 } // 确保不会变成负数
        } 
      }
    );
    
    res.json({
      status: 'success',
      message: 'Image removed from favorites'
    });
  } catch (error) {
    next(error);
  }
};

// 获取热门图片
exports.getPopularImages = async (req, res, next) => {
  try {
    const { limit = 20 } = req.query;
    
    // 获取热门图片（基于浏览和收藏数量）
    const images = await Image.findAll({
      where: { status: 1 },
      order: [
        [sequelize.literal('(view_count * 0.3 + favorite_count * 0.7)'), 'DESC']
      ],
      limit: parseInt(limit)
    });
    
    res.json({
      status: 'success',
      data: images
    });
  } catch (error) {
    next(error);
  }
};

// 获取车型的图片 - 新方法以匹配前端API调用
exports.getImagesByModelId = async (req, res, next) => {
  try {
    const { modelId } = req.params;
    const { page = 1, limit = 20, category } = req.query;
    
    console.log(`获取车型 ${modelId} 的图片`);
    
    const offset = (page - 1) * limit;
    
    // 构建查询条件 - 使用正确的字段名
    const whereCondition = {
      modelId: modelId,  // 使用modelId而不是model_id
      // 如果有状态字段的话
      // status: 'active'
    };
    
    if (category) {
      whereCondition.category = category;
    }
    
    // 查询图片（精选优先 + 时间顺序）
    const { count, rows: images } = await Image.findAndCountAll({
      where: whereCondition,
      order: [
        [{ model: ImageCuration, as: 'Curation' }, 'isCurated', 'DESC'],
        [{ model: ImageCuration, as: 'Curation' }, 'curationScore', 'DESC'],
        ['createdAt', 'DESC'],
        ['id', 'ASC'],
      ],
      include: [
        {
          model: ImageAsset,
          as: 'Assets',
          attributes: ['variant', 'url', 'width', 'height', 'size'],
          required: false,
        },
        {
          model: ImageCuration,
          as: 'Curation',
          required: false,
          attributes: ['isCurated', 'curationScore', 'validUntil'],
        },
      ],
      limit: parseInt(limit),
      offset: offset
    });
    
    console.log(`找到 ${images.length} 张图片`);
    
    // 输出时附加 bestUrl 字段（优先 webp，回退 jpeg）
    const items = images.map((img) => {
      const data = img.toJSON();
      const assetsMap = Array.isArray(data.Assets)
        ? data.Assets.reduce((acc, a) => {
            acc[a.variant] = a.url;
            return acc;
          }, {})
        : {};
      return { ...data, bestUrl: chooseBestUrl(assetsMap, true) || data.url };
    });

    res.json({
      success: true,
      data: items,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error(`获取车型图片失败:`, error);
    res.status(500).json({
      success: false,
      message: '获取图片失败',
      error: error.message
    });
  }
};

// 获取车型的缩略图 - 专门用于网格模式优化
exports.getThumbnailsByModelId = async (req, res, next) => {
  try {
    const { modelId } = req.params;
    const { limit = 1 } = req.query;
    
    console.log(`获取车型 ${modelId} 的缩略图`);
    
    // 构建查询条件
    const whereCondition = {
      modelId: modelId,
    };
    
    // 查询图片，只获取缩略图变体
    const { count, rows: images } = await Image.findAndCountAll({
      where: whereCondition,
      order: [
        [{ model: ImageCuration, as: 'Curation' }, 'isCurated', 'DESC'],
        [{ model: ImageCuration, as: 'Curation' }, 'curationScore', 'DESC'],
        ['createdAt', 'DESC'],
        ['id', 'ASC'],
      ],
      include: [
        {
          model: ImageAsset,
          as: 'Assets',
          attributes: ['variant', 'url', 'width', 'height', 'size'],
          where: {
            variant: 'thumb'  // 只获取缩略图变体
          },
          required: false,
        },
        {
          model: ImageCuration,
          as: 'Curation',
          required: false,
          attributes: ['isCurated', 'curationScore', 'validUntil'],
        },
      ],
      limit: parseInt(limit),
      offset: 0
    });
    
    console.log(`找到 ${images.length} 张缩略图`);
    
    // 处理缩略图数据
    const items = images.map((img) => {
      const data = img.toJSON();
      const assetsMap = Array.isArray(data.Assets)
        ? data.Assets.reduce((acc, a) => {
            acc[a.variant] = a.url;
            return acc;
          }, {})
        : {};
      
      // 优先使用缩略图，如果没有则使用原图
      const thumbnailUrl = assetsMap.thumb || data.url;
      
      return { 
        ...data, 
        thumbnailUrl,
        // 为了兼容前端现有代码，也提供 bestUrl
        bestUrl: thumbnailUrl
      };
    });

    res.json({
      success: true,
      data: items,
      count: items.length,
      total: count
    });
  } catch (error) {
    console.error('获取车型缩略图失败:', error);
    res.status(500).json({
      success: false,
      message: '获取车型缩略图失败',
      error: error.message
    });
  }
}; 