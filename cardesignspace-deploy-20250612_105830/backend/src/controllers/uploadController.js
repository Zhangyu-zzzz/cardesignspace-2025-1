const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const { uploadToCOS, generateUploadPath, deleteFromCOS } = require('../config/cos');
const authController = require('./authController');
const activityService = require('../services/activityService');

// 导入模型并确保关联关系
const { Brand, Model, Image } = require('../models/mysql');
const User = require('../models/mysql/User');

// 配置multer内存存储
const storage = multer.memoryStorage();

// 文件过滤器
const fileFilter = (req, file, cb) => {
  // 检查文件类型
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传图片文件'), false);
  }
};

// multer配置
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB限制
  }
});

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
exports.uploadSingleImage = [
  upload.single('image'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          status: 'error',
          message: '请选择要上传的图片文件'
        });
      }

      const {
        modelId,
        title,
        description,
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

      // 生成COS存储路径
      const cosKey = generateUploadPath(req.file.originalname, modelId, category);

      try {
        // 上传到腾讯云COS
        const cosResult = await uploadToCOS(
          req.file.buffer,
          cosKey,
          req.file.mimetype
        );

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
  }
];

/**
 * 多文件上传
 */
exports.uploadMultipleImages = [
  upload.array('images', 10), // 最多10个文件
  async (req, res) => {
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
          const cosKey = generateUploadPath(file.originalname, modelId, category);

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

          uploadResults.push({
            success: true,
            filename: file.originalname,
            id: savedImage.id,
            url: cosResult.url,
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
  }
];

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
      order: [['uploadDate', 'DESC']],
      limit: parseInt(limit),
      offset: offset
    });

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
      include: [{
        model: Model,
        as: 'Models',
        required: false
      }],
      order: [['name', 'ASC']]
    });
    
    // 设置防缓存头
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
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
    
    // 检查是否有关联的图片
    if (model.Images && model.Images.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: '该车型下还有图片，无法删除'
      });
    }
    
    await model.destroy();
    
    res.json({
      status: 'success',
      message: '车型删除成功'
    });
  } catch (error) {
    console.error('删除车型失败:', error);
    res.status(500).json({
      status: 'error',
      message: '删除车型失败'
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
  deleteModel
}; 