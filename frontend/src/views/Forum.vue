<template>
  <div class="forum-container">
    <div class="forum-layout">
      <!-- 主内容区域 -->
      <div class="main-content">
        <!-- 头部 -->
        <div class="forum-header">
          <h1>用户论坛</h1>
          <p>分享你的想法，与大家一起讨论</p>
        </div>

        <!-- 发布新帖子区域 -->
        <div class="post-editor" v-if="isAuthenticated">
          <div class="user-avatar">
            <img :src="userAvatar" :alt="currentUser.username" />
          </div>
          <div class="editor-content">
            <!-- 话题选择 -->
            <div class="topic-selector">
              <el-select
                v-model="selectedTopics"
                multiple
                filterable
                allow-create
                default-first-option
                placeholder="选择或创建话题 (可选)"
                class="topic-select"
                :multiple-limit="3"
              >
                <el-option
                  v-for="topic in availableTopics"
                  :key="topic"
                  :label="topic"
                  :value="topic"
                >
                  <span style="float: left">#{{ topic }}</span>
                </el-option>
              </el-select>
            </div>
            <el-input
              type="textarea"
              :rows="3"
              placeholder="分享新鲜事..."
              v-model="newPostContent"
              maxlength="500"
              show-word-limit
            />
            <div class="editor-actions">
              <div class="editor-tools">
                <el-upload
                  ref="imageUpload"
                  :file-list="imageList"
                  :auto-upload="false"
                  :on-change="handleImageChange"
                  :on-remove="handleImageRemove"
                  list-type="picture-card"
                  accept="image/*"
                  multiple
                  :limit="9"
                >
                  <i class="el-icon-plus"></i>
                </el-upload>
              </div>
              <div class="publish-actions">
                <el-button @click="clearPost">取消</el-button>
                <el-button type="primary" @click="publishPost" :loading="publishing">
                  发布
                </el-button>
              </div>
            </div>
          </div>
        </div>

        <!-- 未登录提示 -->
        <div class="login-prompt" v-else>
          <el-alert
            title="请先登录才能发布帖子"
            type="info"
            :closable="false"
            show-icon
          >
            <el-button type="primary" size="small" @click="$router.push('/login')">
              去登录
            </el-button>
          </el-alert>
        </div>

        <!-- 帖子列表 -->
        <div class="posts-list">
          <!-- 当前筛选状态 -->
          <div class="filter-status" v-if="selectedTopic">
            <div class="filter-info">
              <el-tag type="primary" size="medium">
                正在筛选话题: #{{ selectedTopic }}
              </el-tag>
              <el-button 
                type="text" 
                size="small" 
                @click="clearTopicFilter"
                style="margin-left: 8px;"
              >
                清除筛选
              </el-button>
            </div>
          </div>
          
          <div class="sort-options">
            <el-radio-group v-model="sortBy" @change="loadPosts">
              <el-radio-button label="createdAt">最新</el-radio-button>
              <el-radio-button label="likesCount">最热</el-radio-button>
            </el-radio-group>
          </div>

          <div class="posts" v-loading="loading">
            <div class="post-item" v-for="post in posts" :key="post.id" :data-id="post.id">
              <!-- 用户信息 -->
              <div class="post-header">
                <div class="user-info">
                  <img 
                    class="user-avatar-small clickable" 
                    :src="getUserAvatar(post.User)" 
                    :alt="getUserName(post.User)"
                    @click="goToUserProfile(post.User && post.User.id)"
                  />
                  <div class="user-details">
                    <span 
                      class="username clickable" 
                      @click="goToUserProfile(post.User && post.User.id)"
                    >
                      {{ getUserName(post.User) }}
                    </span>
                    <span class="post-time">{{ formatTime(post.createdAt) }}</span>
                  </div>
                </div>
                <el-dropdown v-if="canDeletePost(post)" @command="handlePostAction">
                  <span class="el-dropdown-link">
                    <i class="el-icon-more"></i>
                  </span>
                  <el-dropdown-menu slot="dropdown">
                    <el-dropdown-item :command="{action: 'delete', postId: post.id}">删除</el-dropdown-item>
                  </el-dropdown-menu>
                </el-dropdown>
              </div>

              <!-- 帖子内容 -->
              <div class="post-content">
                <!-- 话题标签 -->
                <div class="post-topics" v-if="post.topics && post.topics.length > 0">
                  <el-tag 
                    v-for="topic in post.topics" 
                    :key="topic"
                    size="mini" 
                    type="primary"
                    @click="searchByTopic(topic)"
                    class="topic-tag"
                  >
                    #{{ topic }}
                  </el-tag>
                </div>
                
                <p>{{ post.content }}</p>
                
                <!-- 图片展示 -->
                <div class="post-images" v-if="post.images && post.images.length > 0" :class="{'single-image': post.images.length === 1}">
                  <div 
                    class="image-item" 
                    v-for="(image, index) in post.images" 
                    :key="index"
                    @click="previewImages(post.images, index)"
                  >
                    <img :src="getImageUrl(image)" :alt="`图片${index + 1}`" />
                    <div class="image-overlay">
                      <i class="el-icon-zoom-in"></i>
                    </div>
                  </div>
                </div>
                
                <!-- COS存储标识 -->
                <div class="storage-info" v-if="post.images && post.images.length > 0">
                  <el-tag size="mini" type="success">成功发布</el-tag>
                </div>
              </div>

              <!-- 互动区域 -->
              <div class="post-actions">
                <div class="action-buttons">
                  <el-button 
                    size="small" 
                    :type="post.liked ? 'primary' : ''"
                    :icon="post.liked ? 'el-icon-star-on' : 'el-icon-star-off'"
                    @click="toggleLike(post)"
                  >
                    {{ post.likesCount }} 获赞
                  </el-button>
                  <el-button 
                    size="small" 
                    :type="post.favorited ? 'warning' : ''"
                    :icon="post.favorited ? 'el-icon-collection' : 'el-icon-collection-tag'"
                    @click="toggleFavorite(post)"
                    v-if="isAuthenticated"
                  >
                    {{ post.favoritesCount || 0 }} 收藏
                  </el-button>
                  <el-button 
                    size="small" 
                    icon="el-icon-chat-dot-round"
                    @click="showComments(post)"
                  >
                    {{ post.commentsCount }} 评论
                  </el-button>
                </div>
              </div>

              <!-- 评论区域 -->
              <div class="comments-section" v-if="post.showComments">
                <div class="comment-input" v-if="isAuthenticated">
                  <el-input
                    v-model="post.newComment"
                    placeholder="写评论..."
                    size="small"
                  >
                    <el-button 
                      slot="append" 
                      size="small" 
                      type="primary"
                      @click="submitComment(post)"
                      :loading="post.commenting"
                    >
                      发送
                    </el-button>
                  </el-input>
                </div>
                <div class="comments-list">
                  <div class="comment-item" v-for="comment in post.Comments" :key="comment.id">
                    <img 
                      class="comment-avatar clickable" 
                      :src="getUserAvatar(comment.User)" 
                      :alt="getUserName(comment.User)"
                      @click="goToUserProfile(comment.User && comment.User.id)"
                    />
                    <div class="comment-content">
                      <div class="comment-header">
                        <span 
                          class="comment-username clickable" 
                          @click="goToUserProfile(comment.User && comment.User.id)"
                        >
                          {{ getUserName(comment.User) }}
                        </span>
                        <span class="comment-time">{{ formatTime(comment.createdAt) }}</span>
                      </div>
                      <p class="comment-text">{{ comment.content }}</p>
                      
                      <!-- 回复按钮 -->
                      <div class="comment-actions" v-if="isAuthenticated">
                        <el-button 
                          size="mini" 
                          type="text" 
                          @click="showReplyInput(post, comment)"
                          class="reply-btn"
                        >
                          <i class="el-icon-chat-dot-round"></i> 回复
                        </el-button>
                      </div>
                      
                      <!-- 回复输入框 -->
                      <div class="reply-input" v-if="comment.showReplyInput">
                        <el-input
                          v-model="comment.replyContent"
                          :placeholder="`回复 @${getUserName(comment.User)}:`"
                          size="small"
                          type="textarea"
                          :rows="2"
                        >
                        </el-input>
                        <div class="reply-actions">
                          <el-button 
                            size="mini" 
                            @click="cancelReply(comment)"
                          >
                            取消
                          </el-button>
                          <el-button 
                            size="mini" 
                            type="primary"
                            @click="submitReply(post, comment)"
                            :loading="comment.replying"
                          >
                            回复
                          </el-button>
                        </div>
                      </div>
                      
                      <!-- 显示回复列表 -->
                      <div class="replies-list" v-if="comment.Replies && comment.Replies.length > 0">
                        <div class="reply-item" v-for="reply in comment.Replies" :key="reply.id">
                          <img 
                            class="reply-avatar clickable" 
                            :src="getUserAvatar(reply.User)" 
                            :alt="getUserName(reply.User)"
                            @click="goToUserProfile(reply.User && reply.User.id)"
                          />
                          <div class="reply-content">
                            <div class="reply-header">
                              <span 
                                class="reply-username clickable" 
                                @click="goToUserProfile(reply.User && reply.User.id)"
                              >
                                {{ getUserName(reply.User) }}
                              </span>
                              <span class="reply-time">{{ formatTime(reply.createdAt) }}</span>
                            </div>
                            <p class="reply-text">{{ reply.content }}</p>
                            
                            <!-- 回复的回复按钮 -->
                            <div class="comment-actions" v-if="isAuthenticated">
                              <el-button 
                                size="mini" 
                                type="text" 
                                @click="showReplyInput(post, reply)"
                                class="reply-btn"
                              >
                                <i class="el-icon-chat-dot-round"></i> 回复
                              </el-button>
                            </div>
                            
                            <!-- 回复的回复输入框 -->
                            <div class="reply-input nested-reply" v-if="reply.showReplyInput">
                              <el-input
                                v-model="reply.replyContent"
                                :placeholder="`回复 @${getUserName(reply.User)}:`"
                                size="small"
                                type="textarea"
                                :rows="2"
                              >
                              </el-input>
                              <div class="reply-actions">
                                <el-button 
                                  size="mini" 
                                  @click="cancelReply(reply)"
                                >
                                  取消
                                </el-button>
                                <el-button 
                                  size="mini" 
                                  type="primary"
                                  @click="submitReply(post, reply)"
                                  :loading="reply.replying"
                                >
                                  回复
                                </el-button>
                              </div>
                            </div>
                            
                            <!-- 更深层级的嵌套回复 -->
                            <div class="nested-replies" v-if="reply.Replies && reply.Replies.length > 0">
                              <div class="nested-reply-item" v-for="nestedReply in reply.Replies" :key="nestedReply.id">
                                <img 
                                  class="nested-reply-avatar clickable" 
                                  :src="getUserAvatar(nestedReply.User)" 
                                  :alt="getUserName(nestedReply.User)"
                                  @click="goToUserProfile(nestedReply.User && nestedReply.User.id)"
                                />
                                <div class="nested-reply-content">
                                  <div class="nested-reply-header">
                                    <span 
                                      class="nested-reply-username clickable" 
                                      @click="goToUserProfile(nestedReply.User && nestedReply.User.id)"
                                    >
                                      {{ getUserName(nestedReply.User) }}
                                    </span>
                                    <span class="nested-reply-time">{{ formatTime(nestedReply.createdAt) }}</span>
                                  </div>
                                  <p class="nested-reply-text">{{ nestedReply.content }}</p>
                                  
                                  <!-- 更深层回复的回复按钮 -->
                                  <div class="comment-actions" v-if="isAuthenticated">
                                    <el-button 
                                      size="mini" 
                                      type="text" 
                                      @click="showReplyInput(post, nestedReply)"
                                      class="reply-btn"
                                    >
                                      <i class="el-icon-chat-dot-round"></i> 回复
                                    </el-button>
                                  </div>
                                  
                                  <!-- 更深层的回复输入框 -->
                                  <div class="reply-input nested-reply-input" v-if="nestedReply.showReplyInput">
                                    <el-input
                                      v-model="nestedReply.replyContent"
                                      :placeholder="`回复 @${getUserName(nestedReply.User)}:`"
                                      size="small"
                                      type="textarea"
                                      :rows="2"
                                    >
                                    </el-input>
                                    <div class="reply-actions">
                                      <el-button 
                                        size="mini" 
                                        @click="cancelReply(nestedReply)"
                                      >
                                        取消
                                      </el-button>
                                      <el-button 
                                        size="mini" 
                                        type="primary"
                                        @click="submitReply(post, nestedReply)"
                                        :loading="nestedReply.replying"
                                      >
                                        回复
                                      </el-button>
                                    </div>
                                  </div>
                                  
                                  <!-- 第4层及更深层级的嵌套回复 -->
                                  <div class="deeper-nested-replies" v-if="nestedReply.Replies && nestedReply.Replies.length > 0">
                                    <div class="deeper-reply-item" v-for="deepReply in nestedReply.Replies" :key="deepReply.id">
                                      <img 
                                        class="deeper-reply-avatar clickable" 
                                        :src="getUserAvatar(deepReply.User)" 
                                        :alt="getUserName(deepReply.User)"
                                        @click="goToUserProfile(deepReply.User && deepReply.User.id)"
                                      />
                                      <div class="deeper-reply-content">
                                        <div class="deeper-reply-header">
                                          <span 
                                            class="deeper-reply-username clickable" 
                                            @click="goToUserProfile(deepReply.User && deepReply.User.id)"
                                          >
                                            {{ getUserName(deepReply.User) }}
                                          </span>
                                          <span class="deeper-reply-time">{{ formatTime(deepReply.createdAt) }}</span>
                                        </div>
                                        <p class="deeper-reply-text">{{ deepReply.content }}</p>
                                        
                                        <!-- 第4层回复的回复按钮 -->
                                        <div class="comment-actions" v-if="isAuthenticated">
                                          <el-button 
                                            size="mini" 
                                            type="text" 
                                            @click="showReplyInput(post, deepReply)"
                                            class="reply-btn"
                                          >
                                            <i class="el-icon-chat-dot-round"></i> 回复
                                          </el-button>
                                        </div>
                                        
                                        <!-- 第4层的回复输入框 -->
                                        <div class="reply-input deeper-reply-input" v-if="deepReply.showReplyInput">
                                          <el-input
                                            v-model="deepReply.replyContent"
                                            :placeholder="`回复 @${getUserName(deepReply.User)}:`"
                                            size="small"
                                            type="textarea"
                                            :rows="2"
                                          >
                                          </el-input>
                                          <div class="reply-actions">
                                            <el-button 
                                              size="mini" 
                                              @click="cancelReply(deepReply)"
                                            >
                                              取消
                                            </el-button>
                                            <el-button 
                                              size="mini" 
                                              type="primary"
                                              @click="submitReply(post, deepReply)"
                                              :loading="deepReply.replying"
                                            >
                                              回复
                                            </el-button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 加载更多 -->
          <div class="load-more" v-if="hasMore">
            <el-button @click="loadMorePosts" :loading="loadingMore">
              加载更多
            </el-button>
          </div>
        </div>
      </div>

      <!-- 右侧侧边栏 -->
      <div class="sidebar">
        <!-- 热门话题 -->
        <div class="sidebar-card">
          <div class="card-header">
            <i class="el-icon-star-on"></i>
            <span>热门话题</span>
          </div>
          <div class="card-content">
            <div class="topic-item" v-for="topic in hotTopics" :key="topic.name" @click="searchByTopic(topic.name)">
              <span class="topic-tag">#{{ topic.name }}</span>
              <span class="topic-count">{{ topic.count }}条讨论</span>
            </div>
            <div v-if="hotTopics.length === 0" class="empty-content">
              <span>暂无热门话题</span>
            </div>
          </div>
        </div>

        <!-- 活跃用户 -->
        <div class="sidebar-card">
          <div class="card-header">
            <i class="el-icon-user"></i>
            <span>活跃用户</span>
          </div>
          <div class="card-content">
            <div class="active-user" v-for="user in activeUsers" :key="user.id" @click="goToUserProfile(user.id)">
              <img :src="getUserAvatar(user)" :alt="user.username" class="active-user-avatar">
              <div class="active-user-info">
                <span class="active-username">{{ user.username }}</span>
                <span class="active-stats">{{ user.postsCount }}条帖子</span>
              </div>
            </div>
            <div v-if="activeUsers.length === 0" class="empty-content">
              <span>暂无活跃用户</span>
            </div>
          </div>
        </div>

        <!-- 发帖统计 -->
        <div class="sidebar-card">
          <div class="card-header">
            <i class="el-icon-data-line"></i>
            <span>论坛统计</span>
          </div>
          <div class="card-content">
            <div class="stat-item">
              <span class="stat-label">总帖子数</span>
              <span class="stat-value">{{ totalStats.posts }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">注册用户</span>
              <span class="stat-value">{{ totalStats.users }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">今日新帖</span>
              <span class="stat-value">{{ totalStats.todayPosts }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 图片预览 -->
    <el-dialog
      :visible.sync="imagePreviewVisible"
      width="100%"
      :show-close="false"
      :modal="true"
      :close-on-click-modal="true"
      :close-on-press-escape="true"
      custom-class="weibo-style-preview"
      center
    >
      <div class="weibo-preview-container">
        <!-- 关闭按钮 -->
        <div class="preview-close-btn" @click="imagePreviewVisible = false">
          <i class="el-icon-close"></i>
        </div>
        
        <!-- 图片显示区域 -->
        <div class="preview-image-wrapper" @click="imagePreviewVisible = false">
          <img :src="currentPreviewImage" alt="预览图片" @click.stop />
        </div>
        
        <!-- 导航按钮 -->
        <div class="preview-nav-btn preview-nav-left" 
             v-if="previewImagesList.length > 1 && currentImageIndex > 0"
             @click.stop="prevImage">
          <i class="el-icon-arrow-left"></i>
        </div>
        
        <div class="preview-nav-btn preview-nav-right" 
             v-if="previewImagesList.length > 1 && currentImageIndex < previewImagesList.length - 1"
             @click.stop="nextImage">
          <i class="el-icon-arrow-right"></i>
        </div>
        
        <!-- 底部指示器和控制栏 -->
        <div class="preview-bottom-bar" v-if="previewImagesList.length > 1">
          <!-- 图片指示器 -->
          <div class="preview-indicators">
            <span 
              v-for="(img, index) in previewImagesList" 
              :key="index"
              :class="['indicator-dot', { active: index === currentImageIndex }]"
              @click.stop="jumpToImage(index)"
            ></span>
          </div>
          
          <!-- 图片计数 -->
          <div class="preview-counter">
            {{ currentImageIndex + 1 }} / {{ previewImagesList.length }}
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import axios from 'axios'

export default {
  name: 'Forum',
  data() {
    return {
      posts: [],
      loading: false,
      loadingMore: false,
      hasMore: true,
      currentPage: 1,
      sortBy: 'createdAt',
      selectedTopic: null, // 当前筛选的话题
      
      // 发布新帖子
      newPostContent: '',
      selectedTopics: [], // 选中的话题
      availableTopics: [], // 可用话题列表
      imageList: [],
      publishing: false,
      
      // 图片预览
      imagePreviewVisible: false,
      previewImagesList: [],
      currentImageIndex: 0,
      currentPreviewImage: '',
      
      // 侧边栏数据 - 改为真实数据
      hotTopics: [],
      activeUsers: [],
      totalStats: {
        posts: 0,
        users: 0,
        todayPosts: 0
      }
    }
  },
  computed: {
    ...mapState(['isAuthenticated', 'user']),
    currentUser() {
      return this.user || {}
    },
    userAvatar() {
      return this.getUserAvatar(this.currentUser)
    }
  },
  mounted() {
    this.loadPosts()
    this.loadForumStats()
    this.loadSidebarData()
    this.loadAvailableTopics()
    
    // 检查是否需要定位到特定帖子
    this.checkPostId()
  },
  watch: {
    // 监听路由变化
    '$route'(to, from) {
      if (to.query.postId !== from.query.postId) {
        this.checkPostId()
      }
    }
  },
  methods: {
    // 安全获取用户头像
    getUserAvatar(user) {
      if (!user) return '/default-avatar.png'
      return user.avatar || '/default-avatar.png'
    },
    
    // 安全获取用户名
    getUserName(user) {
      if (!user) return '未知用户'
      return user.username || '未知用户'
    },

    // 加载帖子列表
    async loadPosts() {
      this.loading = true
      try {
        const params = {
          page: 1,
          limit: 10,
          sortBy: this.sortBy
        }
        
        // 如果有选中的话题，添加话题筛选参数
        if (this.selectedTopic) {
          params.topic = this.selectedTopic
        }
        
        const response = await axios.get('/api/forum/posts', { params })
        
        // 兼容新的返回格式
        if (response.data.status === 'success') {
          // 新格式
          this.posts = response.data.data.posts.map(post => ({
            ...post,
            showComments: false,
            newComment: '',
            commenting: false,
            isLiked: false, // TODO: 检查用户是否已获赞
            liked: false,
            favorited: false
          }))
          this.hasMore = response.data.data.hasMore
          this.currentPage = 1
        } else if (response.data.success) {
          // 旧格式
          this.posts = response.data.data.map(post => ({
            ...post,
            showComments: false,
            newComment: '',
            commenting: false,
            isLiked: false,
            liked: false,
            favorited: false
          }))
          this.hasMore = response.data.currentPage < response.data.totalPages
          this.currentPage = 1
        }
        
        // 检查是否需要滚动到特定帖子
        const targetPostId = this.$route.query.postId
        if (targetPostId) {
          this.$nextTick(() => {
            this.scrollToPost(targetPostId)
          })
        }
        
      } catch (error) {
        console.error('加载帖子失败:', error)
        this.$message.error('加载帖子失败')
      } finally {
        this.loading = false
      }
    },

    // 加载更多帖子
    async loadMorePosts() {
      this.loadingMore = true
      try {
        const params = {
          page: this.currentPage + 1,
          limit: 10,
          sortBy: this.sortBy
        }
        
        // 如果有选中的话题，添加话题筛选参数
        if (this.selectedTopic) {
          params.topic = this.selectedTopic
        }
        
        const response = await axios.get('/api/forum/posts', { params })
        
        // 兼容新的返回格式
        if (response.data.status === 'success') {
          // 新格式
          const newPosts = response.data.data.posts.map(post => ({
            ...post,
            showComments: false,
            newComment: '',
            commenting: false,
            isLiked: false,
            liked: false,
            favorited: false
          }))
          this.posts.push(...newPosts)
          this.hasMore = response.data.data.hasMore
          this.currentPage = response.data.data.page
        } else if (response.data.success) {
          // 旧格式
          const newPosts = response.data.data.map(post => ({
            ...post,
            showComments: false,
            newComment: '',
            commenting: false,
            isLiked: false,
            liked: false,
            favorited: false
          }))
          this.posts.push(...newPosts)
          this.hasMore = response.data.currentPage < response.data.totalPages
          this.currentPage = response.data.currentPage
        }
      } catch (error) {
        console.error('加载更多帖子失败:', error)
        this.$message.error('加载更多帖子失败')
      } finally {
        this.loadingMore = false
      }
    },

    // 发布帖子
    async publishPost() {
      if (!this.newPostContent.trim()) {
        this.$message.warning('请输入帖子内容')
        return
      }

      this.publishing = true
      try {
        const formData = new FormData()
        formData.append('content', this.newPostContent.trim())
        
        // 添加话题
        if (this.selectedTopics.length > 0) {
          formData.append('topics', JSON.stringify(this.selectedTopics))
        }
        
        // 添加图片
        this.imageList.forEach(file => {
          if (file.raw) {
            formData.append('images', file.raw)
          }
        })

        const response = await axios.post('/api/forum/posts', formData)

        if (response.data.success) {
          this.$message.success('发布成功！图片已保存到云空间')
          this.clearPost()
          this.loadPosts() // 重新加载帖子列表
          this.loadSidebarData() // 重新加载侧边栏数据
        }
      } catch (error) {
        console.error('发布帖子失败:', error)
        this.$message.error('发布帖子失败')
      } finally {
        this.publishing = false
      }
    },

    // 清空帖子编辑器
    clearPost() {
      this.newPostContent = ''
      this.selectedTopics = []
      this.imageList = []
      if (this.$refs.imageUpload) {
        this.$refs.imageUpload.clearFiles()
      }
    },

    // 处理图片上传
    handleImageChange(file, fileList) {
      this.imageList = fileList
    },

    handleImageRemove(file, fileList) {
      this.imageList = fileList
    },

    // 获赞/取消获赞
    async toggleLike(post) {
      if (!this.isAuthenticated) {
        this.$message.warning('请先登录')
        return
      }

      try {
        const response = await axios.post(`/api/forum/posts/${post.id}/like`, {})

        if (response.data.success) {
          post.isLiked = response.data.liked
          post.likesCount += response.data.liked ? 1 : -1
          post.liked = response.data.liked
        }
      } catch (error) {
        console.error('获赞操作失败:', error)
        this.$message.error('操作失败')
      }
    },

    // 显示/隐藏评论
    async showComments(post) {
      post.showComments = !post.showComments
      
      // 每次显示评论时都重新加载完整的嵌套数据
      if (post.showComments) {
        try {
          const response = await axios.get(`/api/forum/posts/${post.id}`)
          if (response.data.success) {
            post.Comments = response.data.data.Comments || []
            // 为每个评论及其回复初始化响应式属性
            this.initializeCommentReactiveProps(post.Comments)
          }
        } catch (error) {
          console.error('加载评论失败:', error)
          this.$message.error('加载评论失败')
        }
      }
    },

    // 初始化评论的响应式属性
    initializeCommentReactiveProps(comments) {
      if (!comments) return
      
      comments.forEach(comment => {
        // 为顶级评论添加响应式属性
        this.$set(comment, 'showReplyInput', false)
        this.$set(comment, 'replyContent', '')
        this.$set(comment, 'replying', false)
        
        // 递归处理回复
        if (comment.Replies && comment.Replies.length > 0) {
          this.initializeCommentReactiveProps(comment.Replies)
        }
      })
    },

    // 提交评论
    async submitComment(post) {
      if (!post.newComment.trim()) {
        this.$message.warning('请输入评论内容')
        return
      }

      post.commenting = true
      try {
        const response = await axios.post(`/api/forum/posts/${post.id}/comments`, {
          content: post.newComment.trim()
        })

        if (response.data.success) {
          if (!post.Comments) {
            post.Comments = []
          }
          
          const newComment = response.data.data
          // 为新评论初始化响应式属性
          this.$set(newComment, 'showReplyInput', false)
          this.$set(newComment, 'replyContent', '')
          this.$set(newComment, 'replying', false)
          this.$set(newComment, 'Replies', [])
          
          post.Comments.push(newComment)
          post.commentsCount++
          post.newComment = ''
          this.$message.success('评论成功')
        }
      } catch (error) {
        console.error('评论失败:', error)
        this.$message.error('评论失败')
      } finally {
        post.commenting = false
      }
    },

    // 处理帖子操作
    async handlePostAction(command) {
      if (command.action === 'delete') {
        try {
          await this.$confirm('确定要删除这个帖子吗？', '提示', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          })

          const response = await axios.delete(`/api/forum/posts/${command.postId}`)

          if (response.data.success) {
            this.$message.success('删除成功')
            this.loadPosts()
          }
        } catch (error) {
          if (error !== 'cancel') {
            console.error('删除帖子失败:', error)
            this.$message.error('删除失败')
          }
        }
      }
    },

    // 检查是否可以删除帖子
    canDeletePost(post) {
      return this.isAuthenticated && (
        post.userId === this.currentUser.id || 
        this.currentUser.role === 'admin'
      )
    },

    // 预览图片
    previewImages(images, index) {
      this.previewImagesList = images
      this.currentImageIndex = index
      this.currentPreviewImage = this.getImageUrl(images[index])
      this.imagePreviewVisible = true
    },

    // 上一张图片
    prevImage() {
      if (this.currentImageIndex > 0) {
        this.currentImageIndex--
        this.currentPreviewImage = this.getImageUrl(this.previewImagesList[this.currentImageIndex])
      }
    },

    // 下一张图片
    nextImage() {
      if (this.currentImageIndex < this.previewImagesList.length - 1) {
        this.currentImageIndex++
        this.currentPreviewImage = this.getImageUrl(this.previewImagesList[this.currentImageIndex])
      }
    },

    // 跳转到指定图片
    jumpToImage(index) {
      this.currentImageIndex = index
      this.currentPreviewImage = this.getImageUrl(this.previewImagesList[index])
    },

    // 获取图片URL（支持腾讯云COS和本地图片）
    getImageUrl(imagePath) {
      if (!imagePath) return '';
      if (imagePath.startsWith('http')) return imagePath;
      
      // 使用环境变量或生产环境的基础URL
      const baseURL = process.env.VUE_APP_API_BASE_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000');
      return `${baseURL}${imagePath}`;
    },

    // 格式化时间
    formatTime(time) {
      const now = new Date()
      const postTime = new Date(time)
      const diff = now - postTime
      
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
        return postTime.toLocaleDateString()
      }
    },

    // 加载论坛统计
    async loadForumStats() {
      try {
        const response = await axios.get('/api/forum/stats')
        if (response.data.success) {
          this.totalStats = response.data.data
        }
      } catch (error) {
        console.error('加载论坛统计失败:', error)
        // 保持默认值
      }
    },

    // 加载侧边栏数据
    async loadSidebarData() {
      try {
        // 加载热门话题
        const topicsResponse = await axios.get('/api/forum/hot-topics')
        if (topicsResponse.data.success) {
          this.hotTopics = topicsResponse.data.data
        }

        // 加载活跃用户
        const usersResponse = await axios.get('/api/forum/active-users')
        if (usersResponse.data.success) {
          this.activeUsers = usersResponse.data.data
        }
      } catch (error) {
        console.error('加载侧边栏数据失败:', error)
      }
    },

    // 加载可用话题
    async loadAvailableTopics() {
      try {
        const response = await axios.get('/api/forum/topics')
        if (response.data.success) {
          this.availableTopics = response.data.data
        }
      } catch (error) {
        console.error('加载话题列表失败:', error)
        // 如果失败，使用默认话题
        this.availableTopics = ['汽车摄影', '新车发布', '改装分享', '驾驶技巧', '维修保养', '购车心得', '自驾游', '汽车新闻']
      }
    },

    // 根据话题搜索
    searchByTopic(topic) {
      this.selectedTopic = topic
      this.currentPage = 1
      this.hasMore = true
      this.loadPosts()
      this.$message.success(`正在显示话题"${topic}"的所有帖子`)
    },

    // 清除话题筛选
    clearTopicFilter() {
      this.selectedTopic = null
      this.currentPage = 1
      this.hasMore = true
      this.loadPosts()
    },

    // 跳转到用户主页
    goToUserProfile(userId) {
      if (!userId) {
        this.$message.warning('用户信息不完整');
        return;
      }
      
      // 如果是当前用户，跳转到自己的资料页
      if (this.isAuthenticated && this.currentUser.id === parseInt(userId)) {
        this.$router.push('/profile');
      } else {
        // 跳转到指定用户的资料页
        this.$router.push(`/profile/${userId}`);
      }
    },

    // 检查是否需要定位到特定帖子
    checkPostId() {
      const postId = this.$route.query.postId
      if (postId) {
        this.selectedTopic = null
        this.currentPage = 1
        this.hasMore = true
        this.loadPosts()
      }
    },

    // 滚动到指定帖子
    scrollToPost(postId) {
      const postElement = this.$el.querySelector(`.post-item[data-id="${postId}"]`)
      if (postElement) {
        // 滚动到帖子位置
        postElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        
        // 添加高亮效果
        postElement.classList.add('highlighted-post')
        
        // 显示提示消息
        this.$message.success('已定位到指定帖子')
        
        // 3秒后移除高亮效果
        setTimeout(() => {
          postElement.classList.remove('highlighted-post')
        }, 3000)
        
        // 清除URL中的postId参数
        this.$router.replace({ path: '/forum' })
      } else {
        this.$message.warning('未找到指定帖子，可能已被删除')
      }
    },

    // 切换收藏状态
    async toggleFavorite(post) {
      if (!this.isAuthenticated) {
        this.$message.warning('请先登录')
        return
      }

      try {
        const response = await axios.post(`/api/forum/posts/${post.id}/favorite`, {})

        if (response.data.success) {
          post.favorited = response.data.favorited
          if (response.data.favorited) {
            post.favoritesCount = (post.favoritesCount || 0) + 1
            this.$message.success('收藏成功')
          } else {
            post.favoritesCount = Math.max((post.favoritesCount || 0) - 1, 0)
            this.$message.success('取消收藏成功')
          }
        }
      } catch (error) {
        console.error('收藏操作失败:', error)
        this.$message.error('收藏操作失败')
      }
    },

    // 显示回复输入框
    showReplyInput(post, comment) {
      this.$set(comment, 'showReplyInput', true)
    },

    // 取消回复
    cancelReply(comment) {
      this.$set(comment, 'showReplyInput', false)
    },

    // 提交回复
    async submitReply(post, comment) {
      if (!comment.replyContent || !comment.replyContent.trim()) {
        this.$message.warning('请输入回复内容')
        return
      }

      comment.replying = true
      try {
        const response = await axios.post(`/api/forum/posts/${post.id}/comments`, {
          content: comment.replyContent.trim(),
          parentId: comment.id // 传递父评论ID
        })

        if (response.data.success) {
          if (!comment.Replies) {
            this.$set(comment, 'Replies', [])
          }
          
          const newReply = response.data.data
          // 为新回复初始化响应式属性
          this.$set(newReply, 'showReplyInput', false)
          this.$set(newReply, 'replyContent', '')
          this.$set(newReply, 'replying', false)
          this.$set(newReply, 'Replies', [])
          
          comment.Replies.push(newReply)
          comment.replyContent = ''
          this.$set(comment, 'showReplyInput', false)
          post.commentsCount++
          this.$message.success('回复成功')
        }
      } catch (error) {
        console.error('回复失败:', error)
        this.$message.error('回复失败')
      } finally {
        comment.replying = false
      }
    },
  }
}
</script>

<style scoped>
.forum-container {
  min-height: 100vh;
  background: #f8f9fa;
  padding: 20px;
  font-family: Arial, "Microsoft YaHei", sans-serif;
}

.forum-layout {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 20px;
}

.main-content {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.forum-header {
  text-align: center;
  padding: 7px 20px;
  background: linear-gradient(135deg, #409EFF 0%, #67C23A 100%);
  color: white;
}

.forum-header h1 {
  margin: 0 0 0px 0;
  font-size: 20px;
  font-weight: 600;
}

.forum-header p {
  margin: 0;
  font-size: 12px;
  opacity: 0.9;
}

.post-editor {
  display: flex;
  background: white;
  padding: 20px;
  border-bottom: 1px solid #e4e7ed;
}

.user-avatar {
  margin-right: 12px;
  flex-shrink: 0;
}

.user-avatar img {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  object-fit: cover;
  /* border: 1px solid #e4e7ed; */
  /* box-shadow: 0 2px 8px rgba(0,0,0,0.06); */
}

.editor-content {
  flex: 1;
}

.topic-selector {
  margin-bottom: 12px;
}

.topic-select {
  width: 100%;
}

.topic-select .el-input {
  border-radius: 8px;
}

.editor-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
}

.editor-tools {
  display: flex;
  align-items: center;
}

.publish-actions {
  display: flex;
  gap: 8px;
}

.login-prompt {
  padding: 20px;
  border-bottom: 1px solid #e4e7ed;
  background: #f8f9fa;
  border-radius: 12px;
  margin: 20px;
  text-align: center;
}

.sort-options {
  padding: 20px;
  text-align: center;
  background: white;
  border-bottom: 1px solid #e4e7ed;
}

.posts {
  background: #f8f9fa;
  padding: 20px;
}

.post-item {
  padding: 20px;
  margin-bottom: 16px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid #e4e7ed;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.post-item:hover {
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);
  transform: translateY(-4px);
  /* border-color: #b3d8ff; */
}

.post-item:last-child {
  margin-bottom: 0;
}

.post-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.user-info {
  display: flex;
  align-items: center;
}

.user-avatar-small {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  object-fit: cover;
  margin-right: 8px;
  /* border: 1px solid #e4e7ed; */
  /* box-shadow: 0 2px 4px rgba(0,0,0,0.06); */
}

.user-details {
  display: flex;
  flex-direction: column;
}

.username {
  font-weight: 600;
  color: #333;
  font-size: 14px;
}

.post-time {
  color: #909399;
  font-size: 12px;
  font-weight: 500;
}

.post-content {
  margin-bottom: 12px;
}

.post-topics {
  margin-bottom: 12px;
}

.post-topics .topic-tag {
  margin-right: 8px;
  margin-bottom: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.post-topics .topic-tag:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
}

.post-content p {
  color: #333;
  line-height: 1.6;
  margin: 0 0 12px 0;
  font-size: 15px;
  font-weight: 500;
}

.post-images {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  margin-bottom: 8px;
  max-width: 400px;
}

.post-images.single-image {
  grid-template-columns: 1fr;
  max-width: 200px;
}

.post-images.single-image .image-item {
  max-width: 200px;
  max-height: 200px;
  aspect-ratio: 1;
}

.image-item {
  position: relative;
  aspect-ratio: 1;
  cursor: pointer;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
  transition: all 0.3s ease;
  max-width: 95px;
  max-height: 95px;
}

.image-item:hover {
  transform: scale(1.02);
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

.image-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.image-item:hover .image-overlay {
  opacity: 1;
}

.image-overlay i {
  color: white;
  font-size: 20px;
}

.storage-info {
  margin-bottom: 8px;
  color: #606266;
  font-size: 12px;
}

.post-actions {
  border-top: 1px solid #e4e7ed;
  padding-top: 12px;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.comments-section {
  border-top: 1px solid #e4e7ed;
  padding-top: 12px;
  margin-top: 12px;
}

.comment-input {
  margin-bottom: 12px;
}

.comment-item {
  display: flex;
  margin-bottom: 12px;
}

.comment-avatar {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  object-fit: cover;
  margin-right: 8px;
  /* border: 1px solid #e4e7ed; */
}

.comment-content {
  flex: 1;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.comment-username {
  font-weight: 600;
  color: #333;
  font-size: 13px;
}

.comment-time {
  color: #909399;
  font-size: 12px;
}

.comment-text {
  color: #333;
  font-size: 14px;
  margin: 4px 0 0 0;
  line-height: 1.4;
  font-weight: 500;
}

.load-more {
  text-align: center;
  padding: 20px;
  background: white;
}

.load-more .el-button {
  padding: 12px 32px;
  font-size: 16px;
  border-radius: 8px;
  background: linear-gradient(135deg, #409EFF, #67C23A);
  border: none;
  color: white;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

.load-more .el-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(64, 158, 255, 0.4);
}

/* 侧边栏样式 */
.sidebar {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.sidebar-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  border: 1px solid #e4e7ed;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #e4e7ed;
  font-weight: 600;
  color: #333;
}

.card-header i {
  color: #409EFF;
}

.card-content {
  padding: 16px 20px;
}

.topic-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f2f5;
  cursor: pointer;
  transition: all 0.3s ease;
}

.topic-item:last-child {
  border-bottom: none;
}

.topic-item:hover {
  background: #ecf5ff;
  border-radius: 6px;
  padding: 8px 12px;
  margin: 0 -12px;
}

.topic-tag {
  color: #409EFF;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.topic-tag:hover {
  color: #67C23A;
}

.topic-count {
  color: #909399;
  font-size: 12px;
}

.active-user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid #f0f2f5;
  cursor: pointer;
  transition: all 0.3s ease;
}

.active-user:last-child {
  border-bottom: none;
}

.active-user:hover {
  background: #ecf5ff;
  border-radius: 6px;
  padding: 8px 12px;
  margin: 0 -12px;
}

.active-user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  object-fit: cover;
  /* border: 1px solid #e4e7ed; */
}

.active-user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.active-username {
  font-weight: 600;
  color: #333;
  font-size: 14px;
}

.active-stats {
  color: #909399;
  font-size: 12px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f2f5;
}

.stat-item:last-child {
  border-bottom: none;
}

.stat-label {
  color: #606266;
  font-size: 14px;
  font-weight: 500;
}

.stat-value {
  color: #409EFF;
  font-weight: 600;
  font-size: 16px;
}

.empty-content {
  text-align: center;
  color: #909399;
  font-size: 14px;
  padding: 20px;
}

/* 微博风格图片预览 */
::v-deep .el-dialog__wrapper {
  background-color: #000000 !important;
}

::v-deep .weibo-style-preview {
  margin: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  max-width: none !important;
  border-radius: 0 !important;
  background-color: transparent !important;
  box-shadow: none !important;
}

::v-deep .weibo-style-preview .el-dialog__body {
  padding: 0 !important;
  background-color: transparent !important;
  height: 100vh !important;
  border-radius: 0 !important;
}

.weibo-preview-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #000000;
}

/* 关闭按钮 */
.preview-close-btn {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 40px;
  height: 40px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 1000;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.preview-close-btn:hover {
  background-color: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
}

.preview-close-btn i {
  color: white;
  font-size: 20px;
}

/* 图片显示区域 */
.preview-image-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.preview-image-wrapper img {
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  transition: transform 0.3s ease;
}

.preview-image-wrapper img:hover {
  transform: scale(1.02);
}

/* 导航按钮 */
.preview-nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 50px;
  height: 50px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 1000;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.preview-nav-btn:hover {
  background-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-50%) scale(1.1);
}

.preview-nav-left {
  left: 30px;
}

.preview-nav-right {
  right: 30px;
}

.preview-nav-btn i {
  color: white;
  font-size: 24px;
}

/* 底部控制栏 */
.preview-bottom-bar {
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  z-index: 1000;
}

/* 图片指示器 */
.preview-indicators {
  display: flex;
  gap: 8px;
}

.indicator-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  transition: all 0.3s ease;
}

