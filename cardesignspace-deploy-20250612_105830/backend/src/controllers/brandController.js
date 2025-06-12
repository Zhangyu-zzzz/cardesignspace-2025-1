const { Brand, Series, Model } = require('../models/mysql');
const logger = require('../config/logger');

// 获取所有品牌
exports.getAllBrands = async (req, res) => {
  try {
    // 强制查询数据库获取最新数据
    const brands = await Brand.findAll({
      order: [['name', 'ASC']]
    });
    
    // 设置防缓存头
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    res.status(200).json({
      success: true,
      count: brands.length,
      data: brands
    });
  } catch (error) {
    logger.error(`获取品牌列表失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: '获取品牌列表失败',
      error: error.message
    });
  }
};

// 获取单个品牌详情
exports.getBrandById = async (req, res) => {
  try {
    const brand = await Brand.findByPk(req.params.id, {
      include: [{
        model: Series,
        as: 'Series',
        required: false
      }]
    });
    
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: '未找到该品牌'
      });
    }
    
    res.status(200).json({
      success: true,
      data: brand
    });
  } catch (error) {
    logger.error(`获取品牌详情失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: '获取品牌详情失败',
      error: error.message
    });
  }
};

// 创建新品牌
exports.createBrand = async (req, res) => {
  try {
    const brand = await Brand.create(req.body);
    
    res.status(201).json({
      success: true,
      message: '品牌创建成功',
      data: brand
    });
  } catch (error) {
    logger.error(`创建品牌失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: '创建品牌失败',
      error: error.message
    });
  }
};

// 更新品牌
exports.updateBrand = async (req, res) => {
  try {
    const brand = await Brand.findByPk(req.params.id);
    
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: '未找到该品牌'
      });
    }
    
    await brand.update(req.body);
    
    res.status(200).json({
      success: true,
      message: '品牌更新成功',
      data: brand
    });
  } catch (error) {
    logger.error(`更新品牌失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: '更新品牌失败',
      error: error.message
    });
  }
};

// 删除品牌
exports.deleteBrand = async (req, res) => {
  try {
    const brand = await Brand.findByPk(req.params.id);
    
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: '未找到该品牌'
      });
    }
    
    await brand.destroy();
    
    res.status(200).json({
      success: true,
      message: '品牌已成功删除'
    });
  } catch (error) {
    logger.error(`删除品牌失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: '删除品牌失败',
      error: error.message
    });
  }
};

// 获取品牌下的所有车系
exports.getBrandSeries = async (req, res) => {
  try {
    const series = await Series.findAll({
      where: { brandId: req.params.id },
      order: [['year', 'DESC'], ['name', 'ASC']]
    });
    
    res.status(200).json({
      success: true,
      count: series.length,
      data: series
    });
  } catch (error) {
    logger.error(`获取品牌车系失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: '获取品牌车系失败',
      error: error.message
    });
  }
};

// 获取热门品牌
exports.getPopularBrands = async (req, res) => {
  try {
    const brands = await Brand.findAll({
      where: { 
        popular: true 
      },
      order: [['name', 'ASC']],
      limit: 10
    });
    
    res.status(200).json({
      success: true,
      count: brands.length,
      data: brands
    });
  } catch (error) {
    logger.error(`获取热门品牌失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: '获取热门品牌失败',
      error: error.message
    });
  }
};