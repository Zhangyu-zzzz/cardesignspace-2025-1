<template>
  <div class="articles-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="container">
        <h1 class="page-title">汽车资讯</h1>
        <p class="page-subtitle">最新的汽车行业资讯、评测和技术解析</p>
      </div>
    </div>

    <!-- 筛选和搜索区域 -->
    <div class="filters-section">
      <div class="container">
        <!-- 搜索框 -->
        <div class="search-section">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索文章标题、内容或标签..."
            @keyup.enter.native="searchArticles"
            class="search-input"
            clearable
          >
            <el-button slot="append" icon="el-icon-search" @click="searchArticles"></el-button>
          </el-input>
        </div>

        <!-- 分类筛选和排序 -->
        <div class="filter-bar">
          <!-- 分类筛选 -->
          <div class="category-filters">
            <el-tag
              v-for="category in visibleCategories"
              :key="category.value"
              :type="selectedCategory === category.value ? 'primary' : ''"
              @click="filterByCategory(category.value)"
              class="category-tag"
            >
              {{ category.label }}
              <span v-if="category.count" class="count">({{ category.count }})</span>
            </el-tag>
            
            <!-- 更多分类按钮 -->
            <el-button
              v-if="hasMoreCategories"
              @click="toggleMoreCategories"
              size="small"
              type="text"
              class="more-categories-btn"
            >
              {{ showMoreCategories ? '收起' : '更多分类' }}
              <i :class="showMoreCategories ? 'el-icon-arrow-up' : 'el-icon-arrow-down'"></i>
            </el-button>
          </div>

          <!-- 排序选择 -->
          <div class="sort-controls">
            <el-select v-model="sortBy" @change="loadArticles" size="small">
              <el-option label="最新发布" value="publishedAt"></el-option>
              <el-option label="最多阅读" value="viewCount"></el-option>
              <el-option label="最多点赞" value="likeCount"></el-option>
            </el-select>
          </div>
        </div>
      </div>
    </div>

    <!-- 推荐文章区域 -->
    <div v-if="featuredArticles.length > 0" class="featured-section">
      <div class="container">
        <h2 class="section-title">推荐阅读</h2>
        <div class="featured-articles">
          <div
            v-for="article in featuredArticles"
            :key="article.id"
            class="featured-article"
            @click="goToArticle(article.id)"
          >
            <div class="featured-image">
              <img :src="article.coverImage || '/default-article-cover.jpg'" :alt="article.title">
              <div class="featured-overlay">
                <span class="featured-badge">推荐</span>
              </div>
            </div>
            <div class="featured-content">
              <span class="featured-category">{{ article.category }}</span>
              <h3 class="featured-title">{{ article.title }}</h3>
              <p class="featured-summary">{{ article.summary }}</p>
              <div class="featured-meta">
                <span class="author">{{ article.Author.username }}</span>
                <span class="date">{{ formatDate(article.publishedAt) }}</span>
                <span class="stats">{{ article.viewCount }} 阅读</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 文章列表 -->
    <div class="articles-section">
      <div class="container">
        <div v-loading="loading" class="articles-grid">
          <div
            v-for="article in articles"
            :key="article.id"
            class="article-card"
            @click="goToArticle(article.id)"
          >
            <div class="article-image">
              <img :src="article.coverImage || '/default-article-cover.jpg'" :alt="article.title">
              <div class="article-category">{{ article.category }}</div>
            </div>
            <div class="article-content">
              <h3 class="article-title">{{ article.title }}</h3>
              <p v-if="article.subtitle" class="article-subtitle">{{ article.subtitle }}</p>
              <p class="article-summary">{{ article.summary }}</p>
              <div class="article-meta">
                <div class="author-info">
                  <el-avatar :size="24" :src="article.Author.avatar" icon="el-icon-user-solid"></el-avatar>
                  <span class="author-name">{{ article.Author.username }}</span>
                </div>
                <div class="article-stats">
                  <span class="stat-item">
                    <i class="el-icon-view"></i>
                    {{ article.viewCount }}
                  </span>
                  <span class="stat-item">
                    <i class="el-icon-star-on"></i>
                    {{ article.likeCount }}
                  </span>
                  <span class="stat-item">
                    <i class="el-icon-chat-line-square"></i>
                    {{ article.commentCount }}
                  </span>
                </div>
              </div>
              <div class="article-footer">
                <span class="publish-date">{{ formatDate(article.publishedAt) }}</span>
                <span v-if="article.readingTime" class="reading-time">{{ article.readingTime }} 分钟阅读</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 分页 -->
        <div v-if="pagination.pages > 1" class="pagination-section">
          <el-pagination
            @current-change="handlePageChange"
            :current-page="pagination.page"
            :page-size="pagination.limit"
            :total="pagination.total"
            layout="prev, pager, next, jumper, total"
          />
        </div>

        <!-- 空状态 -->
        <div v-if="!loading && articles.length === 0 && !loadError" class="empty-state">
          <i class="el-icon-document"></i>
          <h3>暂无文章</h3>
          <p>{{ searchKeyword ? '没有找到相关文章' : '还没有发布的文章' }}</p>
        </div>

        <!-- 错误状态 -->
        <div v-if="!loading && loadError" class="error-state">
          <i class="el-icon-warning-outline"></i>
          <h3>加载失败</h3>
          <p>{{ errorMessage }}</p>
          <el-button type="primary" @click="retryLoad">重试</el-button>
        </div>
      </div>
    </div>

    <!-- 写文章浮动按钮 -->
    <el-button
      type="primary"
      icon="el-icon-edit"
      class="write-article-fab"
      @click="handleWriteArticle"
      round
    >
      写文章
    </el-button>
  </div>
