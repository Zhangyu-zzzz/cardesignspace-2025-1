const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');

// 获取热门搜索
router.get('/hot', searchController.getHotSearches);

// 通用搜索
router.get('/', searchController.search);

module.exports = router; 