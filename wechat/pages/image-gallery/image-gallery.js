// pages/image-gallery/image-gallery.js
import { imageAPI } from '../../utils/api';
import { previewImage } from '../../utils/util';

Page({
  data: {
    images: [],
    loading: false,
    loadingMore: false,
    error: null,
    page: 1,
    limit: 18,  // 减少每次加载数量，避免卡顿
    hasMore: true
  },

  onLoad() {
    console.log('图片画廊页面加载');
    this.loadImages(true);
  },

  // 加载图片
  async loadImages(reset = false) {
    // 如果是重置，重置状态
    if (reset) {
      this.setData({
        images: [],
        page: 1,
        hasMore: true,
        loading: true,
        error: null
      });
    } else {
      // 加载更多时，检查是否还有更多数据或正在加载
      if (!this.data.hasMore || this.data.loadingMore || this.data.loading) {
        console.log('跳过加载:', {
          hasMore: this.data.hasMore,
          loadingMore: this.data.loadingMore,
          loading: this.data.loading
        });
        return;
      }
      this.setData({ loadingMore: true });
    }
    
    try {
      console.log(`加载图片，第 ${this.data.page} 页，每页 ${this.data.limit} 张`);
      
      const res = await imageAPI.getAll({
        page: this.data.page,
        limit: this.data.limit
      });
      
      console.log('图片数据响应:', res);
      
      // 处理不同的响应格式
      let images = [];
      let pagination = null;
      
      if (Array.isArray(res)) {
        images = res;
      } else if (res.data && Array.isArray(res.data)) {
        images = res.data;
        pagination = res.pagination;
      } else if (res.data && res.data.images && Array.isArray(res.data.images)) {
        images = res.data.images;
        pagination = res.data.pagination;
      }
      
      console.log(`解析后的图片数量: ${images.length}`);
      
      // 处理图片数据，确保有正确的 URL
      const processedImages = images.map((img, index) => ({
        ...img,
        _key: img.id || img.image_id || `img_${this.data.images.length + index}`,
        url: img.url || img.image_url || img.displayUrl || '',
        // 添加加载状态
        _loading: false,
        _error: false
      }));
      
      // 追加或替换图片列表
      const newImages = reset 
        ? processedImages 
        : [...this.data.images, ...processedImages];
      
      // 判断是否还有更多数据
      let hasMore = true;
      if (pagination) {
        hasMore = this.data.page < pagination.pages;
      } else {
        hasMore = images.length === this.data.limit;
      }
      
      this.setData({
        images: newImages,
        hasMore: hasMore,
        page: this.data.page + 1,
        loading: false,
        loadingMore: false
      });
      
      console.log(`图片加载完成，当前共 ${newImages.length} 张，还有更多: ${hasMore}`);
    } catch (error) {
      console.error('加载图片失败:', error);
      console.error('错误详情:', {
        message: error.message,
        stack: error.stack
      });
      
      this.setData({ 
        error: error.message || '加载失败，请检查网络连接',
        loading: false,
        loadingMore: false
      });
      
      wx.showToast({
        title: '加载失败',
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 预览图片
  previewImage(e) {
    const index = e.currentTarget.dataset.index;
    const { images } = this.data;
    
    // 过滤掉无效的 URL
    const urls = images
      .map(img => img.url || img.image_url || img.displayUrl)
      .filter(url => url && url.trim() !== '');
    
    if (urls.length === 0) {
      wx.showToast({
        title: '暂无可用图片',
        icon: 'none'
      });
      return;
    }
    
    console.log(`预览图片，索引: ${index}, 总数量: ${urls.length}`);
    previewImage(urls, index);
  },

  // 图片加载错误处理
  onImageError(e) {
    const index = e.currentTarget.dataset.index;
    const images = this.data.images;
    
    if (images[index]) {
      images[index]._error = true;
      this.setData({
        [`images[${index}]._error`]: true
      });
      console.warn(`图片加载失败，索引: ${index}, URL: ${images[index].url}`);
    }
  },

  // 图片加载成功
  onImageLoad(e) {
    const index = e.currentTarget.dataset.index;
    const images = this.data.images;
    
    if (images[index]) {
      images[index]._loading = false;
      this.setData({
        [`images[${index}]._loading`]: false
      });
    }
  },

  // 加载更多
  onReachBottom() {
    console.log('滚动到底部，准备加载更多图片');
    if (this.data.hasMore && !this.data.loadingMore && !this.data.loading) {
      this.loadImages(false);
    } else {
      console.log('跳过加载更多:', {
        hasMore: this.data.hasMore,
        loadingMore: this.data.loadingMore,
        loading: this.data.loading
      });
    }
  }
});

