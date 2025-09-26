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

const isVerboseLoggingEnabled = process.env.NODE_ENV !== 'production';

const summarizePayload = (data) => {
  if (Array.isArray(data)) {
    return { type: 'array', length: data.length };
  }
  if (data && typeof data === 'object') {
    const keys = Object.keys(data);
    const summary = { type: 'object', keys: keys.slice(0, 5) };
    if (Array.isArray(data.data)) {
      summary.dataLength = data.data.length;
    }
    return summary;
  }
  return data;
};

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    if (isVerboseLoggingEnabled) {
      const method = config.method ? config.method.toUpperCase() : 'UNKNOWN';
      console.log(
        `[API Request] ${method} ${config.url}`,
        {
          params: config.params,
          hasData: !!config.data,
          dataSummary: summarizePayload(config.data)
        }
      );
    }
    
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
    if (isVerboseLoggingEnabled) {
      const method = response.config?.method ? response.config.method.toUpperCase() : 'UNKNOWN';
      console.log(
        `[API Response] ${method} ${response.config.url}`,
        {
          status: response.status,
          dataSummary: summarizePayload(response.data)
        }
      );
    }
    return response.data;
  },
  (error) => {
    console.error('API请求错误:', error.message || error);
    
    if (isVerboseLoggingEnabled && error.response) {
      console.log(
        `[API Error Response] ${error.config?.method?.toUpperCase() || 'UNKNOWN'} ${error.config?.url || ''}`,
        {
          status: error.response.status,
          dataSummary: summarizePayload(error.response.data)
        }
      );
    }
    
    return Promise.reject(error);
  }
);

// 认证相关API
export const authAPI = {
  login: (credentials) => apiClient.post('/auth/login', credentials),
  register: (userData) => apiClient.post('/auth/register', userData),
  me: () => apiClient.get('/auth/me'),
  logout: () => apiClient.post('/auth/logout')
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

// 文章相关API
export const articleAPI = {
  getAll: (params) => apiClient.get('/articles', { params }),
  getById: (id) => apiClient.get(`/articles/${id}`),
  getPopular: () => apiClient.get('/articles/popular'),
  getCategoryStats: () => apiClient.get('/articles/categories/stats'),
  create: (data) => apiClient.post('/articles', data),
  update: (id, data) => apiClient.put(`/articles/${id}`, data),
  delete: (id) => apiClient.delete(`/articles/${id}`),
  toggleLike: (id) => apiClient.post(`/articles/${id}/like`)
};

export { apiClient };

export default {
  brand: brandAPI,
  series: seriesAPI,
  model: modelAPI,
  image: imageAPI,
  auth: authAPI,
  user: userAPI,
  article: articleAPI
}; 
