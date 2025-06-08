const { Model, Series, Brand, Image } = require('../models/mysql');
const { Op } = require('sequelize');
const logger = require('../config/logger');

// 获取所有车型
exports.getAllModels = async (req, res) => {
  try {
    const { brandId, search } = req.query;
    
    // 构建查询条件 - 只显示启用的车型
    const whereCondition = {
      isActive: true  // 只显示启用的车型
    };
    const includeConditions = [
      { model: Brand, as: 'Brand' },
      { model: Image, as: 'Images' }
    ];
    
    if (brandId) {
      whereCondition.brandId = brandId;
      console.log(`按品牌ID查询车型: brandId=${brandId}`);
    }
    
    // 如果有搜索关键词，添加搜索条件
    if (search) {
      // 正确解码URL编码的中文字符
      const decodedSearch = decodeURIComponent(search);
      const searchTerm = `%${decodedSearch}%`;
      
      console.log(`原始搜索参数: ${search}`);
      console.log(`解码后搜索关键词: ${decodedSearch}`);
      
      // 先查找匹配的品牌ID
      const matchingBrands = await Brand.findAll({
        where: {
          name: { [Op.like]: searchTerm }
        },
        attributes: ['id']
      });
      
      const brandIds = matchingBrands.map(brand => brand.id);
      
      // 构建搜索条件：车型名称匹配 或 品牌ID匹配
      whereCondition[Op.or] = [
        { name: { [Op.like]: searchTerm } },
        ...(brandIds.length > 0 ? [{ brandId: { [Op.in]: brandIds } }] : [])
      ];
      
      console.log(`搜索关键词: ${decodedSearch}, 匹配的品牌数量: ${brandIds.length}`);
    }
    
    // 修改关联关系，包含Brand和Images，按创建时间降序排序
    const models = await Model.findAll({
      where: whereCondition,
      include: includeConditions,
      order: [['createdAt', 'DESC'], ['name', 'ASC']]  // 优先按创建时间降序，再按名称升序
    });
    
    console.log(`查询结果: 找到 ${models.length} 个启用的车型`);
    
    res.status(200).json({
      success: true,
      count: models.length,
      data: models
    });
  } catch (error) {
    logger.error(`获取车型列表失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: '获取车型列表失败',
      error: error.message
    });
  }
};

// 根据ID获取车型
exports.getModelById = async (req, res) => {
  try {
    console.log(`获取车型详情, ID: ${req.params.id}`);
    
    // 修正关联关系，使用Brand而不是Series，并修复Image关联
    const model = await Model.findByPk(req.params.id, {
      include: [
        { model: Brand, as: 'Brand' },
        { model: Image, as: 'Images' }
      ]
    });
    
    if (!model) {
      console.log(`未找到ID为${req.params.id}的车型`);
      return res.status(404).json({
        success: false,
        message: '未找到该车型'
      });
    }
    
    console.log(`成功找到车型: ${model.name}`);
    console.log(`相关图片数量: ${model.Images ? model.Images.length : 0}`);
    
    res.status(200).json({
      success: true,
      data: model
    });
  } catch (error) {
    console.error(`获取车型详情失败: ${error.message}`);
    logger.error(`获取车型详情失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: '获取车型详情失败',
      error: error.message
    });
  }
};

// 创建新车型
exports.createModel = async (req, res) => {
  try {
    // 验证品牌是否存在（而不是车系）
    const brand = await Brand.findByPk(req.body.brandId);
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: '未找到相关品牌'
      });
    }
    
    const model = await Model.create(req.body);
    
    res.status(201).json({
      success: true,
      message: '车型创建成功',
      data: model
    });
  } catch (error) {
    logger.error(`创建车型失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: '创建车型失败',
      error: error.message
    });
  }
};

// 更新车型
exports.updateModel = async (req, res) => {
  try {
    const model = await Model.findByPk(req.params.id);
    
    if (!model) {
      return res.status(404).json({
        success: false,
        message: '未找到该车型'
      });
    }
    
    // 如果更新了brandId，验证品牌是否存在
    if (req.body.brandId && req.body.brandId !== model.brandId) {
      const brand = await Brand.findByPk(req.body.brandId);
      if (!brand) {
        return res.status(404).json({
          success: false,
          message: '未找到相关品牌'
        });
      }
    }
    
    await model.update(req.body);
    
    res.status(200).json({
      success: true,
      message: '车型更新成功',
      data: model
    });
  } catch (error) {
    logger.error(`更新车型失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: '更新车型失败',
      error: error.message
    });
  }
};

// 删除车型
exports.deleteModel = async (req, res) => {
  try {
    const model = await Model.findByPk(req.params.id);
    
    if (!model) {
      return res.status(404).json({
        success: false,
        message: '未找到该车型'
      });
    }
    
    await model.destroy();
    
    res.status(200).json({
      success: true,
      message: '车型已成功删除'
    });
  } catch (error) {
    logger.error(`删除车型失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: '删除车型失败',
      error: error.message
    });
  }
};

// 获取车型的所有图片
exports.getModelImages = async (req, res) => {
  try {
    const images = await Image.findAll({
      where: { modelId: req.params.id },
      order: [['uploadDate', 'DESC']]
    });
    
    res.status(200).json({
      success: true,
      count: images.length,
      data: images
    });
  } catch (error) {
    logger.error(`获取车型图片失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: '获取车型图片失败',
      error: error.message
    });
  }
}; 