</template>

<script>
import axios from 'axios'

export default {
  name: 'Articles',
  data() {
    return {
      articles: [],
      featuredArticles: [],
      categories: [
        { label: '全部', value: 'all', count: null },
        { label: '新车发布', value: '新车发布', count: null },
        { label: '试驾评测', value: '试驾评测', count: null },
        { label: '行业资讯', value: '行业资讯', count: null },
        { label: '技术解析', value: '技术解析', count: null },
        { label: '汽车文化', value: '汽车文化', count: null },
        { label: '改装案例', value: '改装案例', count: null },
        { label: '购车指南', value: '购车指南', count: null },
        { label: '维修保养', value: '维修保养', count: null },
        { label: '政策法规', value: '政策法规', count: null }
      ],
      selectedCategory: 'all',
      sortBy: 'publishedAt',
      sortOrder: 'desc',
      searchKeyword: '',
      loading: false,
      loadError: false,
      errorMessage: '',
      showMoreCategories: false,
      maxVisibleCategories: 8,
      pagination: {
        page: 1,
        limit: 12,
        total: 0,
        pages: 1
      }
    }
  },
  computed: {
    // 有文章的分类（除了"全部"）
    categoriesWithArticles() {
      return this.categories.filter(cat => cat.value === 'all' || (cat.count && cat.count > 0))
    },
    
    // 显示的分类（前8个）
    visibleCategories() {
      if (this.showMoreCategories) {
        return this.categoriesWithArticles
      } else {
        return this.categoriesWithArticles.slice(0, this.maxVisibleCategories)
      }
    },
    
    // 是否有更多分类需要显示
    hasMoreCategories() {
      return this.categoriesWithArticles.length > this.maxVisibleCategories
    }
  },
  mounted() {
    this.loadArticles()
    this.loadFeaturedArticles()
    this.loadCategoryStats()
  },
  methods: {
    async loadArticles() {
      try {
        this.loading = true
        this.loadError = false
        this.errorMessage = ''
        
        const params = {
          page: this.pagination.page,
          limit: this.pagination.limit,
          sortBy: this.sortBy,
          sortOrder: this.sortOrder
        }

        if (this.selectedCategory !== 'all') {
          params.category = this.selectedCategory
        }

        if (this.searchKeyword) {
          params.search = this.searchKeyword
        }

        console.log('正在加载文章...', params)
        const response = await axios.get('/api/articles', { params })
        console.log('文章API响应:', response.data)
        
        if (response.data.status === 'success') {
          this.articles = response.data.data.articles
          this.pagination = response.data.data.pagination
        } else {
          throw new Error(response.data.message || '获取文章数据失败')
        }
      } catch (error) {
        console.error('加载文章失败:', error)
        this.loadError = true
        
        if (error.response) {
          console.error('错误响应:', error.response.data)
          this.errorMessage = error.response.data.message || '服务器错误'
        } else if (error.request) {
          console.error('网络错误:', error.request)
          this.errorMessage = '网络连接失败，请检查网络连接'
        } else {
          this.errorMessage = error.message
        }
      } finally {
        this.loading = false
      }
    },

    async loadFeaturedArticles() {
      try {
        const response = await axios.get('/api/articles', {
          params: {
            featured: true,
            limit: 3,
            sortBy: 'publishedAt',
            sortOrder: 'desc'
          }
        })
        
        if (response.data.status === 'success') {
          this.featuredArticles = response.data.data.articles
        }
      } catch (error) {
        console.error('加载推荐文章失败:', error)
      }
    },

    async loadCategoryStats() {
      try {
        const response = await axios.get('/api/articles/categories/stats')
        
        if (response.data.status === 'success') {
          const stats = response.data.data
          stats.forEach(stat => {
            const category = this.categories.find(cat => cat.value === stat.category)
            if (category) {
              category.count = stat.count
            }
          })
        }
      } catch (error) {
        console.error('加载分类统计失败:', error)
      }
    },

    filterByCategory(category) {
      this.selectedCategory = category
      this.pagination.page = 1
      this.loadArticles()
    },

    searchArticles() {
      this.pagination.page = 1
      this.loadArticles()
    },

    toggleMoreCategories() {
      this.showMoreCategories = !this.showMoreCategories
    },

    handlePageChange(page) {
      this.pagination.page = page
      this.loadArticles()
      this.$nextTick(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      })
    },

    goToArticle(articleId) {
      this.$router.push(`/articles/${articleId}`)
    },

    retryLoad() {
      this.loadArticles()
    },

    handleWriteArticle() {
      // 检查用户是否登录
      if (!this.$store.state.user) {
        this.$message.warning('请先登录后再写文章')
        // 可以选择跳转到登录页面
        // this.$router.push('/login')
        return
      }
      
      // 跳转到文章编辑页面
      this.$router.push('/articles/edit')
    },

    formatDate(dateString) {
      const date = new Date(dateString)
      const now = new Date()
      const diff = now - date

      if (diff < 60000) {
        return '刚刚'
      } else if (diff < 3600000) {
        return `${Math.floor(diff / 60000)} 分钟前`
      } else if (diff < 86400000) {
        return `${Math.floor(diff / 3600000)} 小时前`
      } else if (diff < 604800000) {
        return `${Math.floor(diff / 86400000)} 天前`
      } else {
        return date.toLocaleDateString('zh-CN')
      }
    }
  }
}
</script>

