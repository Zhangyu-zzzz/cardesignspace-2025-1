<template>
  <div class="smart-search-modern">
    <!-- Hero区域 - 搜索框 -->
    <div class="hero-section">
      <div class="hero-content">
        <!-- 标题区域 -->
        <div class="title-section">
          <h1 class="page-title">自然语言搜索</h1>
          <p class="page-description">使用自然语言描述你想要的汽车信息，我们将为你找到最相关的图片</p>
          <p class="page-description">建议英文搜索，效果更精准</p>
        </div>
        
        <!-- 搜索框 -->
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
          
          <!-- 搜索提示 -->
          <!-- <div class="search-hint">
            💡 支持自然语言搜索，如"红色的宝马SUV"，或使用关键词组合，如"蓝色 跑车 奔驰"
          </div> -->
        </div>
        
        <!-- 搜索信息卡片 -->
        <transition name="fade">
          <div v-if="searchInfo && hasSearched" class="search-info-card">
            <div class="info-item" v-if="searchInfo.brandInfo">
              <svg class="info-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <span><strong>识别到品牌：</strong>{{ searchInfo.brandInfo.name }}</span>
            </div>
            <div class="info-item" v-if="searchInfo.isTranslated">
              <svg class="info-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04M18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12m-2.62 7l1.62-4.33L19.12 17h-3.24z"/>
              </svg>
              <span><strong>翻译：</strong>{{ searchInfo.translatedQuery }}</span>
            </div>
          </div>
        </transition>
        
        <!-- 快捷搜索标签 - 移到翻译信息下方 -->
        <transition name="fade">
          <div v-if="quickSearchTags.length > 0" class="quick-search-tags">
            <span class="tags-label">
              <svg class="tags-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
              </svg>
              热门搜索：
            </span>
            <button 
              v-for="tag in quickSearchTags" 
              :key="tag.query"
              class="quick-tag"
              @click="quickSearch(tag.query)"
              :title="`搜索次数: ${tag.count}`"
            >
              {{ tag.query }}
              <span class="tag-count">{{ tag.count }}</span>
            </button>
          </div>
        </transition>
      </div>
    </div>

    <!-- 结果区域 -->
    <div class="results-section">
      <div class="results-container">
        <!-- 加载中 -->
        <div v-if="loading" class="loading-state">
          <div class="loading-animation">
            <div class="loading-spinner-large"></div>
            <div class="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
          <h3 class="loading-title">正在搜索中</h3>
          <p class="loading-text">AI正在为您匹配最相关的设计图片...</p>
          <div class="loading-steps">
            <div class="step-item" :class="{ active: loadingStep >= 1, done: loadingStep > 1 }">
              <div class="step-icon">
                <svg v-if="loadingStep > 1" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
                </svg>
                <span v-else>1</span>
              </div>
              <span class="step-text">品牌识别</span>
            </div>
            <div class="step-divider" :class="{ active: loadingStep >= 2 }"></div>
            <div class="step-item" :class="{ active: loadingStep >= 2, done: loadingStep > 2 }">
              <div class="step-icon">
                <svg v-if="loadingStep > 2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
                </svg>
                <span v-else>2</span>
              </div>
              <span class="step-text">语义翻译</span>
            </div>
            <div class="step-divider" :class="{ active: loadingStep >= 3 }"></div>
            <div class="step-item" :class="{ active: loadingStep >= 3, done: loadingStep > 3 }">
              <div class="step-icon">
                <svg v-if="loadingStep > 3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
                </svg>
                <span v-else>3</span>
              </div>
              <span class="step-text">向量匹配</span>
            </div>
          </div>
        </div>

        <!-- 搜索结果 -->
        <div v-else-if="images.length > 0" class="results-content">
          <!-- 结果头部 -->
          <div class="results-header">
            <div class="results-info">
              <h2 class="results-title">搜索结果</h2>
              <p class="results-count">共找到 <strong>{{ pagination.total }}</strong> 张图片</p>
            </div>
            
          </div>

          <!-- 图片网格 -->
          <div class="image-grid">
            <div 
              v-for="image in images" 
              :key="image.id" 
              class="image-item"
              @click="openImageModal(image)"
            >
              <div class="image-wrapper">
                <!-- 缩略图（列表显示）- 始终渲染，让浏览器可以加载 -->
                <img 
                  :src="getThumbnailUrl(image)" 
                  :alt="image.filename || '图片'"
                  loading="lazy"
                  @load="onImageLoad(image, $event)"
                  @error="onImageError($event, image)"
                  class="image-thumbnail"
                  :class="{ 'image-loaded': image.imageLoaded }"
                  :data-image-id="image.id"
                />
                <!-- 占位符 - 覆盖在图片上方，加载完成后隐藏 -->
                <div v-if="!image.imageLoaded" class="image-placeholder">
                  <div class="placeholder-spinner"></div>
                </div>
                <div class="image-overlay">
                  <div class="overlay-content">
                    <h3 class="model-name">{{ image.model?.name || '未知车型' }}</h3>
                    <p class="brand-name">{{ image.brand?.name || '' }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 加载更多 -->
          <div class="load-more-section">
            <div v-if="loadingMore" class="loading-more">
              <div class="loading-spinner"></div>
              <span>正在加载第 {{ pagination.page }} 页...</span>
            </div>
            <div v-else-if="hasMore" class="load-more-hint">
              <button class="load-more-button" @click="loadMore">
                加载更多
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M19 12l-7 7-7-7M19 5l-7 7-7-7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
              <p class="auto-load-hint">或继续向下滚动自动加载</p>
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
              <div class="modal-header-info">
                <h2 class="modal-title">{{ selectedImage.model?.name || selectedImage.filename }}</h2>
                <p class="modal-brand" v-if="selectedImage.brand?.name">{{ selectedImage.brand.name }}</p>
              </div>
              
              <!-- 跳转到车型详情按钮 -->
              <div v-if="selectedImage.modelId" class="modal-action-buttons">
                <button class="view-model-btn" @click="goToModelDetail">
                  <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <span>查看该车型所有图片</span>
                  <svg class="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M9 5l7 7-7 7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
              </div>
              
              <div class="info-cards">
                <div class="info-card" v-if="selectedImage.model?.type">
                  <div class="info-card-label">车型类型</div>
                  <div class="info-card-value">{{ selectedImage.model.type }}</div>
                </div>
                <div class="info-card" v-if="selectedImage.vectorScore">
                  <div class="info-card-label">匹配度</div>
                  <div class="info-card-value">{{ (selectedImage.vectorScore * 100).toFixed(1) }}%</div>
                </div>
              </div>
              
              <div v-if="selectedImage.tags && selectedImage.tags.length > 0" class="modal-tags">
                <div class="tags-header">
                  <svg class="tags-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z"/>
                  </svg>
                  <span class="tags-title">标签</span>
                </div>
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
      loadingStep: 0,
      hasSearched: false,
      hasMore: false,
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
      quickSearchTags: [],
      loadingStepTimer: null,
      scrollRafId: null, // ⭐ 滚动动画帧ID
      imageObservers: [] // ⭐ Intersection Observer 实例
    }
  },
  mounted() {
    this.scrollHandler = this.handleScroll.bind(this)
    window.addEventListener('scroll', this.scrollHandler)
    // 加载热门搜索
    this.loadPopularSearches()
  },
  beforeDestroy() {
    if (this.scrollHandler) {
      window.removeEventListener('scroll', this.scrollHandler)
    }
    if (this.loadingStepTimer) {
      clearInterval(this.loadingStepTimer)
    }
    if (this.scrollRafId) {
      cancelAnimationFrame(this.scrollRafId)
    }
    // ⭐ 清理 Intersection Observer
    this.imageObservers.forEach(observer => observer.disconnect())
    this.imageObservers = []
  },
  methods: {
    // 加载热门搜索
    async loadPopularSearches() {
      try {
        const response = await apiClient.get('/search-stats/popular', {
          params: { limit: 6 }
        })
        console.log('热门搜索API响应:', response)
        
        if (response && response.success && response.data && Array.isArray(response.data) && response.data.length > 0) {
          // ⭐ 确保数据格式正确，count 是数字
          this.quickSearchTags = response.data.map(item => ({
            query: item.query || '',
            count: parseInt(item.count) || 0,
            last_searched_at: item.last_searched_at
          })).filter(item => item.query && item.count > 0) // 过滤掉无效数据
          
          console.log('处理后的热门搜索数据:', this.quickSearchTags)
        } else {
          // 如果没有数据，清空数组，不显示假数据
          this.quickSearchTags = []
          console.log('热门搜索数据为空或格式不正确')
        }
      } catch (error) {
        console.error('加载热门搜索失败:', error)
        console.error('错误详情:', error.response?.data || error.message)
        // 失败时不显示假数据，清空数组
        this.quickSearchTags = []
      }
    },

    // 记录搜索
    async recordSearch(searchData) {
      try {
        // 获取或生成会话ID
        let sessionId = localStorage.getItem('search_session_id');
        if (!sessionId) {
          sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
          localStorage.setItem('search_session_id', sessionId);
        }
        
        const recordData = {
          query: searchData.query,
          translatedQuery: searchData.translatedQuery || null,
          brandId: searchData.brandId || null,
          resultsCount: searchData.resultsCount || 0,
          searchType: searchData.searchType || 'smart',
          isSuccessful: searchData.isSuccessful !== false,
          errorMessage: searchData.errorMessage || null,
          sessionId: sessionId
        };
        
        await apiClient.post('/search-stats/record', recordData);
      } catch (error) {
        console.error('记录搜索失败:', error);
      }
    },

    async performSearch() {
      if (!this.searchQuery.trim()) {
        this.$message.warning('请输入搜索关键词')
        return
      }

      const searchStartTime = Date.now();
      this.loading = true
      this.hasSearched = true
      this.pagination.page = 1
      this.images = []
      this.loadingStep = 0
      
      // 模拟加载步骤动画
      this.loadingStepTimer = setInterval(() => {
        if (this.loadingStep < 3) {
          this.loadingStep++
        }
      }, 2000)

      try {
        await this.loadImages()
        
        // 搜索成功后记录
        const searchDuration = Date.now() - searchStartTime;
        this.recordSearch({
          query: this.searchQuery.trim(),
          translatedQuery: this.searchInfo?.translatedQuery,
          brandId: this.searchInfo?.brandInfo?.id,
          resultsCount: this.images.length,
          searchType: 'smart',
          isSuccessful: true,
          searchDuration: searchDuration
        });
        
      } catch (error) {
        console.error('搜索失败:', error)
        this.$message.error('搜索失败，请稍后重试')
        
        // 搜索失败也记录
        this.recordSearch({
          query: this.searchQuery.trim(),
          resultsCount: 0,
          searchType: 'smart',
          isSuccessful: false,
          errorMessage: error.message || '搜索失败'
        });
        
      } finally {
        this.loading = false
        this.loadingStep = 4
        if (this.loadingStepTimer) {
          clearInterval(this.loadingStepTimer)
          this.loadingStepTimer = null
        }
        // 搜索完成后重新加载热门搜索
        this.loadPopularSearches()
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
          const newImages = (response.data.images || []).map(img => {
            const imageUrl = this.getThumbnailUrl(img)
            console.log('📷 准备加载图片:', img.id, 'URL:', imageUrl ? imageUrl.substring(0, 50) + '...' : '无URL')
            return {
              ...img,
              imageLoaded: false, // ⭐ 初始化图片加载状态
              _loadTimeout: null // ⭐ 加载超时定时器
            }
          })
          
          if (isLoadMore) {
            this.images = [...this.images, ...newImages]
          } else {
            this.images = newImages
          }
          
          // ⭐ 为每张图片设置加载超时（3秒后自动显示，避免一直转圈）
          this.$nextTick(() => {
            newImages.forEach(img => {
              if (img._loadTimeout) {
                clearTimeout(img._loadTimeout)
              }
              img._loadTimeout = setTimeout(() => {
                if (!img.imageLoaded) {
                  console.warn('⏰ 图片加载超时，强制显示:', img.id)
                  this.$set(img, 'imageLoaded', true)
                }
              }, 3000) // 3秒超时
            })
          })
          
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

    // ⭐ 防抖优化的滚动处理
    handleScroll() {
      if (this.loadingMore || !this.hasMore || this.loading) {
        return
      }

      // 使用 requestAnimationFrame 优化性能
      if (this.scrollRafId) {
        cancelAnimationFrame(this.scrollRafId)
      }

      this.scrollRafId = requestAnimationFrame(() => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop
        const windowHeight = window.innerHeight
        const documentHeight = document.documentElement.scrollHeight

        // 提前300px触发加载
        if (scrollTop + windowHeight >= documentHeight - 300) {
          this.loadMore()
        }
      })
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

    goToModelDetail() {
      if (this.selectedImage && this.selectedImage.modelId) {
        // 关闭弹窗
        this.showModal = false
        // 跳转到车型详情页
        this.$router.push(`/model/${this.selectedImage.modelId}`)
      }
    },

    clearSearch() {
      this.searchQuery = ''
      this.images = []
      this.hasSearched = false
      this.hasMore = false
      this.searchInfo = null
      this.pagination.page = 1
    },

    // ⭐ 获取缩略图URL，优先使用缩略图
    getThumbnailUrl(image) {
      if (!image) {
        console.warn('getThumbnailUrl: image 为空')
        return ''
      }
      
      // 优先使用后端返回的 thumbnailUrl
      if (image.thumbnailUrl) {
        return image.thumbnailUrl
      }
      
      // 如果没有，尝试从 Assets 中查找
      if (image.Assets && Array.isArray(image.Assets)) {
        const thumbnail = image.Assets.find(a => a.variant === 'thumbnail' || a.variant === 'thumb')
        if (thumbnail && thumbnail.url) {
          return thumbnail.url
        }
        // 如果没有缩略图，使用 medium
        const medium = image.Assets.find(a => a.variant === 'medium')
        if (medium && medium.url) {
          return medium.url
        }
      }
      
      // 最后回退到 bestUrl 或原图
      const fallbackUrl = image.bestUrl || image.url || ''
      if (!fallbackUrl) {
        console.warn('⚠️ 图片没有可用的URL:', image.id, image)
      }
      return fallbackUrl
    },

    // ⭐ 图片加载完成
    onImageLoad(image, event) {
      if (image) {
        console.log('✅ 图片加载完成:', image.id)
        // 清除超时定时器
        if (image._loadTimeout) {
          clearTimeout(image._loadTimeout)
          image._loadTimeout = null
        }
        this.$set(image, 'imageLoaded', true)
      } else if (event && event.target) {
        // 如果没有传入 image 参数，尝试从 DOM 中查找
        const imageId = event.target.getAttribute('data-image-id')
        if (imageId) {
          const foundImage = this.images.find(img => String(img.id) === String(imageId))
          if (foundImage) {
            console.log('✅ 图片加载完成（通过DOM查找）:', imageId)
            // 清除超时定时器
            if (foundImage._loadTimeout) {
              clearTimeout(foundImage._loadTimeout)
              foundImage._loadTimeout = null
            }
            this.$set(foundImage, 'imageLoaded', true)
          }
        }
      }
    },

    // ⭐ 图片加载失败处理
    onImageError(event, image) {
      console.error('图片加载失败:', image?.id, this.getThumbnailUrl(image))
      
      // 尝试使用原图URL作为回退
      if (image && (image.bestUrl || image.url)) {
        const fallbackUrl = image.bestUrl || image.url
        if (event.target.src !== fallbackUrl) {
          event.target.src = fallbackUrl
          return // 不设置 imageLoaded，让占位符继续显示，等待回退URL加载
        }
      }
      
      // 如果所有URL都失败，标记为已加载（隐藏占位符，显示错误状态）
      if (image) {
        this.$set(image, 'imageLoaded', true)
        this.$set(image, 'imageError', true)
      }
    }
  }
}
</script>

<style scoped>
/* 主容器 - 定义CSS变量 */
.smart-search-modern {
  min-height: 100vh;
  background: #0a0a0a;
  /* CSS变量定义 */
  --primary-color: #e03426;
  --primary-light: #FF4757;
  --primary-dark: #C42331;
  --text-primary: rgba(255, 255, 255, 0.9);
  --text-secondary: rgba(255, 255, 255, 0.7);
  --text-tertiary: rgba(255, 255, 255, 0.5);
  --bg-primary: rgba(255, 255, 255, 0.03);
  --bg-secondary: rgba(255, 255, 255, 0.05);
  --bg-tertiary: rgba(255, 255, 255, 0.08);
  --border-color: rgba(255, 255, 255, 0.1);
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.5);
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Hero区域 */
.hero-section {
  padding: 90px 20px 20px;
  background: transparent;
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
  background: transparent;
  border-radius: 50%;
}

.hero-content {
  max-width: 900px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

/* 搜索容器 */
.search-container {
  margin-bottom: 16px;
}

/* 搜索框 */
.search-box {
  display: flex;
  align-items: center;
  background: var(--bg-primary);
  border: 2px solid var(--border-color);
  border-radius: 16px;
  padding: 8px 8px 8px 20px;
  transition: var(--transition);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.search-box:hover {
  border-color: rgba(255, 255, 255, 0.2);
}

.search-box:focus-within {
  border-color: var(--primary-color);
  box-shadow: 0 4px 16px rgba(224, 52, 38, 0.3);
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

/* 快捷搜索标签 - 移到翻译下方 */
.quick-search-tags {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
  padding: 12px 20px;
  background: transparent;
  border: none;
  animation: fadeInUp 0.4s ease;
}

.tags-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 600;
  white-space: nowrap;
}

.tags-icon {
  width: 18px;
  height: 18px;
  color: var(--primary-color);
}

/* 搜索提示 */
.search-hint {
  margin-top: 10px;
  font-size: 13px;
  color: #868e96;
  line-height: 1.5;
  display: flex;
  align-items: flex-start;
  gap: 4px;
}

.quick-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 20px;
  font-size: 13px;
  color: var(--text-primary);
  cursor: pointer;
  transition: var(--transition);
  font-weight: 500;
  position: relative;
  overflow: hidden;
}

.quick-tag::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-light));
  opacity: 0;
  transition: opacity 0.3s ease;
}

