<template>
  <div id="app">
    <el-container>
      <el-header class="navbar-container">
        <!-- 导航栏重新设计 -->
        <div class="navbar">
          <!-- 左侧导航区域 -->
          <div class="navbar-left">
            <!-- 网站Logo -->
            <div class="navbar-logo" @click="$router.push('/')">
              <!-- 桌面端logo -->
              <img 
                src="https://cardesignspace-cos-1-1259492452.cos.ap-shanghai.myqcloud.com/CDS-LOGO.png" 
                alt="CARDESIGNSPACE" 
                class="logo-image logo-desktop"
              />
              <!-- 移动端logo -->
              <img 
                src="https://cardesignspace-cos-1-1259492452.cos.ap-shanghai.myqcloud.com/CDS-LOGO-SINGLE.png" 
                alt="CARDESIGNSPACE" 
                class="logo-image logo-mobile"
              />
            </div>
          </div>

          <!-- 中间搜索区域 -->
          <div class="navbar-center">
            <div class="search-box">
              <el-input 
                :placeholder="searchPlaceholder" 
                v-model="searchKeyword"
                class="search-input mobile-search-input"
                @keyup.enter.native="handleSearch"
                clearable
                size="medium"
              >
                <el-button 
                  slot="append" 
                  icon="el-icon-search"
                  @click="handleSearch"
                ></el-button>
              </el-input>
            </div>
          </div>
          
          <!-- 右侧导航菜单 -->
          <div class="navbar-right">
            <!-- 导航菜单 -->
            <div class="navbar-menu">
              <el-menu mode="horizontal" router class="nav-menu-items">
                <el-menu-item index="/articles" class="nav-item">
                  <span>汽车资讯</span>
                </el-menu-item>
                <el-menu-item index="/forum" class="nav-item">
                  <span>用户论坛</span>
                </el-menu-item>
                <el-menu-item index="/upload" class="nav-item">
                  <span>图片上传</span>
                </el-menu-item>
                <!-- <el-menu-item v-if="user" index="/articles/edit" class="nav-item">
                  <span>写文章</span>
                </el-menu-item> -->
              </el-menu>
            </div>

            <!-- 用户未登录时显示登录注册 -->
            <template v-if="!user">
              <div class="auth-buttons">
                <el-button type="text" @click="showAuthDialog('login')" class="login-btn">
                  登录
                </el-button>
                <el-button type="primary" size="small" @click="showAuthDialog('register')" class="register-btn">
                  注册
                </el-button>
              </div>
            </template>
            
            <!-- 用户已登录时显示功能区 -->
            <template v-else>
              <div class="user-functions">
                <!-- 消息通知 -->
                <div class="notification-wrapper">
                  <NotificationCenter />
                </div>
                
                <!-- 用户头像菜单 -->
                <div class="user-menu-wrapper">
                  <el-dropdown @command="handleUserMenuCommand" placement="bottom-end">
                    <div class="user-profile-trigger">
                      <el-avatar 
                        :size="36" 
                        :src="user.avatar" 
                        icon="el-icon-user-solid"
                        class="user-avatar clickable-avatar"
                      ></el-avatar>
                      <span class="username clickable-username">{{ user.username }}</span>
                      <i class="el-icon-arrow-down el-icon--right"></i>
                    </div>
                    <el-dropdown-menu slot="dropdown" class="user-dropdown-menu">
                      <el-dropdown-item command="points" class="points-dropdown-item">
                        <i class="el-icon-star-on" style="color: #f39c12;"></i>
                        <span class="dropdown-points-label">我的积分</span>
                        <span class="dropdown-points-value">{{ user.points || 0 }}</span>
                      </el-dropdown-item>
                      <el-dropdown-item divided command="profile">
                        <i class="el-icon-user"></i>
                        个人资料
                      </el-dropdown-item>
                      <el-dropdown-item command="favorites">
                        <i class="el-icon-star-on"></i>
                        我的收藏
                      </el-dropdown-item>
                      <el-dropdown-item command="uploads">
                        <i class="el-icon-upload"></i>
                        我的上传
                      </el-dropdown-item>
                      <el-dropdown-item divided command="logout">
                        <i class="el-icon-switch-button"></i>
                        退出登录
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </el-dropdown>
                </div>
              </div>
            </template>
          </div>
        </div>
      </el-header>
      <el-main>
        <router-view @user-updated="updateUser" />
      </el-main>
      <el-footer>© 2025 CARDESIGNSPACE</el-footer>
    </el-container>
    
    <!-- 认证弹窗 -->
    <AuthDialog
      :show.sync="authDialogVisible"
      :mode="authMode"
      @login-success="onLoginSuccess"
    />
  </div>
