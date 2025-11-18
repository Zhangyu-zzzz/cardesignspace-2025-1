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
      this.setData({ error: error.message || '加载失败' });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 加载最新车型
  async loadLatestModels() {
    try {
      const res = await modelAPI.getAll({
        limit: 10,
        order: [['createdAt', 'DESC']]
      });
      
      const models = res.data || res || [];
      const carouselItems = models.slice(0, 5).map(model => ({
        ...model,
        type: 'model'
      }));
      
      this.setData({
        latestModels: models,
        carouselItems: carouselItems
      });
    } catch (error) {
      console.error('加载最新车型失败:', error);
    }
  },

  // 加载中国品牌
  async loadChineseBrands() {
    try {
      const res = await brandAPI.getAll();
      const brands = res.data || res || [];
      
      // 筛选中国品牌
      const chineseBrands = brands.filter(brand => 
        brand.country === '中国' || 
        brand.country === 'China' ||
        ['比亚迪', '吉利', '长城', '奇瑞', '长安', '上汽', '一汽', '广汽', '东风', '北汽'].includes(brand.name)
      );
      
      this.setData({ chineseBrands: chineseBrands.slice(0, 12) });
    } catch (error) {
      console.error('加载品牌失败:', error);
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
  }
});

