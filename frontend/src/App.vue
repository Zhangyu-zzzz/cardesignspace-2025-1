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
                placeholder="搜索您感兴趣的汽车品牌或车型" 
                v-model="searchKeyword"
                class="search-input"
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
                <el-menu-item index="/forum" class="nav-item">
                  <span>用户论坛</span>
                </el-menu-item>
                <el-menu-item index="/upload" class="nav-item">
                  <span>图片上传</span>
                </el-menu-item>
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
                
                <!-- 积分显示 -->
                <div class="points-wrapper">
                  <el-tooltip content="我的积分" placement="bottom">
                    <div class="points-display" @click="$router.push('/profile')">
                      <i class="el-icon-star-on"></i>
                      <span class="points-value">{{ user.points || 0 }}</span>
                    </div>
                  </el-tooltip>
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
                      <el-dropdown-item command="profile">
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
    ...mapState(['user', 'isAuthenticated'])
  },
  mounted() {
    this.setupAxiosInterceptors()
    this.initializeAuth()
  },
  methods: {
    ...mapActions(['login', 'logout', 'updateUser', 'checkAuth']),
    
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
          if (token) {
            config.headers.Authorization = `Bearer ${token}`
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
          // 只有在非checkAuth请求时才显示消息和清除数据
          // checkAuth请求应该自己处理错误
          if (error.response && error.response.status === 401) {
            const isCheckAuthRequest = error.config && error.config.url && error.config.url.includes('/api/auth/me')
            
            if (!isCheckAuthRequest) {
              this.clearUserData()
              this.$message.warning('登录已过期，请重新登录')
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
  height: 40px;
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
.points-wrapper {
  display: flex;
  align-items: center;
}

.points-display {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #e03426;
  color: #ffffff;
  padding: 8px 12px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(224, 52, 38, 0.3);
}

.points-display:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(224, 52, 38, 0.4);
}

.points-display i {
  font-size: 16px;
  color: #ffd700;
}

.points-value {
  font-size: 14px;
  font-weight: 600;
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
    height: 36px;
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
  
  /* 平板和小笔记本电脑使用移动端logo */
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
    height: 32px !important;
  }
}

@media (max-width: 768px) {
  .navbar {
    padding: 0 8px;
    min-width: 0;
    height: 55px !important;
  }
  
  .navbar-left {
    min-width: 50px;
    gap: 4px;
    flex-shrink: 0;
  }
  
  .logo-image {
    height: 22px;
  }
  
  /* 768px以下显示移动端logo */
  .logo-desktop {
    display: none;
  }
  
  .logo-mobile {
    display: block;
    height: 24px !important;
  }
  
  .navbar-center {
    margin: 0 8px;
    max-width: none;
    min-width: 0;
    flex: 1;
  }
  
  .search-input {
    width: 100%;
  }
  
  .search-input .el-input__inner {
    padding-left: 10px;
    font-size: 12px;
  }
  
  .search-input .el-input-group__append {
    padding: 0 8px;
  }
  
  .navbar-menu {
    display: flex;
    min-width: 0;
    overflow: hidden;
  }
  
  .nav-menu-items {
    min-width: 0;
  }
  
  .nav-menu-items .el-menu-item {
    padding: 0 3px !important;
    margin: 0 1px !important;
    min-width: 0;
    white-space: nowrap;
  }
  
  .nav-menu-items .el-menu-item span {
    font-size: 10px;
  }
  
  .navbar-right {
    flex-shrink: 1;
    gap: 4px;
    min-width: 0;
  }
  
  .user-functions {
    gap: 4px;
  }
  
  .username {
    display: none;
  }
  
  .points-display {
    padding: 2px 4px;
    font-size: 9px;
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
    padding: 0 6px;
    height: 50px !important;
  }
  
  .navbar-left {
    min-width: 45px;
    gap: 2px;
  }
  
  .logo-image {
    height: 20px;
  }
  
  .navbar-center {
    margin: 0 6px;
  }
  
  .search-input .el-input__inner {
    padding-left: 8px;
    font-size: 11px;
  }
  
  .search-input .el-input-group__append {
    padding: 0 6px;
  }
  
  .navbar-left {
    gap: 6px;
    flex: 1;
    min-width: 0;
  }
  
  .navbar-logo {
    flex-shrink: 0;
  }
  
  .logo-image {
    height: 24px;
  }
  
  .navbar-menu {
    flex: 1;
    min-width: 0;
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  
  .navbar-menu::-webkit-scrollbar {
    display: none;
  }
  
  .nav-menu-items {
    flex-wrap: nowrap;
    min-width: max-content;
  }
  
  .nav-menu-items .el-menu-item {
    padding: 0 3px;
    margin: 0;
    white-space: nowrap;
    flex-shrink: 0;
  }
  
  .nav-menu-items .el-menu-item span {
    font-size: 9px;
  }
  
  .navbar-right {
    flex-shrink: 0;
  }
  
  .user-functions {
    gap: 6px;
  }
  
  .points-display {
    padding: 3px 5px;
    font-size: 10px;
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
    padding: 0 6px;
  }
  
  .navbar-left {
    gap: 4px;
  }
  
  .logo-image {
    height: 20px;
  }
  
  /* 480px以下继续显示移动端logo */
  .logo-desktop {
    display: none;
  }
  
  .logo-mobile {
    display: block;
    height: 22px !important;
  }
  
  .nav-menu-items .el-menu-item {
    padding: 0 2px;
  }
  
  .nav-menu-items .el-menu-item span {
    font-size: 8px;
  }
  
  .login-btn {
    padding: 3px 5px;
    font-size: 9px;
  }
  
  .register-btn {
    padding: 3px 6px;
    font-size: 9px;
  }
}

@media (max-width: 320px) {
  .navbar {
    padding: 0 4px;
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