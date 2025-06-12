const { Op } = require('sequelize');
const mongoose = require('mongoose');
const Brand = require('../models/mysql/Brand');
const Series = require('../models/mysql/Series');
const Model = require('../models/mysql/Model');
const Image = require('../models/mysql/Image');
const HotSearch = require('../models/mongodb/HotSearch');

// 通用搜索功能
exports.search = async (req, res, next) => {
  try {
    const { q, type, page = 1, limit = 20 } = req.query;
    
    if (!q) {
      return res.status(400).json({
        status: 'error',
        message: 'Search query is required'
      });
    }
    
    const offset = (page - 1) * limit;
    let results = {};
    
    // 记录热搜
    await recordSearch(q);
    
    // 根据类型执行不同的搜索
    if (!type || type === 'all') {
      // 搜索所有内容
      const [brands, series, models, images] = await Promise.all([
        searchBrands(q, 5),
        searchSeries(q, 5),
        searchModels(q, 10),
        searchImages(q, parseInt(limit), offset)
      ]);
      
      results = {
        brands,
        series,
        models,
        images: images.data,
        pagination: images.pagination
      };
    } else if (type === 'brands') {
      // 只搜索品牌
      results = await searchBrands(q, parseInt(limit), offset);
    } else if (type === 'series') {
      // 只搜索车系
      results = await searchSeries(q, parseInt(limit), offset);
    } else if (type === 'models') {
      // 只搜索车型
      results = await searchModels(q, parseInt(limit), offset);
    } else if (type === 'images') {
      // 只搜索图片
      results = await searchImages(q, parseInt(limit), offset);
      results = results.data;
    }
    
    res.json({
      status: 'success',
      data: results
    });
  } catch (error) {
    next(error);
  }
};

// 获取热门搜索
exports.getHotSearches = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;
    
    const hotSearches = await HotSearch.find()
      .sort({ count: -1, last_search_time: -1 })
      .limit(parseInt(limit));
    
    res.json({
      status: 'success',
      data: hotSearches
    });
  } catch (error) {
    next(error);
  }
};

// 搜索品牌
async function searchBrands(query, limit, offset = 0) {
  const { count, rows } = await Brand.findAndCountAll({
    where: {
      [Op.or]: [
        { name: { [Op.like]: `%${query}%` } },
        { alias: { [Op.like]: `%${query}%` } }
      ],
      status: 1
    },
    order: [['sort_order', 'DESC']],
    limit,
    offset
  });
  
  return {
    data: rows,
    pagination: {
      total: count,
      page: offset ? Math.floor(offset / limit) + 1 : 1,
      limit
    }
  };
}

// 搜索车系
async function searchSeries(query, limit, offset = 0) {
  const { count, rows } = await Series.findAndCountAll({
    where: {
      [Op.or]: [
        { name: { [Op.like]: `%${query}%` } },
        { alias: { [Op.like]: `%${query}%` } }
      ],
      status: 1
    },
    include: [
      {
        model: Brand,
        attributes: ['brand_id', 'name', 'logo_url']
      }
    ],
    order: [['sort_order', 'DESC']],
    limit,
    offset
  });
  
  return {
    data: rows,
    pagination: {
      total: count,
      page: offset ? Math.floor(offset / limit) + 1 : 1,
      limit
    }
  };
}

// 搜索车型
async function searchModels(query, limit, offset = 0) {
  const { count, rows } = await Model.findAndCountAll({
    where: {
      [Op.or]: [
        { name: { [Op.like]: `%${query}%` } },
        { alias: { [Op.like]: `%${query}%` } }
      ],
      status: 1
    },
    include: [
      {
        model: Series,
        attributes: ['series_id', 'name'],
        include: [
          {
            model: Brand,
            attributes: ['brand_id', 'name', 'logo_url']
          }
        ]
      }
    ],
    order: [['release_date', 'DESC']],
    limit,
    offset
  });
  
  return {
    data: rows,
    pagination: {
      total: count,
      page: offset ? Math.floor(offset / limit) + 1 : 1,
      limit
    }
  };
}