.quick-tag:hover {
  border-color: var(--primary-color);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(224, 52, 38, 0.3);
}

.quick-tag:hover::before {
  opacity: 1;
}

.quick-tag:hover {
  color: white !important;
  position: relative;
  z-index: 1;
}

.quick-tag:hover .tag-count {
  background: rgba(255, 255, 255, 0.25) !important;
  color: white !important;
  position: relative;
  z-index: 1;
}

.quick-tag:active {
  transform: translateY(-1px);
}

.tag-count {
  font-size: 11px;
  padding: 2px 6px;
  background: rgba(224, 52, 38, 0.2);
  border-radius: 10px;
  color: var(--primary-color);
  font-weight: 600;
  transition: var(--transition);
  position: relative;
  z-index: 1;
}

/* 搜索信息卡片 */
.search-info-card {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  padding: 12px 20px;
  background: transparent;
  border: none;
  margin-top: 12px;
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
  padding: 0 20px 60px;
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
  min-height: 450px;
  gap: 24px;
  background: transparent;
  border-radius: var(--radius-lg);
  padding: 60px 20px;
}

.loading-animation {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.loading-spinner-large {
  width: 64px;
  height: 64px;
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.loading-dots {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.loading-dots span {
  width: 8px;
  height: 8px;
  background: var(--primary-color);
  border-radius: 50%;
  animation: bounce-dot 1.4s infinite ease-in-out;
}

.loading-dots span:nth-child(1) {
  animation-delay: -0.32s;
}

.loading-dots span:nth-child(2) {
  animation-delay: -0.16s;
}

.loading-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.loading-text {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
}

.loading-steps {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
  padding: 20px 32px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  opacity: 0.3;
  transition: all 0.3s ease;
}

.step-item.active {
  opacity: 1;
}

.step-item.done {
  opacity: 0.6;
}

.step-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.step-item.active .step-icon {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-light) 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
}

.step-item.done .step-icon {
  background: #28a745;
  color: white;
}

.step-icon svg {
  width: 16px;
  height: 16px;
}

.step-text {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
}

.step-item.active .step-text {
  color: var(--primary-color);
  font-weight: 600;
}

.step-divider {
  width: 40px;
  height: 2px;
  background: rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

.step-divider.active {
  background: var(--primary-color);
}

/* 结果内容 */
.results-content {
  animation: fadeIn 0.4s ease;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
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

/* 图片网格 - 每行5张图 */
.image-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
  margin-bottom: 48px;
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
  border-radius: 12px;
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

/* ⭐ 图片占位符 */
.image-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, 
    rgba(255, 255, 255, 0.05) 0%, 
    rgba(255, 255, 255, 0.1) 50%, 
    rgba(255, 255, 255, 0.05) 100%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2; /* 确保在图片上方 */
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.placeholder-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.image-thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.3s ease;
  position: relative;
  z-index: 1;
  display: block; /* 确保图片显示 */
}

.image-thumbnail.image-loaded {
  opacity: 1;
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

/* 加载更多区域 */
.load-more-section {
  display: flex;
  justify-content: center;
  padding: 32px 0;
}

.loading-more,
.no-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: 14px;
  color: var(--text-secondary);
}

.load-more-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.load-more-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 32px;
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-light) 100%);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition);
  box-shadow: 0 4px 12px rgba(220, 53, 69, 0.2);
}

