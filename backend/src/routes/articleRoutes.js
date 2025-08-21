const express = require('express');
const router = express.Router();
const articleController = require('../controllers/articleController');
const articleCommentController = require('../controllers/articleCommentController');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

// 公开路由
router.get('/', articleController.getAllArticles);
router.get('/popular', articleController.getPopularArticles);
router.get('/categories/stats', articleController.getCategoryStats);
router.get('/drafts', authMiddleware, articleController.getUserDrafts);
router.get('/:id', articleController.getArticleById);

// 评论相关路由
router.get('/:articleId/comments', articleCommentController.getArticleComments);

// 需要登录的路由
router.post('/', authMiddleware, articleController.createArticle);
router.put('/:id', authMiddleware, articleController.updateArticle);
router.delete('/:id', authMiddleware, articleController.deleteArticle);
router.post('/:id/like', authMiddleware, articleController.toggleLikeArticle);

// 评论相关需要登录的路由
router.post('/:articleId/comments', authMiddleware, articleCommentController.createComment);
router.put('/comments/:id', authMiddleware, articleCommentController.updateComment);
router.delete('/comments/:id', authMiddleware, articleCommentController.deleteComment);
router.post('/comments/:id/like', authMiddleware, articleCommentController.likeComment);

module.exports = router; 