</template>

<script>
import AuthDialog from './components/AuthDialog.vue'
import NotificationCenter from './components/NotificationCenter.vue'
import axios from 'axios'
import { authAPI } from './services/api'
import { mapState, mapActions } from 'vuex'

export default {
  name: 'App',
  components: {
    AuthDialog,
    NotificationCenter
  },
  data() {
    return {
      authDialogVisible: false,
      authMode: 'login',
      searchKeyword: '',
    }
  },
  computed: {
    ...mapState(['user', 'isAuthenticated']),
    searchPlaceholder() {
      // 检测屏幕宽度来显示不同的placeholder
      if (typeof window !== 'undefined' && window.innerWidth <= 768) {
        return '搜索品牌或车型'
      }
      return '搜索您感兴趣的汽车品牌或车型'
    }
  },
  mounted() {
    this.setupAxiosInterceptors()
    this.initializeAuth()
    // 监听窗口大小变化以更新placeholder
    window.addEventListener('resize', this.handleResize)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.handleResize)
  },
      methods: {
    ...mapActions(['login', 'logout', 'updateUser', 'checkAuth']),
    
    // 处理窗口大小变化
    handleResize() {
      this.$forceUpdate() // 强制更新组件以重新计算placeholder
    },
    
    // 初始化认证状态
    async initializeAuth() {
      // 检查并恢复用户会话
      await this.checkAuth()
    },
    
    // 设置axios拦截器
    setupAxiosInterceptors() {
      // 请求拦截器：添加token
      axios.interceptors.request.use(
        config => {
          const token = localStorage.getItem('token')
          console.log('🔐 请求拦截器:', {
            url: config.url,
            method: config.method,
            hasToken: !!token,
            tokenPreview: token ? token.substring(0, 20) + '...' : '无token'
          })
          if (token) {
            config.headers.Authorization = `Bearer ${token}`
            console.log('✅ 已添加Authorization头')
          } else {
            console.log('❌ 没有token，未添加Authorization头')
          }
          return config
        },
        error => {
          return Promise.reject(error)
        }
      )
      
      // 响应拦截器：处理token过期
      axios.interceptors.response.use(
        response => response,
        error => {
          console.log('🚨 拦截器捕获错误:', {
            url: error.config && error.config.url,
            status: error.response && error.response.status,
            data: error.response && error.response.data,
            message: error.message
          })
          
          // 只有在非checkAuth请求时才显示消息和清除数据
          // checkAuth请求应该自己处理错误
          if (error.response && error.response.status === 401) {
            const isCheckAuthRequest = error.config && error.config.url && error.config.url.includes('/api/auth/me')
            const isArticleRequest = error.config && error.config.url && error.config.url.includes('/api/articles')
            
            // 检查是否是真的认证错误（包含认证相关的错误信息）
            const errorMessage = (error.response && error.response.data && error.response.data.message) || ''
            const isAuthError = errorMessage.includes('认证') || errorMessage.includes('token') || errorMessage.includes('登录')
            
            console.log('🔍 401错误分析:', {
              isCheckAuthRequest,
              isArticleRequest,
              errorMessage,
              isAuthError,
              url: error.config && error.config.url
            })
            
            // 特殊处理"The user belonging to this token no longer exists"错误
            if (errorMessage.includes('The user belonging to this token no longer exists')) {
              console.log('💥 用户不存在，立即清除用户数据')
              this.clearUserData()
              this.$message.error('用户账户不存在，请重新登录')
              return Promise.reject(error)
            }
            
            // 对于文章相关请求，不在这里清除用户数据，让具体的组件处理
            if (isArticleRequest) {
              console.log('ℹ️ 文章请求401错误，让组件自行处理')
              return Promise.reject(error)
            }
            
            // 只有在特定的认证错误时才清除用户数据
            // 避免因为偶发问题就清除用户会话
            if (!isCheckAuthRequest && 
                (errorMessage.includes('invalid signature') || 
                 errorMessage.includes('expired') || 
                 errorMessage.includes('malformed'))) {
              console.log('💥 清除用户数据，显示登录过期消息')
              this.clearUserData()
              this.$message.warning('登录已过期，请重新登录')
            } else {
              console.log('ℹ️ 暂时忽略401错误，避免误清除用户数据')
              // 只显示错误消息，不清除数据
              if (!isCheckAuthRequest) {
                this.$message.error('操作失败，请重试')
              }
            }
          }
          return Promise.reject(error)
        }
      )
    },
    
    // 显示认证弹窗
    showAuthDialog(mode) {
      this.authMode = mode
      this.authDialogVisible = true
    },
    
    // 登录成功回调
    onLoginSuccess(data) {
      this.login(data)
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      this.$message.success(`欢迎回来，${data.user.username}！`)
    },
    
    // 处理用户菜单命令
    handleUserMenuCommand(command) {
      switch (command) {
        case 'points':
          this.$router.push('/profile')
          break
        case 'profile':
          this.$router.push('/profile')
          break
        case 'favorites':
          this.$router.push({ path: '/profile', query: { tab: 'favorites' } })
          break
        case 'uploads':
          this.goToMyUploads()
          break
        case 'logout':
          this.handleLogout()
          break
      }
    },
    
    // 退出登录
    async handleLogout() {
      this.$confirm('确定要退出登录吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(async () => {
        try {
          // 调用后端退出登录API
          await authAPI.logout()
          this.clearUserData()
          this.$message.success('已退出登录')
        } catch (error) {
          console.error('调用退出登录API失败:', error)
          // 即使API调用失败，也清除本地数据
          this.clearUserData()
          this.$message.success('已退出登录')
        }
      }).catch(() => {
        // 用户取消退出
      })
    },
    
    // 清除用户数据
    clearUserData() {
      this.logout()
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    },

    // 导航到我的上传页面
    goToMyUploads() {
      this.$router.push({ path: '/profile', query: { tab: 'uploads' } })
    },

    // 导航到个人主页
    goToProfile() {
      this.$router.push('/profile')
    },

    // 处理搜索
    handleSearch() {
      if (!this.searchKeyword.trim()) return;
      this.$router.push({
        path: '/search',
        query: { keyword: this.searchKeyword.trim() }
      });
    }
  }
}
</script>