.load-more-button svg {
  width: 16px;
  height: 16px;
}

.load-more-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(220, 53, 69, 0.3);
}

.load-more-button:active {
  transform: translateY(0);
}

.auto-load-hint {
  font-size: 12px;
  color: var(--text-tertiary);
  margin: 0;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
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

/* 标题区域 */
.title-section {
  text-align: center;
  margin-bottom: 32px;
}

.page-title {
  font-size: 32px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 12px 0;
  letter-spacing: -0.02em;
}

.page-description {
  font-size: 15px;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
}

/* 欢迎状态 */
.welcome-state {
  padding: 40px 0 60px;
}

.welcome-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}

.welcome-card {
  padding: 28px 24px;
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
  width: 52px;
  height: 52px;
  margin: 0 auto 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(220, 53, 69, 0.15) 0%, rgba(220, 53, 69, 0.08) 100%);
  border-radius: 50%;
}

.card-icon svg {
  width: 26px;
  height: 26px;
  color: var(--primary-color);
}

.welcome-card h3 {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 10px 0;
}

.welcome-card p {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
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
  background: rgba(15, 15, 15, 0.98);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(20px);
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
  background: rgba(0, 0, 0, 0.4);
  padding: 40px;
}

.modal-image-section img {
  max-width: 100%;
  max-height: 80vh;
  object-fit: contain;
  border-radius: var(--radius-md);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.modal-info-section {
  flex: 1;
  padding: 40px;
  overflow-y: auto;
  background: rgba(20, 20, 20, 0.95);
}

.modal-header-info {
  margin-bottom: 28px;
  padding-bottom: 24px;
  border-bottom: 2px solid rgba(255, 255, 255, 0.15);
}

.modal-title {
  font-size: 32px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
  margin: 0 0 12px 0;
  line-height: 1.2;
  letter-spacing: -0.02em;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.modal-brand {
  font-size: 20px;
  color: var(--primary-light);
  margin: 0;
  font-weight: 600;
  display: inline-block;
  padding: 4px 0;
  text-shadow: 0 2px 4px rgba(224, 52, 38, 0.3);
}

/* 车型详情跳转按钮 */
.modal-action-buttons {
  margin: 24px 0;
}

.view-model-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 16px 24px;
  background: linear-gradient(135deg, var(--primary-color) 0%, #1976d2 100%);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(25, 118, 210, 0.2);
}

.view-model-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(25, 118, 210, 0.3);
  background: linear-gradient(135deg, #1565c0 0%, #0d47a1 100%);
}

.view-model-btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(25, 118, 210, 0.2);
}

.view-model-btn .btn-icon {
  width: 20px;
  height: 20px;
  stroke-width: 2;
}

.view-model-btn .arrow-icon {
  width: 16px;
  height: 16px;
  stroke-width: 2.5;
  transition: transform 0.3s ease;
}

.view-model-btn:hover .arrow-icon {
  transform: translateX(4px);
}

.info-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 28px;
}

