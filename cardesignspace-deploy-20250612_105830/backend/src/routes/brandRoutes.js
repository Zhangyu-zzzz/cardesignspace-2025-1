const express = require('express');
const router = express.Router();
const brandController = require('../controllers/brandController');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

// 公开路由
router.get('/', brandController.getAllBrands);
router.get('/:id', brandController.getBrandById);
router.get('/:id/series', brandController.getBrandSeries);

// 需要管理员权限的路由
router.post('/', authMiddleware, adminMiddleware, brandController.createBrand);
router.put('/:id', authMiddleware, adminMiddleware, brandController.updateBrand);
router.delete('/:id', authMiddleware, adminMiddleware, brandController.deleteBrand);

module.exports = router; 