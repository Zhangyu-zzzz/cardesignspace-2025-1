// pages/article-detail/article-detail.js
import { articleAPI } from '../../utils/api';

Page({
  data: {
    article: null,
    loading: true
  },

  onLoad(options) {
    const articleId = options.id;
    if (articleId) {
      this.loadArticle(articleId);
    }
  },

  async loadArticle(articleId) {
    this.setData({ loading: true });
    
    try {
      const res = await articleAPI.getById(articleId);
      const article = res.data || res;
      this.setData({ article: article });
      
      wx.setNavigationBarTitle({
        title: article.title || '文章详情'
      });
    } catch (error) {
      console.error('加载文章失败:', error);
    } finally {
      this.setData({ loading: false });
    }
  }
});

