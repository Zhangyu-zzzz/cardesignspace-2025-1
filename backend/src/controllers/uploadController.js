const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const { uploadToCOS, generateUploadPath, deleteFromCOS } = require('../config/cos');
const authController = require('./authController');
const activityService = require('../services/activityService');
const { generateAndSaveAssets, chooseBestUrl } = require('../services/assetService');
const logger = require('../config/logger');

// 导入模型并确保关联关系
const { Brand, Model, Image, ArticleImage } = require('../models/mysql');
const { analyzeBufferAndUpsert } = require('../services/analysisService');
const User = require('../models/mysql/User');

// 从文件名中提取数字的辅助函数
function extractNumberFromFilename(filename) {
  if (!filename) return null;
  
  // 匹配文件名开头的数字，支持前导零
  const match = filename.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * 获取所有车型列表（用于下拉选择）
 */
exports.getModelsForUpload = async (req, res) => {
  try {
    const models = await Model.findAll({
      include: [{
        model: Brand,
        attributes: ['id', 'name']
      }],
      attributes: ['id', 'name', 'brandId'],
      order: [['name', 'ASC']]
    });

    res.json({
      status: 'success',
      data: models
    });
  } catch (error) {
    console.error('获取车型列表失败:', error);
    res.status(500).json({
      status: 'error',
      message: '获取车型列表失败'
    });
  }
};

/**
 * 单文件上传
 */
exports.uploadSingleImage = async (req, res) => {
  try {
    console.log('=== 开始处理单文件上传 ===');
    console.log('请求体字段:', Object.keys(req.body));
    console.log('文件信息:', req.file ? {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      hasBuffer: !!req.file.buffer
    } : '无文件');
    
    if (!req.file) {
      console.error('上传失败: 没有上传文件');
      return res.status(400).json({
        status: 'error',
        message: '没有上传文件'
      });
    }

    const {
      modelId,
      title,
      description,
      category = 'general',
      isFeatured = false,
      path
    } = req.body;

    console.log('解析的参数:', { modelId, title, category, isFeatured, path });

    // 验证必填字段
    if (!modelId) {
      console.error('上传失败: 缺少车型ID');
      return res.status(400).json({
        status: 'error',
        message: '请选择车型'
      });
    }

    // 检查车型是否存在
    const model = await Model.findByPk(modelId);
    if (!model) {
      console.error('上传失败: 车型不存在, modelId:', modelId);
      return res.status(404).json({
        status: 'error',
        message: '指定的车型不存在'
      });
    }

    console.log('车型信息验证通过:', { modelId: model.id, modelName: model.name });

    // 生成COS存储路径
    let cosKey;
    try {
      cosKey = await generateUploadPath(req.file.originalname, modelId, category, path);
      console.log('生成的COS路径:', cosKey);
    } catch (pathError) {
      console.error('生成COS路径失败:', pathError);
      return res.status(500).json({
        status: 'error',
        message: '生成文件路径失败',
        details: process.env.NODE_ENV === 'production' ? undefined : pathError.message
      });
    }

    try {
      console.log('开始上传到COS...');
      // 上传到腾讯云COS
      const cosResult = await uploadToCOS(
        req.file.buffer,
        cosKey,
        req.file.mimetype
      );
      console.log('COS上传成功:', { url: cosResult.url, key: cosResult.key });

      // 保存到数据库
      const imageData = {
        modelId: parseInt(modelId),
        userId: req.user.id, // 添加用户ID
        title: title || '',
        description: description || '',
        url: cosResult.url,
        filename: req.file.originalname,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        category: category,
        isFeatured: isFeatured === 'true' || isFeatured === true
      };

      const savedImage = await Image.create(imageData);

      // 生成图片变体并落库
      let assets = {};
      try {
        assets = await generateAndSaveAssets({
          imageId: savedImage.id,
          originalBuffer: req.file.buffer,
          originalKey: cosKey,
          originalContentType: req.file.mimetype,
        });
      } catch (assetErr) {
        console.error('生成图片变体失败:', assetErr);
      }

      // 异步触发结构化分析（不阻塞响应）
      (async () => {
        try {
          // 从变体中估算宽高（若有）
          // 此处直接用 sharp 从原图读元数据
          const meta = await (await import('sharp')).then((m) => m.default(req.file.buffer).metadata());
          await analyzeBufferAndUpsert({
            imageId: savedImage.id,
            buffer: req.file.buffer,
            width: meta.width,
            height: meta.height,
            extractorVersion: 'v1',
          });
        } catch (e) {
          console.error('结构化分析失败(单图):', e);
        }
      })();

      // 上传成功后给用户增加积分
      const pointsToAdd = 10; // 每张图片10积分
      const newPoints = await authController.updateUserPoints(req.user.id, pointsToAdd);

      // 记录上传活动
      await activityService.recordUploadActivity(
        req.user.id,
        savedImage.id,
        savedImage.title
      );

      res.json({
        status: 'success',
        message: `图片上传成功，获得${pointsToAdd}积分！`,
        data: {
          id: savedImage.id,
          url: cosResult.url,
          bestUrl: chooseBestUrl(assets, true) || cosResult.url,
          assets,
          title: savedImage.title,
          category: savedImage.category,
          modelId: savedImage.modelId,
          userId: savedImage.userId,
          uploadDate: savedImage.uploadDate,
          pointsEarned: pointsToAdd,
          userTotalPoints: newPoints
        }
      });

    } catch (cosError) {
      console.error('COS上传失败:', cosError);
      logger.error('COS上传失败:', {
        error: cosError.message,
        stack: cosError.stack,
        modelId,
        filename: req.file ? req.file.originalname : 'unknown',
        cosKey: cosKey || 'unknown'
      });
      return res.status(500).json({
        status: 'error',
        message: '图片上传到云存储失败',
        details: process.env.NODE_ENV === 'production' ? undefined : cosError.message
      });
    }

  } catch (error) {
    console.error('图片上传处理失败:', error);
    logger.error('图片上传处理失败:', {
      error: error.message,
      stack: error.stack,
      body: req.body,
      hasFile: !!req.file,
      fileInfo: req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      } : null
    });
    res.status(500).json({
      status: 'error',
      message: '图片上传处理失败',
      details: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
};

/**
 * 多文件上传
 */
exports.uploadMultipleImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: '请选择要上传的图片文件'
      });
    }

    const {
      modelId,
      category = 'general',
      isFeatured = false
    } = req.body;

    // 验证必填字段
    if (!modelId) {
      return res.status(400).json({
        status: 'error',
        message: '请选择车型'
      });
    }

    // 检查车型是否存在
    const model = await Model.findByPk(modelId);
    if (!model) {
      return res.status(404).json({
        status: 'error',
        message: '指定的车型不存在'
      });
    }

    const uploadResults = [];
    const errors = [];

    // 批量上传处理
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      
      try {
        // 生成COS存储路径
        const cosKey = await generateUploadPath(file.originalname, modelId, category);

        // 上传到腾讯云COS
        const cosResult = await uploadToCOS(
          file.buffer,
          cosKey,
          file.mimetype
        );

        // 保存到数据库
        const imageData = {
          modelId: parseInt(modelId),
          userId: req.user.id, // 添加用户ID
          title: `${model.name} - ${file.originalname}`,
          description: '',
          url: cosResult.url,
          filename: file.originalname,
          fileSize: file.size,
          fileType: file.mimetype,
          category: category,
          isFeatured: i === 0 && (isFeatured === 'true' || isFeatured === true) // 第一张设为特色图片
        };

        const savedImage = await Image.create(imageData);

        // 生成图片变体并落库（批量不因变体失败而中断）
        let assets = {};
        try {
          assets = await generateAndSaveAssets({
            imageId: savedImage.id,
            originalBuffer: file.buffer,
            originalKey: cosKey,
            originalContentType: file.mimetype,
          });
        } catch (assetErr) {
          console.error(`生成变体失败(${file.originalname}):`, assetErr);
        }

        // 异步触发结构化分析
        (async () => {
          try {
            const meta = await (await import('sharp')).then((m) => m.default(file.buffer).metadata());
            await analyzeBufferAndUpsert({
              imageId: savedImage.id,
              buffer: file.buffer,
              width: meta.width,
              height: meta.height,
              extractorVersion: 'v1',
            });
          } catch (e) {
            console.error(`结构化分析失败(${file.originalname}):`, e);
          }
        })();

        uploadResults.push({
          success: true,
          filename: file.originalname,
          id: savedImage.id,
          url: cosResult.url,
          bestUrl: chooseBestUrl(assets, true) || cosResult.url,
          assets,
          title: savedImage.title
        });

      } catch (error) {
        console.error(`文件 ${file.originalname} 上传失败:`, error);
        errors.push({
          filename: file.originalname,
          error: error.message
        });
      }
    }

    // 批量上传成功后给用户增加积分
    const pointsPerImage = 10;
    const totalPointsEarned = uploadResults.length * pointsPerImage;
    const newPoints = await authController.updateUserPoints(req.user.id, totalPointsEarned);

    // 记录每张图片的上传活动
    for (const result of uploadResults) {
      await activityService.recordUploadActivity(
        req.user.id,
        result.id,
        result.title
      );
    }

    res.json({
      status: uploadResults.length > 0 ? 'success' : 'error',
      message: `批量上传完成，成功：${uploadResults.length}个，失败：${errors.length}个${totalPointsEarned > 0 ? `，获得${totalPointsEarned}积分！` : ''}`,
      data: {
        successful: uploadResults,
        failed: errors,
        summary: {
          total: req.files.length,
          successful: uploadResults.length,
          failed: errors.length
        },
        pointsEarned: totalPointsEarned,
        userTotalPoints: newPoints
      }
    });

  } catch (error) {
    console.error('批量图片上传处理失败:', error);
    res.status(500).json({
      status: 'error',
      message: '批量图片上传处理失败',
      details: error.message
    });
  }
};

