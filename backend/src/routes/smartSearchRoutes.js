const express = require('express');
const router = express.Router();
const smartSearchController = require('../controllers/smartSearchController');

// 智能搜索
router.get('/', smartSearchController.smartSearch);

module.exports = router;

