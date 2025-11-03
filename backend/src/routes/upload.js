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
    fileSize: 10 * 1024 * 1024, // 10MB限制
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

// 获取车型列表（用于上传页面选择）
router.get('/models', uploadController.getModelsForUpload);

// 单文件上传（需要认证）- 添加multer中间件
router.post('/single', authenticateToken, imageUpload.single('image'), uploadController.uploadSingleImage);

// 文章封面上传（简化版本）
router.post('/cover', authenticateToken, imageUpload.single('file'), uploadController.uploadCoverImage);

// 文章内容图片上传（用于文章编辑器）
router.post('/article-image', authenticateToken, imageUpload.single('image'), uploadController.uploadArticleImage);

// 多文件上传（需要认证）- 添加multer中间件
router.post('/multiple', authenticateToken, imageUpload.array('images', 10), uploadController.uploadMultipleImages);

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
router.post('/brands/:id/logo', authenticateToken, restrictTo('admin', 'editor'), logoUpload.single('logo'), uploadController.uploadBrandLogo);

// ==================== 车型管理路由 ====================
router.get('/brands/:brandId/models', uploadController.getModelsByBrand);
// 车型创建、更新、删除需要认证用户权限（允许所有登录用户创建车型）
router.post('/models', authenticateToken, uploadController.createModel);
router.put('/models/:id', authenticateToken, restrictTo('admin', 'editor'), uploadController.updateModel);
router.delete('/models/:id', authenticateToken, restrictTo('admin', 'editor'), uploadController.deleteModel);

module.exports = router; 