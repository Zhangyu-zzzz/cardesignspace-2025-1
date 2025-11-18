// pages/profile/profile.js
import { userAPI, authAPI } from '../../utils/api';
const app = getApp();

Page({
  data: {
    user: null,
    loading: true,
    isAuthenticated: false
  },

  onLoad() {
    this.checkAuth();
  },

  onShow() {
    this.checkAuth();
    if (app.globalData.isAuthenticated) {
      this.loadProfile();
    }
  },

  // 检查认证状态
  checkAuth() {
    const isAuthenticated = app.globalData.isAuthenticated;
    this.setData({ isAuthenticated: isAuthenticated });
    
    if (!isAuthenticated) {
      this.setData({ loading: false });
    }
  },

  // 加载用户信息
  async loadProfile() {
    this.setData({ loading: true });
    
    try {
      const res = await userAPI.getProfile();
      const user = res.data || res;
      
      this.setData({ user: user });
    } catch (error) {
      console.error('加载用户信息失败:', error);
    } finally {
      this.setData({ loading: false });
    }
  },

  // 跳转到登录页
  goToLogin() {
    wx.navigateTo({
      url: '/pages/login/login'
    });
  },

  // 退出登录
  async onLogout() {
    const confirmed = await new Promise((resolve) => {
      wx.showModal({
        title: '提示',
        content: '确定要退出登录吗？',
        success: (res) => {
          resolve(res.confirm);
        }
      });
    });
    
    if (!confirmed) return;
    
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('退出登录失败:', error);
    } finally {
      app.clearUser();
      this.setData({ 
        user: null, 
        isAuthenticated: false 
      });
      
      wx.showToast({
        title: '已退出登录',
        icon: 'success'
      });
    }
  },

  // 编辑资料
  editProfile() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  }
});

