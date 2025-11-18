// pages/image-gallery/image-gallery.js
import { imageAPI } from '../../utils/api';
import { previewImage } from '../../utils/util';

Page({
  data: {
    images: [],
    loading: true,
    error: null,
    page: 1,
    limit: 20,
    hasMore: true
  },

  onLoad() {
    this.loadImages();
  },

  // 加载图片
  async loadImages() {
    if (!this.data.hasMore || this.data.loading) return;
    
    this.setData({ loading: true, error: null });
    
    try {
      const res = await imageAPI.getAll({
        page: this.data.page,
        limit: this.data.limit
      });
      
      const images = res.data || res || [];
      const newImages = this.data.images.concat(images);
      
      this.setData({
        images: newImages,
        hasMore: images.length === this.data.limit,
        page: this.data.page + 1
      });
    } catch (error) {
      console.error('加载图片失败:', error);
      this.setData({ error: error.message || '加载失败' });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 预览图片
  previewImage(e) {
    const index = e.currentTarget.dataset.index;
    const { images } = this.data;
    const urls = images.map(img => img.url);
    
    previewImage(urls, index);
  },

  // 加载更多
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadImages();
    }
  }
});

