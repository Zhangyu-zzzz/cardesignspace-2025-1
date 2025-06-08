import axios from 'axios'

// 创建专门用于认证的axios实例，避免拦截器冲突
const authAxios = axios.create({
  baseURL: process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : '',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 简单的请求拦截器，只添加token，不做其他处理
authAxios.interceptors.request.use(
  config => {
    console.log('🔐 认证请求:', config.method.toUpperCase(), config.url)
    
    // 从参数中获取token，或者从localStorage获取
    const token = config.token || localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      console.log('📝 添加token到请求头')
    }
    
    return config
  },
  error => {
    console.error('❌ 认证请求拦截器错误:', error)
    return Promise.reject(error)
  }
)

// 简单的响应拦截器，只记录日志，不做处理
authAxios.interceptors.response.use(
  response => {
    console.log('✅ 认证响应成功:', response.status, response.data)
    return response
  },
  error => {
    console.error('❌ 认证响应错误:', error.response && error.response.status, error.response && error.response.data)
    return Promise.reject(error)
  }
)

export default authAxios 