.indicator-dot.active {
  background-color: #ffffff;
  transform: scale(1.2);
}

.indicator-dot:hover {
  background-color: rgba(255, 255, 255, 0.7);
  transform: scale(1.1);
}

/* 图片计数 */
.preview-counter {
  color: white;
  font-size: 14px;
  font-weight: 500;
  background-color: rgba(0, 0, 0, 0.6);
  padding: 6px 12px;
  border-radius: 16px;
  backdrop-filter: blur(10px);
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .forum-layout {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .sidebar {
    order: -1;
  }
  
  .sidebar-card {
    display: none;
  }
  
  .sidebar-card:first-child {
    display: block;
  }
  
  .forum-container {
    padding: 15px;
  }
}

@media (max-width: 768px) {
  .forum-container {
    padding: 10px;
  }
  
  .post-images {
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
    max-width: 280px;
  }
  
  .post-images.single-image {
    max-width: 160px;
  }
  
  .post-images.single-image .image-item {
    max-width: 160px;
    max-height: 160px;
  }
  
  .image-item {
    max-width: 90px;
    max-height: 90px;
  }
  
  .forum-header {
    padding: 20px 15px;
  }
  
  .forum-header h1 {
    font-size: 24px;
  }
  
  .post-editor, .post-item {
    padding: 15px;
  }
  
  .card-content {
    padding: 12px 16px;
  }
  
  .main-content {
    border-radius: 12px;
  }
  
  .sidebar-card {
    border-radius: 12px;
  }

  /* 图片预览移动端优化 */
  .preview-close-btn {
    top: 15px;
    right: 15px;
    width: 36px;
    height: 36px;
  }

  .preview-close-btn i {
    font-size: 18px;
  }

  .preview-nav-btn {
    width: 44px;
    height: 44px;
  }

  .preview-nav-left {
    left: 15px;
  }

  .preview-nav-right {
    right: 15px;
  }

  .preview-nav-btn i {
    font-size: 20px;
  }

  .preview-bottom-bar {
    bottom: 20px;
  }

  .preview-image-wrapper img {
    max-width: 95vw;
    max-height: 85vh;
  }

  .indicator-dot {
    width: 10px;
    height: 10px;
  }

  .preview-counter {
    font-size: 13px;
    padding: 4px 10px;
  }
}

@media (max-width: 480px) {
  .forum-container {
    padding: 8px;
  }
  
  .post-item {
    padding: 12px;
  }
  
  .post-images {
    grid-template-columns: repeat(2, 1fr);
    gap: 4px;
    max-width: 200px;
  }
  
  .post-images.single-image {
    max-width: 120px;
  }
  
  .post-images.single-image .image-item {
    max-width: 120px;
    max-height: 120px;
  }
  
  .image-item {
    max-width: 95px;
    max-height: 95px;
  }
}

/* 筛选状态样式 */
.filter-status {
  padding: 15px 20px;
  background: #ecf5ff;
  border-bottom: 1px solid #e4e7ed;
  border-radius: 12px 12px 0 0;
}

.filter-info {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 可点击元素样式 */
.clickable {
  cursor: pointer;
  transition: all 0.3s ease;
}

.clickable:hover {
  opacity: 0.8;
  transform: scale(1.05);
}

.username.clickable:hover {
  color: #409EFF;
  text-decoration: underline;
}

.comment-username.clickable:hover {
  color: #409EFF;
  text-decoration: underline;
}

/* 高亮帖子样式 */
.highlighted-post {
  border: 2px solid #409EFF !important;
  box-shadow: 0 0 20px rgba(64, 158, 255, 0.3) !important;
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.05), rgba(103, 194, 58, 0.05)) !important;
  animation: pulse-highlight 2s ease-in-out;
}