/**
 * 更新图片信息
 */
exports.updateImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, isFeatured } = req.body;

    // 查找图片记录
    const image = await Image.findByPk(id);
    if (!image) {
      return res.status(404).json({
        status: 'error',
        message: '图片不存在'
      });
    }

    // 更新图片信息
    await image.update({
      title: title !== undefined ? title : image.title,
      description: description !== undefined ? description : image.description,
      category: category !== undefined ? category : image.category,
      isFeatured: isFeatured !== undefined ? isFeatured : image.isFeatured
    });

    res.json({
      status: 'success',
      message: '图片信息更新成功',
      data: image
    });

  } catch (error) {
    console.error('更新图片信息失败:', error);
    res.status(500).json({
      status: 'error',
      message: '更新图片信息失败',
      details: error.message
    });
  }
};

/**
 * 删除图片
 */
exports.deleteImage = async (req, res) => {
  try {
    const { id } = req.params;

    // 查找图片记录
    const image = await Image.findByPk(id);
    if (!image) {
      return res.status(404).json({
        status: 'error',
        message: '图片不存在'
      });
    }

    // 检查图片是否属于当前用户（如果有用户权限验证）
    if (req.user && image.userId && image.userId !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: '无权删除此图片'
      });
    }

    try {
      // 从COS删除文件（从URL中提取key）
      const url = new URL(image.url);
      const cosKey = url.pathname.substring(1); // 去掉开头的 '/'
      
      await deleteFromCOS(cosKey);
    } catch (cosError) {
      console.error('COS删除失败:', cosError);
      // 即使COS删除失败，也继续删除数据库记录
    }

    // 扣除用户积分（如果图片有关联用户）
    const pointsToDeduct = -10; // 扣除10积分
    if (image.userId) {
      try {
        await authController.updateUserPoints(image.userId, pointsToDeduct);
        console.log(`用户 ${image.userId} 删除图片，扣除10积分`);
        
        // 记录删除活动
        await activityService.recordDeleteActivity(
          image.userId, 
          image.title || image.filename
        );
      } catch (pointsError) {
        console.error('扣除积分失败:', pointsError);
        // 积分扣除失败不影响图片删除
      }
    }

    // 从数据库删除记录
    await image.destroy();

    res.json({
      status: 'success',
      message: '图片删除成功',
      data: {
        pointsDeducted: image.userId ? 10 : 0
      }
    });

  } catch (error) {
    console.error('删除图片失败:', error);
    res.status(500).json({
      status: 'error',
      message: '删除图片失败',
      details: error.message
    });
  }
};

