const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { optionalAuth, authenticateToken } = require('../middleware/auth');
const { restrictTo } = require('../middleware/authMiddleware');
const multer = require('multer');

// 配置主要的multer中间件用于图片上传
const storage = multer.memoryStorage();

const imageUpload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB限制
  },
  fileFilter: (req, file, cb) => {
    // 检查文件类型
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件'), false);
    }
  }
});

// 配置multer中间件用于品牌Logo上传
const logoUpload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB限制
  },
  fileFilter: (req, file, cb) => {
    // 只允许图片文件
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件'));
    }
  }
});

// Multer错误处理中间件 - 包装multer中间件以捕获错误
const handleMulterError = (err, req, res, next) => {
  // 如果没有错误，继续下一个中间件
  if (!err) {
    return next();
  }
  
  console.error('Multer错误处理:', err);
  
  // 处理Multer错误
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        status: 'error',
        message: '文件大小超过限制（最大50MB）',
        error: 'File too large'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        status: 'error',
        message: '文件数量超过限制',
        error: 'Too many files'
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        status: 'error',
        message: '上传了意外的文件字段',
        error: 'Unexpected file field'
      });
    }
    return res.status(400).json({
      status: 'error',
      message: '文件上传失败: ' + err.message,
      error: err.code || 'MulterError'
    });
  }
  
  // 处理fileFilter中的错误
  if (err.message) {
    return res.status(400).json({
      status: 'error',
      message: err.message || '文件上传失败',
      error: 'FileFilterError'
    });
  }
  
  // 其他错误传递给下一个错误处理中间件
  next(err);
};

// 包装multer中间件以捕获同步错误
const wrapMulter = (multerMiddleware) => {
  return (req, res, next) => {
    multerMiddleware(req, res, (err) => {
      if (err) {
        return handleMulterError(err, req, res, next);
      }
      next();
    });
  };
};

// 获取车型列表（用于上传页面选择）
router.get('/models', uploadController.getModelsForUpload);

// 单文件上传（需要认证）- 使用包装的multer中间件以捕获错误
router.post('/single', authenticateToken, wrapMulter(imageUpload.single('image')), uploadController.uploadSingleImage);

// 文章封面上传（简化版本）
router.post('/cover', authenticateToken, imageUpload.single('file'), uploadController.uploadCoverImage);

// 文章内容图片上传（用于文章编辑器）
router.post('/article-image', authenticateToken, imageUpload.single('image'), uploadController.uploadArticleImage);

// 多文件上传（需要认证）- 使用包装的multer中间件以捕获错误
router.post('/multiple', authenticateToken, wrapMulter(imageUpload.array('images', 10)), uploadController.uploadMultipleImages);

// 更新图片信息
router.put('/image/:id', uploadController.updateImage);

// 删除图片
router.delete('/image/:id', uploadController.deleteImage);

// 获取图片管理列表（可选认证，用于显示用户信息）
router.get('/images', optionalAuth, uploadController.getImagesList);

// ==================== 品牌管理路由 ====================
router.get('/brands', uploadController.getAllBrands);
// 品牌创建、更新、删除需要管理员或编辑者权限
router.post('/brands', authenticateToken, restrictTo('admin', 'editor'), uploadController.createBrand);
router.put('/brands/:id', authenticateToken, restrictTo('admin', 'editor'), uploadController.updateBrand);
router.delete('/brands/:id', authenticateToken, restrictTo('admin', 'editor'), uploadController.deleteBrand);
// 品牌Logo上传路由 - 使用独立的multer配置，需要管理员或编辑者权限
router.post('/brands/:id/logo', authenticateToken, restrictTo('admin', 'editor'), wrapMulter(logoUpload.single('logo')), uploadController.uploadBrandLogo);

// ==================== 车型管理路由 ====================
router.get('/brands/:brandId/models', uploadController.getModelsByBrand);
// 车型创建、更新、删除需要认证用户权限（允许所有登录用户创建车型）
router.post('/models', authenticateToken, uploadController.createModel);
router.put('/models/:id', authenticateToken, restrictTo('admin', 'editor'), uploadController.updateModel);
router.delete('/models/:id', authenticateToken, restrictTo('admin', 'editor'), uploadController.deleteModel);

module.exports = router; 