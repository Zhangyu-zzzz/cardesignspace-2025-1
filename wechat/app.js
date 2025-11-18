// app.js
App({
  onLaunch() {
    console.log('小程序启动');
    
    // 检查登录状态
    this.checkAuth();
    
    // 获取系统信息
    this.getSystemInfo();
    
    // 检查网络状态
    this.checkNetworkStatus();
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
    // 只记录关键信息，避免输出整个对象
    console.log('系统信息:', {
      platform: systemInfo.platform,
      system: systemInfo.system,
      version: systemInfo.version,
      screenWidth: systemInfo.screenWidth,
      screenHeight: systemInfo.screenHeight
    });
    return systemInfo;
  },

  // 检查网络状态
  checkNetworkStatus() {
    wx.getNetworkType({
      success: (res) => {
        console.log('网络类型:', res.networkType);
        if (res.networkType === 'none') {
          wx.showToast({
            title: '网络未连接',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('获取网络状态失败:', err);
      }
    });
  }
});

