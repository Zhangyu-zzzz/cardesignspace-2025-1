// pages/draw-car/draw-car.js
import { drawCarAPI } from '../../utils/api';
const app = getApp();

Page({
  data: {
    isAuthenticated: false,
    vehicles: [],
    loading: true
  },

  onLoad() {
    this.checkAuth();
    if (app.globalData.isAuthenticated) {
      this.loadVehicles();
    }
  },

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
          }
        }
      });
    }
  },

  async loadVehicles() {
    this.setData({ loading: true });
    
    try {
      const res = await drawCarAPI.getVehicles();
      const vehicles = res.data || res || [];
      this.setData({ vehicles: vehicles });
    } catch (error) {
      console.error('加载车辆失败:', error);
    } finally {
      this.setData({ loading: false });
    }
  }
});