<style scoped>
.articles-page {
  min-height: 100vh;
  background: #f8f9fa;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

/* 页面头部 */
.page-header {
  background: #000000; /* 改为黑色背景 */
  color: white;
  padding: 30px 0;
  text-align: center;
}

.page-title {
  font-size: 2.2rem;
  font-weight: 700;
  margin: 0 0 10px 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.page-subtitle {
  font-size: 1.1rem;
  margin: 0;
  opacity: 0.9;
  font-weight: 300;
}

/* 筛选区域 */
.filters-section {
  background: white;
  padding: 30px 0;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 0;
}

/* 搜索框区域 */
.search-section {
  max-width: 600px;
  margin: 0 auto 25px auto; /* 增加底部间距 */
  width: 100%;
  height: 40px;
  display: flex;
  align-items: center;
}

/* 筛选栏 */
.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
  min-height: 48px;
}

.category-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  height: 40px; /* 固定高度确保对齐 */
}

.category-tag {
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 20px;
  padding: 0 16px; /* 移除上下 padding，只保留左右 */
  font-size: 14px;
  font-weight: 500;
  border: 1px solid #e1e5e9;
  background-color: #f8f9fa;
  color: #666;
  height: 36px; /* 固定高度 */
  line-height: 1; /* 重置行高 */
  display: inline-flex; /* 改为 inline-flex */
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  vertical-align: middle; /* 确保与其他元素对齐 */
}

.category-tag:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  background-color: #ffffff;
  border-color: #e03426;
  color: #e03426;
}

.category-tag.el-tag--primary {
  background-color: #e03426;
  border-color: #e03426;
  color: #ffffff;
}

.category-tag.el-tag--primary:hover {
  background-color: #c02a1f;
  border-color: #c02a1f;
  color: #ffffff;
}

.category-tag .count {
  font-size: 0.85em;
  opacity: 0.8;
  margin-left: 4px;
}

