const { Model, Series, Brand, Image, User } = require('../models/mysql');
const { Op } = require('sequelize');
const { sequelize } = require('../config/mysql');
const logger = require('../config/logger');

// 获取所有车型
exports.getAllModels = async (req, res) => {
  try {
    const { brandId, search, page = 1, limit = 20, latest = false, sortOrder = 'desc', decade, sortBy = 'year' } = req.query;
    
    console.log(`排序参数: sortOrder=${sortOrder}, 类型: ${typeof sortOrder}`);
    console.log(`年代筛选: decade=${decade}`);
    
    // 构建查询条件 - 只显示启用的车型
    const whereCondition = {
      isActive: true  // 只显示启用的车型
    };
    
    // 添加年代筛选条件
    if (decade) {
      const decadeMap = {
        '1900s': [1900, 1909],
        '1910s': [1910, 1919],
        '1920s': [1920, 1929],
        '1930s': [1930, 1939],
        '1940s': [1940, 1949],
        '1950s': [1950, 1959],
        '1960s': [1960, 1969],
        '1970s': [1970, 1979],
        '1980s': [1980, 1989],
        '1990s': [1990, 1999],
        '2000s': [2000, 2009],
        '2010s': [2010, 2019],
        '2020s': [2020, 2029]
      };
      
      if (decadeMap[decade]) {
        const [startYear, endYear] = decadeMap[decade];
        whereCondition.year = {
          [Op.between]: [startYear, endYear]
        };
        console.log(`年代筛选: ${decade} (${startYear}-${endYear})`);
      }
    }
    
    // 如果是首页请求最新车型，优化查询
    if (latest === 'true') {
      console.log('获取最新车型数据，使用分页查询');
    }
    
    const includeConditions = [
      { 
        model: Brand, 
        as: 'Brand',
        attributes: ['id', 'name', 'logo', 'country'] // 只选择需要的字段
      },
      { 
        model: Image, 
        as: 'Images',
        attributes: ['id', 'url', 'filename', 'title'], // 只选择需要的字段，移除category
        required: false, // 允许没有图片的车型也显示
        limit: 1, // 每个车型只获取第一张图片
        order: [['createdAt', 'ASC']] // 获取最早的图片作为缩略图
      }
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
    
    // 添加分页支持
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // 对于最新车型的请求，特殊处理
    let finalModels;
    let finalCount;
    
    if (latest === 'true') {
      // 获取所有启用的车型进行排序
      const sortField = sortBy === 'createdAt' ? 'createdAt' : 'year';
      console.log(`轮播图排序字段: ${sortField}, 排序方式: ${sortOrder.toUpperCase()}`);
      
      const allModels = await Model.findAll({
        where: whereCondition,
        include: [
          { 
            model: Brand, 
            as: 'Brand',
            attributes: ['id', 'name', 'logo', 'country']
          }
        ],
        order: [[sortField, sortOrder.toUpperCase()], ['name', 'ASC']] // 根据sortBy参数决定排序字段
      });
      
      // 手动分页
      finalCount = allModels.length;
      const paginatedModels = allModels.slice(offset, offset + parseInt(limit));
      
      console.log(`最新车型查询: 总计 ${finalCount} 个，排序方式: ${sortOrder.toUpperCase()}`);
      
      // 为每个车型添加第一张图片
      finalModels = await Promise.all(paginatedModels.map(async (model) => {
        const firstImage = await Image.findOne({
          where: { modelId: model.id },
          attributes: ['id', 'url', 'filename', 'title'],
          order: [['createdAt', 'ASC']]
        });
        
        // 转换为普通对象并添加图片
        const modelData = model.toJSON();
        modelData.Images = firstImage ? [firstImage] : [];
        
        return modelData;
      }));
      
      console.log(`最新车型排序完成: 总计 ${finalCount} 个，当前页 ${finalModels.length} 个`);
    } else {
      // 常规查询（包括按品牌筛选）
      const sortField = sortBy === 'createdAt' ? 'createdAt' : 'year';
      console.log(`常规查询排序字段: ${sortField}, 排序方式: ${sortOrder.toUpperCase()}`);
      
      const { count, rows: models } = await Model.findAndCountAll({
        where: whereCondition,
        include: [
          { 
            model: Brand, 
            as: 'Brand',
            attributes: ['id', 'name', 'logo', 'country']
          }
        ],
        order: [
          [sortField, sortOrder.toUpperCase()], // 根据sortBy参数决定排序字段
          ['name', 'ASC'] // 名称升序
        ],
        limit: parseInt(limit),
        offset: offset,
        distinct: true // 确保计数正确
      });
      
      console.log(`数据库查询结果: 找到 ${models.length} 个车型`);
      
      // 为每个车型添加第一张图片
      const modelsWithImages = await Promise.all(models.map(async (model) => {
        const firstImage = await Image.findOne({
          where: { modelId: model.id },
          attributes: ['id', 'url', 'filename', 'title'],
          order: [['createdAt', 'ASC']]
        });
        
        // 转换为普通对象并添加图片
        const modelData = model.toJSON();
        modelData.Images = firstImage ? [firstImage] : [];
        
        return modelData;
      }));
      
      finalModels = modelsWithImages;
      finalCount = count;
    }
    
    console.log(`查询结果: 找到 ${finalModels.length} 个启用的车型, 总计 ${finalCount} 个`);
    
    res.status(200).json({
      success: true,
      count: finalModels.length,
      total: finalCount,
      page: parseInt(page),
      totalPages: Math.ceil(finalCount / parseInt(limit)),
      data: finalModels
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
        { 
          model: Image, 
          as: 'Images',
          include: [
            {
              model: User,
              attributes: ['id', 'username', 'avatar'],
              required: false
            }
          ]
        }
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
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'avatar'],
          required: false // 允许没有关联用户的图片
        }
      ],
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