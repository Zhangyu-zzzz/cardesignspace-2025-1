<template>
  <div class="article-detail-page">
    <div v-if="loading" class="loading-container">
      <el-loading text="加载中..." />
    </div>
    
    <div v-else-if="article" class="article-container">
      <!-- 文章头部 -->
      <div class="article-header">
        <div class="container">
          <div class="breadcrumb">
            <el-breadcrumb separator="/">
              <el-breadcrumb-item><router-link to="/">首页</router-link></el-breadcrumb-item>
              <el-breadcrumb-item><router-link to="/articles">汽车资讯</router-link></el-breadcrumb-item>
              <el-breadcrumb-item>{{ article.title }}</el-breadcrumb-item>
            </el-breadcrumb>
          </div>
          
          <h1 class="article-title">{{ article.title }}</h1>
          <p v-if="article.subtitle" class="article-subtitle">{{ article.subtitle }}</p>
          
          <div class="article-meta">
            <div class="author-section">
              <el-avatar :size="40" :src="article.Author.avatar" icon="el-icon-user-solid"></el-avatar>
              <div class="author-info">
                <span class="author-name">{{ article.Author.username }}</span>
                <span class="publish-date">{{ formatDate(article.publishedAt) }}</span>
              </div>
            </div>
            
            <div class="article-stats">
              <span class="stat-item">
                <i class="el-icon-view"></i>
                {{ article.viewCount }} 阅读
              </span>
              <span class="stat-item">
                <i class="el-icon-star-on"></i>
                {{ article.likeCount }} 点赞
              </span>
              <span class="stat-item">
                <i class="el-icon-chat-line-square"></i>
                {{ article.commentCount }} 评论
              </span>
              <span v-if="article.readingTime" class="stat-item">
                <i class="el-icon-time"></i>
                {{ article.readingTime }} 分钟阅读
              </span>
            </div>
          </div>
          
          <div class="article-tags">
            <span class="category-tag">{{ article.category }}</span>
            <span
              v-for="tag in article.tags"
              :key="tag"
              class="tag-item"
            >
              #{{ tag }}
            </span>
          </div>
        </div>
      </div>

      <!-- 文章内容 -->
      <div class="article-content-section">
        <div class="container">
          <div class="content-wrapper">
            <!-- 主要内容 -->
            <div class="main-content">
              <div v-if="article.coverImage" class="cover-image">
                <img :src="article.coverImage" :alt="article.title">
              </div>
              
              <div class="article-content" v-html="article.content"></div>
              
              <!-- 文章操作 -->
              <div class="article-actions">
                <el-button
                  :type="userLiked ? 'primary' : 'default'"
                  @click="toggleLike"
                  :loading="likeLoading"
                  icon="el-icon-star-on"
                >
                  {{ userLiked ? '已点赞' : '点赞' }} ({{ article.likeCount }})
                </el-button>
                
                <el-button @click="shareArticle" icon="el-icon-share">
                  分享
                </el-button>

                <!-- 编辑按钮（仅作者和管理员可见） -->
                <el-button
                  v-if="canEditArticle"
                  type="warning"
                  @click="editArticle"
                  icon="el-icon-edit"
                >
                  编辑文章
                </el-button>
              </div>
            </div>
            
            <!-- 侧边栏 -->
            <div class="sidebar">
              <!-- 文章目录 -->
              <div v-if="articleToc.length > 0" class="article-toc">
                <h3 class="sidebar-title">
                  <i class="el-icon-menu"></i>
                  文章目录
                </h3>
                <ul class="toc-list">
                  <li
                    v-for="(item, index) in articleToc"
                    :key="index"
                    class="toc-item"
                    :class="{ active: item.active }"
                    @click="scrollToHeading(item.id)"
                  >
                    <span class="toc-text">{{ item.text }}</span>
                  </li>
                </ul>
              </div>
              
              <!-- 相关文章 -->
              <div v-if="relatedArticles.length > 0" class="related-articles">
                <h3 class="sidebar-title">
                  <i class="el-icon-document"></i>
                  相关文章
                </h3>
                <div
                  v-for="related in relatedArticles.slice(0, 3)"
                  :key="related.id"
                  class="related-item"
                  @click="goToArticle(related.id)"
                >
                  <div class="related-image">
                    <img :src="related.coverImage || '/default-article-cover.jpg'" :alt="related.title">
                  </div>
                  <div class="related-content">
                    <h4 class="related-title">{{ related.title }}</h4>
                    <div class="related-meta">
                      <span class="view-count">{{ related.viewCount }} 阅读</span>
                      <span class="publish-date">{{ formatDate(related.publishedAt) }}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- 热门标签 -->
              <div class="popular-tags">
                <h3 class="sidebar-title">
                  <i class="el-icon-collection-tag"></i>
                  热门标签
                </h3>
                <div class="tags-cloud">
                  <el-tag
                    v-for="tag in popularTags"
                    :key="tag.name"
                    :type="tag.type"
                    size="small"
                    class="tag-item"
                    @click="searchByTag(tag.name)"
                  >
                    {{ tag.name }}
                  </el-tag>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 评论区域 -->
      <div class="comments-section">
        <div class="container">
          <h3 class="comments-title">评论 ({{ article.commentCount }})</h3>
          
          <!-- 发表评论 -->
          <div v-if="$store.state.isAuthenticated" class="comment-form">
            <div class="comment-input">
              <el-input
                v-model="newComment"
                type="textarea"
                :rows="3"
                placeholder="写下您的评论..."
                maxlength="500"
                show-word-limit
                class="comment-textarea"
              ></el-input>
            </div>
            <div class="comment-actions">
              <el-button type="primary" @click="submitComment" :loading="commentLoading">
                发表评论
              </el-button>
            </div>
          </div>
          
          <div v-else class="login-prompt">
            <p>请 <el-button type="text" @click="showLogin" class="login-link">登录</el-button> 后发表评论</p>
          </div>
          
          <!-- 评论列表 -->
          <div class="comments-list">
            <div
              v-for="comment in comments"
              :key="comment.id"
              class="comment-item"
            >
              <div class="comment-header">
                <el-avatar :size="32" :src="comment.User.avatar" icon="el-icon-user-solid"></el-avatar>
                <div class="comment-user">
                  <span class="username">{{ comment.User.username }}</span>
                  <span class="comment-date">{{ formatDate(comment.createdAt) }}</span>
                </div>
                <div class="comment-actions">
                  <el-button
                    type="text"
                    size="small"
                    @click="likeComment(comment)"
                    :loading="comment.likeLoading"
                  >
                    <i class="el-icon-star-on"></i>
                    {{ comment.likeCount }}
                  </el-button>
                  <el-button
                    type="text"
                    size="small"
                    @click="replyToComment(comment)"
                  >
                    回复
                  </el-button>
                </div>
              </div>
              
              <div class="comment-content">
                <p>{{ comment.content }}</p>
              </div>
              
              <!-- 回复列表 -->
              <div v-if="comment.Replies && comment.Replies.length > 0" class="replies">
                <div
                  v-for="reply in comment.Replies"
                  :key="reply.id"
                  class="reply-item"
                >
                  <div class="reply-header">
                    <el-avatar :size="24" :src="reply.User.avatar" icon="el-icon-user-solid"></el-avatar>
                    <span class="username">{{ reply.User.username }}</span>
                    <span class="reply-date">{{ formatDate(reply.createdAt) }}</span>
                  </div>
                  <div class="reply-content">
                    <p>{{ reply.content }}</p>
                  </div>
                </div>
              </div>
              
              <!-- 回复表单 -->
              <div v-if="replyingTo === comment.id" class="reply-form">
                <el-input
                  v-model="replyContent"
                  type="textarea"
                  :rows="2"
                  placeholder="写下您的回复..."
                  maxlength="300"
                  class="reply-textarea"
                ></el-input>
                <div class="reply-actions">
                  <el-button size="small" @click="cancelReply">取消</el-button>
                  <el-button type="primary" size="small" @click="submitReply" :loading="replyLoading">
                    回复
                  </el-button>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 评论分页 -->
          <div v-if="commentPagination.pages > 1" class="comments-pagination">
            <el-pagination
              @current-change="handleCommentPageChange"
              :current-page="commentPagination.page"
              :page-size="commentPagination.limit"
              :total="commentPagination.total"
              layout="prev, pager, next"
            />
          </div>
        </div>
      </div>
    </div>
    
    <!-- 错误状态 -->
    <div v-else class="error-state">
      <div class="container">
        <div class="error-content">
          <i class="el-icon-warning"></i>
          <h3>文章不存在</h3>
          <p>抱歉，您访问的文章不存在或已被删除</p>
          <el-button type="primary" @click="$router.push('/articles')">
            返回文章列表
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'