.more-categories-btn {
  height: 36px;
  margin-left: 8px;
  color: #666 !important;
  border: 1px solid #e1e5e9;
  border-radius: 20px;
  padding: 0 12px;
  font-size: 14px;
  transition: all 0.3s ease;
}

.more-categories-btn:hover {
  color: #e03426 !important;
  border-color: #e03426;
  background-color: #fff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.more-categories-btn i {
  margin-left: 4px;
  font-size: 12px;
}

.sort-controls {
  height: 40px; /* 固定高度确保对齐 */
  display: flex;
  align-items: center;
}

.sort-controls .el-select {
  width: 120px;
  height: 36px; /* 固定高度 */
}

/* 排序选择器样式 */
.sort-controls >>> .el-input__inner {
  background-color: #ffffff;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  color: #333333;
  font-size: 14px;
  padding: 8px 12px;
  transition: border-color 0.2s ease;
  height: 36px; /* 固定高度 */
  line-height: 20px; /* 确保文字垂直居中 */
  box-sizing: border-box;
}

.sort-controls >>> .el-input__inner:focus {
  border-color: #e03426;
  outline: none;
  box-shadow: 0 0 0 2px rgba(224, 52, 38, 0.1);
}

.sort-controls >>> .el-input__suffix {
  color: #999;
}

.sort-controls >>> .el-select__caret {
  color: #999;
}

.search-input {
  width: 100%;
  height: 36px; /* 固定高度 */
}

/* 搜索框样式 */
.search-input >>> .el-input__inner {
  border: 2px solid #e03426; /* 改为红色边框 */
  color: #333333;
  background-color: #ffffff;
  font-size: 14px;
  line-height: 1.5;
  padding: 8px 16px;
  transition: border-color 0.2s ease;
  height: 36px;
  box-sizing: border-box;
  border-radius: 4px 0 0 4px; /* 左圆角 */
}

.search-input >>> .el-input__inner:focus {
  border-color: #b8251a; /* 聚焦时深红色边框 */
  outline: none;
  box-shadow: 0 0 0 2px rgba(224, 52, 38, 0.2); /* 红色阴影 */
}

.search-input >>> .el-input__inner::placeholder {
  color: #999999;
}

.search-input >>> .el-input-group__append {
  border: 2px solid #e03426; /* 红色边框 */
  border-left: none;
  background-color: #e03426; /* 红色背景 */
  border-radius: 0 4px 4px 0; /* 右圆角 */
}

.search-input >>> .el-input-group__append .el-button {
  color: #ffffff;
  border: none;
  background: transparent;
}

.search-input >>> .el-input-group__append .el-button:hover {
  background-color: rgba(255, 255, 255, 0.1); /* 悬停时半透明白色 */
  color: #ffffff;
}

/* 推荐文章区域 */
.featured-section {
  background: white;
  padding: 25px 0 40px 0; /* 从40px 0改为25px 0 40px 0，减少上方间距 */
}

.section-title {
  font-size: 1.8rem;
  font-weight: 600;
  margin-bottom: 30px;
  color: #2c3e50;
}

.featured-articles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 30px;
}

.featured-article {
  display: flex;
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
  border: 1px solid rgba(0, 0, 0, 0.04);
}

.featured-article:hover {
  transform: translateY(-6px);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.12);
  border-color: rgba(224, 52, 38, 0.1);
}

.featured-image {
  width: 150px;
  height: 120px;
  position: relative;
  overflow: hidden;
}

.featured-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.featured-overlay {
  position: absolute;
  top: 10px;
  left: 10px;
}

.featured-badge {
  background: #e03426;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

.featured-content {
  flex: 1;
  padding: 15px;
}

.featured-category {
  color: #e03426;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
}

.featured-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 8px 0;
  color: #2c3e50;
  line-height: 1.4;
}

.featured-summary {
  font-size: 0.85rem;
  color: #666;
  line-height: 1.5;
  margin: 8px 0;
}

.featured-meta {
  display: flex;
  align-items: center;
  gap: 15px;
  font-size: 0.75rem;
  color: #999;
  margin-top: 10px;
}

/* 文章列表 */
.articles-section {
  padding: 40px 0;
}

.articles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 30px;
  margin-bottom: 40px;
}

.article-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
  border: 1px solid rgba(0, 0, 0, 0.04);
}

.article-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.12);
  border-color: rgba(224, 52, 38, 0.1);
}

