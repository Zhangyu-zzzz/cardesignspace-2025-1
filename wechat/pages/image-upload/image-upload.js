// pages/image-upload/image-upload.js
import { imageAPI, modelAPI, brandAPI } from '../../utils/api';
const app = getApp();

Page({
  data: {
    isAuthenticated: false,
    brands: [],
    models: [],
    selectedBrandId: '',
    selectedModelId: '',
    selectedBrandIndex: -1,
    selectedModelIndex: -1,
    imagePath: '',
    uploading: false
  },

  onLoad() {
    this.checkAuth();
    this.loadBrands();
  },

  // 检查认证状态
  checkAuth() {
    const isAuthenticated = app.globalData.isAuthenticated;
    this.setData({ isAuthenticated: isAuthenticated });
    
    if (!isAuthenticated) {
      wx.showModal({
        title: '提示',
        content: '请先登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/login/login'
            });
          } else {
            wx.navigateBack();
          }
        }
      });
    }
  },

  // 加载品牌列表
  async loadBrands() {
    try {
      const res = await brandAPI.getAll();
      const brands = res.data || res || [];
      this.setData({ brands: brands });
    } catch (error) {
      console.error('加载品牌失败:', error);
    }
  },

  // 选择品牌
  onBrandChange(e) {
    const index = parseInt(e.detail.value);
    const brand = this.data.brands[index];
    if (brand) {
      this.setData({ 
        selectedBrandId: brand.id,
        selectedBrandIndex: index,
        selectedModelId: '',
        selectedModelIndex: -1,
        models: []
      });
      this.loadModels(brand.id);
    }
  },

  // 加载车型列表
  async loadModels(brandId) {
    try {
      const res = await modelAPI.getAll({ brandId: brandId });
      const models = res.data || res || [];
      this.setData({ models: models });
    } catch (error) {
      console.error('加载车型失败:', error);
    }
  },

  // 选择车型
  onModelChange(e) {
    const index = parseInt(e.detail.value);
    const model = this.data.models[index];
    if (model) {
      this.setData({ 
        selectedModelId: model.id,
        selectedModelIndex: index
      });
    }
  },

  // 选择图片
  chooseImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({ imagePath: res.tempFilePaths[0] });
      }
    });
  },

  // 上传图片
  async uploadImage() {
    const { imagePath, selectedModelId } = this.data;
    
    if (!imagePath) {
      wx.showToast({
        title: '请选择图片',
        icon: 'none'
      });
      return;
    }
    
    if (!selectedModelId) {
      wx.showToast({
        title: '请选择车型',
        icon: 'none'
      });
      return;
    }

    this.setData({ uploading: true });
    
    try {
      await imageAPI.upload(imagePath, {
        modelId: selectedModelId
      });
      
      wx.showToast({
        title: '上传成功',
        icon: 'success'
      });
      
      // 清空表单
      this.setData({
        imagePath: '',
        selectedModelId: '',
        selectedBrandId: '',
        models: []
      });
    } catch (error) {
      console.error('上传失败:', error);
      wx.showToast({
        title: error.message || '上传失败',
        icon: 'none'
      });
    } finally {
      this.setData({ uploading: false });
    }
  }
});

