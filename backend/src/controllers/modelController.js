const { Model, Series, Brand, Image, User, ImageAsset, ImageCuration } = require('../models/mysql');
const { chooseBestUrl } = require('../services/assetService');

// 从文件名中提取数字的辅助函数
function extractNumberFromFilename(filename) {
  if (!filename) return null;
  
  // 匹配文件名开头的数字，支持前导零
  const match = filename.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}
const { Op } = require('sequelize');
const { sequelize } = require('../config/mysql');
const logger = require('../config/logger');

// 获取所有车型
exports.getAllModels = async (req, res) => {
  try {
    const { brandId, search, page = 1, limit = 20, latest = false, sortOrder = 'desc', decade, sortBy = 'year', includeImages = 'true', concept = false } = req.query;
    
    console.log(`排序参数: sortOrder=${sortOrder}, 类型: ${typeof sortOrder}`);
    console.log(`年代筛选: decade=${decade}`);
    console.log(`概念车筛选: concept=${concept}`);
    
    // 构建查询条件 - 只显示启用的车型
    const whereCondition = {
      isActive: true  // 只显示启用的车型
    };
    
    // 添加概念车筛选条件
    if (concept === 'true') {
      whereCondition.name = {
        [Op.like]: '%concept%'
      };
      console.log('筛选概念车：车型名称包含"concept"');
    }
    
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
      }
    ];
    
    // 根据includeImages参数决定是否包含图片
    if (includeImages === 'true') {
      includeConditions.push({
        model: Image, 
        as: 'Images',
        attributes: ['id', 'url', 'filename', 'title'], // 只选择需要的字段，移除category
        required: false, // 允许没有图片的车型也显示
        limit: 1, // 每个车型只获取第一张图片
        order: [['createdAt', 'ASC']] // 获取最早的图片作为缩略图
      });
    }
    
    if (brandId) {
      whereCondition.brandId = brandId;
      console.log(`按品牌ID查询车型: brandId=${brandId}`);
    }
    
    // 如果有搜索关键词，添加搜索条件
    if (search) {
      // 正确解码URL编码的中文字符
      const decodedSearch = decodeURIComponent(search);
      const searchTerm = `%${decodedSearch}%`;
      
      // 生成去除空格的搜索词，用于更灵活的匹配（如"RS7"可以匹配"RS 7"）
      const searchTermNoSpace = `%${decodedSearch.replace(/\s+/g, '')}%`;
      
      console.log(`原始搜索参数: ${search}`);
      console.log(`解码后搜索关键词: ${decodedSearch}`);
      console.log(`去除空格搜索词: ${searchTermNoSpace}`);
      
      // 先查找匹配的品牌ID（支持英文名和中文名搜索）
      // 改进：支持部分匹配，如"奥迪RS7"中的"奥迪"可以匹配到品牌
      const allBrands = await Brand.findAll({
        attributes: ['id', 'name', 'chineseName']
      });
      
      // 查找匹配的品牌（支持完整匹配和部分匹配）
      const matchingBrands = allBrands.filter(brand => {
        const brandName = (brand.name || '').toLowerCase();
        const brandChineseName = (brand.chineseName || '').toLowerCase();
        const searchLower = decodedSearch.toLowerCase();
        const searchNoSpace = searchLower.replace(/\s+/g, '');
        
        // 如果品牌名或中文名为空，跳过
        if (!brandName && !brandChineseName) return false;
        
        // 检查搜索词是否包含品牌名，或品牌名是否包含在搜索词中
        // 优先检查中文名（因为用户可能输入中文品牌名）
        if (brandChineseName && brandChineseName.length > 0) {
          if (searchLower.includes(brandChineseName) || brandChineseName.includes(searchLower)) {
            return true;
          }
          // 去除空格后匹配
          const brandChineseNoSpace = brandChineseName.replace(/\s+/g, '');
          if (searchNoSpace.includes(brandChineseNoSpace) || brandChineseNoSpace.includes(searchNoSpace)) {
            return true;
          }
        }
        
        // 检查英文名
        if (brandName && brandName.length > 0) {
          if (searchLower.includes(brandName) || brandName.includes(searchLower)) {
            return true;
          }
          // 去除空格后匹配
          const brandNameNoSpace = brandName.replace(/\s+/g, '');
          if (searchNoSpace.includes(brandNameNoSpace) || brandNameNoSpace.includes(searchNoSpace)) {
            return true;
          }
        }
        
        return false;
      });
      
      const brandIds = matchingBrands.map(brand => brand.id);
      
      // 如果找到了匹配的品牌，提取品牌名后的剩余部分作为车型搜索词
      let modelSearchTerm = decodedSearch;
      let modelSearchTermNoSpace = searchTermNoSpace;
      
      if (matchingBrands.length > 0) {
        // 尝试从搜索词中移除品牌名，获取车型部分
        // 优先使用中文名匹配（因为用户可能输入中文品牌名）
        for (const brand of matchingBrands) {
          const brandName = brand.name || '';
          const brandChineseName = brand.chineseName || '';
          
          let remaining = decodedSearch;
          
          // 优先移除中文品牌名（因为用户可能输入中文）
          if (brandChineseName && brandChineseName.length > 0 && decodedSearch.includes(brandChineseName)) {
            remaining = decodedSearch.replace(brandChineseName, '').trim();
          }
          // 如果没有中文名匹配，尝试移除英文品牌名
          else if (brandName && brandName.length > 0 && decodedSearch.toLowerCase().includes(brandName.toLowerCase())) {
            remaining = decodedSearch.replace(new RegExp(brandName, 'gi'), '').trim();
          }
          
          // 如果移除品牌名后还有内容，使用剩余部分作为车型搜索词
          if (remaining && remaining.length > 0 && remaining !== decodedSearch) {
            modelSearchTerm = remaining;
            modelSearchTermNoSpace = `%${remaining.replace(/\s+/g, '')}%`;
            console.log(`从搜索词"${decodedSearch}"中提取品牌"${brandChineseName || brandName}"，剩余车型搜索词: "${modelSearchTerm}"`);
            break; // 使用第一个匹配的品牌
          }
        }
      }
      
      console.log(`搜索关键词: ${decodedSearch}, 匹配的品牌数量: ${brandIds.length}`);
      console.log(`车型搜索词: ${modelSearchTerm}`);
      
      // 构建搜索条件：车型名称匹配（支持空格灵活匹配）或 品牌ID匹配
      const modelSearchConditions = [];
      
      // 如果有车型搜索词，添加车型名称匹配条件
      if (modelSearchTerm && modelSearchTerm.length > 0) {
        const modelTerm = `%${modelSearchTerm}%`;
        modelSearchConditions.push(
          { name: { [Op.like]: modelTerm } },
          // 使用REPLACE函数移除空格后匹配，这样"RS7"可以匹配到"RS 7"
          sequelize.where(
            sequelize.fn('REPLACE', sequelize.col('Model.name'), ' ', ''),
            { [Op.like]: modelSearchTermNoSpace }
          )
        );
      }
      
      // 如果找到了匹配的品牌，添加品牌ID条件
      if (brandIds.length > 0) {
        // 如果有车型搜索词，需要同时匹配品牌和车型
        if (modelSearchTerm && modelSearchTerm.length > 0 && modelSearchTerm !== decodedSearch) {
          // 品牌匹配 + 车型匹配（AND关系）
          // 注意：需要保留isActive条件
          const searchConditions = [
            { brandId: { [Op.in]: brandIds } },
            {
              [Op.or]: modelSearchConditions
            }
          ];
          // 合并到whereCondition，保留isActive
          whereCondition[Op.and] = [
            { isActive: true },
            ...searchConditions
          ];
          // 移除单独的isActive，因为已经在Op.and中了
          delete whereCondition.isActive;
        } else {
          // 只有品牌匹配
          whereCondition.brandId = { [Op.in]: brandIds };
        }
      } else {
        // 没有匹配的品牌，只搜索车型名称
        if (modelSearchConditions.length > 0) {
          whereCondition[Op.or] = modelSearchConditions;
        }
      }
    }
    
    // 添加分页支持
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // 对于最新车型的请求，特殊处理
    let finalModels;
    let finalCount;
    
    if (latest === 'true') {
      const sortField = sortBy === 'createdAt' ? 'createdAt' : 'year';
      console.log(`轮播图排序字段: ${sortField}, 排序方式: ${sortOrder.toUpperCase()}`);

      const { count, rows: models } = await Model.findAndCountAll({
        where: whereCondition,
        include: includeConditions,
        order: [
          [sortField, sortOrder.toUpperCase()],
          ['name', 'ASC']
        ],
        limit: parseInt(limit),
        offset,
        distinct: true
      });

      // 直接使用查询结果，避免N+1查询
      finalModels = models.map(model => model.toJSON());
      finalCount = count;

      console.log(`最新车型分页查询: 本页 ${finalModels.length} 条 / 总计 ${finalCount} 条`);
    } else {
      // 常规查询（包括按品牌筛选）- 优化查询性能
      const sortField = sortBy === 'createdAt' ? 'createdAt' : 'year';
      console.log(`常规查询排序字段: ${sortField}, 排序方式: ${sortOrder.toUpperCase()}`);
      
      const { count, rows: models } = await Model.findAndCountAll({
        where: whereCondition,
        include: includeConditions,
        order: [
          [sortField, sortOrder.toUpperCase()], // 根据sortBy参数决定排序字段
          ['name', 'ASC'] // 名称升序
        ],
        limit: parseInt(limit),
        offset: offset,
        distinct: true // 确保计数正确
      });
      
      console.log(`数据库查询结果: 找到 ${models.length} 个车型`);
      
      // 直接使用查询结果，避免N+1查询
      finalModels = models.map(model => model.toJSON());
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
          required: false
        },
        {
          model: ImageAsset,
          as: 'Assets',
          attributes: ['variant', 'url', 'width', 'height', 'size'],
          required: false
        },
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
        ['uploadDate', 'DESC']
      ]
    });

    let items = images.map((img) => {
      const data = img.toJSON();
      const assetsMap = Array.isArray(data.Assets)
        ? data.Assets.reduce((acc, a) => {
            acc[a.variant] = a.url;
            return acc;
          }, {})
        : {};
      return { ...data, bestUrl: chooseBestUrl(assetsMap, true) || data.url };
    });
    
    // 按文件名中的数字进行排序（精选图片保持优先）
    items.sort((a, b) => {
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

    res.status(200).json({
      success: true,
      count: items.length,
      data: items
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
