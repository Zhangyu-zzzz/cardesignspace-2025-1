// pages/inspiration/inspiration.js
import { inspirationAPI } from '../../utils/api';
import { previewImage } from '../../utils/util';

Page({
  data: {
    images: [],
    loading: true
  },

  onLoad() {
    this.loadInspiration();
  },

  async loadInspiration() {
    this.setData({ loading: true });
    
    try {
      const res = await inspirationAPI.getAll();
      const images = res.data || res || [];
      this.setData({ images: images });
    } catch (error) {
      console.error('加载灵感图片失败:', error);
    } finally {
      this.setData({ loading: false });
    }
  },

  previewImage(e) {
    const index = e.currentTarget.dataset.index;
    const { images } = this.data;
    const urls = images.map(img => img.url);
    previewImage(urls, index);
  }
});

