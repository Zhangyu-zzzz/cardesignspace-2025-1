const { Series, Brand, Model } = require('../models/mysql');
const logger = require('../config/logger');

// 获取所有车系
exports.getAllSeries = async (req, res) => {
  try {
    const series = await Series.findAll({
      include: [
        { model: Brand }
      ],
      order: [['name', 'ASC']]
    });
    
    res.status(200).json({
      success: true,
      count: series.length,
      data: series
    });
  } catch (error) {
    logger.error(`获取车系列表失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: '获取车系列表失败',
      error: error.message
    });
  }
};

// 获取指定品牌下的所有车系
exports.getSeriesByBrand = async (req, res) => {
  try {
    const { brandId } = req.params;
    const series = await Series.findAll({
      where: { brandId },
      include: [{ model: Brand, attributes: ['id', 'name', 'logo'] }]
    });
    res.status(200).json(series);
  } catch (error) {
    logger.error(`获取品牌下的车系失败: ${error.message}`);
    res.status(500).json({ message: '获取品牌车系列表失败', error: error.message });
  }
};

// 根据ID获取车系
exports.getSeriesById = async (req, res) => {
  try {
    const series = await Series.findByPk(req.params.id, {
      include: [
        { model: Brand },
        { model: Model }
      ]
    });
    
    if (!series) {
      return res.status(404).json({
        success: false,
        message: '未找到该车系'
      });
    }
    
    res.status(200).json({
      success: true,
      data: series
    });
  } catch (error) {
    logger.error(`获取车系详情失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: '获取车系详情失败',
      error: error.message
    });
  }
};

// 创建新车系
exports.createSeries = async (req, res) => {
  try {
    // 验证品牌是否存在
    const brand = await Brand.findByPk(req.body.brandId);
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: '未找到相关品牌'
      });
    }
    
    const series = await Series.create(req.body);
    
    res.status(201).json({
      success: true,
      message: '车系创建成功',
      data: series
    });
  } catch (error) {
    logger.error(`创建车系失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: '创建车系失败',
      error: error.message
    });
  }
};

// 更新车系
exports.updateSeries = async (req, res) => {
  try {
    const series = await Series.findByPk(req.params.id);
    
    if (!series) {
      return res.status(404).json({
        success: false,
        message: '未找到该车系'
      });
    }
    
    // 如果更新了brandId，验证品牌是否存在
    if (req.body.brandId && req.body.brandId !== series.brandId) {
      const brand = await Brand.findByPk(req.body.brandId);
      if (!brand) {
        return res.status(404).json({
          success: false,
          message: '未找到相关品牌'
        });
      }
    }
    
    await series.update(req.body);
    
    res.status(200).json({
      success: true,
      message: '车系更新成功',
      data: series
    });
  } catch (error) {
    logger.error(`更新车系失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: '更新车系失败',
      error: error.message
    });
  }
};

// 删除车系
exports.deleteSeries = async (req, res) => {
  try {
    const series = await Series.findByPk(req.params.id);
    
    if (!series) {
      return res.status(404).json({
        success: false,
        message: '未找到该车系'
      });
    }
    
    await series.destroy();
    
    res.status(200).json({
      success: true,
      message: '车系已成功删除'
    });
  } catch (error) {
    logger.error(`删除车系失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: '删除车系失败',
      error: error.message
    });
  }
};

// 获取车系下的所有车型
exports.getSeriesModels = async (req, res) => {
  try {
    const models = await Model.findAll({
      where: { seriesId: req.params.id },
      order: [['name', 'ASC']]
    });
    
    res.status(200).json({
      success: true,
      count: models.length,
      data: models
    });
  } catch (error) {
    logger.error(`获取车系车型失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: '获取车系车型失败',
      error: error.message
    });
  }
}; 