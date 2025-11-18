const { Op } = require('sequelize');
const { Brand, Series, Model, Image } = require('../models/mysql');
const logger = require('../config/logger');

// 通用搜索功能
exports.search = async (req, res, next) => {
  try {
    const { q, type, page = 1, limit = 20 } = req.query;
    
    logger.info(`搜索请求: q=${q}, type=${type}, page=${page}, limit=${limit}`);
    logger.info(`请求来源: ${req.headers['user-agent'] || 'unknown'}`);
    logger.info(`请求IP: ${req.ip || req.connection.remoteAddress}`);
    logger.info(`请求头: ${JSON.stringify(req.headers)}`);
    
    if (!q || !q.trim()) {
      logger.warn('搜索请求缺少查询参数');
      return res.status(400).json({
        status: 'error',
        message: 'Search query is required'
      });
    }
    
    const query = q.trim();
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let results = {};
    
    logger.info(`开始搜索: query="${query}", offset=${offset}, limit=${limit}`);
    
    // 根据类型执行不同的搜索
    if (!type || type === 'all') {
      // 搜索所有内容 - 使用串行执行避免并发问题
      logger.info('执行全量搜索');
      
      let brandsResult, seriesResult, modelsResult, imagesResult;
      
      try {
        brandsResult = await searchBrands(query, 5, 0);
      } catch (err) {
        logger.error('搜索品牌失败:', err.message);
        logger.error('错误堆栈:', err.stack);
        brandsResult = { data: [], pagination: { total: 0, page: 1, limit: 5 } };
      }
      
      try {
        seriesResult = await searchSeries(query, 5, 0);
      } catch (err) {
        logger.error('搜索车系失败:', err.message);
        logger.error('错误堆栈:', err.stack);
        seriesResult = { data: [], pagination: { total: 0, page: 1, limit: 5 } };
      }
      
      try {
        modelsResult = await searchModels(query, 10, 0);
      } catch (err) {
        logger.error('搜索车型失败:', err.message);
        logger.error('错误堆栈:', err.stack);
        modelsResult = { data: [], pagination: { total: 0, page: 1, limit: 10 } };
      }
      
      try {
        imagesResult = await searchImages(query, parseInt(limit), offset);
      } catch (err) {
        logger.error('搜索图片失败:', err.message);
        logger.error('错误堆栈:', err.stack);
        imagesResult = { data: [], pagination: { total: 0, page: 1, limit: parseInt(limit), pages: 0 } };
      }
      
      results = {
        brands: Array.isArray(brandsResult?.data) ? brandsResult.data : [],
        series: Array.isArray(seriesResult?.data) ? seriesResult.data : [],
        models: Array.isArray(modelsResult?.data) ? modelsResult.data : [],
        images: Array.isArray(imagesResult?.data) ? imagesResult.data : [],
        pagination: imagesResult?.pagination || {}
      };
    } else if (type === 'brands') {
      // 只搜索品牌
      try {
        results = await searchBrands(query, parseInt(limit), offset);
      } catch (err) {
        logger.error('搜索品牌失败:', err);
        return res.status(500).json({
          status: 'error',
          message: '搜索品牌失败',
          error: process.env.NODE_ENV === 'development' ? err.message : '服务器内部错误'
        });
      }
    } else if (type === 'series') {
      // 只搜索车系
      try {
        results = await searchSeries(query, parseInt(limit), offset);
      } catch (err) {
        logger.error('搜索车系失败:', err);
        return res.status(500).json({
          status: 'error',
          message: '搜索车系失败',
          error: process.env.NODE_ENV === 'development' ? err.message : '服务器内部错误'
        });
      }
    } else if (type === 'models') {
      // 只搜索车型
      try {
        results = await searchModels(query, parseInt(limit), offset);
      } catch (err) {
        logger.error('搜索车型失败:', err);
        return res.status(500).json({
          status: 'error',
          message: '搜索车型失败',
          error: process.env.NODE_ENV === 'development' ? err.message : '服务器内部错误'
        });
      }
    } else if (type === 'images') {
      // 只搜索图片
      try {
        const imageResult = await searchImages(query, parseInt(limit), offset);
        results = imageResult.data || imageResult;
      } catch (err) {
        logger.error('搜索图片失败:', err);
        return res.status(500).json({
          status: 'error',
          message: '搜索图片失败',
          error: process.env.NODE_ENV === 'development' ? err.message : '服务器内部错误'
        });
      }
    }
    
    logger.info(`搜索完成: 品牌${results.brands?.length || 0}个, 车型${results.models?.length || 0}个, 图片${results.images?.length || 0}个`);
    
    // 确保返回的数据格式正确
    const response = {
      status: 'success',
      data: results
    };
    
    logger.info('返回搜索结果');
    return res.json(response);
  } catch (error) {
    // 捕获所有可能的错误
    logger.error('搜索控制器发生未捕获的错误:', error);
    logger.error('错误名称:', error.name);
    logger.error('错误消息:', error.message);
    logger.error('错误堆栈:', error.stack);
    
    // 确保返回错误响应，而不是抛出错误
    if (!res.headersSent) {
      return res.status(500).json({
        status: 'error',
        message: '搜索失败',
        error: process.env.NODE_ENV === 'development' ? error.message : '服务器内部错误'
      });
    }
  }
};

