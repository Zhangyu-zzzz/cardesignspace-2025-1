// pages/model-detail/model-detail.js
import { modelAPI, imageAPI } from '../../utils/api';
import { previewImage } from '../../utils/util';

Page({
  data: {
    model: null,
    images: [],
    currentImageIndex: 0,
    loading: true,
    error: null
  },

  onLoad(options) {
    this.modelId = options.id;
    if (this.modelId) {
      this.loadModelDetail(this.modelId);
      this.loadImages(this.modelId);
    }
  },

  // 加载车型详情
  async loadModelDetail(modelId) {
    this.setData({ loading: true, error: null });
    
    try {
      const res = await modelAPI.getById(modelId);
      const model = res.data || res;
      
      this.setData({ model: model });
      
      wx.setNavigationBarTitle({
        title: model.name || '车型详情'
      });
    } catch (error) {
      console.error('加载车型详情失败:', error);
      this.setData({ error: error.message || '加载失败' });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 重试加载
  retryLoad() {
    if (this.modelId) {
      this.loadModelDetail(this.modelId);
      this.loadImages(this.modelId);
    }
  },

  // 加载车型图片
  async loadImages(modelId) {
    try {
      const res = await modelAPI.getImages(modelId);
      const images = res.data || res || [];
      
      this.setData({ images: images });
    } catch (error) {
      console.error('加载图片失败:', error);
    }
  },

  // 预览图片
  previewImage(e) {
    const index = e.currentTarget.dataset.index;
    const { images } = this.data;
    const urls = images.map(img => img.url);
    
    previewImage(urls, index);
  }
});