<style>
/* 全局防止水平滚动 */
html, body {
  overflow-x: hidden;
  width: 100%;
  max-width: 100%;
  margin: 0;
  padding: 0;
}

#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;
  margin: 0;
  padding: 0;
}

/* Element UI 容器重置 */
.el-container {
  width: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
}

.el-header {
  padding: 0 !important;
  margin: 0 !important;
  width: 100% !important;
}

.el-main {
  padding: 0 !important;
  margin: 0 !important;
}

/* ===== Element UI 主题色覆盖 ===== */
/* 覆盖 Element UI 的主色调 */
.el-button--primary {
  background-color: #e03426 !important;
  border-color: #e03426 !important;
}

.el-button--primary:hover, 
.el-button--primary:focus {
  background-color: #f04838 !important;
  border-color: #f04838 !important;
}

.el-button--primary:active {
  background-color: #d02e20 !important;
  border-color: #d02e20 !important;
}

.el-button--primary.is-disabled {
  background-color: #f0a3a3 !important;
  border-color: #f0a3a3 !important;
}

/* Tag primary */
.el-tag--primary {
  background-color: #e03426 !important;
  border-color: #e03426 !important;
}

/* Link color */
.el-link--primary {
  color: #e03426 !important;
}

.el-link--primary:hover {
  color: #f04838 !important;
}

/* Loading primary */
.el-loading-spinner .el-loading-text {
  color: #e03426 !important;
}