export default {
  name: 'ArticleDetail',
  data() {
    return {
      article: null,
      userLiked: false,
      relatedArticles: [],
      comments: [],
      newComment: '',
      replyContent: '',
      replyingTo: null,
      loading: true,
      likeLoading: false,
      commentLoading: false,
      replyLoading: false,
      commentPagination: {
        page: 1,
        limit: 10,
        total: 0,
        pages: 1
      },
      articleToc: [], // 文章目录数据
      popularTags: [] // 热门标签数据
    }
  },
  computed: {
    canEditArticle() {
      if (!this.$store.state.user || !this.article) return false
      const user = this.$store.state.user
      return user.role === 'admin' || user.id === this.article.authorId
    }
  },
  mounted() {
    this.loadArticle()
  },
  watch: {
    '$route'() {
      this.loadArticle()
    }
  },
  methods: {
    async loadArticle() {
      try {
        this.loading = true
        const articleId = this.$route.params.id
        
        const response = await axios.get(`/api/articles/${articleId}`)
        
        if (response.data.status === 'success') {
          this.article = response.data.data.article
          this.userLiked = response.data.data.userLiked
          
          // 加载评论和相关文章
          this.loadComments()
          this.loadRelatedArticles()
          this.generateArticleToc() // 生成文章目录
          this.loadPopularTags() // 加载热门标签
        }
      } catch (error) {
        console.error('加载文章失败:', error)
        this.article = null
      } finally {
        this.loading = false
      }
    },

    async loadComments() {
      try {
        const response = await axios.get(`/api/articles/${this.article.id}/comments`, {
          params: {
            page: this.commentPagination.page,
            limit: this.commentPagination.limit
          }
        })
        
        if (response.data.status === 'success') {
          this.comments = response.data.data.comments.map(comment => ({
            ...comment,
            likeLoading: false
          }))
          this.commentPagination = response.data.data.pagination
        }
      } catch (error) {
        console.error('加载评论失败:', error)
      }
    },

    async loadRelatedArticles() {
      try {
        const response = await axios.get('/api/articles', {
          params: {
            category: this.article.category,
            limit: 5
          }
        })
        
        if (response.data.status === 'success') {
          this.relatedArticles = response.data.data.articles
            .filter(article => article.id !== this.article.id)
            .slice(0, 4)
        }
      } catch (error) {
        console.error('加载相关文章失败:', error)
      }
    },

    async toggleLike() {
      if (!this.$store.state.isAuthenticated) {
        this.$message.warning('请先登录')
        return
      }

      try {
        this.likeLoading = true
        const response = await axios.post(`/api/articles/${this.article.id}/like`)
        
        if (response.data.status === 'success') {
          this.userLiked = response.data.data.liked
          if (this.userLiked) {
            this.article.likeCount++
          } else {
            this.article.likeCount--
          }
        }
      } catch (error) {
        console.error('点赞失败:', error)
        this.$message.error('操作失败')
      } finally {
        this.likeLoading = false
      }
    },

    async submitComment() {
      if (!this.newComment.trim()) {
        this.$message.warning('请输入评论内容')
        return
      }

      try {
        this.commentLoading = true
        const response = await axios.post(`/api/articles/${this.article.id}/comments`, {
          content: this.newComment
        })
        
        if (response.data.status === 'success') {
          this.newComment = ''
          this.article.commentCount++
          this.loadComments()
          this.$message.success('评论发表成功')
        }
      } catch (error) {
        console.error('发表评论失败:', error)
        this.$message.error('发表评论失败')
      } finally {
        this.commentLoading = false
      }
    },

    async submitReply() {
      if (!this.replyContent.trim()) {
        this.$message.warning('请输入回复内容')
        return
      }

      try {
        this.replyLoading = true
        const response = await axios.post(`/api/articles/${this.article.id}/comments`, {
          content: this.replyContent,
          parentId: this.replyingTo
        })
        
        if (response.data.status === 'success') {
          this.replyContent = ''
          this.replyingTo = null
          this.loadComments()
          this.$message.success('回复发表成功')
        }
      } catch (error) {
        console.error('发表回复失败:', error)
        this.$message.error('发表回复失败')
      } finally {
        this.replyLoading = false
      }
    },

    async likeComment(comment) {
      if (!this.$store.state.isAuthenticated) {
        this.$message.warning('请先登录')
        return
      }

      try {
        comment.likeLoading = true
        const response = await axios.post(`/api/articles/comments/${comment.id}/like`)
        
        if (response.data.status === 'success') {
          comment.likeCount = response.data.data.likeCount
        }
      } catch (error) {
        console.error('点赞评论失败:', error)
        this.$message.error('操作失败')
      } finally {
        comment.likeLoading = false
      }
    },

    replyToComment(comment) {
      if (!this.$store.state.isAuthenticated) {
        this.$message.warning('请先登录')
        return
      }
      this.replyingTo = comment.id
      this.replyContent = ''
    },

    cancelReply() {
      this.replyingTo = null
      this.replyContent = ''
    },

    handleCommentPageChange(page) {
      this.commentPagination.page = page
      this.loadComments()
    },

    goToArticle(articleId) {
      this.$router.push(`/articles/${articleId}`)
    },

    shareArticle() {
      if (navigator.share) {
        navigator.share({
          title: this.article.title,
          text: this.article.summary,
          url: window.location.href
        })
      } else {
        // 复制链接到剪贴板
        navigator.clipboard.writeText(window.location.href)
        this.$message.success('链接已复制到剪贴板')
      }
    },

    showLogin() {
      // 触发登录弹窗（需要与父组件通信）
      this.$parent.showAuthDialog('login')
    },

    formatDate(dateString) {
      const date = new Date(dateString)
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    },

    getRoleText(role) {
      const roleMap = {
        admin: '管理员',
        editor: '编辑',
        user: '用户'
      }
      return roleMap[role] || '用户'
    },

    editArticle() {
      this.$router.push(`/articles/edit/${this.article.id}`)
    },

    // 生成文章目录
    generateArticleToc() {
      if (!this.article || !this.article.content) {
        this.articleToc = []
        return
      }
      
      // 创建临时DOM元素来解析HTML内容
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = this.article.content
      
      const headings = []
      const headingElements = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6')
      
      headingElements.forEach((heading, index) => {
        const level = parseInt(heading.tagName.charAt(1))
        const text = heading.textContent.trim()
        
        if (text) {
          // 生成唯一ID
          const id = `heading-${index}-${text.toLowerCase().replace(/[^a-z0-9]/g, '-')}`
          heading.id = id
          
          headings.push({
            id: id,
            text: text,
            level: level,
            active: false
          })
        }
      })
      
      this.articleToc = headings
      
      // 更新文章内容（添加ID）
      this.article.content = tempDiv.innerHTML
    },

    // 滚动到指定标题
    scrollToHeading(id) {
      const element = document.getElementById(id)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    },

    // 加载热门标签
    async loadPopularTags() {
      try {
        // 使用静态的热门标签数据，统一为灰色样式
        this.popularTags = [
          { name: '新车发布', type: 'info' },
          { name: '试驾评测', type: 'info' },
          { name: '技术解析', type: 'info' },
          { name: '行业资讯', type: 'info' },
          { name: '汽车文化', type: 'info' },
          { name: '改装案例', type: 'info' },
          { name: '购车指南', type: 'info' },
          { name: '维修保养', type: 'info' },
          { name: '新能源', type: 'info' },
          { name: '电动汽车', type: 'info' }
        ]
      } catch (error) {
        console.error('加载热门标签失败:', error)
        // 使用默认标签，统一为灰色样式
        this.popularTags = [
          { name: '新车发布', type: 'info' },
          { name: '试驾评测', type: 'info' },
          { name: '技术解析', type: 'info' }
        ]
      }
    },

    // 根据标签搜索文章
    searchByTag(tagName) {
      this.$router.push(`/articles?tag=${tagName}`)
    }
  }
}
</script>