@keyframes pulse-highlight {
  0% {
    transform: scale(1);
    box-shadow: 0 0 20px rgba(64, 158, 255, 0.3);
  }
  50% {
    transform: scale(1.02);
    box-shadow: 0 0 30px rgba(64, 158, 255, 0.5);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 20px rgba(64, 158, 255, 0.3);
  }
}

.el-dropdown-link {
  cursor: pointer;
  color: #606266;
  padding: 4px;
  transition: all 0.3s ease;
}

.el-dropdown-link:hover {
  color: #409EFF;
}

/* 移除Element UI默认边框样式 */
.el-upload--picture-card {
  border: 1px dashed #c0c4cc !important;
  border-radius: 8px !important;
  width: 20px !important;
  height: 20px !important;
}

.el-upload-list--picture-card .el-upload-list__item {
  border: 1px solid #e4e7ed !important;
  border-radius: 8px !important;
  width: 20px !important;
  height: 20px !important;
}

.el-upload--picture-card i {
  font-size: 16px !important;
  color: #8c939d;
}

.el-upload-list--picture-card .el-upload-list__item-thumbnail {
  width: 50% !important;
  height: 50% !important;
  object-fit: cover !important;
}

/* 评论样式 */
.comment-item {
  display: flex;
  margin-bottom: 12px;
}

