import { injectGlobalShareHandlers } from './utils/share';

injectGlobalShareHandlers();

// app.js
App({
  onLaunch() {
    console.log('小程序启动');
    console.log('当前环境:', __wxConfig?.envVersion || 'unknown');
    
    // 检查登录状态
    this.checkAuth();
    
    // 获取系统信息
    this.getSystemInfo();
    
    // 检查网络状态
    this.checkNetworkStatus();
    
    // 检查域名配置（真机调试时特别重要）
    this.checkDomainConfig();
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
            icon: 'none',
            duration: 3000
          });
        }
      },
      fail: (err) => {
        console.error('获取网络状态失败:', err);
      }
    });
  },

  // 检查域名配置（真机调试时）
  checkDomainConfig() {
    // 在真机上测试一个简单的请求，检查域名是否配置
    const testUrl = this.globalData.apiBaseUrl + '/health';
    console.log('测试域名配置:', testUrl);
    
    wx.request({
      url: testUrl,
      method: 'GET',
      timeout: 5000,
      success: (res) => {
        console.log('域名配置检查成功:', res.statusCode);
      },
      fail: (err) => {
        console.error('域名配置检查失败:', err.errMsg);
        // 如果是域名问题，在控制台给出明确提示
        if (err.errMsg && (err.errMsg.includes('domain') || err.errMsg.includes('不在以下'))) {
          console.error('⚠️⚠️⚠️ 域名未配置！请在微信公众平台配置合法域名！⚠️⚠️⚠️');
          console.error('配置步骤：');
          console.error('1. 登录 https://mp.weixin.qq.com/');
          console.error('2. 进入"开发" -> "开发管理" -> "开发设置"');
          console.error('3. 在"服务器域名"中添加：https://www.cardesignspace.com');
        }
      }
    });
  }
});

