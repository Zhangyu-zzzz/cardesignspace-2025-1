<template>
  <div class="smart-search-modern">
    <!-- Hero区域 - 搜索框 -->
    <div class="hero-section">
      <div class="hero-content">
        <div class="hero-badge">
          <svg class="badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>AI智能搜索</span>
        </div>
        
        <h1 class="hero-title">探索你想要的汽车设计</h1>
        <p class="hero-subtitle">结合AI语义理解与精准品牌匹配，让搜索更智能</p>
        
        <!-- 现代搜索框 -->
        <div class="search-container">
          <div class="search-box">
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="11" cy="11" r="8" stroke-width="2"/>
              <path d="m21 21-4.35-4.35" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <input 
              v-model="searchQuery"
              @keyup.enter="performSearch"
              type="text"
              class="search-input"
              placeholder="输入品牌、颜色、车型...例如：红色的宝马SUV"
              :disabled="loading"
            />
            <button 
              class="search-button" 
              @click="performSearch"
              :disabled="loading || !searchQuery.trim()"
            >
              <span v-if="!loading">搜索</span>
              <div v-else class="loading-spinner"></div>
            </button>
          </div>
          
          <!-- 快捷搜索标签 -->
          <div class="quick-search-tags">
            <span class="tags-label">热门搜索：</span>
            <button 
              v-for="tag in quickSearchTags" 
              :key="tag"
              class="quick-tag"
              @click="quickSearch(tag)"
            >
              {{ tag }}
            </button>
          </div>
        </div>
        
        <!-- 搜索信息卡片 -->
        <transition name="fade">
          <div v-if="searchInfo && hasSearched" class="search-info-card">
            <div class="info-item" v-if="searchInfo.brandInfo">
              <svg class="info-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <span><strong>品牌：</strong>{{ searchInfo.brandInfo.name }}</span>
            </div>
            <div class="info-item">
              <svg class="info-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
              </svg>
              <span><strong>结果：</strong>{{ pagination.total }} 张图片</span>
            </div>
            <div class="info-item" v-if="searchInfo.isTranslated">
              <svg class="info-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04M18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12m-2.62 7l1.62-4.33L19.12 17h-3.24z"/>
              </svg>
              <span><strong>翻译：</strong>{{ searchInfo.translatedQuery }}</span>
            </div>
          </div>
        </transition>
      </div>
    </div>

    <!-- 结果区域 -->
    <div class="results-section">
      <div class="results-container">
        <!-- 加载中 -->
        <div v-if="loading && !hasSearched" class="loading-state">
          <div class="loading-spinner-large"></div>
          <p class="loading-text">正在智能搜索中...</p>
        </div>

        <!-- 搜索结果 -->
        <div v-else-if="images.length > 0" class="results-content">
          <!-- 结果头部 -->
          <div class="results-header">
            <div class="results-info">
              <h2 class="results-title">搜索结果</h2>
              <p class="results-count">共找到 <strong>{{ pagination.total }}</strong> 张图片</p>
            </div>
            
            <!-- 视图切换（可选） -->
            <div class="view-controls">
              <button 
                v-for="view in ['grid', 'masonry']" 
                :key="view"
                :class="['view-btn', { active: currentView === view }]"
                @click="currentView = view"
              >
                <svg v-if="view === 'grid'" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z"/>
                </svg>
                <svg v-else viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 3h8v5H3V3zm10 0h8v8h-8V3zM3 10h8v11H3V10zm10 3h8v8h-8v-8z"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- 图片网格 -->
          <div :class="['image-grid', `view-${currentView}`]">
            <div 
              v-for="image in images" 
              :key="image.id" 
              class="image-item"
              @click="openImageModal(image)"
            >
              <div class="image-wrapper">
                <img 
                  :src="image.bestUrl || image.url" 
                  :alt="image.filename"
                  loading="lazy"
                  @error="onImageError"
                />
                <div class="image-overlay">
                  <div class="overlay-content">
                    <h3 class="model-name">{{ image.model?.name || '未知车型' }}</h3>
                    <p class="brand-name">{{ image.brand?.name || '' }}</p>
                  </div>
                  <div class="overlay-actions">
                    <button class="action-btn">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke-width="2"/>
                        <circle cx="12" cy="12" r="3" stroke-width="2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 加载更多 -->
          <div class="load-more-section">
            <div v-if="loadingMore" class="loading-more">
              <div class="loading-spinner"></div>
              <span>加载更多...</span>
            </div>
            <div v-else-if="hasMore" class="load-more-hint">
              <div class="scroll-indicator">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M12 5v14M19 12l-7 7-7-7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <span>下滑加载更多内容</span>
            </div>
            <div v-else class="no-more">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
              </svg>
              <span>已加载全部 {{ pagination.total }} 张图片</span>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-else-if="hasSearched && !loading" class="empty-state">
          <div class="empty-illustration">
            <svg viewBox="0 0 200 200" fill="none">
              <circle cx="100" cy="100" r="80" stroke="#DC3545" stroke-width="2" opacity="0.2"/>
              <path d="M70 90L90 110L130 70" stroke="#DC3545" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity="0.3"/>
              <circle cx="100" cy="100" r="40" stroke="#DC3545" stroke-width="2" opacity="0.4"/>
            </svg>
          </div>
          <h3 class="empty-title">未找到匹配的结果</h3>
          <p class="empty-text">尝试使用不同的关键词或品牌名称</p>
          <button class="retry-button" @click="clearSearch">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>重新搜索</span>
          </button>
        </div>

        <!-- 初始提示 -->
        <div v-else class="welcome-state">
          <div class="welcome-grid">
            <div class="welcome-card">
              <div class="card-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <h3>品牌识别</h3>
              <p>自动识别查询中的汽车品牌，精准匹配结果</p>
            </div>
            
            <div class="welcome-card">
              <div class="card-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <h3>语义搜索</h3>
              <p>AI理解搜索意图，返回最相关的设计图片</p>
            </div>
            
            <div class="welcome-card">
              <div class="card-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0013 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
                </svg>
              </div>
              <h3>快速响应</h3>
              <p>优化的搜索算法，10秒内返回200+结果</p>
            </div>
          </div>
          
          <div class="example-searches">
            <h3 class="example-title">搜索示例</h3>
            <div class="example-tags">
              <button 
                v-for="example in exampleSearches" 
                :key="example"
                class="example-tag"
                @click="searchQuery = example; performSearch()"
              >
                {{ example }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 图片详情模态框 -->
    <transition name="modal-fade">
      <div v-if="showModal" class="modal-backdrop" @click.self="showModal = false">
        <div class="modal-container">
          <button class="modal-close" @click="showModal = false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M18 6L6 18M6 6l12 12" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
          
          <div v-if="selectedImage" class="modal-content">
            <div class="modal-image-section">
              <img :src="selectedImage.bestUrl || selectedImage.url" :alt="selectedImage.filename">
            </div>
            
            <div class="modal-info-section">
              <h2 class="modal-title">{{ selectedImage.model?.name || '未知车型' }}</h2>
              <p class="modal-brand">{{ selectedImage.brand?.name || '' }}</p>
              
              <div class="info-grid">
                <div class="info-row">
                  <span class="info-label">文件名</span>
                  <span class="info-value">{{ selectedImage.filename }}</span>
                </div>
                <div class="info-row" v-if="selectedImage.model?.type">
                  <span class="info-label">类型</span>
                  <span class="info-value">{{ selectedImage.model.type }}</span>
                </div>
                <div class="info-row" v-if="selectedImage.vectorScore">
                  <span class="info-label">相似度</span>
                  <span class="info-value">{{ (selectedImage.vectorScore * 100).toFixed(1) }}%</span>
                </div>
              </div>
              
              <div v-if="selectedImage.tags && selectedImage.tags.length > 0" class="modal-tags">
                <h4 class="tags-title">标签</h4>
                <div class="tags-container">
                  <span v-for="tag in selectedImage.tags" :key="tag" class="tag-item">
                    {{ tag }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
import { apiClient } from '@/services/api'

export default {
  name: 'SmartSearchModern',
  data() {
    return {
      searchQuery: '',
      images: [],
      loading: false,
      loadingMore: false,
      hasSearched: false,
      hasMore: false,
      currentView: 'grid',
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        pages: 0
      },
      searchInfo: null,
      showModal: false,
      selectedImage: null,
      scrollHandler: null,
      quickSearchTags: ['红色跑车', '奔驰SUV', '蓝色轿车', 'BMW概念车'],
      exampleSearches: [
        '红色的宝马SUV',
        '白色奔驰轿车',
        '蓝色奥迪跑车',
        '黑色保时捷',
        '丰田越野车',
        '特斯拉Model 3'
      ]
    }
  },
  mounted() {
    this.scrollHandler = this.handleScroll.bind(this)
    window.addEventListener('scroll', this.scrollHandler)
  },
  beforeDestroy() {
    if (this.scrollHandler) {
      window.removeEventListener('scroll', this.scrollHandler)
    }
  },
  methods: {
    async performSearch() {
      if (!this.searchQuery.trim()) {
        this.$message.warning('请输入搜索关键词')
        return
      }

      this.loading = true
      this.hasSearched = true
      this.pagination.page = 1
      this.images = []

      try {
        await this.loadImages()
      } catch (error) {
        console.error('搜索失败:', error)
        this.$message.error('搜索失败，请稍后重试')
      } finally {
        this.loading = false
      }
    },

    async loadImages(isLoadMore = false) {
      try {
        if (isLoadMore) {
          this.loadingMore = true
        }

        const response = await apiClient.get('/smart-search', {
          params: {
            q: this.searchQuery,
            page: this.pagination.page,
            limit: this.pagination.limit
          }
        })

        if (response.status === 'success') {
          const newImages = response.data.images || []
          
          if (isLoadMore) {
            this.images = [...this.images, ...newImages]
          } else {
            this.images = newImages
          }
          
          this.pagination = response.data.pagination || this.pagination
          this.hasMore = response.data.pagination?.hasMore || false
          this.searchInfo = response.data.searchInfo || null
        } else {
          throw new Error(response.message || '搜索失败')
        }
      } catch (error) {
        console.error('加载图片失败:', error)
        if (!isLoadMore) {
          throw error
        }
      } finally {
        if (isLoadMore) {
          this.loadingMore = false
        }
      }
    },

    handleScroll() {
      if (this.loadingMore || !this.hasMore || this.loading) {
        return
      }

      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight

      if (scrollTop + windowHeight >= documentHeight - 300) {
        this.loadMore()
      }
    },

    async loadMore() {
      if (!this.hasMore || this.loadingMore) {
        return
      }

      this.pagination.page += 1
      await this.loadImages(true)
    },

    quickSearch(query) {
      this.searchQuery = query
      this.performSearch()
    },

    openImageModal(image) {
      this.selectedImage = image
      this.showModal = true
    },

    clearSearch() {
      this.searchQuery = ''
      this.images = []
      this.hasSearched = false
      this.hasMore = false
      this.searchInfo = null
      this.pagination.page = 1
    },

    onImageError(event) {
      event.target.src = '/default-avatar.svg'
    }
  }
}
</script>

<style scoped>
/* 全局变量 */
:root {
  --primary-color: #DC3545;
  --primary-light: #FF4757;
  --primary-dark: #C42331;
  --text-primary: #1a1a1a;
  --text-secondary: #666666;
  --text-tertiary: #999999;
  --bg-primary: #ffffff;
  --bg-secondary: #f8f9fa;
  --bg-tertiary: #f1f3f5;
  --border-color: #e9ecef;
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.12);
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 主容器 */
.smart-search-modern {
  min-height: 100vh;
  background: linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%);
}

