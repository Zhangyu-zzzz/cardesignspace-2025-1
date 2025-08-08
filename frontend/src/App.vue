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
              <i class="el-icon-car logo-icon"></i>
              <span class="logo-text">CARDESIGNSPACE</span>
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
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
}

.el-footer {
  text-align: center;
  line-height: 60px;
  color: #909399;
}

/* ===== 导航栏样式 ===== */
.navbar-container {
  padding: 0;
  background: #ffffff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  border-bottom: none;
}

.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 60px;
  margin: 0 auto;
  padding: 0 24px;
  background: #ffffff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

/* 左侧导航区域 */
.navbar-left {
  display: flex;
  align-items: center;
  gap: 32px;
  min-width: 200px;
}

.navbar-center {
  flex: 1;
  max-width: 600px;
  margin: 0 20px;
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
}

.search-input .el-input-group__append {
  border-radius: 0 20px 20px 0;
  padding: 0 20px;
  background: #409EFF;
  border-color: #409EFF;
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
}

.navbar-menu {
  display: flex;
  align-items: center;
}

/* 重置Element UI默认样式 */
.nav-menu-items {
  border: none;
  background: transparent;
  border-bottom: none !important;
}

/* 重置Element UI默认样式 */
.nav-menu-items .el-menu-item {
  border-bottom: none !important;
  margin: 0 12px !important;
  padding: 0 !important;
  border-radius: 6px !important;
}

.nav-menu-items .el-menu-item::after {
  display: none !important;
}

.nav-menu-items .el-menu-item:not(.is-disabled):hover {
  background-color: transparent !important;
  color: inherit !important;
}

.nav-menu-items .el-menu-item:not(.is-disabled):focus {
  background-color: transparent !important;
  color: inherit !important;
}

.nav-menu-items .el-menu-item.is-active {
  border-bottom: none !important;
  background-color: transparent !important;
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
  color: #8c939d !important;
  font-weight: 500 !important;
  border-radius: 6px !important;
  position: relative !important;
  margin: 0 !important;
  background-color: transparent !important;
  border: none !important;
}

.nav-item:hover {
  color: #606266 !important;
  background-color: transparent !important;
}

.nav-item.is-active {
  color: #409EFF !important;
  background-color: transparent !important;
  font-weight: 600 !important;
}

.nav-item.is-active:hover {
  color: #409EFF !important;
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
  color: #606266;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 6px;
  transition: all 0.3s ease;
}

.login-btn:hover {
  color: #409EFF;
  background-color: #ecf5ff;
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
  background: linear-gradient(135deg, #ffeaa7, #fab1a0);
  color: #2d3436;
  padding: 8px 12px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(250, 177, 160, 0.3);
}

.points-display:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(250, 177, 160, 0.4);
}

.points-display i {
  font-size: 16px;
  color: #f39c12;
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
  background-color: #f5f7fa;
}

.user-avatar {
  transition: all 0.3s ease;
}

.user-profile-trigger:hover .user-avatar {
  transform: scale(1.05);
}

.username {
  font-weight: 500;
  color: #606266;
  font-size: 14px;
  transition: all 0.3s ease;
}

.user-profile-trigger:hover .username {
  color: #409EFF;
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
  color: #409EFF;
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
  color: #c0c4cc;
  transition: all 0.3s ease;
}

.user-profile-trigger:hover .el-icon-arrow-down {
  color: #409EFF;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .navbar {
    padding: 0 20px;
  }
  
  .navbar-left {
    gap: 20px;
  }
  
  .logo-text {
    font-size: 20px;
  }
  
  .logo-icon {
    font-size: 18px;
  }
  
  .nav-menu-items .el-menu-item {
    padding: 0 10px;
    margin: 0 2px;
  }
  
  .nav-menu-items .el-menu-item span {
    font-size: 13px;
  }
}

@media (max-width: 768px) {
  .navbar {
    padding: 0 12px;
  }
  
  .navbar-left {
    min-width: auto;
  }
  
  .logo-text {
    display: none;
  }
  
  .navbar-center {
    margin: 0 10px;
  }
  
  .search-input .el-input__inner {
    padding-left: 15px;
  }
  
  .search-input .el-input-group__append {
    padding: 0 15px;
  }
  
  .navbar-menu {
    display: none;
  }
  
  .navbar-right {
    flex-shrink: 0;
  }
  
  .user-functions {
    gap: 8px;
  }
  
  .username {
    display: none;
  }
  
  .points-display {
    padding: 4px 6px;
    font-size: 12px;
  }
  
  .user-profile-trigger {
    padding: 4px 6px;
  }
  
  .user-avatar {
    width: 28px !important;
    height: 28px !important;
  }
  
  .auth-buttons {
    gap: 6px;
  }
  
  .login-btn {
    padding: 4px 8px;
    font-size: 11px;
  }
  
  .register-btn {
    padding: 4px 10px;
    font-size: 11px;
  }
}

@media (max-width: 480px) {
  .navbar {
    padding: 0 8px;
  }
  
  .navbar-left {
    gap: 6px;
    flex: 1;
    min-width: 0;
  }
  
  .navbar-logo {
    flex-shrink: 0;
  }
  
  .logo-text {
    font-size: 11px;
  }
  
  .logo-icon {
    font-size: 9px;
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
  
  .logo-text {
    font-size: 9px;
  }
  
  .logo-icon {
    font-size: 8px;
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
  
  .logo-text {
    display: none;
  }
  
  .logo-icon {
    font-size: 12px;
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