// 搜索图片
async function searchImages(query, limit, offset = 0) {
  // 首先找出匹配查询的所有车型ID
  const models = await Model.findAll({
    attributes: ['model_id'],
    where: {
      [Op.or]: [
        { name: { [Op.like]: `%${query}%` } },
        { alias: { [Op.like]: `%${query}%` } }
      ],
      status: 1
    }
  });
  
  const modelIds = models.map(model => model.model_id);
  
  // 然后找出匹配的车系ID
  const series = await Series.findAll({
    attributes: ['series_id'],
    where: {
      [Op.or]: [
        { name: { [Op.like]: `%${query}%` } },
        { alias: { [Op.like]: `%${query}%` } }
      ],
      status: 1
    }
  });
  
  // 找出这些车系下的所有车型ID
  if (series.length > 0) {
    const seriesIds = series.map(s => s.series_id);
    const seriesModels = await Model.findAll({
      attributes: ['model_id'],
      where: {
        series_id: { [Op.in]: seriesIds },
        status: 1
      }
    });
    
    seriesModels.forEach(model => {
      if (!modelIds.includes(model.model_id)) {
        modelIds.push(model.model_id);
      }
    });
  }
  
  // 最后找出品牌ID
  const brands = await Brand.findAll({
    attributes: ['brand_id'],
    where: {
      [Op.or]: [
        { name: { [Op.like]: `%${query}%` } },
        { alias: { [Op.like]: `%${query}%` } }
      ],
      status: 1
    }
  });
  
  // 找出这些品牌下的所有车系
  if (brands.length > 0) {
    const brandIds = brands.map(b => b.brand_id);
    const brandSeries = await Series.findAll({
      attributes: ['series_id'],
      where: {
        brand_id: { [Op.in]: brandIds },
        status: 1
      }
    });
    
    const brandSeriesIds = brandSeries.map(s => s.series_id);
    
    // 找出这些车系下的所有车型
    if (brandSeriesIds.length > 0) {
      const brandModels = await Model.findAll({
        attributes: ['model_id'],
        where: {
          series_id: { [Op.in]: brandSeriesIds },
          status: 1
        }
      });
      
      brandModels.forEach(model => {
        if (!modelIds.includes(model.model_id)) {
          modelIds.push(model.model_id);
        }
      });
    }
  }
  
  // 构建查询条件
  let whereCondition = { status: 1 };
  
  // 如果有车型ID，添加到查询条件
  if (modelIds.length > 0) {
    whereCondition.model_id = { [Op.in]: modelIds };
  } else {
    // 如果没有找到相关车型，则直接搜索图片标题和描述
    whereCondition = {
      ...whereCondition,
      [Op.or]: [
        { title: { [Op.like]: `%${query}%` } },
        { description: { [Op.like]: `%${query}%` } }
      ]
    };
  }
  
  // 查询图片
  const { count, rows } = await Image.findAndCountAll({
    where: whereCondition,
    order: [['sort_order', 'DESC'], ['created_at', 'DESC']],
    limit,
    offset
  });
  
  return {
    data: rows,
    pagination: {
      total: count,
      page: offset ? Math.floor(offset / limit) + 1 : 1,
      limit,
      pages: Math.ceil(count / limit)
    }
  };
}

// 记录搜索词
async function recordSearch(query) {
  try {
    // 清理搜索词
    const cleanQuery = query.trim().toLowerCase();
    
    // 忽略太短的搜索词
    if (cleanQuery.length < 2) return;
    
    // 更新或创建搜索记录
    await HotSearch.findOneAndUpdate(
      { keyword: cleanQuery },
      { 
        $inc: { count: 1 },
        $set: { last_search_time: new Date() }
      },
      { upsert: true }
    );
  } catch (error) {
    console.error('Error recording search:', error);
  }
} 