/* Hero区域 */
.hero-section {
  padding: 60px 20px 80px;
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  position: relative;
  overflow: hidden;
}

.hero-section::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -10%;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(220, 53, 69, 0.03) 0%, transparent 70%);
  border-radius: 50%;
}

.hero-content {
  max-width: 900px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

/* 徽章 */
.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: linear-gradient(135deg, rgba(220, 53, 69, 0.1) 0%, rgba(220, 53, 69, 0.05) 100%);
  border: 1px solid rgba(220, 53, 69, 0.2);
  border-radius: 100px;
  color: var(--primary-color);
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 24px;
}

.badge-icon {
  width: 16px;
  height: 16px;
}

/* 标题 */
.hero-title {
  font-size: 48px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 16px 0;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.hero-subtitle {
  font-size: 18px;
  color: var(--text-secondary);
  margin: 0 0 40px 0;
  line-height: 1.6;
}

/* 搜索容器 */
.search-container {
  margin-bottom: 24px;
}

/* 搜索框 */
.search-box {
  display: flex;
  align-items: center;
  background: var(--bg-primary);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 8px 8px 8px 20px;
  transition: var(--transition);
  box-shadow: var(--shadow-md);
}

.search-box:focus-within {
  border-color: var(--primary-color);
  box-shadow: 0 8px 24px rgba(220, 53, 69, 0.15);
}

.search-icon {
  width: 24px;
  height: 24px;
  color: var(--text-tertiary);
  margin-right: 12px;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 16px;
  color: var(--text-primary);
  background: transparent;
  padding: 12px 0;
}

.search-input::placeholder {
  color: var(--text-tertiary);
}

.search-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.search-button {
  padding: 12px 32px;
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-light) 100%);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition);
  flex-shrink: 0;
  white-space: nowrap;
  min-width: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-button:hover:not(:disabled) {
  background: linear-gradient(135deg, var(--primary-light) 0%, var(--primary-color) 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
}

.search-button:active:not(:disabled) {
  transform: translateY(0);
}

.search-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 快捷搜索标签 */
.quick-search-tags {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.tags-label {
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 500;
}

.quick-tag {
  padding: 6px 16px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 100px;
  font-size: 14px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: var(--transition);
}

.quick-tag:hover {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
  transform: translateY(-1px);
}

/* 搜索信息卡片 */
.search-info-card {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  padding: 16px 20px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  margin-top: 20px;
  box-shadow: var(--shadow-sm);
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text-secondary);
}

.info-icon {
  width: 16px;
  height: 16px;
  color: var(--primary-color);
}

/* 结果区域 */
.results-section {
  padding: 0 20px 80px;
}

.results-container {
  max-width: 1400px;
  margin: 0 auto;
}

/* 加载状态 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 20px;
}

.loading-spinner-large {
  width: 48px;
  height: 48px;
  border: 4px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.loading-text {
  font-size: 16px;
  color: var(--text-secondary);
}

/* 结果内容 */
.results-content {
  animation: fadeIn 0.4s ease;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  padding-bottom: 20px;
  border-bottom: 2px solid var(--border-color);
}

.results-info {
  flex: 1;
}

.results-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 8px 0;
}

