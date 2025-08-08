const express = require('express');
const router = express.Router();
const imageController = require('../controllers/imageController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

// GET /api/images?brandId=&modelId=&part=&angle=&scene=&tags[]=&sort=&page=&limit=
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    // 复用 imageController.getImagesByModelId 或后续可扩展为综合筛选
    if (req.query.modelId) {
      req.params.modelId = req.query.modelId;
      return imageController.getImagesByModelId(req, res, next);
    }
    return res.status(400).json({ success: false, message: '暂仅支持按 modelId 查询' });
  } catch (e) {
    next(e);
  }
});

module.exports = router;


