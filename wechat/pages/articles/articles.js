// pages/articles/articles.js
import { articleAPI } from '../../utils/api';

Page({
  data: {
    articles: [],
    loading: true,
    error: null
  },

  onLoad() {
    this.loadArticles();
  },

  async loadArticles() {
    this.setData({ loading: true, error: null });
    
    try {
      const res = await articleAPI.getAll();
      const articles = res.data || res || [];
      this.setData({ articles: articles });
    } catch (error) {
      console.error('加载文章失败:', error);
      this.setData({ error: error.message || '加载失败' });
    } finally {
      this.setData({ loading: false });
    }
  },

  viewArticle(e) {
    const articleId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/article-detail/article-detail?id=${articleId}`
    });
  }
});