.results-count {
  font-size: 14px;
  color: var(--text-secondary);
}

.results-count strong {
  color: var(--primary-color);
  font-weight: 600;
}

/* 视图控制 */
.view-controls {
  display: flex;
  gap: 8px;
}

.view-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: var(--transition);
}

.view-btn svg {
  width: 20px;
  height: 20px;
  color: var(--text-secondary);
}

.view-btn:hover,
.view-btn.active {
  background: var(--primary-color);
  border-color: var(--primary-color);
}

.view-btn:hover svg,
.view-btn.active svg {
  color: white;
}

/* 图片网格 */
.image-grid {
  display: grid;
  gap: 24px;
  margin-bottom: 48px;
}

.image-grid.view-grid {
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
}

.image-grid.view-masonry {
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  grid-auto-rows: 10px;
}

.image-item {
  animation: fadeInUp 0.4s ease;
  animation-fill-mode: both;
}

.image-item:nth-child(1) { animation-delay: 0.05s; }
.image-item:nth-child(2) { animation-delay: 0.1s; }
.image-item:nth-child(3) { animation-delay: 0.15s; }
.image-item:nth-child(4) { animation-delay: 0.2s; }

.image-wrapper {
  position: relative;
  border-radius: var(--radius-md);
  overflow: hidden;
  cursor: pointer;
  aspect-ratio: 16 / 9;
  box-shadow: var(--shadow-sm);
  transition: var(--transition);
}

