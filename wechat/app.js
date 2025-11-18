// app.js
App({
  onLaunch() {
    // 检查登录状态
    this.checkAuth();
    
    // 获取系统信息
    this.getSystemInfo();
  },

  globalData: {
    user: null,
    token: null,
    isAuthenticated: false,
    systemInfo: null,
    apiBaseUrl: 'https://www.cardesignspace.com/api' // 根据实际情况修改
  },

  // 检查认证状态
  checkAuth() {
    const token = wx.getStorageSync('token');
    const user = wx.getStorageSync('user');
    
    if (token && user) {
      this.globalData.token = token;
      this.globalData.user = user;
      this.globalData.isAuthenticated = true;
    }
  },

  // 设置用户信息
  setUser(user, token) {
    this.globalData.user = user;
    this.globalData.token = token;
    this.globalData.isAuthenticated = true;
    
    wx.setStorageSync('user', user);
    wx.setStorageSync('token', token);
  },

  // 清除用户信息
  clearUser() {
    this.globalData.user = null;
    this.globalData.token = null;
    this.globalData.isAuthenticated = false;
    
    wx.removeStorageSync('user');
    wx.removeStorageSync('token');
  },

  // 获取系统信息
  getSystemInfo() {
    const systemInfo = wx.getSystemInfoSync();
    this.globalData.systemInfo = systemInfo;
    return systemInfo;
  }
});

