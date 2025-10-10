<template>
  <div class="image-gallery">
    <!-- 统计信息栏 -->
    <div class="stats-bar">
      <div class="stats-item">
        <span class="stats-label">总图片数:</span>
        <span class="stats-value">{{ totalImages.toLocaleString() }}</span>
      </div>
      <div class="stats-item">
        <span class="stats-label">筛选结果:</span>
        <span class="stats-value">{{ filteredCount.toLocaleString() }}</span>
      </div>
      <div class="stats-item">
        <span class="stats-label">当前页:</span>
        <span class="stats-value">{{ images.length }} 张</span>
      </div>
    </div>

    <div class="gallery-container">
      <!-- 左侧筛选栏 - 优化宽度 -->
      <div class="filter-sidebar">
        <div class="filter-section">
          <h3>筛选条件</h3>
          
          <!-- 车型分类 -->
          <div class="filter-group">
            <label>车型分类</label>
            <select v-model="filters.modelType" @change="loadImages()">
              <option value="">全部类型</option>
              <option v-for="type in modelTypes" :key="type" :value="type">{{ type }}</option>
            </select>
          </div>

          <!-- 品牌筛选 -->
          <div class="filter-group">
            <label>品牌</label>
            <select v-model="filters.brandId" @change="loadImages()">
              <option value="">全部品牌</option>
              <option v-for="brand in brands" :key="brand.id" :value="brand.id">{{ brand.name }}</option>
            </select>
          </div>

          <!-- 视角筛选 -->
          <div class="filter-group">
            <label>视角</label>
            <div class="tag-buttons">
              <button 
                v-for="angle in angleTags" 
                :key="angle"
                :class="['tag-btn', { active: filters.angles === angle }]"
                @click="filters.angles = filters.angles === angle ? '' : angle; loadImages()"
              >
                {{ angle }}
              </button>
            </div>
          </div>

          <!-- 图片类型筛选 -->
          <div class="filter-group">
            <label>图片类型</label>
            <div class="tag-buttons">
              <button 
                v-for="type in imageTypeTags" 
                :key="type"
                :class="['tag-btn', { active: filters.types === type }]"
                @click="filters.types = filters.types === type ? '' : type; loadImages()"
              >
                {{ type }}
              </button>
            </div>
          </div>

          <!-- 外型风格筛选 -->
          <div class="filter-group">
            <label>外型风格</label>
            <select v-model="filters.exteriorStyles" @change="loadImages()">
              <option value="">全部外型风格</option>
              <option v-for="style in exteriorStyleTags" :key="style" :value="style">{{ style }}</option>
            </select>
          </div>

          <!-- 内饰风格筛选 -->
          <div class="filter-group">
            <label>内饰风格</label>
            <select v-model="filters.interiorStyles" @change="loadImages()">
              <option value="">全部内饰风格</option>
              <option v-for="style in interiorStyleTags" :key="style" :value="style">{{ style }}</option>
            </select>
          </div>

          <!-- 标签搜索 -->
          <div class="filter-group">
            <label>标签搜索</label>
            <input 
              type="text" 
              v-model="filters.tagSearch" 
              @input="debounceSearch"
              placeholder="输入标签关键词"
              class="tag-search-input"
            />
          </div>

          <!-- 热门标签 -->
          <div class="popular-tags">
            <div class="popular-tags-label">热门标签 ({{ popularTags.length }})</div>
            <div class="popular-tags-list">
              <span 
                v-for="tag in popularTags" 
                :key="tag.tag"
                class="popular-tag"
                @click="selectPopularTag(tag.tag)"
              >
                {{ tag.tag }} ({{ tag.count }})
              </span>
            </div>
            <div v-if="popularTagsLoading" class="popular-tags-loading">加载中...</div>
          </div>

          <!-- 筛选操作按钮 -->
          <div class="filter-actions">
            <button @click="clearFilters" class="btn-secondary">清除筛选</button>
            <button @click="loadImages()" class="btn-primary">应用筛选</button>
          </div>
        </div>
      </div>

      <!-- 右侧内容区域 - 优化布局 -->
      <div class="content-area">
        <!-- 初始加载状态 -->
        <div v-if="initialLoading" class="loading-container">
          <div class="loading-spinner">
            <div class="spinner"></div>
            <p>正在加载图片...</p>
            <div class="loading-subtitle">请稍候，正在为您准备精彩内容</div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-else-if="!loading && images.length === 0" class="empty-state">
          <div class="empty-icon">📷</div>
          <h3>暂无图片</h3>
          <p>当前筛选条件下没有找到图片，请尝试调整筛选条件</p>
          <button @click="clearFilters" class="btn-primary">清除筛选</button>
        </div>

        <!-- 优化后的图片网格 - 增加列数，减少空白 -->
        <div v-else class="image-grid-optimized">
          <div 
            v-for="image in images" 
            :key="image.id" 
            class="image-card-optimized"
            @click="openImageModal(image)"
          >
            <div class="image-container-optimized">
              <img 
                :src="image.displayUrl || image.url" 
                :alt="image.filename"
                @load="onImageLoad"
                @error="onImageError"
                loading="lazy"
              />
              <div class="image-overlay-optimized">
                <div class="model-name">{{ image.Model?.name || '未知车型' }}</div>
                <div class="model-type">{{ image.Model?.type || '未知类型' }}</div>
              </div>
            </div>
            
            <div class="image-details-optimized">
              <div class="filename">{{ image.filename }}</div>
              
              <!-- 标签显示 -->
              <div v-if="image.tags && image.tags.length > 0" class="tags-display">
                <span 
                  v-for="(tag, index) in image.tags.slice(0, 3)" 
                  :key="index" 
                  class="tag"
                >
                  {{ tag }}
                </span>
                <span v-if="image.tags.length > 3" class="more-tags">
                  +{{ image.tags.length - 3 }}
                </span>
              </div>
              
              <!-- 风格标签显示 -->
              <div v-if="image.Model?.styleTags && image.Model.styleTags.length > 0" class="style-tags-display">
                <span 
                  v-for="(tag, index) in image.Model.styleTags.slice(0, 2)" 
                  :key="index" 
                  class="style-tag"
                >
                  {{ tag }}
                </span>
                <span v-if="image.Model.styleTags.length > 2" class="more-style-tags">
                  +{{ image.Model.styleTags.length - 2 }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 加载更多指示器 -->
        <div v-if="loading" class="loading-indicator">
          <div class="spinner"></div>
          <span>加载更多图片...</span>
        </div>
      </div>
    </div>

    <!-- 图片详情模态框 -->
    <div v-if="showImageModal" class="image-modal-overlay" @click="closeImageModal">
      <div class="image-modal" @click.stop>
        <div class="modal-header">
          <h3>{{ selectedImage?.Model?.Brand?.name }} {{ selectedImage?.Model?.name }}</h3>
          <button @click="closeImageModal" class="close-btn">&times;</button>
        </div>
        
        <div class="modal-content">
          <div class="modal-image">
            <img :src="(selectedImage && (selectedImage.displayUrl || selectedImage.url)) || ''" :alt="selectedImage?.filename">
          </div>
          
          <div class="modal-info">
            <div class="info-item">
              <label>文件名:</label>
              <span>{{ selectedImage?.filename }}</span>
            </div>
            <div class="info-item">
              <label>车型:</label>
              <span>{{ selectedImage?.Model?.name }}</span>
            </div>
            <div class="info-item">
              <label>品牌:</label>
              <span>{{ selectedImage?.Model?.Brand?.name }}</span>
            </div>
            <div class="info-item">
              <label>类型:</label>
              <span>{{ selectedImage?.Model?.type }}</span>
            </div>
            
            <!-- 标签信息 -->
            <div class="info-item" v-if="selectedImage?.tags && selectedImage.tags.length > 0">
              <label>标签:</label>
              <div class="tags-list">
                <span v-for="tag in selectedImage.tags" :key="tag" class="tag">
                  {{ tag }}
                </span>
              </div>
            </div>
            
            <!-- 风格标签信息 -->
            <div class="info-item" v-if="selectedImage?.Model?.styleTags && selectedImage.Model.styleTags.length > 0">
              <label>风格标签:</label>
              <div class="style-tags-list">
                <span v-for="tag in selectedImage.Model.styleTags" :key="tag" class="style-tag">
                  {{ tag }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { apiClient } from '@/services/api'

export default {
  name: 'ImageGalleryOptimized',
  data() {
    return {
      // 图片数据
      images: [],
      totalImages: 0,
      filteredCount: 0,
      page: 1,
      limit: 20,
      hasMore: true,
      loading: false,
      initialLoading: true,
      
      // 筛选条件
      filters: {
        modelType: '',
        brandId: '',
        angles: '',
        types: '',
        tagSearch: '',
        exteriorStyles: '',
        interiorStyles: ''
      },
      
      // 预设标签
      angleTags: ['正前', '正侧', '正后', '前45', '后45', '俯侧', '顶视'],
      imageTypeTags: ['外型', '内饰', '零部件', '其他'],
      
      // 外型风格标签
      exteriorStyleTags: [],
      
      // 内饰风格标签
      interiorStyleTags: [],
      
      // 热门标签
      popularTags: [],
      popularTagsLoading: false,
      
      // 模态框
      showImageModal: false,
      selectedImage: null,
      
      // 防抖
      searchTimeout: null
    }
  },
  
  async mounted() {
    try {
      // 优化：先加载图片列表，再并行加载筛选选项
      await this.loadImages()
      
      // 初始加载完成，显示图片
      this.initialLoading = false
      
      // 并行加载筛选选项（不阻塞图片显示）
      const initPromises = [
        this.loadBrands(),
        this.loadStyleTags(),
        this.loadPopularTags()
      ]

      // 异步执行，不等待完成
      Promise.all(initPromises).catch(error => {
        console.warn('筛选选项加载失败:', error)
      })

    } catch (error) {
      console.error('初始化加载失败:', error)
      this.initialLoading = false
    }

    // 添加滚动监听
    window.addEventListener('scroll', this.handleScroll)
  },
  
  beforeDestroy() {
    window.removeEventListener('scroll', this.handleScroll)
  },
  
  methods: {
    async loadBrands() {
      try {
        const response = await apiClient.get('/brands')
        this.brands = response.data || []
      } catch (error) {
        console.error('加载品牌失败:', error)
      }
    },
    
    async loadStyleTags() {
      try {
        const response = await apiClient.get('/image-tags/style-tag-options')
        if (response.data) {
          this.exteriorStyleTags = response.data.exteriorStyles || []
          this.interiorStyleTags = response.data.interiorStyles || []
        }
      } catch (error) {
        console.error('加载风格标签失败:', error)
      }
    },
    
    async loadPopularTags() {
      try {
        this.popularTagsLoading = true
        const response = await apiClient.get('/image-gallery/popular-tags', {
          params: { limit: 15 }
        })
        this.popularTags = response.data || []
        console.log('设置的热门标签:', this.popularTags)
      } catch (error) {
        console.error('加载热门标签失败:', error)
      } finally {
        this.popularTagsLoading = false
      }
    },
    
    async loadImages(reset = true) {
      if (this.loading) return
      
      if (reset) {
        this.images = []
        this.page = 1
        this.hasMore = true
      }
      
      this.loading = true
      
      try {
        // 将单个值转换为数组传递给后端
        const angles = this.filters.angles ? [this.filters.angles] : []
        const types = this.filters.types ? [this.filters.types] : []
        const styleTags = []
        
        if (this.filters.exteriorStyles) {
          styleTags.push(this.filters.exteriorStyles)
        }
        if (this.filters.interiorStyles) {
          styleTags.push(this.filters.interiorStyles)
        }
        
        const params = {
          page: this.page,
          limit: this.limit,
          modelType: this.filters.modelType,
          brandId: this.filters.brandId,
          angles: angles,
          types: types,
          tagSearch: this.filters.tagSearch,
          styleTags: styleTags
        }
        
        const response = await apiClient.get('/image-gallery/images', { params })

        const batch = (response && response.data && response.data.images) ? response.data.images : []
        
        // 后端已经提供了displayUrl，无需额外处理
        if (reset) {
          this.images = batch
          this.totalImages = response.data.pagination.total
          this.filteredCount = response.data.pagination.filteredCount
        } else {
          this.images.push(...batch)
        }

        this.hasMore = batch.length === this.limit
        this.page++
        
      } catch (error) {
        console.error('加载图片失败:', error)
        this.$message.error('加载图片失败')
      } finally {
        this.loading = false
      }
    },
    
    handleScroll() {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight
      
      // 当滚动到底部时加载更多
      if (scrollTop + windowHeight >= documentHeight - 100 && this.hasMore && !this.loading) {
        this.loadImages(false)
      }
    },
    
    clearFilters() {
      this.filters = {
        modelType: '',
        brandId: '',
        angles: '',
        types: '',
        tagSearch: '',
        exteriorStyles: '',
        interiorStyles: ''
      }
      this.loadImages()
    },
    
    debounceSearch() {
      clearTimeout(this.searchTimeout)
      this.searchTimeout = setTimeout(() => {
        this.loadImages()
      }, 500)
    },
    
    selectPopularTag(tag) {
      this.filters.tagSearch = tag
      this.loadImages()
    },
    
    openImageModal(image) {
      this.selectedImage = image
      this.showImageModal = true
    },
    
    closeImageModal() {
      this.showImageModal = false
      this.selectedImage = null
    },
    
    onImageLoad() {
      // 图片加载完成
    },
    
    onImageError(event) {
      // 图片加载失败，可以设置默认图片
      event.target.src = '/default-avatar.svg'
    }
  }
}
</script>

<style scoped>
.image-gallery {
  padding: 20px;
  max-width: 1800px; /* 增加最大宽度 */
  margin: 0 auto;
}

.gallery-container {
  display: flex;
  gap: 20px;
  min-height: calc(100vh - 100px);
}

/* 优化左侧边栏宽度 */
.filter-sidebar {
  width: 280px; /* 从300px减少到280px */
  flex-shrink: 0;
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  height: fit-content;
  position: sticky;
  top: 20px;
}

.content-area {
  flex: 1;
  min-width: 0;
}

/* 优化后的图片网格 - 增加列数，减少空白 */
.image-grid-optimized {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); /* 从250px减少到220px，增加列数 */
  gap: 16px; /* 从20px减少到16px，减少间距 */
  margin-bottom: 40px;
}

/* 优化后的图片卡片 */
.image-card-optimized {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.image-card-optimized:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(220, 53, 69, 0.15);
}

/* 优化后的图片容器 */
.image-container-optimized {
  position: relative;
  height: 180px; /* 从200px减少到180px，让卡片更紧凑 */
  overflow: hidden;
}

.image-container-optimized img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
}