.comment-avatar {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  object-fit: cover;
  margin-right: 8px;
  /* border: 1px solid #e4e7ed; */
}

.comment-content {
  flex: 1;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.comment-username {
  font-weight: 600;
  color: #333;
  font-size: 13px;
}

.comment-time {
  color: #909399;
  font-size: 12px;
}

.comment-text {
  color: #333;
  font-size: 14px;
  margin: 4px 0 0 0;
  line-height: 1.4;
  font-weight: 500;
}

/* 评论操作按钮 */
.comment-actions {
  margin-top: 6px;
}

.reply-btn {
  font-size: 12px;
  padding: 0;
  color: #909399;
}

.reply-btn:hover {
  color: #409EFF;
}

/* 回复输入框 */
.reply-input {
  margin-top: 8px;
  margin-left: 32px;
}

.reply-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  justify-content: flex-end;
}

/* 回复列表样式 */
.replies-list {
  margin-top: 12px;
  margin-left: 32px;
  border-left: 2px solid #f5f5f5;
  padding-left: 12px;
}

.reply-item {
  display: flex;
  margin-bottom: 8px;
}

.reply-avatar {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  object-fit: cover;
  margin-right: 6px;
}

.reply-content {
  flex: 1;
}

.reply-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.reply-username {
  font-weight: 600;
  color: #333;
  font-size: 13px;
}