<style scoped>
.article-detail-page {
  min-height: 100vh;
  background: #f8f9fa;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.loading-container {
  height: 60vh;
  display: flex;
  justify-content: center;
  align-items: center;
}

/* 文章头部 */
.article-header {
  background: white;
  padding: 40px 0;
  border-bottom: 1px solid #eee;
}

.breadcrumb {
  margin-bottom: 20px;
}

.article-title {
  font-size: 2.2rem;
  font-weight: 700;
  color: #2c3e50;
  line-height: 1.3;
  margin: 0 0 15px 0;
}

.article-subtitle {
  font-size: 1.2rem;
  color: #666;
  margin: 0 0 25px 0;
  line-height: 1.5;
}

.article-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.author-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.author-info {
  display: flex;
  flex-direction: column;
}

.author-name {
  font-weight: 600;
  color: #2c3e50;
  font-size: 1rem;
}

.publish-date {
  font-size: 0.85rem;
  color: #999;
}

.article-stats {
  display: flex;
  gap: 20px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.9rem;
  color: #666;
}

.stat-item i {
  font-size: 1rem;
}

.article-tags {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.category-tag {
  background: #f4f4f5;
  color: #606266;
  border: 1px solid #d3d4d6;
  padding: 0 12px;
  border-radius: 15px;
  font-size: 0.8rem;
  font-weight: 600;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  vertical-align: middle;
}

.tag-item {
  background: none;
  border: none;
  color: #909399;
  font-size: 0.8rem;
  font-weight: 500;
  margin-right: 8px;
  cursor: pointer;
  transition: color 0.2s ease;
  display: inline-block;
  line-height: 1.5;
}

.tag-item:hover {
  color: #606266;
}

/* 文章内容区域 */
.article-content-section {
  padding: 40px 0;
}

.content-wrapper {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 40px;
}

.main-content {
  background: white;
  border-radius: 16px;
  padding: 48px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.04);
}