.image-card-optimized:hover .image-container-optimized img {
  transform: scale(1.05);
}

/* 优化后的图片覆盖层 */
.image-overlay-optimized {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0,0,0,0.7));
  padding: 12px; /* 从15px减少到12px */
  color: white;
}

.model-name {
  font-weight: bold;
  font-size: 13px; /* 从14px减少到13px */
  margin-bottom: 3px; /* 从4px减少到3px */
}

.model-type {
  font-size: 11px; /* 从12px减少到11px */
  opacity: 0.9;
}

/* 优化后的图片详情 */
.image-details-optimized {
  padding: 12px; /* 从15px减少到12px */
}

.filename {
  font-size: 11px; /* 从12px减少到11px */
  color: #666;
  margin-bottom: 6px; /* 从8px减少到6px */
  word-break: break-all;
}

.tags-display, .style-tags-display {
  display: flex;
  flex-wrap: wrap;
  gap: 3px; /* 从4px减少到3px */
  margin-bottom: 6px; /* 从8px减少到6px */
}

.tag, .style-tag {
  padding: 2px 5px; /* 从2px 6px减少到2px 5px */
  border-radius: 3px;
  font-size: 10px; /* 从11px减少到10px */
  background: #f0f0f0;
  color: #555;
}

.style-tag {
  background: #f8d7da;
  color: #721c24;
}