/**
 * 获取图片管理列表
 */
exports.getImagesList = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      modelId,
      category,
      search
    } = req.query;

    const offset = (page - 1) * limit;
    const whereCondition = {};

    // 筛选条件
    if (modelId) {
      whereCondition.modelId = modelId;
    }
    if (category) {
      whereCondition.category = category;
    }
    if (search) {
      whereCondition[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { filename: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: images } = await Image.findAndCountAll({
      where: whereCondition,
      include: [
        {
          model: Model,
          attributes: ['id', 'name'],
          include: [{
            model: Brand,
            attributes: ['id', 'name']
          }]
        },
        {
          model: User,
          attributes: ['id', 'username', 'avatar'],
          required: false
        }
      ],
      order: [['uploadDate', 'DESC']],  // 按时间排序，后续在应用层进行数字排序
      limit: parseInt(limit),
      offset: offset
    });

    // 按文件名中的数字进行排序
    const sortedImages = images.sort((a, b) => {
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
      status: 'success',
      data: {
        images: sortedImages,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });

  } catch (error) {
    console.error('获取图片列表失败:', error);
    res.status(500).json({
      status: 'error',
      message: '获取图片列表失败',
      details: error.message
    });
  }
};

// ==================== 品牌管理 API ====================

// 获取所有品牌
const getAllBrands = async (req, res) => {
  try {
    const brands = await Brand.findAll({
      attributes: ['id', 'name', 'logo', 'country', 'description', 'founded_year', 'createdAt', 'updatedAt'],
      order: [['name', 'ASC']]
    });
    
    // 设置缓存头，允许浏览器缓存5分钟
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.setHeader('Pragma', '');
    res.setHeader('Expires', new Date(Date.now() + 300000).toUTCString());
    
    res.json({
      status: 'success',
      data: brands
    });
  } catch (error) {
    console.error('获取品牌列表失败:', error);
    res.status(500).json({
      status: 'error',
      message: '获取品牌列表失败'
    });
  }
};

// 创建新品牌
const createBrand = async (req, res) => {
  try {
    const { name, country, description, founded_year } = req.body;
    
    if (!name) {
      return res.status(400).json({
        status: 'error',
        message: '品牌名称不能为空'
      });
    }
    
    // 检查品牌是否已存在
    const existingBrand = await Brand.findOne({ where: { name } });
    if (existingBrand) {
      return res.status(400).json({
        status: 'error',
        message: '品牌已存在'
      });
    }
    
    const brand = await Brand.create({
      name,
      country,
      description,
      founded_year
    });
    
    res.json({
      status: 'success',
      data: brand,
      message: '品牌创建成功'
    });
  } catch (error) {
    console.error('创建品牌失败:', error);
    res.status(500).json({
      status: 'error',
      message: '创建品牌失败'
    });
  }
};

// 品牌Logo上传
const uploadBrandLogo = async (req, res) => {
  try {
    const brandId = req.params.id;
    
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: '请选择Logo文件'
      });
    }

    // 检查品牌是否存在
    const brand = await Brand.findByPk(brandId);
    if (!brand) {
      return res.status(404).json({
        status: 'error',
        message: '品牌不存在'
      });
    }

    // 集成腾讯云COS上传
    const { uploadToCOS } = require('../config/cos');
    
    // 生成logo存储路径
    const ext = req.file.originalname.split('.').pop();
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const logoKey = `logos/brands/${brandId}/${timestamp}_${random}.${ext}`;

    try {
      // 上传到腾讯云COS
      const cosResult = await uploadToCOS(
        req.file.buffer,
        logoKey,
        req.file.mimetype
      );

      // 更新品牌logo
      brand.logo = cosResult.url;
      await brand.save();

      res.json({
        status: 'success',
        message: 'Logo上传成功',
        data: {
          id: brand.id,
          name: brand.name,
          logo: brand.logo,
          country: brand.country,
          description: brand.description,
          founded_year: brand.founded_year,
          createdAt: brand.createdAt,
          updatedAt: brand.updatedAt
        }
      });

    } catch (cosError) {
      console.error('Logo上传到COS失败:', cosError);
      return res.status(500).json({
        status: 'error',
        message: 'Logo上传失败',
        details: cosError.message
      });
    }

  } catch (error) {
    console.error('品牌Logo上传失败:', error);
    res.status(500).json({
      status: 'error',
      message: 'Logo上传失败'
    });
  }
};

