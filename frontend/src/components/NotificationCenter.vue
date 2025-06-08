<template>
  <div class="notification-center" v-if="isAuthenticated">
    <!-- 通知铃铛图标 -->
    <el-badge :value="unreadCount" :hidden="unreadCount === 0" class="notification-badge">
      <el-button 
        type="text" 
        size="medium"
        @click="showDrawer = true"
        class="notification-trigger"
      >
        <i class="el-icon-bell" style="font-size: 18px;"></i>
      </el-button>
    </el-badge>

    <!-- 通知抽屉 -->
    <el-drawer
      title="通知中心"
      :visible.sync="showDrawer"
      direction="rtl"
      size="400px"
      :before-close="handleClose"
    >
      <!-- 抽屉头部操作 -->
      <div class="drawer-header">
        <div class="header-actions">
          <el-button 
            size="mini" 
            type="primary" 
            @click="markAllAsRead"
            :disabled="unreadCount === 0"
          >
            全部已读
          </el-button>
          <el-button 
            size="mini" 
            @click="refreshNotifications"
            :loading="loading"
          >
            刷新
          </el-button>
        </div>
        <div class="filter-tabs">
          <el-radio-group v-model="currentFilter" size="mini" @change="onFilterChange">
            <el-radio-button label="all">全部</el-radio-button>
            <el-radio-button label="unread">未读</el-radio-button>
            <el-radio-button label="like">点赞</el-radio-button>
            <el-radio-button label="comment">评论</el-radio-button>
          </el-radio-group>
        </div>
      </div>

      <!-- 通知列表 -->
      <div class="notification-list" v-loading="loading">
        <div v-if="notifications.length === 0" class="empty-state">
          <i class="el-icon-bell"></i>
          <p>{{ currentFilter === 'unread' ? '暂无未读通知' : '暂无通知' }}</p>
        </div>
        
        <div 
          v-for="notification in notifications" 
          :key="notification.id"
          class="notification-item"
          :class="{ 'unread': !notification.isRead }"
          @click="handleNotificationClick(notification)"
        >
          <!-- 用户头像 -->
          <div class="avatar-wrapper">
            <img 
              :src="getUserAvatar(notification.Sender)" 
              :alt="getUserName(notification.Sender)"
              class="notification-avatar"
            />
            <div class="type-icon" :class="`type-${notification.type}`">
              <i :class="getTypeIcon(notification.type)"></i>
            </div>
          </div>

          <!-- 通知内容 -->
          <div class="notification-content">
            <div class="notification-title">{{ notification.title }}</div>
            <div class="notification-text">{{ notification.content }}</div>
            <div class="notification-meta">
              <span class="notification-time">{{ formatTime(notification.createdAt) }}</span>
              <el-button 
                v-if="!notification.isRead"
                type="text" 
                size="mini"
                @click.stop="markAsRead(notification.id)"
              >
                标记已读
              </el-button>
            </div>
          </div>

          <!-- 未读标识 -->
          <div v-if="!notification.isRead" class="unread-dot"></div>
        </div>

        <!-- 加载更多 -->
        <div v-if="hasMore" class="load-more">
          <el-button 
            @click="loadMoreNotifications" 
            :loading="loadingMore"
            size="small"
            type="text"
          >
            加载更多
          </el-button>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import axios from 'axios'