.more-tags, .more-style-tags {
  font-size: 10px; /* 从11px减少到10px */
  color: #999;
  padding: 2px 5px; /* 从2px 6px减少到2px 5px */
}

/* 统计信息栏 */
.stats-bar {
  display: flex;
  gap: 30px;
  margin-bottom: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 6px;
}

.stats-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stats-label {
  font-weight: 500;
  color: #555;
}

.stats-value {
  font-weight: bold;
  color: #dc3545;
}

/* 筛选相关样式保持不变 */
.filter-section h3 {
  margin: 0 0 20px 0;
  color: #333;
  font-size: 18px;
}

.filter-group {
  margin-bottom: 15px;
}

.filter-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #555;
}

.filter-group select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  transition: border-color 0.2s;
}

.filter-group select:focus {
  outline: none;
  border-color: #dc3545;
  box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.25);
}

.tag-buttons, .style-tag-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-btn, .style-tag-btn {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

.tag-btn:hover, .style-tag-btn:hover {
  background: #f0f0f0;
}

.tag-btn.active, .style-tag-btn.active {
  background: #dc3545;
  color: white;
  border-color: #dc3545;
}

.tag-search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.tag-search-input:focus {
  outline: none;
  border-color: #dc3545;
  box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.25);
}

.popular-tags {
  margin-top: 10px;
}

