import Vue from 'vue'
import Vuex from 'vuex'
import authAxios from '../utils/authAxios'

Vue.use(Vuex)

// 从localStorage加载初始状态
const token = localStorage.getItem('token')
const userStr = localStorage.getItem('user')
let user = null

try {
  if (userStr) {
    user = JSON.parse(userStr)
  }
} catch (error) {
  console.error('解析localStorage中的用户信息失败:', error)
  localStorage.removeItem('user')
}

export default new Vuex.Store({
  state: {
    isAuthenticated: !!(token && user),
    user: user,
    token: token
  },
  mutations: {
    setAuth(state, auth) {
      state.isAuthenticated = auth.isAuthenticated
      state.user = auth.user
      state.token = auth.token
      
      // 同步到localStorage
      if (auth.token) {
        localStorage.setItem('token', auth.token)
      }
      if (auth.user) {
        localStorage.setItem('user', JSON.stringify(auth.user))
      }
    },
    clearAuth(state) {
      state.isAuthenticated = false
      state.user = null
      state.token = null
      
      // 清除localStorage
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    },
    updateUser(state, userData) {
      state.user = { ...state.user, ...userData }
      
      // 同步到localStorage
      if (state.user) {
        localStorage.setItem('user', JSON.stringify(state.user))
      }
    }
  },
  actions: {
    // 登录操作
    login({ commit }, authData) {
      commit('setAuth', {
        isAuthenticated: true,
        user: authData.user,
        token: authData.token
      })
    },
    
    // 登出操作
    logout({ commit }) {
      commit('clearAuth')
    },
    
    // 更新用户信息
    updateUser({ commit }, userData) {
      commit('updateUser', userData)
    },
    
    // 检查并恢复用户会话
    async checkAuth({ commit, state }) {
      console.log('🔍 开始检查认证状态...')
      
      // 从localStorage获取token，如果Vuex中没有的话
      let token = state.token
      if (!token) {
        token = localStorage.getItem('token')
        if (token) {
          console.log('🔄 从localStorage恢复token')
        }
      }
      
      // 如果没有token，不需要检查
      if (!token) {
        console.log('❌ 没有token，清除认证状态')
        commit('clearAuth')
        return false
      }
      
      console.log('📝 找到token，验证中...')
      console.log('Token:', token.substring(0, 50) + '...')
      
      try {
        // 使用专门的认证axios实例验证token
        console.log('🌐 发送请求到 /api/auth/me')
        const response = await authAxios.get('/api/auth/me', {
          token: token  // 传递token给拦截器
        })
        
        console.log('📥 收到响应:', response.data)
        
        // 兼容两种响应格式
        const isSuccess = response.data.status === 'success' || response.data.success === true
        const userData = response.data.data || response.data.user
        
        console.log('✅ 响应解析:')
        console.log('- 成功状态:', isSuccess)
        console.log('- 用户数据:', userData)
        
        if (isSuccess && userData) {
          // 如果验证成功，更新用户信息
          console.log('✅ Token验证成功，更新认证状态')
          commit('setAuth', {
            isAuthenticated: true,
            user: userData,
            token: token
          })
          return true
        } else {
          // 如果验证失败，清除认证状态
          console.log('❌ Token验证失败，清除认证状态')
          commit('clearAuth')
          return false
        }
      } catch (error) {
        console.error('❌ 验证用户会话失败:')
        console.error('- 错误类型:', error.name)
        console.error('- 错误信息:', error.message)
        
        if (error.response) {
          console.error('- 响应状态:', error.response.status)
          console.error('- 响应数据:', error.response.data)
          console.error('- 请求头:', (error.config && error.config.headers) || 'undefined')
        }
        
        // 如果验证失败，清除认证状态
        commit('clearAuth')
        return false
      }
    }
  },
  modules: {
  }
}) 