export default {
  name: 'NotificationCenter',
  data() {
    return {
      showDrawer: false,
      notifications: [],
      unreadCount: 0,
      loading: false,
      loadingMore: false,
      currentFilter: 'all',
      currentPage: 1,
      hasMore: true,
      pollingTimer: null,
      initialized: false
    }
  },
  computed: {
    ...mapState(['isAuthenticated', 'user'])
  },
  watch: {
    isAuthenticated(newVal) {
      if (newVal) {
        this.initialize()
      } else {
        this.stopPolling()
        this.reset()
      }
    }
  },
  mounted() {
    // 如果用户已登录，初始化通知系统
    if (this.isAuthenticated) {
      this.initialize()
    }
  },
  beforeDestroy() {
    this.stopPolling()
  },
  methods: {
    // 加载通知列表
    async loadNotifications() {
      if (!this.isAuthenticated) return

      this.loading = true
      try {
        const params = {
          page: 1,
          limit: 20
        }

        if (this.currentFilter !== 'all') {
          if (this.currentFilter === 'unread') {
            params.isRead = false
          } else {
            params.type = this.currentFilter
          }
        }

        const response = await axios.get('/api/notifications', { params })
        
        if (response.data.success) {
          this.notifications = response.data.data.notifications
          this.hasMore = response.data.data.page < response.data.data.totalPages
          this.currentPage = 1
        }
      } catch (error) {
        console.error('加载通知失败:', error)
        
        // 只有在用户已登录且不是401错误时才显示错误消息
        if (this.isAuthenticated && error.response && error.response.status !== 401) {
          this.$message.error('加载通知失败')
        }
      } finally {
        this.loading = false
      }
    },

    // 加载更多通知
    async loadMoreNotifications() {
      if (!this.isAuthenticated || !this.hasMore) return

      this.loadingMore = true
      try {
        const params = {
          page: this.currentPage + 1,
          limit: 20
        }

        if (this.currentFilter !== 'all') {
          if (this.currentFilter === 'unread') {
            params.isRead = false
          } else {
            params.type = this.currentFilter
          }
        }

        const response = await axios.get('/api/notifications', { params })
        
        if (response.data.success) {
          this.notifications.push(...response.data.data.notifications)
          this.hasMore = response.data.data.page < response.data.data.totalPages
          this.currentPage = response.data.data.page
        }
      } catch (error) {
        console.error('加载更多通知失败:', error)
        this.$message.error('加载更多通知失败')
      } finally {
        this.loadingMore = false
      }
    },

    // 获取未读通知数量
    async loadUnreadCount() {
      if (!this.isAuthenticated) return

      try {
        const response = await axios.get('/api/notifications/unread-count')
        if (response.data.success) {
          this.unreadCount = response.data.data.count
        }
      } catch (error) {
        console.error('获取未读通知数量失败:', error)
        // 静默处理错误，不显示用户提示，避免在登录状态不稳定时的干扰
      }
    },

    // 标记单个通知为已读
    async markAsRead(notificationId) {
      try {
        const response = await axios.put(`/api/notifications/${notificationId}/read`)
        if (response.data.success) {
          // 更新本地状态
          const notification = this.notifications.find(n => n.id === notificationId)
          if (notification) {
            notification.isRead = true
            this.unreadCount = Math.max(0, this.unreadCount - 1)
          }
        }
      } catch (error) {
        console.error('标记通知已读失败:', error)
        this.$message.error('操作失败')
      }
    },

    // 标记所有通知为已读
    async markAllAsRead() {
      try {
        const response = await axios.put('/api/notifications/read-all')
        if (response.data.success) {
          // 更新本地状态
          this.notifications.forEach(notification => {
            notification.isRead = true
          })
          this.unreadCount = 0
          this.$message.success(`已标记 ${response.data.data.count} 条通知为已读`)
        }
      } catch (error) {
        console.error('标记所有通知已读失败:', error)
        this.$message.error('操作失败')
      }
    },

    // 刷新通知
    refreshNotifications() {
      this.loadNotifications()
      this.loadUnreadCount()
    },

    // 处理筛选变化
    onFilterChange() {
      this.currentPage = 1
      this.hasMore = true
      this.loadNotifications()
    },

    // 处理通知点击
    handleNotificationClick(notification) {
      // 如果未读，标记为已读
      if (!notification.isRead) {
        this.markAsRead(notification.id)
      }

      // 根据通知类型跳转到相应页面
      if (notification.postId) {
        this.showDrawer = false
        this.$router.push({
          path: '/forum',
          query: { postId: notification.postId }
        })
      }
    },

    // 关闭抽屉
    handleClose() {
      this.showDrawer = false
    },

    // 获取类型图标
    getTypeIcon(type) {
      const icons = {
        like: 'el-icon-star-on',
        comment: 'el-icon-chat-dot-round',
        follow: 'el-icon-user',
        system: 'el-icon-info'
      }
      return icons[type] || 'el-icon-bell'
    },

    // 安全获取用户头像
    getUserAvatar(user) {
      if (!user) return '/default-avatar.png'
      return user.avatar || '/default-avatar.png'
    },

    // 安全获取用户名
    getUserName(user) {
      if (!user) return '系统'
      return user.username || '系统'
    },

    // 格式化时间
    formatTime(time) {
      const now = new Date()
      const notificationTime = new Date(time)
      const diff = now - notificationTime

      const minutes = Math.floor(diff / 60000)
      const hours = Math.floor(diff / 3600000)
      const days = Math.floor(diff / 86400000)

      if (minutes < 1) {
        return '刚刚'
      } else if (minutes < 60) {
        return `${minutes}分钟前`
      } else if (hours < 24) {
        return `${hours}小时前`
      } else if (days < 7) {
        return `${days}天前`
      } else {
        return notificationTime.toLocaleDateString()
      }
    },

    // 开始轮询
    startPolling() {
      this.stopPolling()
      this.loadUnreadCount()
      this.pollingTimer = setInterval(() => {
        this.loadUnreadCount()
      }, 30000) // 每30秒检查一次
    },

    // 停止轮询
    stopPolling() {
      if (this.pollingTimer) {
        clearInterval(this.pollingTimer)
        this.pollingTimer = null
      }
    },

    // 重置状态
    reset() {
      this.notifications = []
      this.unreadCount = 0
      this.currentPage = 1
      this.hasMore = true
      this.showDrawer = false
      this.initialized = false
    },

    // 初始化方法
    async initialize() {
      console.log('🔔 NotificationCenter: 开始初始化通知系统')
      console.log('🔔 用户认证状态:', this.isAuthenticated)
      console.log('🔔 用户信息:', this.user)
      
      if (!this.isAuthenticated) {
        console.log('🔔 用户未登录，跳过通知初始化')
        return
      }
      
      console.log('🔔 加载通知列表和未读数量...')
      await this.loadNotifications()
      await this.loadUnreadCount()
      this.startPolling()
      console.log('🔔 通知系统初始化完成')
    }
  }
}
</script>