// 更新品牌
const updateBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, country, description, founded_year } = req.body;
    
    const brand = await Brand.findByPk(id);
    if (!brand) {
      return res.status(404).json({
        status: 'error',
        message: '品牌不存在'
      });
    }
    
    // 检查名称是否重复（排除当前品牌）
    if (name !== brand.name) {
      const existingBrand = await Brand.findOne({ 
        where: { 
          name,
          id: { [Op.ne]: id }
        } 
      });
      if (existingBrand) {
        return res.status(400).json({
          status: 'error',
          message: '品牌名称已存在'
        });
      }
    }
    
    await brand.update({
      name: name || brand.name,
      country: country || brand.country,
      description: description || brand.description,
      founded_year: founded_year || brand.founded_year
    });
    
    res.json({
      status: 'success',
      data: brand,
      message: '品牌更新成功'
    });
  } catch (error) {
    console.error('更新品牌失败:', error);
    res.status(500).json({
      status: 'error',
      message: '更新品牌失败'
    });
  }
};

// 删除品牌
const deleteBrand = async (req, res) => {
  try {
    const { id } = req.params;
    
    const brand = await Brand.findByPk(id, {
      include: [{ model: Model, as: 'Models' }]
    });
    
    if (!brand) {
      return res.status(404).json({
        status: 'error',
        message: '品牌不存在'
      });
    }
    
    // 检查是否有关联的车型
    if (brand.Models && brand.Models.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: '该品牌下还有车型，无法删除'
      });
    }
    
    await brand.destroy();
    
    res.json({
      status: 'success',
      message: '品牌删除成功'
    });
  } catch (error) {
    console.error('删除品牌失败:', error);
    res.status(500).json({
      status: 'error',
      message: '删除品牌失败'
    });
  }
};

