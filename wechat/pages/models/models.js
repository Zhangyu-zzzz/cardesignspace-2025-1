// pages/models/models.js
import { modelAPI } from '../../utils/api';

Page({
  data: {
    models: [],
    loading: true
  },

  onLoad() {
    this.loadModels();
  },

  async loadModels() {
    this.setData({ loading: true });
    
    try {
      const res = await modelAPI.getAll();
      const models = res.data || res || [];
      this.setData({ models: models });
    } catch (error) {
      console.error('加载车型失败:', error);
    } finally {
      this.setData({ loading: false });
    }
  },

  viewModelDetail(e) {
    const modelId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/model-detail/model-detail?id=${modelId}`
    });
  }
});