.info-card {
  padding: 20px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.05) 100%);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  text-align: center;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.info-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(224, 52, 38, 0.2);
  border-color: var(--primary-color);
  background: linear-gradient(135deg, rgba(224, 52, 38, 0.15) 0%, rgba(224, 52, 38, 0.08) 100%);
}

.info-card-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 8px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-card-value {
  font-size: 20px;
  color: rgba(255, 255, 255, 0.95);
  font-weight: 700;
}

.modal-tags {
  padding: 20px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.tags-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.tags-icon {
  width: 18px;
  height: 18px;
  color: var(--primary-light);
}

.tags-title {
  font-size: 15px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-item {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 100px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.85);
  font-weight: 500;
  transition: all 0.3s ease;
}

.tag-item:hover {
  background: rgba(224, 52, 38, 0.2);
  border-color: var(--primary-color);
  color: rgba(255, 255, 255, 0.95);
  transform: translateY(-1px);
}

/* 动画 */
@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

@keyframes bounce-dot {
  0%, 80%, 100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  40% {
    transform: scale(1.2);
    opacity: 1;
  }
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
/* 中等屏幕：4列 */
@media (max-width: 1200px) and (min-width: 769px) {
  .image-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;
  }
}

/* 小屏幕：3列 */
@media (max-width: 1000px) and (min-width: 769px) {
  .image-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }
}

