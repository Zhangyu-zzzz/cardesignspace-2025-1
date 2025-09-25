const express = require('express');
const router = express.Router();
const curationController = require('../controllers/curationController');

// 获取精选列表（公开） GET /api/curation
router.get('/', curationController.getCurations);

module.exports = router;

