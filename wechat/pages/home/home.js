// pages/home/home.js
import { modelAPI, brandAPI } from '../../utils/api';
import { getOptimizedImageUrl } from '../../utils/util';

Page({
  data: {
    carouselItems: [],
    currentSlide: 0,
    chineseBrands: [],
    latestModels: [],
    loading: true,
    error: null
  },

  onLoad() {
    this.loadData();
  },

  onShow() {
    // 刷新数据
    this.loadData();
  },

  // 加载数据
  async loadData() {
    this.setData({ loading: true, error: null });
    
    try {
      await Promise.all([
        this.loadLatestModels(),
        this.loadChineseBrands()
      ]);
    } catch (error) {
      console.error('加载数据失败:', error);
      const errorMsg = error.message || '加载失败';
      this.setData({ error: errorMsg });
      
      // 真机上显示错误提示
      wx.showToast({
        title: errorMsg,
        icon: 'none',
        duration: 3000
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 加载最新车型
  async loadLatestModels() {
    try {
      console.log('开始加载最新车型...');
      const res = await modelAPI.getAll({
        limit: 10,
        latest: 'true'
      });
      
      console.log('车型数据响应:', res);
      const models = res.data || res || [];
      console.log('解析后的车型数量:', models.length);
      
      const carouselItems = models.slice(0, 5).map((model, index) => {
        // 提取图片URL
        const imageUrl = model.Images && model.Images[0] 
          ? (model.Images[0].url || model.Images[0].image_url)
          : (model.Brand && model.Brand.logo) || '';
        return {
          ...model,
          type: 'model',
          _key: model.id || `model_${index}`,
          _imageUrl: imageUrl
        };
      });
      
      const latestModelsWithKey = models.map((model, index) => {
        // 提取图片URL
        const imageUrl = model.Images && model.Images[0] 
          ? (model.Images[0].url || model.Images[0].image_url)
          : (model.Brand && model.Brand.logo) || '';
        return {
          ...model,
          _key: model.id || `model_${index}`,
          _imageUrl: imageUrl
        };
      });
      
      this.setData({
        latestModels: latestModelsWithKey,
        carouselItems: carouselItems
      });
      console.log('车型数据设置完成');
    } catch (error) {
      console.error('加载最新车型失败:', error);
      console.error('错误详情:', {
        message: error.message,
        stack: error.stack
      });
      // 设置空数组避免页面报错
      this.setData({
        latestModels: [],
        carouselItems: []
      });
    }
  },

  // 加载中国品牌
  async loadChineseBrands() {
    try {
      console.log('开始加载品牌...');
      const res = await brandAPI.getAll();
      console.log('品牌数据响应:', res);
      const brands = res.data || res || [];
      console.log('解析后的品牌数量:', brands.length);
      
      // 筛选中国品牌
      const chineseBrands = brands.filter(brand => 
        brand.country === '中国' || 
        brand.country === 'China' ||
        ['比亚迪', '吉利', '长城', '奇瑞', '长安', '上汽', '一汽', '广汽', '东风', '北汽'].includes(brand.name)
      );
      
      const brandsWithKey = chineseBrands.slice(0, 12).map((brand, index) => ({
        ...brand,
        _key: brand.id || `brand_${index}`
      }));
      
      this.setData({ chineseBrands: brandsWithKey });
      console.log('品牌数据设置完成');
    } catch (error) {
      console.error('加载品牌失败:', error);
      console.error('错误详情:', {
        message: error.message,
        stack: error.stack
      });
      // 设置空数组避免页面报错
      this.setData({ chineseBrands: [] });
    }
  },

  // 轮播图切换
  goToSlide(index) {
    this.setData({ currentSlide: index });
  },

  // 上一张
  prevSlide() {
    const { currentSlide, carouselItems } = this.data;
    const newIndex = currentSlide > 0 ? currentSlide - 1 : carouselItems.length - 1;
    this.setData({ currentSlide: newIndex });
  },

  // 下一张
  nextSlide() {
    const { currentSlide, carouselItems } = this.data;
    const newIndex = currentSlide < carouselItems.length - 1 ? currentSlide + 1 : 0;
    this.setData({ currentSlide: newIndex });
  },

  // 自动轮播
  autoPlay() {
    this.timer = setInterval(() => {
      this.nextSlide();
    }, 5000);
  },

  // 停止自动轮播
  stopAutoPlay() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  },

  // 查看车型详情
  viewModelDetail(e) {
    const modelId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/model-detail/model-detail?id=${modelId}`
    });
  },

  // 查看品牌详情
  viewBrandDetail(e) {
    const brandId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/brand-detail/brand-detail?id=${brandId}`
    });
  },

  // 搜索
  onSearch() {
    wx.navigateTo({
      url: '/pages/search/search'
    });
  },

  // 获取优化图片URL
  getOptimizedImageUrl,

  onUnload() {
    this.stopAutoPlay();
  },

  // 车型图片加载错误处理
  onModelImageError(e) {
    const index = e.currentTarget.dataset.index;
    const models = this.data.latestModels;
    if (models[index] && models[index].Brand && models[index].Brand.logo) {
      // 如果车型图片加载失败，尝试使用品牌logo
      models[index]._fallbackImage = models[index].Brand.logo;
      this.setData({
        'latestModels': models
      });
    }
  },

  // 品牌图片加载错误处理
  onBrandImageError(e) {
    const index = e.currentTarget.dataset.index;
    const brands = this.data.chineseBrands;
    if (brands[index]) {
      // 品牌图片加载失败，设置为空
      brands[index]._logoError = true;
      this.setData({
        'chineseBrands': brands
      });
    }
  },

  // 轮播图图片加载错误处理
  onCarouselImageError(e) {
    const index = e.currentTarget.dataset.index;
    const items = this.data.carouselItems;
    if (items[index] && items[index].Brand && items[index].Brand.logo) {
      // 如果轮播图图片加载失败，尝试使用品牌logo
      items[index]._fallbackImage = items[index].Brand.logo;
      this.setData({
        'carouselItems': items
      });
    }
  }
});