.cover-image {
  margin-bottom: 30px;
}

.cover-image img {
  width: 100%;
  height: 300px;
  object-fit: cover;
  border-radius: 8px;
}

.article-content {
  line-height: 1.8;
  color: #333;
  font-size: 1rem;
}

.article-content >>> h2 {
  font-size: 1.6rem;
  margin: 30px 0 15px 0;
  color: #2c3e50;
}

.article-content >>> h3 {
  font-size: 1.3rem;
  margin: 25px 0 12px 0;
  color: #2c3e50;
}

.article-content >>> p {
  margin: 15px 0;
  line-height: 1.8;
}

.article-content >>> img {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 20px 0;
}

.article-actions {
  display: flex;
  gap: 15px;
  margin-top: 40px;
  padding-top: 30px;
  border-top: 1px solid #f0f0f0;
}

/* 侧边栏基础样式 */
.sidebar {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 评论区域 */
.comments-section {
  background: white;
  padding: 40px 0;
}

.comments-title {
  font-size: 1.5rem;
  margin: 0 0 30px 0;
  color: #2c3e50;
}

.comment-form {
  margin-bottom: 40px;
  padding: 28px;
  background: #f8f9fa;
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.04);
}

.comment-input {
  margin-bottom: 15px;
}

/* 评论输入框样式 */
.comment-textarea >>> .el-textarea__inner {
  background-color: #ffffff;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  color: #333333;
  font-size: 14px;
  line-height: 1.5;
  padding: 12px 16px;
  transition: border-color 0.2s ease;
}