.image-wrapper:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.image-wrapper img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: var(--transition);
}

.image-wrapper:hover img {
  transform: scale(1.05);
}

/* 图片遮罩 */
.image-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.8) 100%);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 20px;
  opacity: 0;
  transition: var(--transition);
}

.image-wrapper:hover .image-overlay {
  opacity: 1;
}

.overlay-content {
  margin-bottom: auto;
  padding-top: 100px;
}

.model-name {
  font-size: 16px;
  font-weight: 600;
  color: white;
  margin: 0 0 4px 0;
}

.brand-name {
  font-size: 14px;
  color: rgba(255,255,255,0.8);
  margin: 0;
}

.overlay-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.2);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 50%;
  cursor: pointer;
  transition: var(--transition);
}

.action-btn svg {
  width: 20px;
  height: 20px;
  color: white;
}

.action-btn:hover {
  background: rgba(255,255,255,0.3);
  transform: scale(1.1);
}

/* 加载更多区域 */
.load-more-section {
  display: flex;
  justify-content: center;
  padding: 40px 0;
}

.loading-more,
.load-more-hint,
.no-more {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: var(--text-secondary);
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.scroll-indicator {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  border-radius: 50%;
  animation: bounce 2s infinite;
}

.scroll-indicator svg {
  width: 16px;
  height: 16px;
  color: var(--text-tertiary);
}

.no-more {
  color: var(--primary-color);
}

.no-more svg {
  width: 20px;
  height: 20px;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 60px 20px;
  text-align: center;
}

.empty-illustration {
  margin-bottom: 32px;
}

.empty-illustration svg {
  width: 120px;
  height: 120px;
}

.empty-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 12px 0;
}