.popular-tags-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
  font-weight: 500;
}

.popular-tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.popular-tag {
  padding: 4px 8px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 12px;
  font-size: 12px;
  color: #495057;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}

.popular-tag:hover {
  background: #dc3545;
  color: white;
  border-color: #dc3545;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(220, 53, 69, 0.2);
}

.popular-tags-loading {
  font-size: 12px;
  color: #999;
  font-style: italic;
}

.filter-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.btn-primary, .btn-secondary {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-primary {
  background: #dc3545;
  color: white;
  transition: background-color 0.2s;
}

.btn-primary:hover {
  background: #c82333;
}

.btn-secondary {
  background: #6c757d;
  color: white;
  transition: background-color 0.2s;
}

.btn-secondary:hover {
  background: #5a6268;
}

/* 加载状态样式 */
.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  background: #f8f9fa;
  border-radius: 12px;
  margin: 20px 0;
}

.loading-spinner {
  text-align: center;
  color: #666;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-spinner p {
  margin: 10px 0;
  font-size: 16px;
  font-weight: 500;
}

.loading-subtitle {
  font-size: 14px;
  color: #888;
  margin-top: 5px;
}

/* 空状态样式 */
.empty-state {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  background: #f8f9fa;
  border-radius: 12px;
  margin: 20px 0;
  text-align: center;
  padding: 40px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
  opacity: 0.6;
}

.empty-state h3 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 24px;
}

