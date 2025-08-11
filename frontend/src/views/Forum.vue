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
            <el-input
              type="textarea"
              :rows="4"
              placeholder="有什么新鲜事想分享给大家？"
              v-model="newPostContent"
              maxlength="500"
              show-word-limit
              resize="none"
              class="post-textarea"
            />
            
            <!-- 显示已选择的话题 -->
            <div class="selected-topics-display" v-if="selectedTopics.length > 0">
              <el-tag
                v-for="topic in selectedTopics"
                :key="topic"
                closable
                @close="removeSelectedTopic(topic)"
                size="small"
                type="primary"
                class="topic-tag-display"
              >
                #{{ topic }}
              </el-tag>
            </div>

            <!-- 上传的图片预览 -->
            <div class="uploaded-images" v-if="imageList.length > 0">
              <div class="image-grid">
                <!-- 已上传的图片 -->
                <div 
                  v-for="(file, index) in imageList" 
                  :key="index"
                  class="image-item"
                >
                  <img :src="getImagePreviewUrl(file)" :alt="`图片${index + 1}`" />
                  <div class="image-overlay">
                    <i class="el-icon-close" @click="removeImage(index)"></i>
                  </div>
                </div>
                
                <!-- 添加更多图片按钮 -->
                <div 
                  v-if="imageList.length < 9"
                  class="add-image-item"
                  @click="triggerImageUpload"
                >
                  <i class="el-icon-plus"></i>
                </div>
              </div>
            </div>
            
            <!-- 工具栏和发布按钮 -->
            <div class="editor-toolbar">
              <div class="toolbar-left">
                <div class="toolbar-item">
                  <emoji-picker @emoji-selected="handleEmojiSelect">
                    <template slot="reference">
                      <div class="tool-btn">
                        <i class="el-icon-sunny"></i>
                        <span>表情</span>
                      </div>
                    </template>
                  </emoji-picker>
                </div>
                
                <div class="toolbar-item">
                  <el-upload
                    ref="hiddenImageUpload"
                    :file-list="[]"
                    :auto-upload="false"
                    :on-change="handleImageChange"
                    accept="image/*"
                    multiple
                    :limit="9"
                    :show-file-list="false"
                    class="hidden-uploader"
                  >
                    <div class="tool-btn">
                      <i class="el-icon-picture"></i>
                      <span>图片</span>
                    </div>
                  </el-upload>
                </div>
                
                <div class="toolbar-item">
                  <div class="tool-btn disabled">
                    <i class="el-icon-video-camera"></i>
                    <span>视频</span>
                  </div>
                </div>
                
                <div class="toolbar-item">
                  <el-popover
                    placement="top-start"
                    width="280"
                    trigger="click"
                    v-model="topicSelectorVisible"
                    popper-class="topic-selector-popover"
                  >
                    <div class="topic-selector-content">
                      <div class="topic-selector-header">
                        <span>选择话题</span>
                        <span class="topic-count">{{ selectedTopics.length }}/3</span>
                      </div>
                      <div class="selected-topics" v-if="selectedTopics.length > 0">
                        <el-tag
                          v-for="topic in selectedTopics"
                          :key="topic"
                          closable
                          @close="removeSelectedTopic(topic)"
                          size="small"
                          type="primary"
                        >
                          #{{ topic }}
                        </el-tag>
                      </div>
                      <el-input
                        v-model="newTopicInput"
                        placeholder="搜索或创建话题..."
                        size="small"
                        @keyup.enter.native="addNewTopic"
                        clearable
                      />
                      <div class="available-topics" v-if="filteredTopics.length > 0">
                        <div class="topic-list-header">推荐话题</div>
                        <div
                          v-for="topic in filteredTopics"
                          :key="topic"
                          class="topic-option"
                          @click="selectTopic(topic)"
                          :class="{ disabled: selectedTopics.includes(topic) }"
                        >
                          <span class="topic-name">#{{ topic }}</span>
                        </div>
                      </div>
                    </div>
                    <template slot="reference">
                      <div class="tool-btn" :class="{ active: topicSelectorVisible }">
                        <i class="el-icon-price-tag"></i>
                        <span>话题</span>
                      </div>
                    </template>
                  </el-popover>
                </div>
                
                <div class="toolbar-item">
                  <div class="tool-btn disabled">
                    <i class="el-icon-headset"></i>
                    <span>音频</span>
                  </div>
                </div>
                
                <div class="toolbar-item">
                  <div class="tool-btn disabled">
                    <i class="el-icon-more"></i>
                    <span>更多</span>
                  </div>
                </div>
              </div>
              
              <div class="toolbar-right">
                <el-button 
                  type="primary" 
                  @click="publishPost" 
                  :loading="publishing"
                  class="publish-btn"
                  :disabled="!newPostContent.trim() && imageList.length === 0"
                >
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
                <!-- 帖子操作菜单（只对作者显示） -->
                <el-dropdown v-if="canManagePost(post)" @command="handlePostAction" trigger="click">
                  <span class="el-dropdown-link">
                    <i class="el-icon-more"></i>
                  </span>
                  <el-dropdown-menu slot="dropdown">
                    <el-dropdown-item :command="{action: 'edit', postId: post.id}">
                      <i class="el-icon-edit"></i> 编辑
                    </el-dropdown-item>
                    <el-dropdown-item :command="{action: 'delete', postId: post.id}" divided>
                      <i class="el-icon-delete"></i> 删除
                    </el-dropdown-item>
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
                
                <div class="post-text" v-html="renderTextWithEmoji(post.content)"></div>
                
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
              <div class="comments-section" v-if="post.showComments" :data-post-id="post.id">
                <div class="comment-input" v-if="isAuthenticated">
                  <div class="comment-input-row">
                    <el-input
                      v-model="post.newComment"
                      placeholder="写评论..."
                      size="small"
                      class="comment-input-field"
                    />
                    <div class="comment-input-actions">
                      <emoji-picker @emoji-selected="emoji => handleCommentEmojiSelect(post, emoji)" />
                      <el-button 
                        size="small" 
                        type="primary"
                        @click="submitComment(post)"
                        :loading="post.commenting"
                      >
                        发送
                      </el-button>
                    </div>
                  </div>
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
                      <p class="comment-text" v-html="renderTextWithEmoji(comment.content)"></p>
                      
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
                      <div class="reply-input" v-if="comment.showReplyInput" :data-comment-id="comment.id">
                        <el-input
                          v-model="comment.replyContent"
                          :placeholder="`回复 @${getUserName(comment.User)}:`"
                          size="small"
                          type="textarea"
                          :rows="2"
                        />
                        <div class="reply-actions">
                          <div class="reply-tools">
                            <emoji-picker @emoji-selected="emoji => handleReplyEmojiSelect(comment, emoji)" />
                          </div>
                          <div class="reply-buttons">
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
                            <p class="reply-text" v-html="renderTextWithEmoji(reply.content)"></p>
                            
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
                            <div class="reply-input nested-reply" v-if="reply.showReplyInput" :data-comment-id="reply.id">
                              <el-input
                                v-model="reply.replyContent"
                                :placeholder="`回复 @${getUserName(reply.User)}:`"
                                size="small"
                                type="textarea"
                                :rows="2"
                              >
                              </el-input>
                              <div class="reply-actions">
                                <div class="reply-tools">
                                  <emoji-picker @emoji-selected="emoji => handleReplyEmojiSelect(reply, emoji)" />
                                </div>
                                <div class="reply-buttons">
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
                                  <p class="nested-reply-text" v-html="renderTextWithEmoji(nestedReply.content)"></p>
                                  
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
                                  <div class="reply-input nested-reply-input" v-if="nestedReply.showReplyInput" :data-comment-id="nestedReply.id">
                                    <el-input
                                      v-model="nestedReply.replyContent"
                                      :placeholder="`回复 @${getUserName(nestedReply.User)}:`"
                                      size="small"
                                      type="textarea"
                                      :rows="2"
                                    >
                                    </el-input>
                                    <div class="reply-actions">
                                      <div class="reply-tools">
                                        <emoji-picker @emoji-selected="emoji => handleReplyEmojiSelect(nestedReply, emoji)" />
                                      </div>
                                      <div class="reply-buttons">
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
                                        <p class="deeper-reply-text" v-html="renderTextWithEmoji(deepReply.content)"></p>
                                        
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
                                        <div class="reply-input deeper-reply-input" v-if="deepReply.showReplyInput" :data-comment-id="deepReply.id">
                                          <el-input
                                            v-model="deepReply.replyContent"
                                            :placeholder="`回复 @${getUserName(deepReply.User)}:`"
                                            size="small"
                                            type="textarea"
                                            :rows="2"
                                          />
                                          <div class="reply-actions">
                                            <div class="reply-tools">
                                              <emoji-picker @emoji-selected="emoji => handleReplyEmojiSelect(deepReply, emoji)" />
                                            </div>
                                            <div class="reply-buttons">
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

