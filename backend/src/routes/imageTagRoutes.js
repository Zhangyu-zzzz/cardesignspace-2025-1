const express = require('express');
const router = express.Router();
const tagController = require('../controllers/tagController');
const { authenticateToken } = require('../middleware/auth');

// POST /api/images/:id/tags
router.post('/:id/tags', authenticateToken, tagController.addTagsToImage);

// DELETE /api/images/:id/tags/:tagId
router.delete('/:id/tags/:tagId', authenticateToken, tagController.removeTagFromImage);

module.exports = router;
