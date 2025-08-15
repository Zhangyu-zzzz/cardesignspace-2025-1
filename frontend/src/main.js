import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import ElementUI from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'

// 导入富文本编辑器
import VueQuillEditor from 'vue-quill-editor'
import 'quill/dist/quill.core.css'
import 'quill/dist/quill.snow.css'
import 'quill/dist/quill.bubble.css'

Vue.use(ElementUI)
Vue.use(VueQuillEditor)
Vue.config.productionTip = false

// 创建Vue实例前检查并恢复用户认证状态
async function initApp() {
  try {
    console.log('=== 应用初始化开始 ===')
    
    // 检查localStorage状态
    const token = localStorage.getItem('token')
    const userStr = localStorage.getItem('user')
    console.log('localStorage检查:')
    console.log('- token存在:', !!token)
    console.log('- user存在:', !!userStr)
    
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr)
        console.log('- user数据:', user)
      } catch (error) {
        console.error('- user数据解析失败:', error)
      }
    }
    
    // 检查初始Vuex状态
    console.log('初始Vuex状态:')
    console.log('- isAuthenticated:', store.state.isAuthenticated)
    console.log('- user:', store.state.user)
    console.log('- token:', store.state.token ? '存在' : '不存在')
    
    // 等待一小段时间确保axios拦截器设置完成
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // 尝试恢复用户会话
    console.log('正在检查用户登录状态...')
    const isAuthenticated = await store.dispatch('checkAuth')
    
    console.log('状态恢复结果:', isAuthenticated)
    console.log('恢复后Vuex状态:')
    console.log('- isAuthenticated:', store.state.isAuthenticated)
    console.log('- user:', store.state.user)
    
    if (isAuthenticated) {
      console.log('✅ 用户登录状态恢复成功')
    } else {
      console.log('❌ 用户未登录或登录已过期')
    }
  } catch (error) {
    console.error('❌ 恢复用户状态失败:', error)
  } finally {
    console.log('=== 启动Vue应用 ===')
    // 无论恢复成功与否，都启动应用
    new Vue({
      router,
      store,
      render: h => h(App)
    }).$mount('#app')
  }
}

// 启动应用
initApp() 