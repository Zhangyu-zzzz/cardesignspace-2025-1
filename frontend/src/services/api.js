import axios from 'axios';

// 根据环境确定API基础URL
const getBaseURL = () => {
  // 在生产环境中，API请求会通过nginx代理到后端
  if (process.env.NODE_ENV === 'production') {
    return '/api';  // 使用相对路径，通过nginx代理
  }
  // 开发环境直接连接到后端服务器
  return process.env.VUE_APP_API_URL || 'http://localhost:3000/api';
};

// 创建axios实例
const apiClient = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    console.log(`发送请求 [${config.method.toUpperCase()} ${config.url}]:`, {
      headers: config.headers,
      params: config.params,
      data: config.data ? (
        config.url.includes('login') || config.url.includes('register')
          ? { ...config.data, password: '******' }  // 不记录密码
          : config.data
      ) : undefined
    });
    
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('请求拦截器错误:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    console.log(`收到响应 [${response.config.method.toUpperCase()} ${response.config.url}]:`, {
      status: response.status,
      headers: response.headers,
      data: response.data
    });
    return response.data;
  },
  (error) => {
    console.error('API请求错误:', error);
    
    // 记录错误响应详情
    if (error.response) {
      console.log('API错误响应 [${error.config.method.toUpperCase()} ${error.config.url}]:', {
        status: error.response.status,
        headers: error.response.headers,
        data: error.response.data
      });
    }
    
    return Promise.reject(error);
  }
);

// 认证相关API
export const authAPI = {
  login: (credentials) => apiClient.post('/auth/login', credentials),
  register: (userData) => apiClient.post('/auth/register', userData),
  me: () => apiClient.get('/auth/me')
};

// 品牌相关API
export const brandAPI = {
  getAll: () => apiClient.get('/upload/brands', { params: { _t: Date.now() } }),
  getById: (id) => apiClient.get(`/brands/${id}`),
  create: (data) => apiClient.post('/brands', data),
  update: (id, data) => apiClient.put(`/brands/${id}`, data),
  delete: (id) => apiClient.delete(`/brands/${id}`)
};

// 车型相关API
export const modelAPI = {
  getAll: (params) => apiClient.get('/models', { params }),
  getById: (id) => apiClient.get(`/models/${id}`),
  create: (data) => apiClient.post('/models', data),
  update: (id, data) => apiClient.put(`/models/${id}`, data),
  delete: (id) => apiClient.delete(`/models/${id}`)
};

// 图片相关API
export const imageAPI = {
  getAll: (params) => apiClient.get('/images', { params }),
  getByModelId: (modelId) => apiClient.get(`/images/model/${modelId}`),
  upload: (data) => apiClient.post('/images/upload', data),
  delete: (id) => apiClient.delete(`/images/${id}`)
};

export const seriesAPI = {
  getAll: () => apiClient.get('/series'),
  getById: (id) => apiClient.get(`/series/${id}`),
  getModels: (seriesId) => apiClient.get(`/series/${seriesId}/models`),
  create: (data) => apiClient.post('/series', data),
  update: (id, data) => apiClient.put(`/series/${id}`, data),
  delete: (id) => apiClient.delete(`/series/${id}`)
};

export const userAPI = {
  getProfile: () => apiClient.get('/users/profile'),
  updateProfile: (data) => apiClient.put('/users/profile', data)
};

export default {
  brand: brandAPI,
  series: seriesAPI,
  model: modelAPI,
  image: imageAPI,
  auth: authAPI,
  user: userAPI
}; 