.empty-state p {
  margin: 0 0 20px 0;
  color: #666;
  font-size: 16px;
  max-width: 400px;
}

.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 40px;
  color: #666;
}

/* 模态框样式保持不变 */
.image-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.image-modal {
  background: white;
  border-radius: 8px;
  max-width: 90vw;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.modal-header h3 {
  margin: 0;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
}

.modal-content {
  display: flex;
  max-height: calc(90vh - 80px);
}

.modal-image {
  flex: 1;
  max-width: 60%;
  padding: 20px;
}

.modal-image img {
  width: 100%;
  height: auto;
  max-height: calc(90vh - 120px);
  object-fit: contain;
}

.modal-info {
  flex: 1;
  max-width: 40%;
  padding: 20px;
  overflow-y: auto;
}

.info-item {
  margin-bottom: 15px;
}

.info-item label {
  display: block;
  font-weight: 500;
  color: #555;
  margin-bottom: 5px;
}

.tags-list, .style-tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* 响应式设计 */
@media (max-width: 1400px) {
  .image-grid-optimized {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }
}

@media (max-width: 1200px) {
  .image-grid-optimized {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  }
  
  .filter-sidebar {
    width: 260px;
  }
}

@media (max-width: 1024px) {
  .gallery-container {
    flex-direction: column;
  }
  
  .filter-sidebar {
    width: 100%;
    position: static;
    margin-bottom: 20px;
  }
  
  .content-area {
    width: 100%;
  }
  
  .image-grid-optimized {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }
}

@media (max-width: 768px) {
  .image-gallery {
    padding: 10px;
  }
  
  .gallery-container {
    gap: 15px;
  }
  
  .filter-sidebar {
    padding: 15px;
  }
  
  .image-grid-optimized {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 12px;
  }
  
  .image-container-optimized {
    height: 150px;
  }
  
  .tag-buttons, .style-tag-buttons {
    gap: 6px;
  }
  
  .tag-btn, .style-tag-btn {
    padding: 4px 8px;
    font-size: 12px;
  }
  
  .modal-content {
    flex-direction: column;
  }
  
  .modal-image, .modal-info {
    max-width: 100%;
  }
}
</style>
