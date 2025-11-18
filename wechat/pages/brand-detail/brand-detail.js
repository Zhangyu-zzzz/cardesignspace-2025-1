// pages/brand-detail/brand-detail.js
import { brandAPI, modelAPI } from '../../utils/api';

Page({
  data: {
    brand: null,
    models: [],
    loading: true,
    error: null
  },

  onLoad(options) {
    this.brandId = options.id;
    if (this.brandId) {
      this.loadBrandDetail(this.brandId);
      this.loadModels(this.brandId);
    }
  },

  // 加载品牌详情
  async loadBrandDetail(brandId) {
    this.setData({ loading: true, error: null });
    
    try {
      const res = await brandAPI.getById(brandId);
      const brand = res.data || res;
      
      this.setData({ brand: brand });
      
      wx.setNavigationBarTitle({
        title: brand.name || '品牌详情'
      });
    } catch (error) {
      console.error('加载品牌详情失败:', error);
      this.setData({ error: error.message || '加载失败' });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 加载品牌下的车型
  async loadModels(brandId) {
    try {
      const res = await modelAPI.getAll({
        brandId: brandId
      });
      
      const models = res.data || res || [];
      this.setData({ models: models });
    } catch (error) {
      console.error('加载车型失败:', error);
    }
  },

  // 重试加载
  retryLoad() {
    if (this.brandId) {
      this.loadBrandDetail(this.brandId);
      this.loadModels(this.brandId);
    }
  },

  // 查看车型详情
  viewModelDetail(e) {
    const modelId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/model-detail/model-detail?id=${modelId}`
    });
  }
});

