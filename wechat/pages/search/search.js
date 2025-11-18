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
      const brands = (results.brands?.data || results.brands || []).map((item, index) => ({
        ...item,
        _key: item.brand_id || item.id || `brand_${index}`
      }));
      const models = (results.models?.data || results.models || []).map((item, index) => {
        // 处理车型图片
        const imageUrl = item.Images && item.Images[0] 
          ? (item.Images[0].url || item.Images[0].image_url)
          : (item.Brand && item.Brand.logo) || '';
        return {
          ...item,
          _key: item.model_id || item.id || `model_${index}`,
          _imageUrl: imageUrl
        };
      });
      const images = (results.images?.data || results.images || []).map((item, index) => ({
        ...item,
        _key: item.image_id || item.id || `image_${index}`
      }));
      
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
  },

  // 图片加载错误处理
  onImageError(e) {
    const index = e.currentTarget.dataset.index;
    const models = this.data.results.models;
    if (models[index]) {
      // 如果图片加载失败，尝试使用品牌logo
      if (models[index].Brand && models[index].Brand.logo) {
        models[index]._imageUrl = models[index].Brand.logo;
        this.setData({
          'results.models': models
        });
      }
    }
  }
});