.comment-textarea >>> .el-textarea__inner:focus {
  border-color: #e03426;
  outline: none;
  box-shadow: 0 0 0 2px rgba(224, 52, 38, 0.1);
}

.comment-textarea >>> .el-textarea__inner::placeholder {
  color: #999999;
}

.comment-textarea >>> .el-input__count {
  color: #999999;
  background-color: transparent;
}

.comment-actions {
  display: flex;
  justify-content: flex-end;
}

.login-prompt {
  text-align: center;
  margin: 40px 0;
  color: #666;
  padding: 28px;
  background: #f8f9fa;
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.04);
}

.login-link {
  color: #e03426 !important;
  font-weight: 600;
  text-decoration: none;
}

.login-link:hover {
  color: #c02a1f !important;
  text-decoration: underline;
}

.comments-list {
  display: flex;
  flex-direction: column;
  gap: 25px;
}

.comment-item {
  padding: 25px;
  background: #f8f9fa;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.04);
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 15px;
}

.comment-user {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.username {
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 2px;
  font-size: 14px;
}

.comment-date {
  font-size: 12px;
  color: #999;
}

.comment-content {
  margin: 10px 0;
  line-height: 1.6;
  color: #333;
  font-size: 14px;
  word-wrap: break-word;
}

.comment-actions {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.comment-actions .el-button {
  font-size: 12px;
  padding: 4px 8px;
  color: #666;
}

.comment-actions .el-button:hover {
  color: #e03426;
}

.replies {
  margin-top: 20px;
  padding-left: 40px;
}

.reply-item {
  padding: 15px;
  background: white;
  border-radius: 8px;
  margin-bottom: 10px;
  border: 1px solid rgba(0, 0, 0, 0.04);
}

.reply-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.reply-date {
  font-size: 11px;
  color: #999;
  margin-left: auto;
}

.reply-content {
  font-size: 13px;
  line-height: 1.5;
  color: #333;
  word-wrap: break-word;
}

.reply-form {
  margin-top: 15px;
  padding: 15px;
  background: white;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.04);
}

.reply-form .el-textarea__inner {
  background-color: #ffffff;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  color: #333333;
  font-size: 13px;
  line-height: 1.4;
  padding: 8px 12px;
}

.reply-form .el-textarea__inner:focus {
  border-color: #e03426;
  outline: none;
  box-shadow: 0 0 0 2px rgba(224, 52, 38, 0.1);
}

.reply-form .el-textarea__inner::placeholder {
  color: #999999;
}

/* 回复文本框样式 */
.reply-textarea >>> .el-textarea__inner {
  background-color: #ffffff;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  color: #333333;
  font-size: 13px;
  line-height: 1.4;
  padding: 8px 12px;
  transition: border-color 0.2s ease;
}

.reply-textarea >>> .el-textarea__inner:focus {
  border-color: #e03426;
  outline: none;
  box-shadow: 0 0 0 2px rgba(224, 52, 38, 0.1);
}

.reply-textarea >>> .el-textarea__inner::placeholder {
  color: #999999;
}

.reply-textarea >>> .el-input__count {
  color: #999999;
  background-color: transparent;
}

.reply-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 10px;
}

