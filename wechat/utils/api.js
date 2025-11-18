// utils/api.js
const app = getApp();

// API基础URL
const getBaseURL = () => {
  return app.globalData.apiBaseUrl || 'https://www.cardesignspace.com/api';
};

// 请求封装
const request = (options) => {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('token');
    
    wx.request({
      url: getBaseURL() + options.url,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        ...options.header
      },
      success: (res) => {
        if (res.statusCode === 200) {
          // 处理不同的响应格式
          const data = res.data;
          
          // 如果响应数据有success字段，检查是否成功
          if (data.success === false) {
            reject(new Error(data.message || '请求失败'));
            return;
          }
          
          // 如果响应数据有status字段，检查是否成功
          if (data.status === 'error') {
            reject(new Error(data.message || '请求失败'));
            return;
          }
          
          // 返回数据
          resolve(data);
        } else if (res.statusCode === 401) {
          // token过期，清除用户信息
          app.clearUser();
          wx.showToast({
            title: '登录已过期',
            icon: 'none'
          });
          reject(new Error('登录已过期'));
        } else {
          // 记录详细的错误信息用于调试
          console.error('API请求失败:', {
            statusCode: res.statusCode,
            data: res.data,
            header: res.header
          });
          const errorMsg = res.data?.message || res.data?.error || `请求失败 (${res.statusCode})`;
          reject(new Error(errorMsg));
        }
      },
      fail: (err) => {
        reject(err);
      }
    });
  });
};

// 认证相关API
export const authAPI = {
  login: (credentials) => request({
    url: '/auth/login',
    method: 'POST',
    data: credentials
  }),
  
  register: (userData) => request({
    url: '/auth/register',
    method: 'POST',
    data: userData
  }),
  
  me: () => request({
    url: '/auth/me',
    method: 'GET'
  }),
  
  logout: () => request({
    url: '/auth/logout',
    method: 'POST'
  })
};

// 品牌相关API
export const brandAPI = {
  getAll: () => request({
    url: '/upload/brands',
    method: 'GET',
    data: { _t: Date.now() }
  }),
  
  getById: (id) => request({
    url: `/brands/${id}`,
    method: 'GET'
  })
};

// 车型相关API
export const modelAPI = {
  getAll: (params) => request({
    url: '/models',
    method: 'GET',
    data: params
  }),
  
  getById: (id) => request({
    url: `/models/${id}`,
    method: 'GET'
  }),
  
  getImages: (modelId, params = {}) => request({
    url: `/models/${modelId}/images`,
    method: 'GET',
    data: params
  })
};

// 图片相关API
export const imageAPI = {
  getAll: (params) => request({
    url: '/images',
    method: 'GET',
    data: params
  }),
  
  getByModelId: (modelId, params = {}) => request({
    url: `/models/${modelId}/images`,
    method: 'GET',
    data: params
  }),
  
  upload: (filePath, formData) => {
    return new Promise((resolve, reject) => {
      const token = wx.getStorageSync('token');
      
      wx.uploadFile({
        url: getBaseURL() + '/images/upload',
        filePath: filePath,
        name: 'image',
        formData: formData,
        header: {
          'Authorization': token ? `Bearer ${token}` : ''
        },
        success: (res) => {
          try {
            const data = JSON.parse(res.data);
            if (data.success === false) {
              reject(new Error(data.message || '上传失败'));
            } else {
              resolve(data);
            }
          } catch (e) {
            reject(new Error('解析响应失败'));
          }
        },
        fail: (err) => {
          reject(err);
        }
      });
    });
  },
  
  delete: (id) => request({
    url: `/images/${id}`,
    method: 'DELETE'
  })
};

// 搜索相关API
export const searchAPI = {
  search: (keyword, params = {}) => {
    // 对于GET请求，将参数拼接到URL中（兼容微信小程序）
    const queryObj = { q: keyword, ...params };
    const queryString = Object.keys(queryObj)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(queryObj[key])}`)
      .join('&');
    return request({
      url: `/search?${queryString}`,
      method: 'GET'
    });
  }
};

// 文章相关API
export const articleAPI = {
  getAll: (params) => request({
    url: '/articles',
    method: 'GET',
    data: params
  }),
  
  getById: (id) => request({
    url: `/articles/${id}`,
    method: 'GET'
  }),
  
  getPopular: () => request({
    url: '/articles/popular',
    method: 'GET'
  })
};

// 用户相关API
export const userAPI = {
  getProfile: () => request({
    url: '/users/profile',
    method: 'GET'
  }),
  
  updateProfile: (data) => request({
    url: '/users/profile',
    method: 'PUT',
    data: data
  })
};

// 论坛相关API
export const forumAPI = {
  getPosts: (params) => request({
    url: '/forum/posts',
    method: 'GET',
    data: params
  }),
  
  getPostById: (id) => request({
    url: `/forum/posts/${id}`,
    method: 'GET'
  }),
  
  createPost: (data) => request({
    url: '/forum/posts',
    method: 'POST',
    data: data
  })
};

// 灵感相关API
export const inspirationAPI = {
  getAll: (params) => request({
    url: '/inspiration',
    method: 'GET',
    data: params
  })
};

// 画了个车相关API
export const drawCarAPI = {
  getVehicles: (params) => request({
    url: '/draw-car/vehicles',
    method: 'GET',
    data: params
  }),
  
  createVehicle: (data) => request({
    url: '/draw-car/vehicles',
    method: 'POST',
    data: data
  }),
  
  vote: (vehicleId) => request({
    url: `/draw-car/vehicles/${vehicleId}/vote`,
    method: 'POST'
  })
};

export default {
  auth: authAPI,
  brand: brandAPI,
  model: modelAPI,
  image: imageAPI,
  search: searchAPI,
  article: articleAPI,
  user: userAPI,
  forum: forumAPI,
  inspiration: inspirationAPI,
  drawCar: drawCarAPI
};

