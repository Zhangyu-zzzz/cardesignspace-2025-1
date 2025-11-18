// pages/search/search.js
import { searchAPI } from '../../utils/api';

Page({
  data: {
    keyword: '',
    results: {
      brands: [],
      models: [],
      images: []
    },
    loading: false,
    hasSearched: false
  },

  onLoad(options) {
    if (options.keyword) {
      this.setData({ keyword: options.keyword });
      this.performSearch(options.keyword);
    }
  },

  // 搜索输入
  onSearchInput(e) {
    const keyword = e.detail.value;
    this.setData({ keyword: keyword });
  },

  // 执行搜索
  async performSearch(keyword) {
    if (!keyword.trim()) {
      wx.showToast({
        title: '请输入搜索关键词',
        icon: 'none'
      });
      return;
    }

    this.setData({ loading: true, hasSearched: true });
    
    try {
      const res = await searchAPI.search(keyword);
      // 后端返回格式: { status: 'success', data: { brands, models, images, ... } }
      const results = res.data || res || {};
      
      // 处理数据结构：brands/models/images 可能是 { data: [...], pagination: {...} } 格式
      const brands = results.brands?.data || results.brands || [];
      const models = results.models?.data || results.models || [];
      const images = results.images?.data || results.images || [];
      
      this.setData({
        results: {
          brands: brands,
          models: models,
          images: images
        }
      });
    } catch (error) {
      console.error('搜索失败:', error);
      wx.showToast({
        title: error.message || '搜索失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 搜索按钮点击
  onSearch() {
    this.performSearch(this.data.keyword);
  },

  // 查看品牌详情
  viewBrandDetail(e) {
    const brandId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/brand-detail/brand-detail?id=${brandId}`
    });
  },

  // 查看车型详情
  viewModelDetail(e) {
    const modelId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/model-detail/model-detail?id=${modelId}`
    });
  },

  // 预览图片
  previewImage(e) {
    const url = e.currentTarget.dataset.url;
    const { results } = this.data;
    const urls = results.images.map(img => img.url || img.image_url).filter(u => u);
    const index = urls.indexOf(url);
    
    if (urls.length > 0) {
      wx.previewImage({
        urls: urls,
        current: url
      });
    }
  }
});