.reply-actions .el-button {
  font-size: 12px;
  padding: 6px 12px;
}

.comments-pagination {
  display: flex;
  justify-content: center;
  margin-top: 40px;
}

/* 错误状态 */
.error-state {
  padding: 100px 0;
}

.error-content {
  text-align: center;
  color: #666;
}

.error-content i {
  font-size: 4rem;
  color: #ddd;
  margin-bottom: 20px;
}

.error-content h3 {
  font-size: 1.5rem;
  margin: 0 0 15px 0;
}

.error-content p {
  margin: 0 0 25px 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .container {
    padding: 0 15px;
  }
  
  .article-header {
    padding: 20px 0;
  }
  
  .article-title {
    font-size: 1.8rem;
  }
  
  .article-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  
  .content-wrapper {
    grid-template-columns: 1fr;
    gap: 30px;
  }
  
  .main-content {
    padding: 25px;
  }
  
  .comment-item {
    padding: 20px;
  }
  
  .replies {
    padding-left: 20px;
  }
}

/* 侧边栏模块样式 */
.sidebar {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.article-toc,
.related-articles,
.popular-tags {
  background: white;
  border-radius: 16px;
  padding: 28px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.04);
}

.sidebar-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  font-size: 1.1rem;
  color: #2c3e50;
  font-weight: 600;
}