<!-- 编辑帖子对话框 -->
<el-dialog
  title="编辑帖子"
  :visible.sync="editDialogVisible"
  width="600px"
  :close-on-click-modal="false"
  @close="cancelEdit"
>
  <div class="edit-post-form">
    <el-input
      type="textarea"
      :rows="4"
      placeholder="有什么新鲜事想分享给大家？"
      v-model="editPostContent"
      maxlength="500"
      show-word-limit
      resize="none"
    />
    
    <!-- 编辑中的话题 -->
    <div class="edit-topics-display" v-if="editSelectedTopics.length > 0">
      <el-tag
        v-for="topic in editSelectedTopics"
        :key="topic"
        closable
        @close="removeEditTopic(topic)"
        size="small"
        type="primary"
        class="topic-tag-display"
      >
        #{{ topic }}
      </el-tag>
    </div>

    <!-- 编辑中的图片 -->
    <div class="edit-images" v-if="editImageList.length > 0">
      <div class="image-grid">
        <div 
          v-for="(image, index) in editImageList" 
          :key="index"
          class="image-item"
        >
          <img :src="getEditImageUrl(image)" :alt="`图片${index + 1}`" />
          <div class="image-overlay">
            <i class="el-icon-close" @click="removeEditImage(index)"></i>
          </div>
        </div>
        
        <div 
          v-if="editImageList.length < 9"
          class="add-image-item"
          @click="triggerEditImageUpload"
        >
          <i class="el-icon-plus"></i>
        </div>
      </div>
    </div>

    <!-- 编辑工具栏 -->
    <div class="edit-toolbar">
      <div class="edit-tools">
        <emoji-picker @emoji-selected="handleEditEmojiSelect">
          <template slot="reference">
            <div class="tool-btn">
              <i class="el-icon-sunny"></i>
              <span>表情</span>
            </div>
          </template>
        </emoji-picker>
        
        <el-upload
          ref="editImageUpload"
          :file-list="[]"
          :auto-upload="false"
          :on-change="handleEditImageChange"
          accept="image/*"
          multiple
          :limit="9"
          :show-file-list="false"
          class="hidden-uploader"
        >
          <div class="tool-btn">
            <i class="el-icon-picture"></i>
            <span>图片</span>
          </div>
        </el-upload>
        
        <el-popover
          placement="top-start"
          width="280"
          trigger="click"
          v-model="editTopicSelectorVisible"
          popper-class="topic-selector-popover"
        >
          <div class="topic-selector-content">
            <div class="topic-selector-header">
              <span>选择话题</span>
              <span class="topic-count">{{ editSelectedTopics.length }}/3</span>
            </div>
            <div class="selected-topics" v-if="editSelectedTopics.length > 0">
              <el-tag
                v-for="topic in editSelectedTopics"
                :key="topic"
                closable
                @close="removeEditTopic(topic)"
                size="small"
                type="primary"
              >
                #{{ topic }}
              </el-tag>
            </div>
            <el-input
              v-model="editNewTopicInput"
              placeholder="搜索或创建话题..."
              size="small"
              @keyup.enter.native="addEditTopic"
              clearable
            />
            <div class="available-topics" v-if="filteredTopics.length > 0">
              <div class="topic-list-header">推荐话题</div>
              <div
                v-for="topic in filteredTopics"
                :key="topic"
                class="topic-option"
                @click="selectEditTopic(topic)"
                :class="{ disabled: editSelectedTopics.includes(topic) }"
              >
                <span class="topic-name">#{{ topic }}</span>
              </div>
            </div>
          </div>
          <template slot="reference">
            <div class="tool-btn" :class="{ active: editTopicSelectorVisible }">
              <i class="el-icon-price-tag"></i>
              <span>话题</span>
            </div>
          </template>
        </el-popover>
      </div>
    </div>
  </div>
  
  <div slot="footer" class="dialog-footer">
    <el-button @click="cancelEdit">取消</el-button>
    <el-button 
      type="primary" 
      @click="saveEdit" 
      :loading="editingSaving"
      :disabled="!editPostContent.trim() && editImageList.length === 0"
    >
      保存
    </el-button>
  </div>