// ==================== 车型管理 API ====================

// 获取指定品牌的车型
const getModelsByBrand = async (req, res) => {
  try {
    const { brandId } = req.params;
    
    const models = await Model.findAll({
      where: { brandId },
      include: [{
        model: Brand,
        attributes: ['id', 'name']
      }],
      order: [['name', 'ASC']]
    });
    
    res.json({
      status: 'success',
      data: models
    });
  } catch (error) {
    console.error('获取车型列表失败:', error);
    res.status(500).json({
      status: 'error',
      message: '获取车型列表失败'
    });
  }
};

// 创建新车型
const createModel = async (req, res) => {
  try {
    const { name, brandId, type, price, description, year, specs } = req.body;
    
    if (!name || !brandId) {
      return res.status(400).json({
        status: 'error',
        message: '车型名称和品牌不能为空'
      });
    }
    
    // 检查品牌是否存在
    const brand = await Brand.findByPk(brandId);
    if (!brand) {
      return res.status(400).json({
        status: 'error',
        message: '指定的品牌不存在'
      });
    }
    
    // 检查车型是否已存在
    const existingModel = await Model.findOne({ 
      where: { name, brandId } 
    });
    if (existingModel) {
      return res.status(400).json({
        status: 'error',
        message: '该品牌下已存在同名车型'
      });
    }
    
    const model = await Model.create({
      name,
      brandId,
      type: type || '其他',
      price,
      description,
      year,
      specs
    });
    
    // 返回包含品牌信息的车型数据
    const modelWithBrand = await Model.findByPk(model.id, {
      include: [{
        model: Brand,
        attributes: ['id', 'name']
      }]
    });
    
    res.json({
      status: 'success',
      data: modelWithBrand,
      message: '车型创建成功'
    });
  } catch (error) {
    console.error('创建车型失败:', error);
    res.status(500).json({
      status: 'error',
      message: '创建车型失败'
    });
  }
};