.reply-time {
  color: #909399;
  font-size: 12px;
}

.reply-text {
  color: #333;
  font-size: 14px;
  margin: 2px 0 0 0;
  line-height: 1.4;
}

/* 更深层级嵌套回复样式 */
.nested-replies {
  margin-top: 8px;
  margin-left: 20px;
  border-left: 1px solid #e0e0e0;
  padding-left: 8px;
}

.nested-reply-item {
  display: flex;
  margin-bottom: 6px;
}

.nested-reply-avatar {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  object-fit: cover;
  margin-right: 4px;
}

.nested-reply-content {
  flex: 1;
}

.nested-reply-header {
  display: flex;
  align-items: center;
  gap: 4px;
}

.nested-reply-username {
  font-weight: 600;
  color: #333;
  font-size: 13px;
}

.nested-reply-time {
  color: #909399;
  font-size: 12px;
}

.nested-reply-text {
  color: #333;
  font-size: 14px;
  margin: 2px 0 0 0;
  line-height: 1.4;
}

.nested-reply-input {
  margin-top: 6px;
  margin-left: 20px;
}

/* 第4层及更深层级嵌套回复样式 */
.deeper-nested-replies {
  margin-top: 6px;
  margin-left: 16px;
  border-left: 1px solid #f0f0f0;
  padding-left: 6px;
}

.deeper-reply-item {
  display: flex;
  margin-bottom: 5px;
}

.deeper-reply-avatar {
  width: 14px;
  height: 14px;
  border-radius: 2px;
  object-fit: cover;
  margin-right: 3px;
}

.deeper-reply-content {
  flex: 1;
}

.deeper-reply-header {
  display: flex;
  align-items: center;
  gap: 3px;
}

.deeper-reply-username {
  font-weight: 600;
  color: #333;
  font-size: 13px;
}

.deeper-reply-time {
  color: #909399;
  font-size: 12px;
}

.deeper-reply-text {
  color: #333;
  font-size: 14px;
  margin: 1px 0 0 0;
  line-height: 1.4;
}

.deeper-reply-input {
  margin-top: 4px;
  margin-left: 16px;
}
</style> 