@media (max-width: 768px) {
  .title-section {
    margin-bottom: 24px;
  }

  .page-title {
    font-size: 26px;
  }

  .page-description {
    font-size: 14px;
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

  .search-hint {
    font-size: 12px;
  }

  .results-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .image-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 12px;
  }

  .modal-content {
    flex-direction: column;
  }

  .modal-image-section,
  .modal-info-section {
    padding: 20px;
  }

  .modal-title {
    font-size: 24px;
  }

  .modal-brand {
    font-size: 16px;
  }

  .view-model-btn {
    padding: 14px 20px;
    font-size: 15px;
  }

  .view-model-btn .btn-icon {
    width: 18px;
    height: 18px;
  }

  .view-model-btn .arrow-icon {
    width: 14px;
    height: 14px;
  }

  .info-cards {
    grid-template-columns: 1fr;
  }

  .info-card {
    padding: 16px;
  }

  .welcome-state {
    padding: 40px 0;
  }

  .welcome-grid {
    grid-template-columns: 1fr;
  }

  .load-more-button {
    width: 100%;
  }

  .loading-state {
    min-height: 350px;
    padding: 40px 20px;
  }

  .loading-steps {
    flex-direction: column;
    padding: 16px 20px;
    gap: 12px;
  }

  .step-divider {
    width: 2px;
    height: 20px;
  }
}
</style>