// 更新车型
const updateModel = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, brandId, type, price, description, year, specs, isActive } = req.body;
    
    const model = await Model.findByPk(id);
    if (!model) {
      return res.status(404).json({
        status: 'error',
        message: '车型不存在'
      });
    }
    
    // 如果更新了品牌，检查品牌是否存在
    if (brandId && brandId !== model.brandId) {
      const brand = await Brand.findByPk(brandId);
      if (!brand) {
        return res.status(400).json({
          status: 'error',
          message: '指定的品牌不存在'
        });
      }
    }
    
    // 检查车型名称是否重复（排除当前车型）
    if (name !== model.name || brandId !== model.brandId) {
      const existingModel = await Model.findOne({ 
        where: { 
          name: name || model.name,
          brandId: brandId || model.brandId,
          id: { [Op.ne]: id }
        } 
      });
      if (existingModel) {
        return res.status(400).json({
          status: 'error',
          message: '该品牌下已存在同名车型'
        });
      }
    }
    
    await model.update({
      name: name || model.name,
      brandId: brandId || model.brandId,
      type: type || model.type,
      price: price !== undefined ? price : model.price,
      description: description || model.description,
      year: year || model.year,
      specs: specs || model.specs,
      isActive: isActive !== undefined ? isActive : model.isActive
    });
    
    // 返回包含品牌信息的车型数据
    const modelWithBrand = await Model.findByPk(model.id, {
      include: [{
        model: Brand,
        attributes: ['id', 'name']
      }]
    });
    
    res.json({
      status: 'success',
      data: modelWithBrand,
      message: '车型更新成功'
    });
  } catch (error) {
    console.error('更新车型失败:', error);
    res.status(500).json({
      status: 'error',
      message: '更新车型失败'
    });
  }
};

// 删除车型
const deleteModel = async (req, res) => {
  try {
    const { id } = req.params;
    
    const model = await Model.findByPk(id, {
      include: [{
        model: Image,
        as: 'Images',
        required: false
      }]
    });
    
    if (!model) {
      return res.status(404).json({
        status: 'error',
        message: '车型不存在'
      });
    }
    
    // 如果有关联的图片，先删除所有图片
    if (model.Images && model.Images.length > 0) {
      console.log(`车型 ${model.name} 下有 ${model.Images.length} 张图片，开始删除...`);
      
      for (const image of model.Images) {
        try {
          // 删除COS中的文件
          if (image.cosKey) {
            await deleteFromCOS(image.cosKey);
          }
          
          // 删除数据库记录
          await image.destroy();
          console.log(`已删除图片: ${image.title}`);
        } catch (imageError) {
          console.error(`删除图片失败 (${image.title}):`, imageError);
          // 继续删除其他图片，不中断流程
        }
      }
      
      console.log(`车型 ${model.name} 下的所有图片已删除`);
    }
    
    // 删除车型
    await model.destroy();
    
    res.json({
      status: 'success',
      message: '车型及关联图片删除成功'
    });
  } catch (error) {
    console.error('删除车型失败:', error);
    res.status(500).json({
      status: 'error',
      message: '删除车型失败'
    });
  }
};