// 搜索品牌
async function searchBrands(query, limit, offset = 0) {
  try {
    const { count, rows } = await Brand.findAndCountAll({
      where: {
        [Op.or]: [
          { name: { [Op.like]: `%${query}%` } },
          { chineseName: { [Op.like]: `%${query}%` } }
        ]
      },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    return {
      data: rows || [],
      pagination: {
        total: count || 0,
        page: offset ? Math.floor(offset / limit) + 1 : 1,
        limit: parseInt(limit)
      }
    };
  } catch (error) {
    logger.error('searchBrands 函数错误:', error);
    throw error;
  }
}

// 搜索车系
async function searchSeries(query, limit, offset = 0) {
  try {
    const { count, rows } = await Series.findAndCountAll({
    where: {
      name: { [Op.like]: `%${query}%` }
    },
    include: [
      {
        model: Brand,
        as: 'Brand',
        attributes: ['id', 'name', 'logo'],
        required: false
      }
    ],
    order: [['createdAt', 'DESC']],
    limit: parseInt(limit),
    offset: parseInt(offset),
    distinct: true
  });
  
  return {
    data: rows || [],
    pagination: {
      total: count || 0,
      page: offset ? Math.floor(offset / limit) + 1 : 1,
      limit: parseInt(limit)
    }
  };
  } catch (error) {
    logger.error('searchSeries 函数错误:', error);
    throw error;
  }
}

// 搜索车型
async function searchModels(query, limit, offset = 0) {
  try {
    const { count, rows } = await Model.findAndCountAll({
    where: {
      name: { [Op.like]: `%${query}%` },
      isActive: true
    },
    include: [
      {
        model: Brand,
        as: 'Brand',
        attributes: ['id', 'name', 'logo'],
        required: false
      }
    ],
    order: [
      ['year', 'DESC'],
      ['createdAt', 'DESC']
    ],
    limit: parseInt(limit),
    offset: parseInt(offset),
    distinct: true
  });
  
  return {
    data: rows || [],
    pagination: {
      total: count || 0,
      page: offset ? Math.floor(offset / limit) + 1 : 1,
      limit: parseInt(limit)
    }
  };
  } catch (error) {
    logger.error('searchModels 函数错误:', error);
    throw error;
  }
}

// 搜索图片
async function searchImages(query, limit, offset = 0) {
  try {
    // 首先找出匹配查询的所有车型ID
    const models = await Model.findAll({
    attributes: ['id'],
    where: {
      name: { [Op.like]: `%${query}%` },
      isActive: true
    },
    limit: 100 // 限制最多100个车型
  });
  
  let modelIds = models.map(model => model.id);
  
  // 然后找出匹配的品牌ID，再找出这些品牌下的所有车型
  const brands = await Brand.findAll({
    attributes: ['id'],
    where: {
      [Op.or]: [
        { name: { [Op.like]: `%${query}%` } },
        { chineseName: { [Op.like]: `%${query}%` } }
      ]
    },
    limit: 50 // 限制最多50个品牌
  });
  
  // 找出这些品牌下的所有车型
  if (brands.length > 0) {
    const brandIds = brands.map(b => b.id);
    const brandModels = await Model.findAll({
      attributes: ['id'],
      where: {
        brandId: { [Op.in]: brandIds },
        isActive: true
      },
      limit: 200 // 限制最多200个车型
    });
    
    brandModels.forEach(model => {
      if (!modelIds.includes(model.id)) {
        modelIds.push(model.id);
      }
    });
  }
  
  // 构建查询条件
  let whereCondition = {};
  
  // 如果有车型ID，添加到查询条件
  if (modelIds.length > 0) {
    whereCondition.modelId = { [Op.in]: modelIds };
  } else {
    // 如果没有找到相关车型，则直接搜索图片标题和描述
    whereCondition = {
      [Op.or]: [
        { title: { [Op.like]: `%${query}%` } },
        { description: { [Op.like]: `%${query}%` } }
      ]
    };
  }
  
  // 查询图片
  const { count, rows } = await Image.findAndCountAll({
    where: whereCondition,
    order: [
      ['sortOrder', 'DESC'],
      ['createdAt', 'DESC']
    ],
    limit: parseInt(limit),
    offset: parseInt(offset)
  });
  
  return {
    data: rows || [],
    pagination: {
      total: count || 0,
      page: offset ? Math.floor(offset / limit) + 1 : 1,
      limit: parseInt(limit),
      pages: Math.ceil((count || 0) / parseInt(limit))
    }
  };
  } catch (error) {
    logger.error('searchImages 函数错误:', error);
    throw error;
  }
}

// 获取热门搜索
exports.getHotSearches = async (req, res, next) => {
  try {
    // 返回一些热门搜索关键词
    const hotSearches = [
      '宝马', '奔驰', '奥迪', '丰田', '本田', '大众', '福特', '现代',
      'SUV', '轿车', '跑车', '新能源', '电动车', '混动', '豪华车', '家用车'
    ];
    
    res.json({
      status: 'success',
      data: hotSearches
    });
  } catch (error) {
    next(error);
  }
};