/* Switch primary */
.el-switch.is-checked .el-switch__core {
  background-color: #e03426 !important;
  border-color: #e03426 !important;
}

/* Checkbox primary */
.el-checkbox__input.is-checked .el-checkbox__inner {
  background-color: #e03426 !important;
  border-color: #e03426 !important;
}

/* Radio primary */
.el-radio__input.is-checked .el-radio__inner {
  background-color: #e03426 !important;
  border-color: #e03426 !important;
}

/* Progress primary */
.el-progress-bar__inner {
  background-color: #e03426 !important;
}

/* Slider primary */
.el-slider__button {
  border-color: #e03426 !important;
}

.el-slider__bar {
  background-color: #e03426 !important;
}

/* Menu 菜单项强制覆盖 */
.el-menu--horizontal .el-menu-item {
  background-color: transparent !important;
  color: #ffffff !important;
}

.el-menu--horizontal .el-menu-item:hover {
  background-color: transparent !important;
  color: #e03426 !important;
}

.el-menu--horizontal .el-menu-item.is-active {
  background-color: transparent !important;
  color: #e03426 !important;
  border-bottom: none !important;
}

/* 更强制的菜单项样式覆盖 */
.navbar .el-menu-item,
.navbar .el-menu-item:hover,
.navbar .el-menu-item:focus,
.navbar .el-menu-item.is-active,
.navbar .el-menu-item.is-active:hover {
  background-color: transparent !important;
  background: transparent !important;
}

.navbar .nav-item,
.navbar .nav-item:hover,
.navbar .nav-item:focus,
.navbar .nav-item.is-active,
.navbar .nav-item.is-active:hover {
  background-color: transparent !important;
  background: transparent !important;
}

/* 终极覆盖 - 确保导航菜单项完全透明 */
.navbar-container .el-menu,
.navbar-container .el-menu-item,
.navbar-container .nav-item {
  background: none !important;
  background-color: transparent !important;
  background-image: none !important;
}

.navbar-container .el-menu-item::before,
.navbar-container .el-menu-item::after {
  display: none !important;
}

/* 强制所有状态下的透明背景 */
.navbar-container .el-menu-item[class*="is-"],
.navbar-container .el-menu-item[class*="el-"],
.navbar-container .nav-item[class*="is-"],
.navbar-container .nav-item[class*="el-"] {
  background: transparent !important;
  background-color: transparent !important;
}

/* 强制登录按钮白色文字 */
.navbar-container .login-btn,
.navbar-container .el-button.login-btn,
.navbar-container button.login-btn {
  color: #ffffff !important;
  background-color: transparent !important;
  border: none !important;
}

.navbar-container .login-btn:hover,
.navbar-container .el-button.login-btn:hover,
.navbar-container button.login-btn:hover {
  color: #e03426 !important;
  background-color: rgba(255, 255, 255, 0.1) !important;
}

.navbar-container .login-btn:focus,
.navbar-container .el-button.login-btn:focus,
.navbar-container button.login-btn:focus {
  color: #ffffff !important;
  background-color: transparent !important;
}

.el-footer {
  text-align: center;
  line-height: 60px;
  color: #909399;
}

/* ===== 导航栏样式 ===== */
.navbar-container {
  padding: 0 !important;
  background: #000000 !important;
  border-bottom: none !important;
  width: 100% !important;
  max-width: 100% !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
  overflow-x: hidden !important;
  margin: 0 !important;
}

/* 确保导航栏完全覆盖 */
.navbar-container::before,
.navbar-container::after {
  display: none !important;
}

.navbar {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  height: 60px !important;
  margin: 0 auto !important;
  padding: 0 12px !important;
  background: #000000 !important;
  width: 100% !important;
  box-sizing: border-box !important;
  overflow: hidden !important;
}

/* 左侧导航区域 */
.navbar-left {
  display: flex;
  align-items: center;
  gap: 32px;
  min-width: 150px;
  flex-shrink: 0;
}