.sidebar-title i {
  color: #e03426;
}

/* 文章目录样式 */
.toc-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.toc-item {
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
  color: #333;
  margin-bottom: 4px;
  border-left: 3px solid transparent;
}

.toc-item:hover {
  background-color: #f8f9fa;
  border-left-color: #e03426;
}

.toc-item.active {
  background-color: #e03426;
  color: white;
  border-left-color: #e03426;
}

.toc-text {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 相关文章样式 */
.related-articles {
  margin-bottom: 0;
}

.related-item {
  display: flex;
  gap: 12px;
  padding: 12px 0;
  cursor: pointer;
  transition: transform 0.2s ease;
  border-bottom: 1px solid #f0f0f0;
}

.related-item:last-child {
  border-bottom: none;
}

.related-item:hover {
  transform: translateX(4px);
}

.related-image {
  flex-shrink: 0;
  width: 60px;
  height: 40px;
  border-radius: 8px;
  overflow: hidden;
}

.related-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.related-content {
  flex: 1;
  min-width: 0;
}

.related-title {
  font-size: 0.9rem;
  line-height: 1.4;
  color: #333;
  margin: 0 0 6px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.related-meta {
  display: flex;
  gap: 12px;
  font-size: 0.75rem;
  color: #999;
}

.view-count,
.publish-date {
  white-space: nowrap;
}

/* 热门标签样式 */
.tags-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-item {
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.8rem;
  padding: 4px 12px;
}

.tag-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* 统一热门标签为灰色样式 */
.popular-tags .tag-item {
  background-color: #f4f4f5 !important;
  border-color: #d3d4d6 !important;
  color: #606266 !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  height: 28px !important;
  line-height: 1 !important;
  vertical-align: middle !important;
}

.popular-tags .tag-item:hover {
  background-color: #e9e9eb !important;
  border-color: #c0c4cc !important;
  color: #303133 !important;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .sidebar {
    gap: 16px;
  }
  
  .article-toc,
  .related-articles,
  .popular-tags {
    padding: 20px;
  }
  
  .related-item {
    padding: 8px 0;
  }
  
  .related-image {
    width: 50px;
    height: 35px;
  }
  
  .tags-cloud {
    gap: 6px;
  }
  
  .tag-item {
    font-size: 0.75rem;
    padding: 3px 10px;
  }
}
</style> 