.empty-text {
  font-size: 16px;
  color: var(--text-secondary);
  margin: 0 0 32px 0;
}

.retry-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition);
}

.retry-button svg {
  width: 20px;
  height: 20px;
}

.retry-button:hover {
  background: var(--primary-light);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
}

/* 欢迎状态 */
.welcome-state {
  padding: 40px 0;
}

.welcome-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  margin-bottom: 60px;
}

.welcome-card {
  padding: 32px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  text-align: center;
  transition: var(--transition);
  box-shadow: var(--shadow-sm);
}

.welcome-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
  border-color: var(--primary-color);
}

.card-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(220, 53, 69, 0.1) 0%, rgba(220, 53, 69, 0.05) 100%);
  border-radius: 50%;
}

.card-icon svg {
  width: 28px;
  height: 28px;
  color: var(--primary-color);
}

.welcome-card h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 12px 0;
}

.welcome-card p {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.6;
}

/* 示例搜索 */
.example-searches {
  text-align: center;
}

.example-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 20px 0;
}

.example-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
}

.example-tag {
  padding: 10px 20px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 100px;
  font-size: 14px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: var(--transition);
}

.example-tag:hover {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(220, 53, 69, 0.2);
}

/* 模态框 */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.modal-container {
  position: relative;
  max-width: 1200px;
  width: 100%;
  max-height: 90vh;
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  z-index: 10;
  transition: var(--transition);
}

.modal-close svg {
  width: 20px;
  height: 20px;
  color: white;
}

.modal-close:hover {
  background: rgba(0, 0, 0, 0.8);
  transform: rotate(90deg);
}

.modal-content {
  display: flex;
  height: 100%;
  overflow-y: auto;
}

.modal-image-section {
  flex: 1.5;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8f9fa;
  padding: 40px;
}

.modal-image-section img {
  max-width: 100%;
  max-height: 80vh;
  object-fit: contain;
  border-radius: var(--radius-md);
}

.modal-info-section {
  flex: 1;
  padding: 40px;
  overflow-y: auto;
}

.modal-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 8px 0;
}

.modal-brand {
  font-size: 16px;
  color: var(--text-secondary);
  margin: 0 0 32px 0;
}

.info-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 32px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-color);
}

.info-label {
  font-size: 14px;
  color: var(--text-tertiary);
  font-weight: 500;
}

.info-value {
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 500;
}

.modal-tags {
  padding-top: 20px;
  border-top: 2px solid var(--border-color);
}

.tags-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 16px 0;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-item {
  padding: 6px 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 100px;
  font-size: 13px;
  color: var(--text-secondary);
}

/* 动画 */
@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-enter-active, .fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter, .fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.modal-fade-enter-active, .modal-fade-leave-active {
  transition: all 0.3s ease;
}

.modal-fade-enter, .modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter .modal-container,
.modal-fade-leave-to .modal-container {
  transform: scale(0.9);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .hero-title {
    font-size: 32px;
  }

  .hero-subtitle {
    font-size: 16px;
  }

  .search-box {
    flex-direction: column;
    padding: 12px;
    gap: 12px;
  }

  .search-icon {
    display: none;
  }

  .search-input {
    width: 100%;
  }

  .search-button {
    width: 100%;
  }

  .quick-search-tags {
    flex-direction: column;
    align-items: flex-start;
  }

  .results-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .image-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 16px;
  }

  .modal-content {
    flex-direction: column;
  }

  .modal-image-section,
  .modal-info-section {
    padding: 20px;
  }

  .welcome-grid {
    grid-template-columns: 1fr;
  }
}
</style>