/**
 * 文章封面上传（简化版本，不需要modelId）
 */
exports.uploadCoverImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '没有上传文件'
      });
    }

    // 生成唯一的文件名
    const fileExtension = req.file.originalname.split('.').pop();
    const fileName = `article-cover-${uuidv4()}.${fileExtension}`;
    const cosKey = `articles/covers/${fileName}`;

    try {
      // 上传到腾讯云COS
      const cosResult = await uploadToCOS(
        req.file.buffer,
        cosKey,
        req.file.mimetype
      );

      // 保存到ArticleImage表
      const articleImage = await ArticleImage.create({
        userId: req.user.id,
        url: cosResult.url,
        filename: req.file.originalname,
        cosKey: cosKey,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        imageType: 'cover',
        status: 'active'
      });

      res.json({
        success: true,
        status: 'success',
        message: '封面上传成功',
        data: {
          id: articleImage.id,
          url: cosResult.url,
          filename: fileName,
          imageType: 'cover'
        }
      });

    } catch (cosError) {
      console.error('COS上传失败:', cosError);
      return res.status(500).json({
        success: false,
        message: '图片上传到云存储失败',
        details: cosError.message
      });
    }

  } catch (error) {
    console.error('图片上传处理失败:', error);
    res.status(500).json({
      success: false,
      message: '图片上传处理失败',
      details: error.message
    });
  }
};

/**
 * 文章内容图片上传（用于文章编辑器中的图片）
 */
exports.uploadArticleImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: '没有上传文件'
      });
    }

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        status: 'error',
        message: '只支持 JPG、PNG、GIF、WebP 格式的图片'
      });
    }

    // 验证文件大小（最大10MB）
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (req.file.size > maxSize) {
      return res.status(400).json({
        status: 'error',
        message: '图片大小不能超过10MB'
      });
    }

    // 生成唯一的文件名
    const fileExtension = req.file.originalname.split('.').pop();
    const fileName = `article-content-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
    const cosKey = `articles/content/${fileName}`;

    try {
      // 上传到腾讯云COS
      const cosResult = await uploadToCOS(
        req.file.buffer,
        cosKey,
        req.file.mimetype
      );

      // 保存到ArticleImage表
      const articleImage = await ArticleImage.create({
        userId: req.user.id,
        url: cosResult.url,
        filename: req.file.originalname,
        cosKey: cosKey,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        imageType: 'content',
        status: 'active'
      });

      res.json({
        status: 'success',
        message: '图片上传成功',
        data: {
          id: articleImage.id,
          url: cosResult.url,
          filename: fileName,
          imageType: 'content'
        }
      });

    } catch (cosError) {
      console.error('COS上传失败:', cosError);
      return res.status(500).json({
        status: 'error',
        message: '图片上传到云存储失败',
        details: cosError.message
      });
    }

  } catch (error) {
    console.error('图片上传处理失败:', error);
    res.status(500).json({
      status: 'error',
      message: '图片上传处理失败',
      details: error.message
    });
  }
};

module.exports = {
  uploadSingleImage: exports.uploadSingleImage,
  uploadMultipleImages: exports.uploadMultipleImages,
  getImagesList: exports.getImagesList,
  updateImage: exports.updateImage,
  deleteImage: exports.deleteImage,
  getModelsForUpload: exports.getModelsForUpload,
  getAllBrands,
  createBrand,
  uploadBrandLogo,
  updateBrand,
  deleteBrand,
  getModelsByBrand,
  createModel,
  updateModel,
  deleteModel,
  uploadCoverImage: exports.uploadCoverImage,
  uploadArticleImage: exports.uploadArticleImage
}; 