.article-image {
  width: 100%;
  height: 200px;
  position: relative;
  overflow: hidden;
}

.article-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.article-card:hover .article-image img {
  transform: scale(1.05);
}

.article-category {
  position: absolute;
  top: 15px;
  left: 15px;
  background: rgba(224, 52, 38, 0.9);
  color: white;
  padding: 4px 12px;
  border-radius: 15px;
  font-size: 0.8rem;
  font-weight: 600;
}

.article-content {
  padding: 24px;
}

.article-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 8px 0;
  line-height: 1.4;
}

.article-subtitle {
  font-size: 0.9rem;
  color: #666;
  margin: 0 0 10px 0;
  line-height: 1.4;
}

.article-summary {
  font-size: 0.85rem;
  color: #666;
  line-height: 1.6;
  margin: 10px 0 15px 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.article-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.author-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.author-name {
  font-size: 0.85rem;
  color: #666;
  font-weight: 500;
}

.article-stats {
  display: flex;
  gap: 15px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
  color: #999;
}

.stat-item i {
  font-size: 0.9rem;
}

.article-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
  color: #999;
  padding-top: 15px;
  border-top: 1px solid #f0f0f0;
}

/* 分页 */
.pagination-section {
  display: flex;
  justify-content: center;
  margin-top: 40px;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #666;
}

.empty-state i {
  font-size: 4rem;
  color: #ddd;
  margin-bottom: 20px;
}

.empty-state h3 {
  font-size: 1.2rem;
  margin: 0 0 10px 0;
}

.empty-state p {
  margin: 0;
  opacity: 0.8;
}

/* 错误状态 */
.error-state {
  text-align: center;
  padding: 60px 20px;
  color: #666;
}

.error-state i {
  font-size: 4rem;
  color: #f56c6c;
  margin-bottom: 20px;
}

.error-state h3 {
  font-size: 1.2rem;
  margin: 0 0 10px 0;
  color: #f56c6c;
}

.error-state p {
  margin: 0 0 20px 0;
  opacity: 0.8;
}

/* 写文章浮动按钮 */
.write-article-fab {
  position: fixed;
  bottom: 30px;
  right: 30px;
  z-index: 1000;
  box-shadow: 0 4px 16px rgba(224, 52, 38, 0.3);
  font-size: 16px;
  padding: 12px 24px;
  height: auto;
}

.write-article-fab:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(224, 52, 38, 0.4);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .container {
    padding: 0 15px;
  }
  
  .page-header {
    padding: 20px 0; /* 从40px减少到20px */
  }
  
  .page-title {
    font-size: 1.8rem; /* 从2rem减少到1.8rem */
  }
  
  .page-subtitle {
    font-size: 1rem; /* 从1rem保持不变 */
  }
  
  .filters-section {
    padding: 20px 0;
  }
  
  /* 搜索框区域 */
  .search-section {
    max-width: 100%;
    margin: 0 auto 20px auto; /* 移动端减少间距 */
    height: auto;
  }
  
  /* 筛选栏 */
  .filter-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 15px;
    min-height: auto;
  }
  
  .category-filters {
    justify-content: center;
    gap: 8px;
    height: auto;
    min-height: 40px;
  }
  
  .category-tag {
    font-size: 12px;
    padding: 6px 12px;
    height: 32px;
    line-height: 18px;
  }
  
  .sort-controls {
    align-self: center;
    height: auto;
  }
  
  .sort-controls .el-select {
    width: 140px;
    height: 32px;
  }
  
  .sort-controls >>> .el-input__inner {
    height: 32px;
    line-height: 18px;
    padding: 6px 10px;
  }
  
  .search-input {
    height: 32px;
  }
  
  .search-input >>> .el-input__inner {
    font-size: 14px;
    padding: 6px 12px;
    height: 32px;
  }
  
  .featured-articles {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  
  .featured-section {
    padding: 20px 0 30px 0; /* 移动端进一步减少间距 */
  }
  
  .featured-article {
    flex-direction: column;
  }
  
  .featured-image {
    width: 100%;
    height: 200px;
  }
  
  .articles-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  
  .article-card {
    margin-bottom: 0;
  }
  
  .write-article-fab {
    bottom: 20px;
    right: 20px;
    padding: 10px 20px;
    font-size: 14px;
  }
}
</style> 