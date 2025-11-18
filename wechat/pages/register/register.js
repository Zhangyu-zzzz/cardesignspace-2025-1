// pages/register/register.js
import { authAPI } from '../../utils/api';
const app = getApp();

Page({
  data: {
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    loading: false
  },

  // 用户名输入
  onUsernameInput(e) {
    this.setData({ username: e.detail.value });
  },

  // 邮箱输入
  onEmailInput(e) {
    this.setData({ email: e.detail.value });
  },

  // 密码输入
  onPasswordInput(e) {
    this.setData({ password: e.detail.value });
  },

  // 确认密码输入
  onConfirmPasswordInput(e) {
    this.setData({ confirmPassword: e.detail.value });
  },

  // 注册
  async onRegister() {
    const { username, email, password, confirmPassword } = this.data;
    
    // 验证输入
    if (!username.trim()) {
      wx.showToast({
        title: '请输入用户名',
        icon: 'none'
      });
      return;
    }
    
    if (!email.trim()) {
      wx.showToast({
        title: '请输入邮箱',
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
    
    if (password !== confirmPassword) {
      wx.showToast({
        title: '两次密码输入不一致',
        icon: 'none'
      });
      return;
    }

    this.setData({ loading: true });
    
    try {
      const res = await authAPI.register({
        username: username.trim(),
        email: email.trim(),
        password: password
      });
      
      const user = res.data?.user || res.user;
      const token = res.data?.token || res.token;
      
      if (user && token) {
        // 保存用户信息
        app.setUser(user, token);
        
        wx.showToast({
          title: '注册成功',
          icon: 'success'
        });
        
        // 跳转到首页
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/home/home'
          });
        }, 1500);
      } else {
        throw new Error('注册失败，请重试');
      }
    } catch (error) {
      console.error('注册失败:', error);
      wx.showToast({
        title: error.message || '注册失败',
        icon: 'none',
        duration: 2000
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 跳转到登录页
  goToLogin() {
    wx.navigateBack();
  }
});