/* Logo样式 */
.navbar-logo {
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.navbar-logo:hover {
  transform: scale(1.05);
}

.logo-image {
  height: 32px; /* 从40px减少到32px */
  width: auto;
  object-fit: contain;
  filter: brightness(1.2) contrast(1.1);
}

/* 响应式logo显示控制 */
.logo-desktop {
  display: block;
}

.logo-mobile {
  display: none;
}

.navbar-center {
  flex: 1;
  max-width: 400px;
  margin: 0 20px;
  min-width: 150px;
  overflow: hidden;
}

.search-box {
  width: 100%;
}

.search-input {
  width: 100%;
}

.search-input .el-input__inner {
  border-radius: 20px 0 0 20px;
  border-right: none;
  padding-left: 20px;
  background-color: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.3);
  color: #ffffff;
}

.search-input .el-input__inner::placeholder {
  color: rgba(255, 255, 255, 0.7);
}

.search-input .el-input__inner:focus {
  border-color: #e03426;
  box-shadow: 0 0 0 2px rgba(224, 52, 38, 0.2);
}

.search-input .el-input-group__append {
  border-radius: 0 20px 20px 0;
  padding: 0 20px;
  background: #e03426;
  border-color: #e03426;
}

.search-input .el-input-group__append .el-button {
  border: none;
  color: white;
  padding: 0;
  margin: 0;
}

.navbar-right {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-shrink: 1;
  min-width: 0;
  overflow: hidden;
}

.navbar-menu {
  display: flex;
  align-items: center;
}

/* 重置Element UI默认样式 */
.nav-menu-items {
  border: none !important;
  background: transparent !important;
  border-bottom: none !important;
}

/* 重置Element UI默认样式 */
.nav-menu-items .el-menu-item {
  border-bottom: none !important;
  margin: 0 12px !important;
  padding: 0 !important;
  border-radius: 6px !important;
  background-color: transparent !important;
}

.nav-menu-items .el-menu-item::after {
  display: none !important;
}

.nav-menu-items .el-menu-item:not(.is-disabled):hover {
  background-color: transparent !important;
  color: #e03426 !important;
}

.nav-menu-items .el-menu-item:not(.is-disabled):focus {
  background-color: transparent !important;
  color: #e03426 !important;
}

.nav-menu-items .el-menu-item.is-active {
  border-bottom: none !important;
  background-color: transparent !important;
  color: #e03426 !important;
}

/* 导航项样式 - 参考右侧设计 */
.nav-item {
  display: flex !important;
  align-items: center !important;
  gap: 0px !important;
  padding: 0 16px !important;
  height: 36px !important;
  border-bottom: none !important;
  transition: all 0.2s ease !important;
  color: #ffffff !important;
  font-weight: 500 !important;
  border-radius: 6px !important;
  position: relative !important;
  margin: 0 !important;
  background-color: transparent !important;
  border: none !important;
}

.nav-item:hover {
  color: #e03426 !important;
  background-color: transparent !important;
}

.nav-item.is-active {
  color: #e03426 !important;
  background-color: transparent !important;
  font-weight: 600 !important;
}

.nav-item.is-active:hover {
  color: #e03426 !important;
  background-color: transparent !important;
}

.nav-item span {
  font-size: 14px !important;
  font-weight: inherit !important;
}