<style scoped>
.notification-center {
  position: relative;
}

.notification-badge {
  margin-right: 16px;
}

.notification-trigger {
  color: #606266;
  transition: color 0.3s ease;
  padding: 8px;
  border-radius: 50%;
}

.notification-trigger:hover {
  color: #409EFF;
  background-color: rgba(64, 158, 255, 0.1);
}

.drawer-header {
  padding: 0 0 16px 0;
  border-bottom: 1px solid #e4e7ed;
  margin-bottom: 16px;
}

.header-actions {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}

.filter-tabs {
  display: flex;
  justify-content: center;
}

.notification-list {
  height: calc(100vh - 160px);
  overflow-y: auto;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #909399;
}

.empty-state i {
  font-size: 48px;
  margin-bottom: 16px;
  color: #dcdfe6;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  padding: 16px;
  border-bottom: 1px solid #f0f2f5;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.notification-item:hover {
  background-color: #f8f9fa;
}

.notification-item.unread {
  background-color: #ecf5ff;
}

.notification-item.unread:hover {
  background-color: #d9ecff;
}

.avatar-wrapper {
  position: relative;
  margin-right: 12px;
  flex-shrink: 0;
}

.notification-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.type-icon {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid white;
  font-size: 10px;
  color: white;
}

.type-icon.type-like {
  background-color: #f56c6c;
}

.type-icon.type-comment {
  background-color: #409EFF;
}

.type-icon.type-follow {
  background-color: #67C23A;
}

.type-icon.type-system {
  background-color: #909399;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-title {
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
  font-size: 14px;
}

.notification-text {
  color: #666;
  font-size: 13px;
  line-height: 1.4;
  margin-bottom: 8px;
  word-break: break-word;
}

.notification-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.notification-time {
  color: #909399;
  font-size: 12px;
}

.unread-dot {
  position: absolute;
  top: 20px;
  right: 16px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #f56c6c;
}

.load-more {
  text-align: center;
  padding: 16px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .notification-item {
    padding: 12px;
  }

  .notification-avatar {
    width: 32px;
    height: 32px;
  }

  .type-icon {
    width: 14px;
    height: 14px;
    font-size: 8px;
  }
}
</style> 