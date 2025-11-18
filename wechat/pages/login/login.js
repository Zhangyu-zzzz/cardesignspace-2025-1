// pages/login/login.js
import { authAPI } from '../../utils/api';
const app = getApp();

Page({
  data: {
    username: '',
    password: '',
    loading: false
  },

  // 用户名输入
  onUsernameInput(e) {
    this.setData({ username: e.detail.value });
  },

  // 密码输入
  onPasswordInput(e) {
    this.setData({ password: e.detail.value });
  },

  // 登录
  async onLogin() {
    const { username, password } = this.data;
    
    if (!username.trim()) {
      wx.showToast({
        title: '请输入用户名',
        icon: 'none'
      });
      return;
    }
    
    if (!password.trim()) {
      wx.showToast({
        title: '请输入密码',
        icon: 'none'
      });
      return;
    }

    this.setData({ loading: true });
    
    try {
      const res = await authAPI.login({
        username: username.trim(),
        password: password
      });
      
      const user = res.data?.user || res.user;
      const token = res.data?.token || res.token;
      
      if (user && token) {
        // 保存用户信息
        app.setUser(user, token);
        
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        });
        
        // 返回上一页或跳转到首页
        setTimeout(() => {
          const pages = getCurrentPages();
          if (pages.length > 1) {
            wx.navigateBack();
          } else {
            wx.switchTab({
              url: '/pages/home/home'
            });
          }
        }, 1500);
      } else {
        throw new Error('登录失败，请检查用户名和密码');
      }
    } catch (error) {
      console.error('登录失败:', error);
      wx.showToast({
        title: error.message || '登录失败',
        icon: 'none',
        duration: 2000
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 跳转到注册页
  goToRegister() {
    wx.navigateTo({
      url: '/pages/register/register'
    });
  }
});