/* 右侧用户区域 */
.navbar-right {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

/* 登录注册按钮 */
.auth-buttons {
  display: flex;
  align-items: center;
  gap: 12px;
}

.login-btn {
  color: #ffffff !important;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 6px;
  transition: all 0.3s ease;
  background-color: transparent !important;
  border: none !important;
}

.login-btn:hover {
  color: #e03426 !important;
  background-color: rgba(255, 255, 255, 0.1) !important;
}

.login-btn:focus {
  color: #ffffff !important;
  background-color: transparent !important;
}

.register-btn {
  padding: 8px 20px;
  border-radius: 20px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.register-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

/* 用户功能区 */
.user-functions {
  display: flex;
  align-items: center;
  gap: 16px;
}

/* 通知包装器 */
.notification-wrapper {
  display: flex;
  align-items: center;
}

/* 积分显示 */
/* 下拉菜单积分项样式 */
.points-dropdown-item {
  background-color: #f8f9fa !important;
  border-bottom: 1px solid #e9ecef !important;
  cursor: pointer !important;
}

.points-dropdown-item:hover {
  background-color: #e9ecef !important;
}

.points-dropdown-item .dropdown-points-label {
  flex: 1;
  margin-left: 4px;
  font-weight: 500;
}

.points-dropdown-item .dropdown-points-value {
  background: linear-gradient(135deg, #e03426, #ff6b4a);
  color: #ffffff;
  padding: 3px 10px;
  border-radius: 15px;
  font-size: 12px;
  font-weight: 600;
  margin-left: auto;
  box-shadow: 0 2px 4px rgba(224, 52, 38, 0.3);
  transition: all 0.3s ease;
}

.points-dropdown-item:hover .dropdown-points-value {
  transform: scale(1.05);
  box-shadow: 0 3px 6px rgba(224, 52, 38, 0.4);
}

/* 用户菜单 */
.user-menu-wrapper {
  margin-left: 20px;
}

.user-profile-trigger {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 20px;
  transition: all 0.3s ease;
}

.user-profile-trigger:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.user-avatar {
  transition: all 0.3s ease;
}

.user-profile-trigger:hover .user-avatar {
  transform: scale(1.05);
}

.username {
  font-weight: 500;
  color: #ffffff;
  font-size: 14px;
  transition: all 0.3s ease;
}

.user-profile-trigger:hover .username {
  color: #e03426;
}

.clickable-avatar {
  cursor: pointer;
}

.clickable-username {
  cursor: pointer;
}

/* 用户下拉菜单样式 */
.user-dropdown-menu {
  margin-top: 8px;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  border: 1px solid #e4e7ed;
  overflow: hidden;
}

.user-dropdown-menu .el-dropdown-menu__item {
  padding: 12px 16px;
  font-size: 14px;
  color: #606266;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-dropdown-menu .el-dropdown-menu__item:hover {
  background-color: #f5f7fa;
  color: #e03426;
}

.user-dropdown-menu .el-dropdown-menu__item.is-divided {
  border-top: 1px solid #e4e7ed;
}

.user-dropdown-menu .el-dropdown-menu__item i {
  font-size: 16px;
  width: 16px;
  text-align: center;
}

/* 退出登录项特殊样式 */
.user-dropdown-menu .el-dropdown-menu__item[data-command="logout"] {
  color: #f56c6c;
}

.user-dropdown-menu .el-dropdown-menu__item[data-command="logout"]:hover {
  background-color: #fef0f0;
  color: #f56c6c;
}

/* 下拉箭头图标 */
.user-profile-trigger .el-icon-arrow-down {
  font-size: 12px;
  color: #ffffff;
  transition: all 0.3s ease;
}

.user-profile-trigger:hover .el-icon-arrow-down {
  color: #e03426;
}

/* 响应式设计 */
@media (min-width: 1400px) {
  .navbar {
    padding: 0 20px;
  }
}

@media (max-width: 1200px) {
  .navbar {
    padding: 0 12px;
  }
  
  .navbar-left {
    gap: 16px;
    min-width: 120px;
  }
  
  .navbar-center {
    max-width: 300px;
    margin: 0 16px;
    min-width: 150px;
  }
  
  .logo-image {
    height: 28px; /* 从32px减少到28px */
  }
  
  /* 平板和小笔记本电脑使用移动端logo */
  .logo-desktop {
    display: none;
  }
  
  .logo-mobile {
    display: block;
    height: 28px !important; /* 从32px减少到28px */
  }
  
  .nav-menu-items .el-menu-item {
    padding: 0 8px !important;
    margin: 0 4px !important;
  }
  
  .nav-menu-items .el-menu-item span {
    font-size: 13px;
  }
  
  .navbar-right {
    gap: 16px;
  }
}

@media (max-width: 1024px) {
  .navbar {
    padding: 0 10px;
  }
  
  .navbar-left {
    gap: 12px;
    min-width: 100px;
  }
  
  .navbar-center {
    max-width: 250px;
    margin: 0 12px;
    min-width: 120px;
  }
  
  .logo-image {
    height: 32px;
  }
  
  /* 平板和小笔记本电脑也使用移动端logo */
  .logo-desktop {
    display: none;
  }
  
  .logo-mobile {
    display: block;
    height: 32px !important;
  }
  
  .nav-menu-items .el-menu-item {
    padding: 0 6px !important;
    margin: 0 2px !important;
  }
  
  .nav-menu-items .el-menu-item span {
    font-size: 12px;
  }
  
  .navbar-right {
    gap: 12px;
  }
}

@media (max-width: 1024px) {
  /* 平板和小笔记本电脑也使用移动端logo */
  .logo-desktop {
    display: none;
  }
  
  .logo-mobile {
    display: block;
    height: 28px !important; /* 从32px减少到28px */
  }
}

@media (max-width: 768px) {
  .navbar {
    padding: 0 8px;
    min-width: 0;
    height: 55px !important;
  }
  
  .navbar-left {
    min-width: 40px;
    gap: 2px;
    flex-shrink: 0;
  }
  
  .logo-image {
    height: 18px; /* 进一步减小logo尺寸 */
  }
  
  /* 768px以下显示移动端logo */
  .logo-desktop {
    display: none;
  }
  
  .logo-mobile {
    display: block;
    height: 18px !important; /* 进一步减小logo尺寸 */
  }
  
  .navbar-center {
    margin: 0 6px;
    max-width: none;
    min-width: 120px;
    flex: 2; /* 增加搜索框的权重 */
  }
  
  .search-input {
    width: 100%;
  }
  
  .search-input .el-input__inner {
    padding-left: 8px;
    font-size: 12px;
    height: 32px; /* 减小搜索框高度 */
  }
  
  .search-input .el-input-group__append {
    padding: 0 6px;
  }
  
  .search-input .el-input-group__append .el-button {
    height: 32px; /* 减小按钮高度 */
    padding: 0;
    min-width: 32px;
  }
  
  .search-input .el-input-group__append .el-button .el-icon-search {
    font-size: 14px;
    font-weight: bold;
  }
  
  .navbar-menu {
    display: flex;
    min-width: 0;
    overflow: hidden;
    flex-shrink: 2; /* 允许菜单收缩更多 */
  }
  
  .nav-menu-items {
    min-width: 0;
    flex-shrink: 1;
  }
  
  .nav-menu-items .el-menu-item {
    padding: 0 2px !important;
    margin: 0 1px !important;
    min-width: 0;
    white-space: nowrap;
  }
  
  .nav-menu-items .el-menu-item span {
    font-size: 9px; /* 进一步减小字体 */
  }
  
  .navbar-right {
    flex-shrink: 0; /* 右侧用户区域不收缩 */
    gap: 3px;
    min-width: 0;
  }
  
  .user-functions {
    gap: 3px;
  }
  
  .username {
    display: none;
  }
  
  .user-profile-trigger {
    padding: 2px 4px;
  }
  
  .user-avatar {
    width: 24px !important;
    height: 24px !important;
  }
  
  .auth-buttons {
    gap: 2px;
  }
  
  .login-btn {
    padding: 2px 4px;
    font-size: 9px;
    white-space: nowrap;
  }
  
  .register-btn {
    padding: 2px 6px;
    font-size: 9px;
    white-space: nowrap;
  }
}

@media (max-width: 480px) {
  .navbar {
    padding: 0 4px;
    height: 50px !important;
  }
  
  .navbar-left {
    min-width: 35px;
    gap: 1px;
  }
  
  .logo-image {
    height: 16px; /* 进一步减小 */
  }
  
  .navbar-center {
    margin: 0 4px;
    min-width: 100px;
    flex: 3; /* 进一步增加搜索框权重 */
  }
  
  .search-input .el-input__inner {
    padding-left: 6px;
    font-size: 11px;
    height: 30px; /* 进一步减小高度 */
  }
  
  .search-input .el-input-group__append {
    padding: 0 4px;
  }
  
  .search-input .el-input-group__append .el-button {
    height: 30px;
    min-width: 30px;
    background: #e03426 !important;
    border-color: #e03426 !important;
  }
  
  .search-input .el-input-group__append .el-button .el-icon-search {
    font-size: 13px;
    font-weight: bold;
    color: #ffffff !important;
  }
  
  .navbar-left {
    gap: 2px;
    flex-shrink: 0;
    min-width: 30px;
  }
  
  .navbar-logo {
    flex-shrink: 0;
  }
  
  .logo-image {
    height: 16px; /* 与480px保持一致 */
  }
  
  .navbar-menu {
    flex: 1;
    min-width: 0;
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
    flex-shrink: 2;
  }
  
  .navbar-menu::-webkit-scrollbar {
    display: none;
  }
  
  .nav-menu-items {
    flex-wrap: nowrap;
    min-width: max-content;
  }
  
  .nav-menu-items .el-menu-item {
    padding: 0 2px;
    margin: 0;
    white-space: nowrap;
    flex-shrink: 0;
  }
  
  .nav-menu-items .el-menu-item span {
    font-size: 8px; /* 进一步减小 */
  }
  
  .navbar-right {
    flex-shrink: 0;
    min-width: 60px;
  }
  
  .user-functions {
    gap: 4px;
  }
  
  .user-avatar {
    width: 24px !important;
    height: 24px !important;
  }
  
  .auth-buttons {
    gap: 4px;
  }
  
  .login-btn {
    padding: 4px 6px;
    font-size: 10px;
  }
  
  .register-btn {
    padding: 4px 8px;
    font-size: 10px;
  }
}

@media (max-width: 360px) {
  .navbar {
    padding: 0 3px;
  }
  
  .navbar-left {
    gap: 1px;
    min-width: 25px;
  }
  
  .logo-image {
    height: 14px; /* 最小logo尺寸 */
  }
  
  /* 360px以下继续显示移动端logo */
  .logo-desktop {
    display: none;
  }
  
  .logo-mobile {
    display: block;
    height: 14px !important;
  }
  
  .navbar-center {
    margin: 0 3px;
    min-width: 80px;
    flex: 4; /* 最大化搜索框权重 */
  }
  
  .search-input .el-input__inner {
    padding-left: 4px;
    font-size: 10px;
    height: 28px;
  }
  
  .search-input .el-input-group__append {
    padding: 0 3px;
  }
  
  .search-input .el-input-group__append .el-button {
    height: 28px;
    min-width: 28px;
    background: #e03426 !important;
    border-color: #e03426 !important;
  }
  
  .search-input .el-input-group__append .el-button .el-icon-search {
    font-size: 12px;
    font-weight: bold;
    color: #ffffff !important;
  }
  
  .nav-menu-items .el-menu-item {
    padding: 0 1px;
  }
  
  .nav-menu-items .el-menu-item span {
    font-size: 7px; /* 最小字体 */
  }
  
  .navbar-right {
    min-width: 50px;
  }
  
  .user-functions {
    gap: 2px;
  }
  
  .login-btn {
    padding: 2px 3px;
    font-size: 8px;
  }
  
  .register-btn {
    padding: 2px 4px;
    font-size: 8px;
  }
}

@media (max-width: 320px) {
  .navbar {
    padding: 0 2px;
  }
  
  .navbar-center {
    margin: 0 2px;
    min-width: 70px;
    flex: 5; /* 在最小屏幕上最大化搜索框空间 */
  }
  
  .search-input .el-input__inner {
    padding-left: 3px;
    font-size: 9px;
    height: 26px;
  }
  
  .search-input .el-input-group__append {
    padding: 0 2px;
  }
  
  .search-input .el-input-group__append .el-button {
    height: 26px;
    min-width: 26px;
  }
  
  .search-input .el-input-group__append .el-button .el-icon-search {
    font-size: 11px;
  }
  
  .navbar-left {
    gap: 4px;
  }
  
  .logo-image {
    height: 18px;
  }
  
  .nav-menu-items .el-menu-item {
    padding: 0 2px;
  }
  
  .nav-menu-items .el-menu-item span {
    font-size: 8px;
  }
  
  .login-btn {
    padding: 2px 4px;
    font-size: 8px;
  }
  
  .register-btn {
    padding: 2px 5px;
    font-size: 8px;
  }
}
</style> 