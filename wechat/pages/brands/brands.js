// pages/brands/brands.js
import { brandAPI } from '../../utils/api';

Page({
  data: {
    brands: [],
    loading: true,
    error: null,
    searchKeyword: '',
    filteredBrands: []
  },

  onLoad() {
    this.loadBrands();
  },

  // 加载品牌列表
  async loadBrands() {
    this.setData({ loading: true, error: null });
    
    try {
      const res = await brandAPI.getAll();
      const brands = res.data || res || [];
      
      this.setData({
        brands: brands,
        filteredBrands: brands
      });
    } catch (error) {
      console.error('加载品牌失败:', error);
      this.setData({ error: error.message || '加载失败' });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 搜索品牌
  onSearchInput(e) {
    const keyword = e.detail.value;
    this.setData({ searchKeyword: keyword });
    this.filterBrands(keyword);
  },

  // 筛选品牌
  filterBrands(keyword) {
    const { brands } = this.data;
    
    if (!keyword.trim()) {
      this.setData({ filteredBrands: brands });
      return;
    }
    
    const filtered = brands.filter(brand => 
      brand.name.toLowerCase().includes(keyword.toLowerCase()) ||
      (brand.chinese_name && brand.chinese_name.includes(keyword))
    );
    
    this.setData({ filteredBrands: filtered });
  },

  // 查看品牌详情
  viewBrandDetail(e) {
    const brandId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/brand-detail/brand-detail?id=${brandId}`
    });
  }
});

