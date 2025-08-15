<template>
  <div class="profile-container">
    <!-- 顶部横幅背景 -->
    <div class="profile-banner">
      <div class="banner-overlay"></div>
      <div class="banner-content">
        <div class="profile-main">
          <!-- 左侧头像 -->
          <div class="avatar-section">
            <!-- 使用img标签代替el-avatar -->
            <div class="custom-avatar">
              <img 
                :src="userAvatar" 
                :alt="user.username" 
                class="profile-avatar-img"
                @error="handleAvatarError"
                @load="handleAvatarLoad"
              />
            </div>
            <div class="avatar-badge" v-if="user.role === 'admin'">
              <i class="el-icon-medal"></i>
            </div>
          </div>
          
          <!-- 右侧用户信息 -->
          <div class="user-info">
            <div class="user-header">
              <h1 class="username">{{ user.username }}</h1>
              <el-button size="small" type="primary" @click="showEditProfile" class="edit-btn" v-if="isCurrentUser">
                编辑资料
              </el-button>
            </div>
            
            <div class="user-stats">
              <div class="stat-item">
                <span class="stat-number">{{ userStats.postsCount }}</span>
                <span class="stat-label">帖子</span>
              </div>
              <div class="stat-item">
                <span class="stat-number">{{ userStats.likesCount }}</span>
                <span class="stat-label">获赞</span>
              </div>
              <div class="stat-item">
                <span class="stat-number">{{ user.points || 0 }}</span>
                <span class="stat-label">积分</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="main-content">
      <div class="content-container">
        <!-- 标签页导航 -->
        <div class="tabs-section">
          <el-tabs v-model="activeTab" @tab-click="handleTabChange">
            <el-tab-pane label="我的帖子" name="posts">
              <!-- 发布新帖快捷入口 -->
              <div class="quick-post" v-if="isCurrentUser">
                <div class="quick-post-card">
                  <el-avatar :size="50" :src="userAvatar" icon="el-icon-user-solid"></el-avatar>
                  <el-button type="text" @click="goToForum" class="quick-post-btn">
                    <span>分享新鲜事...</span>
                    <i class="el-icon-edit"></i>
                  </el-button>
                </div>
              </div>

              <!-- 帖子筛选 -->
              <div class="filter-section">
                <el-radio-group v-model="postsFilter" @change="loadUserPosts" size="small">
                  <el-radio-button label="all">全部帖子</el-radio-button>
                  <el-radio-button label="popular">热门帖子</el-radio-button>
                </el-radio-group>
              </div>

              <!-- 帖子网格 -->
              <div class="posts-grid" v-loading="loading">
                <div 
                  class="post-card clickable-post" 
                  v-for="post in userPosts" 
                  :key="post.id"
                  @click="goToPostInForum(post.id)"
                >
                  <div class="post-header">
                    <span class="post-time">{{ formatTime(post.createdAt) }}</span>
                    <el-dropdown 
                      v-if="isCurrentUser" 
                      @command="() => deletePost(post.id)"
                      @click.stop
                    >
                      <i class="el-icon-more"></i>
                      <el-dropdown-menu slot="dropdown">
                        <el-dropdown-item command="delete">删除</el-dropdown-item>
                      </el-dropdown-menu>
                    </el-dropdown>
                  </div>
                  
                  <div class="post-content">
                    <p class="post-text">{{ post.content }}</p>
                    
                    <!-- 图片展示 -->
                    <div class="post-images" v-if="post.images && post.images.length > 0">
                      <div 
                        class="image-preview" 
                        v-for="(image, index) in post.images.slice(0, 4)" 
                        :key="index"
                        @click.stop="previewImages(post.images, index)"
                      >
                        <img :src="getImageUrl(image)" :alt="`图片${index + 1}`" />
                        <div class="image-count" v-if="post.images.length > 4 && index === 3">
                          +{{ post.images.length - 4 }}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="post-footer">
                    <div class="engagement-stats">
                      <span class="stat">
                        <i class="el-icon-star-on"></i>
                        {{ post.likesCount }} 获赞
                      </span>
                      <span class="stat">
                        <i class="el-icon-chat-dot-round"></i>
                        {{ post.commentsCount }} 评论
                      </span>
                    </div>
                    <!-- 添加跳转提示 -->
                    <div class="post-hint">
                      <span>点击查看详情</span>
                      <i class="el-icon-right"></i>
                    </div>
                  </div>
                </div>

                <!-- 空状态 -->
                <div class="empty-state" v-if="!loading && userPosts.length === 0">
                  <div class="empty-content">
                    <i class="el-icon-document-add"></i>
                    <h3>{{ isCurrentUser ? '还没有发布过帖子' : '该用户还没有发布过帖子' }}</h3>
                    <p>{{ isCurrentUser ? '分享你的第一条动态吧！' : '' }}</p>
                    <el-button type="primary" @click="goToForum" v-if="isCurrentUser">
                      发布第一条帖子
                    </el-button>
                  </div>
                </div>

                <!-- 加载更多 -->
                <div class="load-more" v-if="hasMore && userPosts.length > 0">
                  <el-button @click="loadMorePosts" :loading="loadingMore" class="load-more-btn">
                    加载更多
                  </el-button>
                </div>
              </div>
            </el-tab-pane>

            <el-tab-pane label="获赞记录" name="likes">
              <!-- 获赞记录列表 -->
              <div class="likes-list" v-loading="loading">
                <div 
                  class="like-item clickable-post" 
                  v-for="like in userLikes" 
                  :key="like.id"
                  @click="goToPostInForum(like.postId)"
                >
                  <div class="like-header">
                    <div class="liker-info">
                      <img 
                        :src="getUserAvatar(like.liker)" 
                        :alt="like.liker.username"
                        class="liker-avatar"
                      />
                      <div class="liker-details">
                        <span class="liker-name">{{ like.liker.username }}</span>
                        <span class="like-time">{{ formatTime(like.likedAt) }}</span>
                      </div>
                    </div>
                    <div class="like-action">
                      <i class="el-icon-star-on" style="color: #e03426;"></i>
                      <span>赞了你的帖子</span>
                    </div>
                  </div>
                  
                  <div class="post-preview">
                    <p class="post-content">{{ like.postContent }}</p>
                    
                    <!-- 帖子图片预览 -->
                    <div class="post-images" v-if="like.postImages && like.postImages.length > 0">
                      <div 
                        class="image-preview" 
                        v-for="(image, index) in like.postImages.slice(0, 3)" 
                        :key="index"
                      >
                        <img :src="getImageUrl(image)" :alt="`图片${index + 1}`" />
                        <div class="image-count" v-if="like.postImages.length > 3 && index === 2">
                          +{{ like.postImages.length - 3 }}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div class="like-footer">
                    <span class="view-hint">点击查看帖子详情</span>
                    <i class="el-icon-right"></i>
                  </div>
                </div>

                <!-- 空状态 -->
                <div class="empty-state" v-if="!loading && userLikes.length === 0">
                  <div class="empty-content">
                    <i class="el-icon-star-on"></i>
                    <h3>还没有获得点赞</h3>
                    <p>发布优质内容来获得更多点赞吧！</p>
                    <el-button type="primary" @click="goToForum">
                      去发帖
                    </el-button>
                  </div>
                </div>

                <!-- 加载更多 -->
                <div class="load-more" v-if="likeHasMore && userLikes.length > 0">
                  <el-button @click="loadMoreLikes" :loading="loadingMoreLikes" class="load-more-btn">
                    加载更多
                  </el-button>
                </div>
              </div>
            </el-tab-pane>

            <el-tab-pane label="我的收藏" name="favorites" v-if="isCurrentUser">
              <!-- 收藏帖子网格 -->
              <div class="posts-grid" v-loading="loading">
                <div 
                  class="post-card clickable-post" 
                  v-for="post in favoritePosts" 
                  :key="post.id"
                  @click="goToPostInForum(post.id)"
                >
                  <div class="post-header">
                    <span class="post-time">收藏于 {{ formatTime(post.favoritedAt) }}</span>
                    <el-dropdown 
                      @command="() => removeFavorite(post.id)"
                      @click.stop
                    >
                      <i class="el-icon-more"></i>
                      <el-dropdown-menu slot="dropdown">
                        <el-dropdown-item command="remove">取消收藏</el-dropdown-item>
                      </el-dropdown-menu>
                    </el-dropdown>
                  </div>
                  
                  <div class="post-content">
                    <p class="post-text">{{ post.content }}</p>
                    
                    <!-- 图片展示 -->
                    <div class="post-images" v-if="post.images && post.images.length > 0">
                      <div 
                        class="image-preview" 
                        v-for="(image, index) in post.images.slice(0, 4)" 
                        :key="index"
                        @click.stop="previewImages(post.images, index)"
                      >
                        <img :src="getImageUrl(image)" :alt="`图片${index + 1}`" />
                        <div class="image-count" v-if="post.images.length > 4 && index === 3">
                          +{{ post.images.length - 4 }}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="post-footer">
                    <div class="engagement-stats">
                      <span class="stat">
                        <i class="el-icon-star-on"></i>
                        {{ post.likesCount }} 获赞
                      </span>
                      <span class="stat">
                        <i class="el-icon-chat-dot-round"></i>
                        {{ post.commentsCount }} 评论
                      </span>
                    </div>
                    <div class="post-hint">
                      <span>点击查看详情</span>
                      <i class="el-icon-right"></i>
                    </div>
                  </div>
                </div>

                <!-- 空状态 -->
                <div class="empty-state" v-if="!loading && favoritePosts.length === 0">
                  <div class="empty-content">
                    <i class="el-icon-collection"></i>
                    <h3>还没有收藏过帖子</h3>
                    <p>去论坛收藏感兴趣的帖子吧！</p>
                    <el-button type="primary" @click="goToForum">
                      浏览论坛
                    </el-button>
                  </div>
                </div>

                <!-- 加载更多 -->
                <div class="load-more" v-if="favoriteHasMore && favoritePosts.length > 0">
                  <el-button @click="loadMoreFavorites" :loading="loadingMoreFavorites" class="load-more-btn">
                    加载更多
                  </el-button>
                </div>
              </div>
            </el-tab-pane>

            <el-tab-pane label="我的上传" name="uploads" v-if="isCurrentUser">
              <!-- 上传图片网格 -->
              <div class="uploads-grid" v-loading="loading">
                <div 
                  class="upload-card" 
                  v-for="upload in userUploads" 
                  :key="upload.id"
                  @click="goToModel(upload.Model.id)"
                >
                  <div class="upload-image">
                    <img 
                      :src="upload.thumbnailUrl || upload.url" 
                      :alt="upload.Model ? upload.Model.name : '汽车图片'"
                      @error="handleImageError"
                    />
                  </div>
                  <div class="upload-info">
                    <h4 class="model-name">{{ upload.Model ? upload.Model.name : '未知车型' }}</h4>
                    <div class="model-details" v-if="upload.Model">
                      <span class="brand-name">{{ upload.Model.Brand ? upload.Model.Brand.name : '' }}</span>
                      <span class="model-type">{{ upload.Model.type }}</span>
                    </div>
                    <div class="upload-time">上传于 {{ formatTime(upload.createdAt) }}</div>
                  </div>
                </div>

                <!-- 空状态 -->
                <div class="empty-state" v-if="!loading && userUploads.length === 0">
                  <div class="empty-content">
                    <i class="el-icon-picture-outline"></i>
                    <h3>还没有上传过图片</h3>
                    <p>上传你喜爱的汽车图片吧！</p>
                    <el-button type="primary" @click="goToUpload">
                      上传图片
                    </el-button>
                  </div>
                </div>

                <!-- 加载更多 -->
                <div class="load-more" v-if="uploadHasMore && userUploads.length > 0">
                  <el-button @click="loadMoreUploads" :loading="loadingMoreUploads" class="load-more-btn">
                    加载更多
                  </el-button>
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>
        </div>
      </div>
    </div>

    <!-- 编辑个人资料弹窗 -->
    <el-dialog
      title="编辑个人资料"
      :visible.sync="editProfileVisible"
      width="500px"
      :before-close="handleCloseEdit"
    >
      <el-form :model="editForm" :rules="editRules" ref="editForm" label-width="80px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="editForm.username" placeholder="请输入用户名"></el-input>
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="editForm.email" placeholder="请输入邮箱"></el-input>
        </el-form-item>
        <el-form-item label="头像">
          <el-upload
            class="avatar-uploader"
            :action="uploadUrl"
            :headers="uploadHeaders"
            :show-file-list="false"
            :on-success="handleAvatarSuccess"
            :on-error="handleAvatarUploadError"
            :before-upload="beforeAvatarUpload"
            name="avatar"
          >
            <img v-if="editForm.avatar" :src="editForm.avatar" class="avatar-preview">
            <i v-else class="el-icon-plus avatar-uploader-icon"></i>
          </el-upload>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="editProfileVisible = false">取消</el-button>
        <el-button type="primary" @click="saveProfile" :loading="saving">保存</el-button>
      </div>
    </el-dialog>

    <!-- 图片预览 -->
    <el-dialog
      title="图片预览"
      :visible.sync="imagePreviewVisible"
      width="80%"
      center
    >
      <div class="image-preview-dialog">
        <img :src="currentPreviewImage" alt="预览图片" />
      </div>
      <div class="preview-controls">
        <el-button @click="prevImage" :disabled="currentImageIndex === 0">上一张</el-button>
        <span>{{ currentImageIndex + 1 }} / {{ previewImagesList.length }}</span>
        <el-button @click="nextImage" :disabled="currentImageIndex === previewImagesList.length - 1">下一张</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'Profile',
  data() {
    return {
      user: {},
      userStats: {
        postsCount: 0,
        likesCount: 0,
        commentsCount: 0
      },
      loading: false,
      saving: false,
      editForm: {
        username: '',
        email: '',
        avatar: ''
      },
      editRules: {
        username: [
          { required: true, message: '请输入用户名', trigger: 'blur' },
          { min: 2, max: 20, message: '用户名长度在 2 到 20 个字符', trigger: 'blur' }
        ],
        email: [
          { required: true, message: '请输入邮箱地址', trigger: 'blur' },
          { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }
        ]
      },
      activeTab: 'posts',
      postsFilter: 'all',
      userPosts: [],
      hasMore: true,
      loadingMore: false,
      editProfileVisible: false,
      imagePreviewVisible: false,
      currentPreviewImage: '',
      currentImageIndex: 0,
      previewImagesList: [],
      uploadUrl: '/api/auth/upload-avatar',
      uploadHeaders: {},
      favoritePosts: [],
      favoriteHasMore: true,
      loadingMoreFavorites: false,
      userUploads: [],
      uploadHasMore: true,
      loadingMoreUploads: false,
      userLikes: [],
      likeHasMore: true,
      loadingMoreLikes: false
    };
  },
  computed: {
    userAvatar() {
      const avatar = this.user.avatar;
      
      if (!avatar) {
        return '/images/default-avatar.png';
      }
      
      // 如果是完整的HTTP/HTTPS URL，直接返回
      if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
        return avatar;
      }
      
      // 如果包含腾讯云域名，也直接返回
      if (avatar.includes('tencentcos.cn') || avatar.includes('cos.ap-shanghai.myqcloud.com')) {
        return avatar;
      }
      
      // 使用环境变量或生产环境的基础URL
      const baseURL = process.env.NODE_ENV === 'production' ? '' : (process.env.VUE_APP_API_BASE_URL || 'http://localhost:3000');
      const finalUrl = `${baseURL}${avatar}`;
      return finalUrl;
    },
    isCurrentUser() {
      const currentUser = this.$store.state.user;
      const targetUserId = this.getCurrentUserId();
      
      // 如果没有指定userId参数，说明是查看自己的资料
      if (!targetUserId) {
        return true;
      }
      
      // 如果指定了userId，只有当前登录用户的ID与目标用户ID相同时才返回true
      return this.user && currentUser && this.user.id === currentUser.id;
    }
  },
  async mounted() {
    await this.loadUserProfile();
    await this.loadUserStats();
    await this.loadUserPosts();
    this.setupUploadHeaders();
    
    // 根据路由路径自动切换标签页
    this.setActiveTabFromRoute();
  },
  watch: {
    // 监听路由变化，当userId改变时重新加载数据
    '$route'(to, from) {
      if (to.params.userId !== from.params.userId) {
        this.loadUserProfile();
        this.loadUserStats();
        this.loadUserPosts();
      }
    }
  },
  methods: {
    // 获取当前要查看的用户ID
    getCurrentUserId() {
      // 如果有路由参数userId，则查看指定用户，否则查看当前登录用户
      return this.$route.params.userId || null;
    },

    async loadUserProfile() {
      try {
        const targetUserId = this.getCurrentUserId();
        
        if (targetUserId) {
          // 查看指定用户的资料（公开信息）
          const response = await axios.get(`/api/forum/user-profile/${targetUserId}`);
          
          if (response.data.status === 'success') {
            this.user = response.data.data;
            // 查看他人资料时，不设置编辑表单
            this.editForm = {
              username: '',
              email: '',
              avatar: ''
            };
          } else {
            this.$message.error('用户不存在');
            this.$router.push('/forum');
          }
        } else {
          // 查看当前用户自己的资料
          const token = localStorage.getItem('token');
          if (!token) {
            this.$router.push('/login');
            return;
          }

          const response = await axios.get('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
          });

          if (response.data.status === 'success') {
            this.user = response.data.data;
            this.editForm = {
              username: this.user.username || '',
              email: this.user.email || '',
              avatar: this.user.avatar || ''
            };
          }
        }
      } catch (error) {
        console.error('加载用户资料失败:', error);
        this.$message.error('加载用户资料失败');
        // 如果是查看他人资料失败，返回论坛
        if (this.getCurrentUserId()) {
          this.$router.push('/forum');
        }
      }
    },

    async loadUserStats() {
      if (!this.user.id) return;
      
      try {
        const response = await axios.get(`/api/forum/user-stats/${this.user.id}`);
        if (response.data.status === 'success') {
          this.userStats = response.data.data;
        }
      } catch (error) {
        console.error('加载用户统计失败:', error);
      }
    },

    async loadUserPosts() {
      if (!this.user.id) return;
      
      this.loading = true;
      try {
        const response = await axios.get('/api/forum/posts', {
          params: {
            filter: this.postsFilter,
            userId: this.user.id,
            page: 1,
            limit: 10
          }
        });
        if (response.data.status === 'success') {
          this.userPosts = response.data.data.posts;
          this.hasMore = response.data.data.hasMore;
        }
      } catch (error) {
        console.error('加载用户帖子失败:', error);
      } finally {
        this.loading = false;
      }
    },

    async loadMorePosts() {
      this.loadingMore = true;
      try {
        const currentPage = Math.floor(this.userPosts.length / 10) + 1;
        const response = await axios.get('/api/forum/posts', {
          params: {
            filter: this.postsFilter,
            userId: this.user.id,
            page: currentPage + 1,
            limit: 10
          }
        });
        if (response.data.status === 'success') {
          this.userPosts = [...this.userPosts, ...response.data.data.posts];
          this.hasMore = response.data.data.hasMore;
        }
      } catch (error) {
        console.error('加载更多帖子失败:', error);
      } finally {
        this.loadingMore = false;
      }
    },

    async deletePost(postId) {
      try {
        await this.$confirm('确定要删除这个帖子吗？', '确认删除', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        });
        
        const token = localStorage.getItem('token');
        const response = await axios.delete(`/api/forum/posts/${postId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.status === 'success') {
          this.$message.success('帖子删除成功');
          await this.loadUserPosts();
          await this.loadUserStats();
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('删除帖子失败:', error);
          this.$message.error('删除失败，请重试');
        }
      }
    },

    previewImages(images, index) {
      this.previewImagesList = images.map(img => this.getImageUrl(img));
      this.currentImageIndex = index;
      this.currentPreviewImage = this.previewImagesList[index];
      this.imagePreviewVisible = true;
    },

    prevImage() {
      if (this.currentImageIndex > 0) {
        this.currentImageIndex--;
        this.currentPreviewImage = this.previewImagesList[this.currentImageIndex];
      }
    },

    nextImage() {
      if (this.currentImageIndex < this.previewImagesList.length - 1) {
        this.currentImageIndex++;
        this.currentPreviewImage = this.previewImagesList[this.currentImageIndex];
      }
    },

    goToForum() {
      this.$router.push('/forum');
    },

    showEditProfile() {
      // 初始化编辑表单
      this.editForm = {
        username: this.user.username || '',
        email: this.user.email || '',
        avatar: this.user.avatar || ''
      };
      this.editProfileVisible = true;
    },

    handleCloseEdit() {
      this.editProfileVisible = false;
      this.editForm = {
        username: this.user.username || '',
        email: this.user.email || '',
        avatar: this.user.avatar || ''
      };
    },

    async saveProfile() {
      try {
        await this.$refs.editForm.validate();
        
        this.saving = true;
        const token = localStorage.getItem('token');
        const response = await axios.put('/api/auth/profile', this.editForm, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.status === 'success') {
          this.user = { ...this.user, ...this.editForm };
          this.$store.dispatch('updateUser', this.user);
          this.$message.success('个人资料更新成功');
          this.editProfileVisible = false;
        }
      } catch (error) {
        console.error('保存个人资料失败:', error);
        this.$message.error('保存失败，请重试');
      } finally {
        this.saving = false;
      }
    },

    setupUploadHeaders() {
      const token = localStorage.getItem('token');
      this.uploadHeaders = {
        Authorization: `Bearer ${token}`
      };
    },

    handleAvatarSuccess(response) {
      if (response.status === 'success') {
        this.editForm.avatar = response.data.avatar;
        // 立即更新user对象中的头像，这样预览界面也会立即更新
        this.user.avatar = response.data.avatar;
        this.$message.success('头像上传成功');
      } else {
        this.$message.error(response.message || '头像上传失败');
      }
    },

    handleAvatarUploadError(error) {
      console.error('头像上传失败:', error);
      this.$message.error('头像上传失败，请重试');
    },

    beforeAvatarUpload(file) {
      const isImage = file.type.indexOf('image/') === 0;
      const isLt2M = file.size / 1024 / 1024 < 2;

      if (!isImage) {
        this.$message.error('上传头像图片只能是图片格式!');
        return false;
      }
      if (!isLt2M) {
        this.$message.error('上传头像图片大小不能超过 2MB!');
        return false;
      }
      return true;
    },

    handleAvatarError() {
      console.error('头像加载失败:', this.userAvatar);
    },

    handleAvatarLoad() {
      // 头像加载成功
    },

    getImageUrl(imageUrl) {
      if (!imageUrl) return '/images/default-avatar.png';
      if (imageUrl.startsWith('http')) return imageUrl;
      
      // 使用环境变量或生产环境的基础URL
      const baseURL = process.env.NODE_ENV === 'production' ? '' : (process.env.VUE_APP_API_BASE_URL || 'http://localhost:3000');
      return `${baseURL}${imageUrl}`;
    },

    formatTime(dateString) {
      const date = new Date(dateString);
      const now = new Date();
      const diff = now - date;
      
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);
      
      if (minutes < 1) return '刚刚';
      if (minutes < 60) return `${minutes}分钟前`;
      if (hours < 24) return `${hours}小时前`;
      if (days < 7) return `${days}天前`;
      
      return date.toLocaleDateString('zh-CN');
    },

    handleTabChange(tab) {
      // 更新URL但不导航
      if (tab.name !== this.activeTab) {
        this.activeTab = tab.name;
        this.$router.replace({ 
          path: this.$route.path, 
          query: { ...this.$route.query, tab: tab.name } 
        });
      }

      // 根据标签页加载相应数据
      if (tab.name === 'favorites' && this.isCurrentUser) {
        if (this.favoritePosts.length === 0) {
          this.loadFavoritePosts();
        }
      } else if (tab.name === 'uploads' && this.isCurrentUser) {
        if (this.userUploads.length === 0) {
          this.loadUserUploads();
        }
      } else if (tab.name === 'likes') {
        if (this.userLikes.length === 0) {
          this.loadUserLikes();
        }
      }
    },

    goToPostInForum(postId) {
      this.$router.push({ path: '/forum', query: { postId } });
    },

    async loadFavoritePosts() {
      try {
        const response = await axios.get('/api/forum/favorites', {
          params: {
            page: 1,
            limit: 10
          }
        });
        
        if (response.data.success) {
          this.favoritePosts = response.data.data.posts;
          this.favoriteHasMore = response.data.data.hasMore;
        }
      } catch (error) {
        console.error('加载收藏帖子失败:', error);
        this.$message.error('加载收藏帖子失败');
      }
    },

    async loadMoreFavorites() {
      this.loadingMoreFavorites = true;
      try {
        const nextPage = Math.floor(this.favoritePosts.length / 10) + 1;
        const response = await axios.get('/api/forum/favorites', {
          params: {
            page: nextPage,
            limit: 10
          }
        });
        
        if (response.data.success) {
          this.favoritePosts.push(...response.data.data.posts);
          this.favoriteHasMore = response.data.data.hasMore;
        }
      } catch (error) {
        console.error('加载更多收藏失败:', error);
        this.$message.error('加载更多收藏失败');
      } finally {
        this.loadingMoreFavorites = false;
      }
    },

    async removeFavorite(postId) {
      try {
        const response = await axios.post(`/api/forum/posts/${postId}/favorite`);
        if (response.data.success) {
          // 从列表中移除该帖子
          this.favoritePosts = this.favoritePosts.filter(post => post.id !== postId);
          this.$message.success('取消收藏成功');
        }
      } catch (error) {
        console.error('取消收藏失败:', error);
        this.$message.error('取消收藏失败');
      }
    },

    async loadUserUploads() {
      try {
        const response = await axios.get('/api/forum/user-uploads', {
          params: {
            page: 1,
            limit: 12
          }
        });
        
        if (response.data.success) {
          this.userUploads = response.data.data.uploads;
          this.uploadHasMore = response.data.data.hasMore;
        }
      } catch (error) {
        console.error('加载用户上传失败:', error);
        this.$message.error('加载用户上传失败');
      }
    },

    async loadMoreUploads() {
      this.loadingMoreUploads = true;
      try {
        const nextPage = Math.floor(this.userUploads.length / 12) + 1;
        const response = await axios.get('/api/forum/user-uploads', {
          params: {
            page: nextPage,
            limit: 12
          }
        });
        
        if (response.data.success) {
          this.userUploads.push(...response.data.data.uploads);
          this.uploadHasMore = response.data.data.hasMore;
        }
      } catch (error) {
        console.error('加载更多上传失败:', error);
        this.$message.error('加载更多上传失败');
      } finally {
        this.loadingMoreUploads = false;
      }
    },

    goToModel(modelId) {
      this.$router.push(`/model/${modelId}`);
    },

    goToUpload() {
      this.$router.push('/upload');
    },

    handleImageError() {
      console.error('图片加载失败:', this.userAvatar);
    },

    // 根据路由路径自动切换标签页
    setActiveTabFromRoute() {
      const route = this.$route;
      if (route.name === 'ProfileUploads') {
        this.activeTab = 'uploads';
      } else if (route.name === 'ProfileFavorites') {
        this.activeTab = 'favorites';
      } else if (route.query.tab) {
        this.activeTab = route.query.tab;
      } else {
        this.activeTab = 'posts';
      }
    },

    async loadUserLikes() {
      try {
        const response = await axios.get('/api/forum/user-likes', {
          params: {
            page: 1,
            limit: 10
          }
        });
        
        if (response.data.success) {
          this.userLikes = response.data.data.likes;
          this.likeHasMore = response.data.data.hasMore;
        }
      } catch (error) {
        console.error('加载用户点赞失败:', error);
        this.$message.error('加载用户点赞失败');
      }
    },

    async loadMoreLikes() {
      this.loadingMoreLikes = true;
      try {
        const nextPage = Math.floor(this.userLikes.length / 10) + 1;
        const response = await axios.get('/api/forum/user-likes', {
          params: {
            page: nextPage,
            limit: 10
          }
        });
        
        if (response.data.success) {
          this.userLikes.push(...response.data.data.likes);
          this.likeHasMore = response.data.data.hasMore;
        }
      } catch (error) {
        console.error('加载更多点赞失败:', error);
        this.$message.error('加载更多点赞失败');
      } finally {
        this.loadingMoreLikes = false;
      }
    },

    getUserAvatar(user) {
      return this.getImageUrl(user.avatar);
    }
  }
};
</script>

<style scoped>
.profile-container {
  min-height: 100vh;
  background: #f8f9fa;
  font-family: Arial, "Microsoft YaHei", sans-serif;
}

/* 顶部横幅 */
.profile-banner {
  position: relative;
  height: 180px;
  background: #000000;
  overflow: hidden;
}

.banner-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(ellipse at center, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
  opacity: 0.6;
}

.banner-content {
  position: relative;
  z-index: 1;
  max-width: 1200px;
  margin: 0 auto;
  height: 100%;
  padding: 10px 20px;
  display: flex;
  align-items: center;
}

.profile-main {
  display: flex;
  align-items: stretch;
  gap: 24px;
  width: 100%;
  min-height: 120px;
}

.avatar-section {
  position: relative;
  flex-shrink: 0;
}

.profile-avatar-img {
  border-radius: 50%;
  object-fit: cover;
  width: 90px;
  height: 90px;
  border: 3px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
}

.profile-avatar-img:hover {
  transform: scale(1.02);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
}

.avatar-badge {
  position: absolute;
  bottom: 0;
  right: 0;
  background: linear-gradient(135deg, #e03426 0%, #67C23A 100%);
  border: 3px solid white;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 12px;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

.user-info {
  flex: 1;
  color: white;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 24px;
  height: 100%;
}

.user-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 0;
}

.username {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: white;
  line-height: 1.2;
  word-break: break-all;
  max-width: calc(100% - 120px);
  overflow-wrap: break-word;
}

.edit-btn {
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  backdrop-filter: blur(10px);
  border-radius: 6px;
  padding: 6px 16px;
  transition: all 0.3s ease;
  font-size: 13px;
  font-weight: 500;
  flex-shrink: 0;
  margin-top: 2px;
}

.edit-btn:hover {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-1px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.user-stats {
  display: flex;
  gap: 24px;
  margin: 0;
}

.stat-item {
  text-align: left;
  transition: all 0.3s ease;
  cursor: pointer;
}

.stat-item:hover {
  transform: translateY(-2px);
}

.stat-number {
  display: block;
  font-size: 20px;
  font-weight: 600;
  color: white;
  margin-bottom: 2px;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  line-height: 1;
}

.stat-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
  font-weight: 500;
}

/* 主内容区域 */
.main-content {
  background: transparent;
  padding: 0 40px;
  margin-top: 10px;
  position: relative;
  z-index: 2;
  max-width: 1400px;
  margin-left: auto;
  margin-right: auto;
}

.content-container {
  max-width: 100%;
  margin: 0 auto;
}

/* 标签页样式 - 强制居中 */
.tabs-section {
  background: white;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.tabs-section .el-tabs__header {
  margin: 0 !important;
  border-bottom: 1px solid #e4e7ed;
  background: #f8f9fa;
  padding: 0 40px !important;
  position: relative !important;
  overflow: hidden;
  display: flex !important;
  justify-content: center !important;
}

.tabs-section .el-tabs__nav-wrap {
  position: relative !important;
  left: auto !important;
  transform: none !important;
  width: auto !important;
  padding: 20px 0 !important;
  background: transparent;
  text-align: center;
  display: flex !important;
  justify-content: center !important;
}

.tabs-section .el-tabs__nav-wrap::after {
  display: none !important;
}

.tabs-section .el-tabs__nav-scroll {
  overflow: visible !important;
  width: auto !important;
  display: flex !important;
  justify-content: center !important;
}

.tabs-section .el-tabs__nav {
  float: none !important;
  display: flex !important;
  position: relative !important;
  width: auto !important;
  margin: 0 !important;
  padding: 0 !important;
  transform: none !important;
}

.tabs-section .el-tabs__item {
  font-size: 16px;
  font-weight: 600;
  color: #606266;
  height: 40px;
  line-height: 40px;
  transition: all 0.3s ease;
  float: none !important;
  display: block !important;
  margin: 0 !important;
  padding: 0 25px !important;
  flex-shrink: 0 !important;
}

.tabs-section .el-tabs__item:first-child {
  margin-left: 0 !important;
  padding-left: 25px !important;
}

.tabs-section .el-tabs__item:hover {
  color: #e03426;
}

.tabs-section .el-tabs__item.is-active {
  color: #e03426;
  font-weight: 600;
}

.tabs-section .el-tabs__active-bar {
  background-color: #e03426;
  height: 2px;
  position: absolute !important;
  bottom: 0 !important;
}

.tabs-section .el-tabs__content {
  padding: 40px !important;
}

/* 备用方案 - 如果上面不行就用这个 */
.tabs-section .el-tabs__header::before {
  content: "" !important;
  display: table !important;
  clear: both !important;
}

.tabs-section .el-tabs__header::after {
  content: "" !important;
  display: table !important;
  clear: both !important;
}

/* 快速发帖优化 */
.quick-post {
  margin-bottom: 20px;
  padding: 0;
}

.quick-post-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 12px;
  border: 1px solid #e4e7ed;
  transition: all 0.3s ease;
  cursor: pointer;
  margin: 4px;
}

.quick-post-card:hover {
  background: #ecf5ff;
  border-color: #b3d8ff;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
}

.quick-post-btn {
  flex: 1;
  text-align: left;
  background: transparent;
  border: none;
  color: #606266;
  font-size: 14px;
  font-weight: 500;
  padding: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.quick-post-btn span {
  font-size: 14px;
  color: #909399;
}

.quick-post-btn i {
  font-size: 16px;
  color: #e03426;
}

/* 筛选区域 */
.filter-section {
  margin-bottom: 20px;
  text-align: center;
  padding: 0;
}

.filter-section .el-radio-group {
  background: white;
  border-radius: 8px;
  padding: 4px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  border: 1px solid #e4e7ed;
}

.filter-section .el-radio-button__inner {
  background: transparent;
  border: none;
  color: #606266;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 6px;
  transition: all 0.3s ease;
}

.filter-section .el-radio-button__orig-radio:checked + .el-radio-button__inner {
  background: #e03426;
  color: white;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
}

.filter-section .el-radio-button:hover .el-radio-button__inner {
  background: #ecf5ff;
  color: #e03426;
}

/* 帖子网格优化 */
.posts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
  padding: 0;
}

.post-card {
  background: white;
  border-radius: 12px;
  border: 1px solid #e4e7ed;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  margin: 0;
}

.post-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);
  border-color: #b3d8ff;
}

/* 可点击帖子样式 */
.clickable-post {
  cursor: pointer;
  position: relative;
}

.clickable-post:hover {
  transform: translateY(-6px);
  box-shadow: 0 12px 35px rgba(0, 0, 0, 0.15);
  border-color: #e03426;
}

.clickable-post:hover .post-hint {
  opacity: 1;
  transform: translateY(0);
}

.post-hint {
  position: absolute;
  bottom: 10px;
  right: 15px;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #e03426;
  opacity: 0;
  transform: translateY(10px);
  transition: all 0.3s ease;
  background: rgba(255, 255, 255, 0.9);
  padding: 4px 8px;
  border-radius: 12px;
  backdrop-filter: blur(5px);
}

.post-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #e4e7ed;
}

.post-time {
  font-size: 12px;
  color: #909399;
  font-weight: 500;
}

.post-content {
  padding: 20px;
}

.post-text {
  margin: 0 0 16px 0;
  color: #333;
  font-size: 14px;
  line-height: 1.6;
  font-weight: 500;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.post-images {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  border-radius: 8px;
  overflow: hidden;
  margin-top: 4px;
}

.image-preview {
  position: relative;
  cursor: pointer;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 6px;
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.image-preview:hover img {
  transform: scale(1.05);
}

.image-count {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 16px;
  font-weight: 600;
}

.post-footer {
  padding: 18px 20px;
  border-top: 1px solid #e4e7ed;
  background: #f8f9fa;
}

.engagement-stats {
  display: flex;
  gap: 20px;
}

.stat {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #909399;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 6px;
}

.stat:hover {
  color: #e03426;
  background: #ecf5ff;
}

.stat i {
  font-size: 14px;
}

/* 空状态优化 */
.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 60px 20px;
  background: #f8f9fa;
  border-radius: 12px;
  border: 1px solid #e4e7ed;
}

.empty-content {
  max-width: 400px;
  margin: 0 auto;
}

.empty-content i {
  font-size: 64px;
  color: #c0c4cc;
  margin-bottom: 20px;
  display: block;
}

.empty-content h3 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 18px;
  font-weight: 600;
}

.empty-content p {
  margin: 0 0 20px 0;
  color: #606266;
  font-size: 14px;
  line-height: 1.5;
}

/* 加载更多优化 */
.load-more {
  grid-column: 1 / -1;
  text-align: center;
  padding: 20px;
}

.load-more-btn {
  padding: 12px 32px;
  font-size: 16px;
  border-radius: 8px;
  background: linear-gradient(135deg, #e03426, #67C23A);
  border: none;
  color: white;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

.load-more-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(64, 158, 255, 0.4);
}

/* 即将推出 */
.coming-soon {
  text-align: center;
  padding: 60px 20px;
  color: #606266;
  background: #f8f9fa;
  border-radius: 12px;
  border: 1px solid #e4e7ed;
}

.coming-soon i {
  font-size: 64px;
  color: #c0c4cc;
  margin-bottom: 20px;
  display: block;
}

.coming-soon h3 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 18px;
  font-weight: 600;
}

.coming-soon p {
  margin: 0;
  font-size: 14px;
}

/* 弹窗样式 */
.avatar-uploader {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px dashed #c0c4cc;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.avatar-uploader:hover {
  border-color: #e03426;
}

.avatar-uploader-icon {
  font-size: 20px;
  color: #8c939d;
  cursor: pointer;
}

.avatar-preview {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 8px;
}

.image-preview-dialog {
  text-align: center;
}

.image-preview-dialog img {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.preview-controls {
  text-align: center;
  margin-top: 16px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .posts-grid {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 20px;
    padding: 0 3px;
  }
  
  .quick-post {
    padding: 0 3px;
  }

  .filter-section {
    padding: 0 3px;
  }
  
  .banner-content {
    padding: 15px 15px;
  }
  
  .profile-main {
    gap: 24px;
  }
  
  .user-stats {
    gap: 24px;
  }
  
  .main-content {
    padding: 20px;
    max-width: 100%;
  }

  .tabs-section .el-tabs__header {
    padding: 0 25px !important;
    display: flex !important;
    justify-content: center !important;
  }

  .tabs-section .el-tabs__nav-wrap {
    padding: 18px 0 !important;
  }

  .tabs-section .el-tabs__item {
    padding: 0 20px !important;
    font-size: 15px !important;
  }

  .tabs-section .el-tabs__content {
    padding: 25px !important;
  }
}

@media (max-width: 768px) {
  .profile-banner {
    height: 160px;
  }
  
  .banner-content {
    padding: 16px 15px;
  }
  
  .profile-main {
    flex-direction: column;
    align-items: center;
    gap: 16px;
    text-align: center;
    min-height: 100px;
  }
  
  .user-info {
    justify-content: center;
    gap: 24px;
  }
  
  .user-header {
    flex-direction: column;
    gap: 10px;
    text-align: center;
    align-items: center;
  }
  
  .username {
    font-size: 20px;
    max-width: 100%;
    text-align: center;
  }
  
  .user-stats {
    justify-content: center;
    gap: 24px;
  }
  
  .posts-grid {
    grid-template-columns: 1fr;
    gap: 16px;
    padding: 0 2px;
  }

  .quick-post {
    padding: 0 2px;
  }

  .filter-section {
    padding: 0 2px;
  }
  
  .quick-post-card {
    padding: 18px;
  }
  
  .main-content {
    padding: 15px;
    max-width: 100%;
  }

  .tabs-section .el-tabs__header {
    padding: 0 20px !important;
    display: flex !important;
    justify-content: center !important;
  }

  .tabs-section .el-tabs__nav-wrap {
    padding: 16px 0 !important;
  }

  .tabs-section .el-tabs__item {
    padding: 0 15px !important;
    font-size: 14px !important;
  }
  
  .tabs-section .el-tabs__content {
    padding: 20px !important;
  }

  .post-content {
    padding: 18px;
  }

  .post-header {
    padding: 16px 18px;
  }

  .post-footer {
    padding: 16px 18px;
  }
}

@media (max-width: 480px) {
  .profile-banner {
    height: 140px;
  }
  
  .banner-content {
    padding: 12px 10px;
  }
  
  .profile-main {
    min-height: 80px;
    gap: 12px;
  }
  
  .user-info {
    justify-content: center;
    gap: 20px;
  }
  
  .profile-avatar-img {
    width: 70px;
    height: 70px;
  }
  
  .avatar-badge {
    width: 20px;
    height: 20px;
    font-size: 10px;
  }
  
  .username {
    font-size: 18px;
    max-width: 100%;
  }
  
  .user-stats {
    flex-wrap: wrap;
    gap: 12px;
  }
  
  .stat-item {
    flex: 1;
    min-width: calc(33.33% - 8px);
    text-align: center;
  }
  
  .stat-number {
    font-size: 16px;
  }
  
  .stat-label {
    font-size: 12px;
  }
  
  .main-content {
    padding: 10px;
    max-width: 100%;
  }

  .tabs-section .el-tabs__header {
    padding: 0 15px !important;
    display: flex !important;
    justify-content: center !important;
  }

  .tabs-section .el-tabs__nav-wrap {
    padding: 12px 0 !important;
  }

  .tabs-section .el-tabs__item {
    padding: 0 12px !important;
    font-size: 13px !important;
  }

  .tabs-section .el-tabs__content {
    padding: 15px !important;
  }

  .quick-post {
    padding: 0;
  }

  .filter-section {
    padding: 0;
  }

  .quick-post-card {
    padding: 16px;
    margin: 2px;
  }

  .post-content {
    padding: 16px;
  }

  .post-header {
    padding: 14px 16px;
  }

  .post-footer {
    padding: 14px 16px;
  }

  .posts-grid {
    gap: 12px;
    padding: 0;
  }
}

/* 上传图片网格样式 */
.uploads-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
  margin-top: 20px;
}

.upload-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: all 0.3s ease;
  cursor: pointer;
}

.upload-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.upload-image {
  width: 100%;
  height: 200px;
  overflow: hidden;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: all 0.3s ease;
}

.upload-card:hover .upload-image img {
  transform: scale(1.05);
}

.upload-info {
  padding: 16px;
}

.model-name {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 8px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.model-details {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.brand-name {
  background: linear-gradient(135deg, #e03426, #67C23A);
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.model-type {
  color: #909399;
  font-size: 12px;
  background: #f4f4f5;
  padding: 2px 6px;
  border-radius: 4px;
}

.upload-time {
  color: #909399;
  font-size: 12px;
  margin-top: 4px;
}

/* 响应式 - 上传网格 */
@media (max-width: 1024px) {
  .uploads-grid {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 20px;
  }
}

@media (max-width: 768px) {
  .uploads-grid {
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 16px;
  }
  
  .upload-image {
    height: 160px;
  }
  
  .upload-info {
    padding: 12px;
  }
}

@media (max-width: 480px) {
  .uploads-grid {
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  
  .upload-image {
    height: 120px;
  }
  
  .upload-info {
    padding: 10px;
  }
  
  .model-name {
    font-size: 14px;
  }
}

/* 获赞记录样式 */
.likes-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
}

.like-item {
  background: white;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #e4e7ed;
  transition: all 0.3s ease;
  cursor: pointer;
}

.like-item:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border-color: #e03426;
  transform: translateY(-2px);
}

.like-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.liker-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.liker-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #e4e7ed;
}

.liker-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.liker-name {
  font-weight: 600;
  color: #333;
  font-size: 14px;
}

.like-time {
  color: #909399;
  font-size: 12px;
}

.like-action {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #e03426;
  font-size: 14px;
  font-weight: 500;
}

.post-preview {
  margin: 15px 0;
}

.post-preview .post-content {
  color: #606266;
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 10px;
}

.post-preview .post-images {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.post-preview .image-preview {
  position: relative;
  width: 60px;
  height: 60px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e4e7ed;
}

.post-preview .image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.post-preview .image-count {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
}

.like-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 6px;
  color: #909399;
  font-size: 12px;
  border-top: 1px solid #f0f0f0;
  padding-top: 10px;
  margin-top: 15px;
}

.view-hint {
  color: #909399;
  font-size: 12px;
}

/* 个人主页主题色修改 */
/* 编辑资料按钮 */
.profile-container >>> .el-button--primary {
  background-color: #e03426 !important;
  border-color: #e03426 !important;
}

.profile-container >>> .el-button--primary:hover {
  background-color: #b8251a !important;
  border-color: #b8251a !important;
}

/* Tab标签页主题色 */
.profile-container >>> .el-tabs__active-bar {
  background-color: #e03426 !important;
}

.profile-container >>> .el-tabs__item.is-active {
  color: #e03426 !important;
}

.profile-container >>> .el-tabs__item:hover {
  color: #e03426 !important;
}

/* 帖子筛选按钮主题色 */
.profile-container >>> .el-radio-button__inner {
  background-color: #fff !important;
  border-color: #e03426 !important;
  color: #e03426 !important;
}

.profile-container >>> .el-radio-button__orig-radio:checked + .el-radio-button__inner {
  background-color: #e03426 !important;
  border-color: #e03426 !important;
  color: #fff !important;
  box-shadow: -1px 0 0 0 #e03426 !important;
}

.profile-container >>> .el-radio-button__inner:hover {
  color: #b8251a !important;
  border-color: #b8251a !important;
}

.profile-container >>> .el-radio-button:first-child .el-radio-button__inner {
  border-left-color: #e03426 !important;
}

/* 快捷发帖按钮 */
.quick-post-btn {
  color: #e03426 !important;
}

.quick-post-btn:hover {
  color: #b8251a !important;
  background-color: rgba(224, 52, 38, 0.1) !important;
}

/* 对话框按钮 */
.profile-container >>> .el-dialog .el-button--primary {
  background-color: #e03426 !important;
  border-color: #e03426 !important;
}

.profile-container >>> .el-dialog .el-button--primary:hover {
  background-color: #b8251a !important;
  border-color: #b8251a !important;
}

/* 表单输入框焦点状态 */
.profile-container >>> .el-input__inner:focus {
  border-color: #e03426 !important;
  outline: 0 !important;
  box-shadow: 0 0 0 2px rgba(224, 52, 38, 0.2) !important;
}

.profile-container >>> .el-textarea__inner:focus {
  border-color: #e03426 !important;
  outline: 0 !important;
  box-shadow: 0 0 0 2px rgba(224, 52, 38, 0.2) !important;
}

/* 分页组件主题色 */
.profile-container >>> .el-pagination .el-pagination__item.active {
  background-color: #e03426 !important;
  color: #fff !important;
}

.profile-container >>> .el-pagination .el-pagination__item:hover {
  color: #e03426 !important;
}

.profile-container >>> .el-pagination .btn-next:hover,
.profile-container >>> .el-pagination .btn-prev:hover {
  color: #e03426 !important;
}

/* 点赞相关颜色 */
.like-action {
  color: #e03426 !important;
}

/* 上传区域悬停颜色 */
.avatar-uploader:hover {
  border-color: #e03426 !important;
}

.like-item:hover {
  border-color: #e03426 !important;
}
</style> 