</el-dialog>

<script>
import { mapState } from 'vuex'
import axios from 'axios'
import EmojiPicker from '@/components/EmojiPicker.vue'
import { parseEmojiToHtml } from '@/utils/emoji'

export default {
  name: 'Forum',
  components: {
    EmojiPicker
  },
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
      },
      topicSelectorVisible: false,
      newTopicInput: '',
      filteredTopics: [],
      
      // 编辑帖子
      editDialogVisible: false,
      editPostContent: '',
      editSelectedTopics: [],
      editImageList: [],
      editingSaving: false,
      editTopicSelectorVisible: false,
      editNewTopicInput: '',
      currentEditPostId: null
    }
  },
  computed: {
    ...mapState(['isAuthenticated', 'user']),
    currentUser() {
      return this.user || {}
    },
    userAvatar() {
      return this.getUserAvatar(this.currentUser)
    },
    // 过滤可用话题
    filteredTopics() {
      if (!this.newTopicInput) {
        return this.availableTopics.slice(0, 10) // 限制显示数量
      }
      return this.availableTopics.filter(topic => 
        topic.toLowerCase().includes(this.newTopicInput.toLowerCase())
      ).slice(0, 10)
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

    // 处理表情选择 - 发帖
    handleEmojiSelect(emoji) {
      this.newPostContent += emoji
      // 聚焦到输入框
      this.$nextTick(() => {
        const textarea = this.$el.querySelector('.post-editor textarea')
        if (textarea) {
          textarea.focus()
          // 将光标移到最后
          textarea.setSelectionRange(this.newPostContent.length, this.newPostContent.length)
        }
      })
    },

    // 处理评论表情选择
    handleCommentEmojiSelect(post, emoji) {
      post.newComment += emoji
      // 聚焦到评论输入框
      this.$nextTick(() => {
        const commentInput = this.$el.querySelector(`[data-post-id="${post.id}"] .comment-input input`)
        if (commentInput) {
          commentInput.focus()
        }
      })
    },

    // 处理回复表情选择
    handleReplyEmojiSelect(comment, emoji) {
      comment.replyContent += emoji
      // 聚焦到回复输入框
      this.$nextTick(() => {
        const replyTextarea = this.$el.querySelector(`[data-comment-id="${comment.id}"] .reply-input textarea`)
        if (replyTextarea) {
          replyTextarea.focus()
        }
      })
    },

    // 渲染包含表情的文本
    renderTextWithEmoji(text) {
      return parseEmojiToHtml(text)
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
      if (!this.newPostContent.trim() && this.imageList.length === 0) {
        this.$message.warning('请输入帖子内容或上传图片')
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
        this.imageList.forEach((file, index) => {
          if (file.raw) {
            formData.append('images', file.raw)
          }
        })

        const response = await axios.post('/api/forum/posts', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })

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
      // 清理图片预览URL，避免内存泄漏
      this.imageList.forEach(file => {
        if (file.raw) {
          URL.revokeObjectURL(URL.createObjectURL(file.raw))
        }
      })
      
      this.newPostContent = ''
      this.selectedTopics = []
      this.imageList = []
      this.topicSelectorVisible = false
      this.newTopicInput = ''
    },

    // 处理图片上传
    handleImageChange(file, fileList) {
      if (file && file.raw) {
        // 检查文件类型
        const isImage = file.raw.type.startsWith('image/')
        if (!isImage) {
          this.$message.error('只能上传图片文件!')
          return false
        }
        
        // 检查文件大小 (5MB)
        const isLt5M = file.raw.size / 1024 / 1024 < 5
        if (!isLt5M) {
          this.$message.error('图片大小不能超过 5MB!')
          return false
        }
        
        // 避免重复添加
        const existingFile = this.imageList.find(item => 
          item.name === file.name && item.size === file.size
        )
        if (!existingFile) {
          this.imageList.push(file)
        }
      }
    },

    // 移除图片（保持原方法兼容性）
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
      if (command.action === 'edit') {
        await this.editPost(command.postId)
      } else if (command.action === 'delete') {
        try {
          await this.$confirm('删除后无法恢复，确定要删除这个帖子吗？', '删除帖子', {
            confirmButtonText: '确定删除',
            cancelButtonText: '取消',
            type: 'warning',
            dangerouslyUseHTMLString: true,
            message: '<div style="color: #f56c6c; font-weight: 600;">此操作不可逆！</div><div style="margin-top: 8px;">删除帖子后，所有评论和互动数据都将被清除。</div>'
          })

          const response = await axios.delete(`/api/forum/posts/${command.postId}`)

          if (response.data.success) {
            this.$message.success('帖子已删除')
            this.loadPosts()
            this.loadSidebarData() // 重新加载侧边栏数据
          }
        } catch (error) {
          if (error !== 'cancel') {
            console.error('删除帖子失败:', error)
            this.$message.error('删除失败')
          }
        }
      }
    },

    // 编辑帖子
    async editPost(postId) {
      try {
        // 获取帖子详情
        const response = await axios.get(`/api/forum/posts/${postId}`)
        
        if (response.data.success) {
          const post = response.data.data
          
          // 填充编辑表单
          this.editPostContent = post.content
          this.editSelectedTopics = post.topics ? [...post.topics] : []
          this.editImageList = post.images ? post.images.map(img => ({ url: img })) : []
          this.currentEditPostId = postId
          
          // 显示编辑对话框
          this.editDialogVisible = true
        }
      } catch (error) {
        console.error('获取帖子详情失败:', error)
        this.$message.error('无法加载帖子信息')
      }
    },

    // 检查是否可以删除帖子
    canDeletePost(post) {
      return this.canManagePost(post)
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

    // 移除选中的话题
    removeSelectedTopic(topic) {
      this.selectedTopics = this.selectedTopics.filter(t => t !== topic)
    },

    // 选择话题
    selectTopic(topic) {
      if (!this.selectedTopics.includes(topic) && this.selectedTopics.length < 3) {
        this.selectedTopics.push(topic)
      }
      this.newTopicInput = ''
      this.topicSelectorVisible = false
    },

    // 添加新话题
    addNewTopic() {
      const newTopic = this.newTopicInput.trim()
      if (newTopic && !this.selectedTopics.includes(newTopic) && this.selectedTopics.length < 3) {
        this.selectedTopics.push(newTopic)
        this.newTopicInput = ''
        this.topicSelectorVisible = false
      }
    },

    // 获取图片预览URL
    getImagePreviewUrl(file) {
      if (file.raw) {
        return URL.createObjectURL(file.raw)
      }
      return file.url || ''
    },

    // 移除图片
    removeImage(index) {
      this.imageList.splice(index, 1)
    },

    // 触发图片上传
    triggerImageUpload() {
      if (this.imageList.length >= 9) {
        this.$message.warning('最多只能上传9张图片')
        return
      }
      this.$refs.hiddenImageUpload.$refs.input.click()
    },

    // 检查是否可以管理帖子
    canManagePost(post) {
      console.log('=== 权限检查调试信息 ===')
      console.log('当前用户:', this.currentUser)
      console.log('是否已认证:', this.isAuthenticated)
      console.log('帖子信息:', post)
      console.log('帖子用户ID (post.User.id):', post.User && post.User.id)
      console.log('帖子用户ID (post.userId):', post.userId)
      console.log('当前用户ID:', this.currentUser.id)
      
      const canManage = this.isAuthenticated && (
        (post.User && post.User.id === this.currentUser.id) || 
        (post.userId === this.currentUser.id) ||
        this.currentUser.role === 'admin'
      )
      
      console.log('是否可以管理:', canManage)
      console.log('========================')
      
      return canManage
    },

    // 处理编辑表情选择
    handleEditEmojiSelect(emoji) {
      this.editPostContent += emoji
      // 聚焦到输入框
      this.$nextTick(() => {
        const textarea = this.$el.querySelector('.edit-post-form textarea')
        if (textarea) {
          textarea.focus()
          // 将光标移到最后
          textarea.setSelectionRange(this.editPostContent.length, this.editPostContent.length)
        }
      })
    },

    // 处理编辑图片上传
    handleEditImageChange(file, fileList) {
      if (file && file.raw) {
        // 检查文件类型
        const isImage = file.raw.type.startsWith('image/')
        if (!isImage) {
          this.$message.error('只能上传图片文件!')
          return false
        }
        
        // 检查文件大小 (5MB)
        const isLt5M = file.raw.size / 1024 / 1024 < 5
        if (!isLt5M) {
          this.$message.error('图片大小不能超过 5MB!')
          return false
        }
        
        // 避免重复添加
        const existingFile = this.editImageList.find(item => 
          item.name === file.name && item.size === file.size
        )
        if (!existingFile) {
          this.editImageList.push(file)
        }
      }
    },

    // 移除编辑图片（保持原方法兼容性）
    handleEditImageRemove(file, fileList) {
      this.editImageList = fileList
    },

    // 保存编辑帖子
    async saveEdit() {
      if (!this.editPostContent.trim() && this.editImageList.length === 0) {
        this.$message.warning('请输入帖子内容或上传图片')
        return
      }

      this.editingSaving = true
      try {
        const formData = new FormData()
        formData.append('content', this.editPostContent.trim())
        
        // 添加话题
        if (this.editSelectedTopics.length > 0) {
          formData.append('topics', JSON.stringify(this.editSelectedTopics))
        }
        
        // 区分新图片和已有图片
        const newImages = []
        const existingImages = []
        
        this.editImageList.forEach((image) => {
          if (image.raw) {
            // 新上传的图片
            newImages.push(image.raw)
          } else if (image.url) {
            // 已有的图片
            existingImages.push(image.url)
          }
        })
        
        // 添加新图片
        newImages.forEach((file) => {
          formData.append('images', file)
        })
        
        // 添加保留的已有图片
        if (existingImages.length > 0) {
          formData.append('existingImages', JSON.stringify(existingImages))
        }

        const response = await axios.put(`/api/forum/posts/${this.currentEditPostId}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })

        if (response.data.success) {
          this.$message.success('帖子更新成功！')
          this.cancelEdit()
          this.loadPosts() // 重新加载帖子列表
          this.loadSidebarData() // 重新加载侧边栏数据
        }
      } catch (error) {
        console.error('更新帖子失败:', error)
        this.$message.error('更新帖子失败：' + (error.response && error.response.data && error.response.data.message || error.message))
      } finally {
        this.editingSaving = false
      }
    },

    // 取消编辑帖子
    cancelEdit() {
      this.editDialogVisible = false
      this.editPostContent = ''
      this.editSelectedTopics = []
      this.editImageList = []
      this.editTopicSelectorVisible = false
      this.editNewTopicInput = ''
    },

    // 移除编辑图片
    removeEditImage(index) {
      this.editImageList.splice(index, 1)
    },

    // 触发编辑图片上传
    triggerEditImageUpload() {
      if (this.editImageList.length >= 9) {
        this.$message.warning('最多只能上传9张图片')
        return
      }
      this.$refs.editImageUpload.$refs.input.click()
    },

    // 选择编辑话题
    selectEditTopic(topic) {
      if (!this.editSelectedTopics.includes(topic) && this.editSelectedTopics.length < 3) {
        this.editSelectedTopics.push(topic)
      }
      this.editNewTopicInput = ''
      this.editTopicSelectorVisible = false
    },

    // 添加新编辑话题
    addEditTopic() {
      const newTopic = this.editNewTopicInput.trim()
      if (newTopic && !this.editSelectedTopics.includes(newTopic) && this.editSelectedTopics.length < 3) {
        this.editSelectedTopics.push(newTopic)
        this.editNewTopicInput = ''
        this.editTopicSelectorVisible = false
      }
    },

    // 移除编辑话题
    removeEditTopic(topic) {
      this.editSelectedTopics = this.editSelectedTopics.filter(t => t !== topic)
    },

    // 获取编辑图片URL
    getEditImageUrl(image) {
      // 如果是新上传的文件，使用createObjectURL
      if (image.raw) {
        return URL.createObjectURL(image.raw)
      }
      // 如果是已有图片的字符串
      if (typeof image === 'string') {
        return this.getImageUrl(image)
      }
      // 如果是对象形式的已有图片
      if (image.url) {
        return this.getImageUrl(image.url)
      }
      return ''
    }
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
  background: linear-gradient(135deg, #e03426 0%, #67C23A 100%);
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
}

.editor-content {
  flex: 1;
}

.post-textarea {
  border: none !important;
  box-shadow: none !important;
}

.post-textarea .el-textarea__inner {
  border: none !important;
  box-shadow: none !important;
  resize: none !important;
  font-size: 16px;
  line-height: 1.5;
  padding: 0 !important;
  background: transparent !important;
}

.post-textarea .el-textarea__inner:focus {
  border: none !important;
  box-shadow: none !important;
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
  gap: 8px;
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
  background: linear-gradient(135deg, #e03426, #67C23A);
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
  color: #e03426;
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
  color: #e03426;
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
  color: #e03426;
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
  color: #e03426;
  text-decoration: underline;
}

.comment-username.clickable:hover {
  color: #e03426;
  text-decoration: underline;
}

/* 高亮帖子样式 */
.highlighted-post {
  border: 2px solid #e03426 !important;
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
  color: #e03426;
}

/* 图片上传组件样式优化 - 使用更强的优先级 */
::v-deep .el-upload--picture-card {
  border: 1px dashed #c0c4cc !important;
  border-radius: 8px !important;
  width: 80px !important;
  height: 80px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  transition: all 0.3s ease !important;
  line-height: 1 !important;
}

::v-deep .el-upload--picture-card:hover {
  border-color: #e03426 !important;
}

::v-deep .el-upload-list--picture-card .el-upload-list__item {
  border: 1px solid #e4e7ed !important;
  border-radius: 8px !important;
  width: 120px !important;
  height: 120px !important;
  margin-right: 8px !important;
  margin-bottom: 8px !important;
  overflow: hidden !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

::v-deep .el-upload--picture-card i {
  font-size: 20px !important;
  color: #8c939d !important;
  margin: 0 !important;
}

::v-deep .el-upload-list--picture-card .el-upload-list__item-thumbnail {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
  border-radius: 6px !important;
}

/* 修复图片预览容器 */
::v-deep .el-upload-list--picture-card .el-upload-list__item-name {
  display: none !important;
}

::v-deep .el-upload-list--picture-card .el-upload-list__item-status-label {
  display: none !important;
}

::v-deep .el-upload-list--picture-card .el-upload-list__item-actions {
  position: absolute !important;
  top: 0 !important;
  right: 0 !important;
  background: rgba(0, 0, 0, 0.5) !important;
  border-radius: 0 0 0 8px !important;
}

/* 上传列表容器优化 */
::v-deep .el-upload-list--picture-card {
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 8px !important;
  margin: 0 !important;
}

/* 确保编辑器工具栏中的上传组件正确显示 */
.editor-tools ::v-deep .el-upload-list {
  display: flex !important;
  flex-wrap: wrap !important;
  align-items: flex-start !important;
  gap: 8px !important;
}

.editor-tools {
  display: flex;
  align-items: center;
  gap: 8px;
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

/* 评论输入框样式 */
.comment-input {
  margin-bottom: 12px;
}

.comment-input-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.comment-input-field {
  flex: 1;
}

.comment-input-actions {
  display: flex;
  align-items: center;
  gap: 8px;
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
  color: #e03426;
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
  justify-content: space-between;
  align-items: center;
}

.reply-tools {
  display: flex;
  align-items: center;
}

.reply-buttons {
  display: flex;
  gap: 8px;
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

/* 表情相关样式 */
.post-text {
  color: #333;
  line-height: 1.6;
  margin: 0 0 12px 0;
  font-size: 15px;
  font-weight: 500;
}

/* 表情文本样式 */
::v-deep .emoji-text {
  font-size: 16px;
  display: inline-block;
  vertical-align: middle;
  margin: 0 1px;
}

.comment-text ::v-deep .emoji-text {
  font-size: 14px;
}

.reply-text ::v-deep .emoji-text {
  font-size: 14px;
}

.nested-reply-text ::v-deep .emoji-text {
  font-size: 14px;
}

.deeper-reply-text ::v-deep .emoji-text {
  font-size: 14px;
}

.topic-selector-tool {
  margin-right: 12px;
}

.topic-selector-popover {
  padding: 16px !important;
  border-radius: 12px !important;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12) !important;
  border: 1px solid #e4e7ed !important;
}

.topic-selector-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.topic-selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  color: #333;
}

.topic-count {
  font-size: 12px;
  color: #909399;
  background: #f5f7fa;
  padding: 2px 8px;
  border-radius: 10px;
}

.selected-topics {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-height: 60px;
  overflow-y: auto;
}

.available-topics {
  max-height: 150px;
  overflow-y: auto;
}

.topic-list-header {
  font-weight: 600;
  color: #333;
  font-size: 13px;
  margin-bottom: 6px;
}

.topic-option {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  background-color: #f8f9fa;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-bottom: 4px;
}

.topic-option:hover:not(.disabled) {
  background-color: #ecf5ff;
  transform: translateX(2px);
}

.topic-option.disabled {
  opacity: 0.5;
  pointer-events: none;
  background-color: #f0f0f0;
}

.topic-name {
  font-size: 14px;
  color: #e03426;
  font-weight: 500;
}

/* 工具按钮统一样式 */
.tool-button {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  border-radius: 6px;
  transition: all 0.3s ease;
  color: #606266;
  font-size: 14px;
  background: transparent;
  border: none;
  cursor: pointer;
}

.tool-button:hover {
  background-color: #f5f7fa;
  color: #e03426;
}

.tool-button.active {
  background-color: #ecf5ff;
  color: #e03426;
}

.tool-button i {
  font-size: 16px;
}

.tool-button span {
  font-size: 14px;
  font-weight: 500;
}

.topic-selector-tool {
  display: inline-block;
}

.new-topic-input {
  width: 100%;
}

.add-topic-button {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background-color: #e03426;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
}

.add-topic-button:hover {
  background-color: #67C23A;
}

.topic-tag-display {
  margin-right: 4px;
  margin-bottom: 4px;
}

/* 话题显示样式 */
.selected-topics-display {
  margin-top: 8px;
  margin-bottom: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.topic-tag-display {
  cursor: pointer;
  transition: all 0.3s ease;
}

.topic-tag-display:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
}

/* 上传图片预览区域 */
.uploaded-images {
  margin: 12px 0;
}

/* 工具栏样式 */
.editor-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f2f5;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.toolbar-item {
  display: flex;
  align-items: center;
}

.tool-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  color: #8C9199;
  background: transparent;
  border: none;
  min-width: 50px;
}

.tool-btn:hover:not(.disabled) {
  background-color: #f8f9fa;
  color: #e03426;
  transform: translateY(-2px);
}

.tool-btn.active {
  color: #e03426;
  background-color: #ecf5ff;
}

.tool-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tool-btn i {
  font-size: 18px;
}

.tool-btn span {
  font-size: 12px;
  font-weight: 500;
}

/* 隐藏上传组件 */
.hidden-uploader {
  display: inline-block;
}

.hidden-uploader .el-upload {
  display: contents;
}

/* 发布按钮样式 */
.toolbar-right {
  display: flex;
  align-items: center;
}

.publish-btn {
  background: #e03426 !important;
  border: none !important;
  border-radius: 20px !important;
  padding: 10px 24px !important;
  font-size: 14px !important;
  font-weight: 600 !important;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3) !important;
  transition: all 0.3s ease !important;
}

.publish-btn:hover:not(.is-disabled) {
  background: #66b1ff !important;
  transform: translateY(-2px) !important;
  box-shadow: 0 6px 20px rgba(64, 158, 255, 0.4) !important;
}

.publish-btn.is-disabled {
  background: #e4e7ed !important;
  color: #c0c4cc !important;
  box-shadow: none !important;
}

/* 图片上传器优化 */
.image-uploader ::v-deep .el-upload--picture-card {
  width: 100px !important;
  height: 100px !important;
  line-height: 100px !important;
  border: 1px dashed #d9d9d9 !important;
  border-radius: 8px !important;
}

.image-uploader ::v-deep .el-upload-list--picture-card .el-upload-list__item {
  width: 100px !important;
  height: 100px !important;
  border-radius: 8px !important;
}

.image-uploader ::v-deep .el-upload-list--picture-card .el-upload-list__item-thumbnail {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(3, 100px);
  gap: 8px;
  margin: 12px 0;
}

.image-item {
  position: relative;
  width: 100px;
  height: 100px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e4e7ed;
}

.image-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.image-overlay {
  position: absolute;
  top: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-bottom-left-radius: 4px;
}

.image-overlay:hover {
  background: rgba(255, 0, 0, 0.8);
}

.add-image-item {
  width: 100px;
  height: 100px;
  background-color: #f8f9fa;
  border: 1px dashed #c0c4cc;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.add-image-item:hover {
  border-color: #e03426;
  background-color: #ecf5ff;
}

.add-image-item i {
  color: #8c939d;
  font-size: 24px;
}

/* 编辑帖子对话框样式 */
.edit-post-form {
  padding: 0;
}

.edit-post-form .el-textarea__inner {
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  padding: 12px;
  font-size: 15px;
  line-height: 1.5;
}

.edit-post-form .el-textarea__inner:focus {
  border-color: #e03426;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

.edit-topics-display {
  margin: 12px 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.edit-images {
  margin: 12px 0;
}

.edit-toolbar {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f2f5;
}

.edit-tools {
  display: flex;
  align-items: center;
  gap: 16px;
}

.dialog-footer {
  text-align: right;
  padding-top: 16px;
}

.dialog-footer .el-button {
  margin-left: 8px;
}

/* 下拉菜单图标样式 */
.el-dropdown-menu__item i {
  margin-right: 6px;
  font-size: 14px;
  color: #909399;
}

.el-dropdown-menu__item:hover i {
  color: #e03426;
}
</style> 