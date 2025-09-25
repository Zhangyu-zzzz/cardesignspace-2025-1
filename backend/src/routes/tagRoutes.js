const express = require('express');
const router = express.Router();
const tagController = require('../controllers/tagController');
const { authenticateToken } = require('../middleware/auth');

// 查询标签（公开）
router.get('/', tagController.listTags);

// 标签维护（需要鉴权，后续可限制为管理员）
router.post('/', authenticateToken, tagController.createTag);
router.put('/:id', authenticateToken, tagController.updateTag);
router.delete('/:id', authenticateToken, tagController.deleteTag);

module.exports = router;

