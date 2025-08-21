<template>
  <div class="inspiration-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="container">
        <div class="header-content">
          <div class="header-left">
            <h1 class="page-title">灵感图片</h1>
            <p class="page-subtitle">精选汽车设计灵感图集，激发你的创意灵感</p>
          </div>
          <div class="header-right">
            <div class="stats">
              <!-- <span class="stat-item">
                <i class="el-icon-picture"></i>
                {{ totalImages }} 张图片
              </span>
              <span class="stat-item">
                <i class="el-icon-collection-tag"></i>
                {{ totalTags }} 个标签
              </span> -->
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 搜索和筛选区域 -->
    <div class="filters-section">
      <div class="container">
        <!-- 搜索框 -->
        <div class="search-section">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索图片标签、描述..."
            @keyup.enter.native="searchImages"
            class="search-input"
            clearable
          >
            <el-button slot="append" icon="el-icon-search" @click="searchImages"></el-button>
          </el-input>
        </div>

        <!-- 标签筛选 -->
        <div class="filter-bar">
          <div class="filter-group">
            <span class="filter-label">热门标签：</span>
            <div class="tag-filters">
              <el-tag
                v-for="(tag, tagIndex) in popularTags"
                :key="`popular-${tagIndex}`"
                :class="{ active: selectedTags.includes(tag) }"
                @click="toggleTag(tag)"
                class="filter-tag"
                size="small"
              >
                {{ tag }}
              </el-tag>
            </div>
          </div>
          
          <div class="filter-actions">
            <el-button 
              size="small" 
              @click="clearFilters"
              :disabled="!hasActiveFilters"
            >
              清除筛选
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 图片瀑布流 -->
    <div class="masonry-container">
      <div class="container">
        <div class="masonry-grid" ref="masonryGrid">
          <div
            v-for="(image, index) in filteredImages"
            :key="`${image.filename}-${index}`"
            class="masonry-item"
            @click="openImageModal(image)"
          >
            <div class="image-card">
              <div class="image-wrapper">
                <img 
                  :src="image.main_img_url" 
                  :alt="image.filename"
                  @load="onImageLoad"
                  @error="onImageError"
                  class="inspiration-image"
                />
                <div class="image-overlay">
                  <div class="overlay-content">
                    <div class="image-actions">
                      <el-button 
                        type="primary"
                        size="medium"
                        icon="el-icon-view"
                        @click.stop="openImageModal(image)"
                        class="action-btn view-btn"
                        circle
                      >
                      </el-button>
                      <el-button 
                        :type="isFavorite(image) ? 'warning' : 'default'"
                        size="medium"
                        :icon="isFavorite(image) ? 'el-icon-star-on' : 'el-icon-star-off'"
                        @click.stop="toggleFavorite(image)"
                        class="action-btn favorite-btn"
                        circle
                      >
                      </el-button>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="image-info">
                <div class="image-tags">
                  <el-tag
                    v-for="(tag, tagIndex) in image.tags.slice(0, 5)"
                    :key="`${image.filename}-tag-${tagIndex}`"
                    size="mini"
                    class="image-tag clickable-tag"
                    @click.stop="handleTagClick(tag)"
                  >
                    {{ tag }}
                  </el-tag>
                  <span v-if="image.tags.length > 5" class="more-tags">
                    +{{ image.tags.length - 5 }}
                  </span>
                </div>
                
                <div class="image-meta">
                  <span class="likes-count">
                    <i class="el-icon-star-on"></i>
                    {{ formatNumber(image.likes) }}
                  </span>
                  <span class="source-info" v-if="image.source_link">
                    <i class="el-icon-link"></i>
                    来源
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 滚动加载提示 -->
        <div class="scroll-load-section" v-if="hasMore && !loading && !scrollLoading">
          <div class="scroll-load-text">
            <i class="el-icon-arrow-down"></i>
            滚动到底部自动加载更多
          </div>
        </div>

        <!-- 加载状态 -->
        <div class="loading-state" v-if="loading || scrollLoading">
          <div class="loading-spinner">
            <i class="el-icon-loading"></i>
            <p>{{ loading ? '正在加载灵感图片...' : '正在加载更多...' }}</p>
          </div>
        </div>



        <!-- 无结果提示 -->
        <div class="no-results" v-if="filteredImages.length === 0 && !loading">
          <i class="el-icon-picture-outline"></i>
          <p>没有找到相关图片</p>
          <el-button @click="clearFilters">清除筛选条件</el-button>
        </div>
      </div>
    </div>


    <!-- 新的图片模态框 -->
    <InspirationImageModal 
      :visible="imageModalVisible"
      :image="currentImage"
      @close="closeImageModal"
      @tag-click="handleTagClick"
    />
  </div>
</template>

<script>
import { apiClient } from '@/services/api'
import InspirationImageModal from '@/components/InspirationImageModal.vue'

export default {
  name: 'Inspiration',
  components: {
    InspirationImageModal
  },
  data() {
    return {
      images: [],
      filteredImages: [],
      searchKeyword: '',
      selectedTags: [],
      popularTags: [],
      loading: false,
      hasMore: true,
      currentPage: 1,
      pageSize: 20,
      totalImages: 0,
      totalTags: 0,
      favorites: JSON.parse(localStorage.getItem('inspiration_favorites') || '[]'),
      imageModalVisible: false,
      currentImage: null,
      masonryInitialized: false,
      scrollLoading: false
    }
  },
  
  computed: {
    hasActiveFilters() {
      return this.searchKeyword.trim() || this.selectedTags.length > 0
    }
  },
  
  mounted() {
    this.loadImages()
    this.loadImageStats()
    this.loadPopularTags()
    
    // 监听窗口大小变化，重新计算瀑布流布局
    window.addEventListener('resize', this.handleResize)
    
    // 初始化滚动监听
    this.initScrollListener()
  },
  
      beforeDestroy() {
      window.removeEventListener('resize', this.handleResize)
      window.removeEventListener('scroll', this.handleScroll)
    },
  
      methods: {
      initScrollListener() {
        // 添加滚动监听
        window.addEventListener('scroll', this.handleScroll)
      },
      
      handleScroll() {
        // 检查是否滚动到底部
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop
        const windowHeight = window.innerHeight
        const documentHeight = document.documentElement.scrollHeight
        
        // 当距离底部150px时触发加载，给更多缓冲空间
        if (scrollTop + windowHeight >= documentHeight - 150) {
          this.autoLoadMore()
        }
      },
      
      async autoLoadMore() {
        // 防止重复加载
        if (this.loading || !this.hasMore || this.scrollLoading) {
          return
        }
        
        this.scrollLoading = true
        console.log('触发自动加载更多')
        
        try {
          await this.loadMore()
        } finally {
          // 延迟重置状态，防止频繁触发
          setTimeout(() => {
            this.scrollLoading = false
          }, 1000)
        }
      },
      
      restoreScrollPosition(targetScrollTop) {
        // 使用 requestAnimationFrame 确保在下一帧恢复滚动位置
        requestAnimationFrame(() => {
          // 检查目标滚动位置是否超出页面高度
          const documentHeight = document.documentElement.scrollHeight
          const windowHeight = window.innerHeight
          const maxScrollTop = documentHeight - windowHeight
          
          // 确保滚动位置在有效范围内
          const safeScrollTop = Math.min(targetScrollTop, maxScrollTop)
          
          window.scrollTo({
            top: safeScrollTop,
            behavior: 'instant' // 使用 instant 避免动画效果
          })
        })
      },
      
      async loadImages() {
      try {
        this.loading = true
        
        // 重置页码和数据
        this.currentPage = 1
        this.images = []
        
        // 调用真实API
        const response = await this.fetchInspirationData()
        
        console.log('loadImages - API响应:', response)
        
        if (response && response.images) {
          // 确保没有重复数据
          const uniqueImages = this.removeDuplicates(response.images)
          this.images = uniqueImages
          console.log('设置图片数据:', this.images.length, '张图片')
          this.applyFilters()
        } else {
          console.error('API响应格式错误:', response)
        }
      } catch (error) {
        console.error('加载图片失败:', error)
        this.$message.error('加载图片失败，请重试')
      } finally {
        this.loading = false
      }
    },
    
    async fetchInspirationData() {
      try {
        // 调用后端API
        const response = await apiClient.get('/inspiration/images', {
          params: {
            page: this.currentPage,
            limit: this.pageSize
          }
        })
        
        console.log('fetchInspirationData - 原始响应:', response)
        
        if (response.status === 'success') {
          console.log('fetchInspirationData - 返回数据:', response.data)
          return response.data
        } else {
          console.error('API响应状态错误:', response)
          return null
        }
      } catch (error) {
        console.error('API调用失败:', error)
        this.$message.error('加载数据失败，请稍后重试')
        return null
      }
    },
    
    async loadPopularTags() {
      try {
        const response = await apiClient.get('/inspiration/tags/popular', {
          params: { limit: 20 }
        })
        console.log('loadPopularTags - 响应:', response)
        
        if (response.status === 'success') {
          this.popularTags = response.data.tags || []
          console.log('设置热门标签:', this.popularTags.length, '个标签')
        }
      } catch (error) {
        console.error('加载热门标签失败:', error)
        this.popularTags = []
      }
    },
    
    async loadImageStats() {
      // 加载图片统计信息
      try {
        const response = await apiClient.get('/inspiration/stats')
        console.log('loadImageStats - 响应:', response)
        
        if (response.status === 'success') {
          const stats = response.data
          this.totalImages = stats.total_images || 0
          this.totalTags = stats.total_unique_tags || 0
          console.log('设置统计信息:', this.totalImages, '张图片,', this.totalTags, '个标签')
        }
      } catch (error) {
        console.error('加载统计信息失败:', error)
        this.totalImages = 0
        this.totalTags = 0
      }
    },
    
    searchImages() {
      this.currentPage = 1
      this.applyFilters()
    },
    
    toggleTag(tag) {
      const index = this.selectedTags.indexOf(tag)
      if (index > -1) {
        this.selectedTags.splice(index, 1)
      } else {
        this.selectedTags.push(tag)
      }
      this.applyFilters()
    },
    

    
    clearFilters() {
      this.searchKeyword = ''
      this.selectedTags = []
      this.applyFilters()
    },
    
    applyFilters() {
      let filtered = [...this.images]
      
      // 搜索过滤
      if (this.searchKeyword.trim()) {
        const keyword = this.searchKeyword.toLowerCase()
        filtered = filtered.filter(image => 
          (image.tags && image.tags.some(tag => tag.toLowerCase().includes(keyword))) ||
          image.filename.toLowerCase().includes(keyword)
        )
      }
      
      // 标签过滤
      if (this.selectedTags.length > 0) {
        filtered = filtered.filter(image =>
          image.tags && this.selectedTags.some(selectedTag =>
            image.tags.some(tag => tag.toLowerCase() === selectedTag.toLowerCase())
          )
        )
      }
      
      this.filteredImages = filtered
    },
    
    async loadMore() {
      if (this.loading || !this.hasMore) {
        return
      }
      
      // 记录当前滚动位置和最后一个图片元素的位置
      const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop
      const lastImageElement = this.$refs.masonryGrid?.lastElementChild
      const lastImageOffsetTop = lastImageElement ? lastImageElement.offsetTop : 0
      
      this.currentPage++
      this.loading = true
      try {
        const response = await apiClient.get('/inspiration/images', {
          params: {
            page: this.currentPage,
            limit: this.pageSize
          }
        })
        
        console.log('loadMore - 响应:', response)
        
        if (response.status === 'success') {
          const newImages = response.data.images || []
          
          // 去重处理：基于filename去重
          const existingFilenames = new Set(this.images.map(img => img.filename))
          const uniqueNewImages = newImages.filter(img => !existingFilenames.has(img.filename))
          
          this.images = [...this.images, ...uniqueNewImages]
          this.applyFilters()
          
          // 检查是否还有更多数据
          const pagination = response.data.pagination
          this.hasMore = pagination && this.currentPage < pagination.pages
          
          console.log('加载更多完成:', newImages.length, '张图片, 还有更多:', this.hasMore)
          
          // 等待DOM更新后恢复滚动位置
          this.$nextTick(() => {
            // 重新初始化瀑布流布局
            this.initMasonry()
            
            // 延迟恢复滚动位置，确保布局完成
            setTimeout(() => {
              // 计算新的滚动位置，考虑新内容的添加
              const newLastImageElement = this.$refs.masonryGrid?.lastElementChild
              const newLastImageOffsetTop = newLastImageElement ? newLastImageElement.offsetTop : lastImageOffsetTop
              
              // 如果新内容导致布局变化，调整滚动位置
              const scrollOffset = newLastImageOffsetTop > lastImageOffsetTop ? 0 : currentScrollTop
              this.restoreScrollPosition(Math.max(currentScrollTop, scrollOffset))
            }, 100)
          })
        }
      } catch (error) {
        console.error('加载更多失败:', error)
        this.$message.error('加载更多失败，请重试')
        // 回退页码
        this.currentPage--
      } finally {
        this.loading = false
      }
    },
    
    openImageModal(image) {
      this.currentImage = image
      this.imageModalVisible = true
    },
    
    closeImageModal() {
      this.imageModalVisible = false
      this.currentImage = null
    },
    
    handleTagClick(tag) {
      if (!this.selectedTags.includes(tag)) {
        this.selectedTags.push(tag)
        this.applyFilters()
      }
    },
    
    async toggleFavorite(image) {
      try {
        // 调用后端API进行收藏操作
        const response = await apiClient.post('/inspiration/favorite', {
          imageId: image.id,
          imageUrl: image.main_img_url,
          filename: image.filename,
          tags: image.tags,
          likes: image.likes,
          source_link: image.source_link,
          timestamp: image.timestamp
        })
        
        if (response.status === 'success') {
          const isFavorited = response.data.favorited
          
          // 更新本地状态
          const index = this.favorites.findIndex(fav => fav.filename === image.filename)
          if (isFavorited && index === -1) {
            this.favorites.push(image)
            this.$message.success('已添加到收藏')
          } else if (!isFavorited && index > -1) {
            this.favorites.splice(index, 1)
            this.$message.success('已取消收藏')
          }
          
          // 同步更新localStorage（保持兼容性）
          localStorage.setItem('inspiration_favorites', JSON.stringify(this.favorites))
        }
      } catch (error) {
        console.error('收藏操作失败:', error)
        // 如果后端失败，降级到localStorage
        const index = this.favorites.findIndex(fav => fav.filename === image.filename)
        if (index > -1) {
          this.favorites.splice(index, 1)
          this.$message.success('已取消收藏')
        } else {
          this.favorites.push(image)
          this.$message.success('已添加到收藏')
        }
        localStorage.setItem('inspiration_favorites', JSON.stringify(this.favorites))
      }
    },
    
    isFavorite(image) {
      return this.favorites.some(fav => fav.filename === image.filename)
    },
    
    downloadImage(image) {
      const link = document.createElement('a')
      link.href = image.main_img_url
      link.download = image.filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      this.$message.success('开始下载图片')
    },
    
    onImageLoad(event) {
      // 图片加载完成后重新计算瀑布流布局
      this.$nextTick(() => {
        this.initMasonry()
      })
    },
    
    onImageError(event) {
      // 图片加载失败时显示占位图
      event.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjVmNWY1Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIExvYWQgRXJyb3I8L3RleHQ+PC9zdmc+'
    },
    
    initMasonry() {
      // 使用CSS Column布局实现瀑布流效果
      const grid = this.$refs.masonryGrid
      if (!grid) return
      
      // 设置响应式列数
      const screenWidth = window.innerWidth
      let columns = 4
      if (screenWidth <= 480) columns = 1
      else if (screenWidth <= 768) columns = 2
      else if (screenWidth <= 1200) columns = 3
      
      grid.style.columnCount = columns.toString()
      grid.style.columnGap = '16px'
      grid.style.columnFill = 'balance'
      
      this.masonryInitialized = true
    },
    

    
    formatNumber(num) {
      if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'k'
      }
      return num.toString()
    },
    
    formatDate(timestamp) {
      return new Date(timestamp * 1000).toLocaleDateString('zh-CN')
    },
    
    handleResize() {
      // 防抖处理窗口大小变化
      clearTimeout(this.resizeTimer)
      this.resizeTimer = setTimeout(() => {
        if (this.masonryInitialized) {
          this.initMasonry()
        }
      }, 300)
    },
    
    // 去重方法：基于filename去重
    removeDuplicates(images) {
      const seen = new Set()
      return images.filter(image => {
        if (seen.has(image.filename)) {
          return false
        }
        seen.add(image.filename)
        return true
      })
    }
  },
  
  watch: {
    filteredImages() {
      this.$nextTick(() => {
        this.initMasonry()
      })
    }
  }
}
</script>

<style scoped>
.inspiration-page {
  min-height: 100vh;
  background: #fafafa;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

/* 页面头部 */
.page-header {
  background: #000000;
  color: white;
  padding: 40px 0;
  margin-bottom: 30px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-title {
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 8px 0;
  color: white;
}

.page-subtitle {
  font-size: 16px;
  margin: 0;
  opacity: 0.9;
  color: rgba(255, 255, 255, 0.9);
}

.stats {
  display: flex;
  gap: 20px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  opacity: 0.9;
}

.stat-item i {
  font-size: 16px;
}

/* 搜索和筛选区域 */
.filters-section {
  background: white;
  padding: 20px 0;
  margin-bottom: 30px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.search-section {
  margin-bottom: 20px;
}

.search-input {
  max-width: 500px;
}

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

.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-label {
  font-weight: 600;
  color: #2c3e50;
  white-space: nowrap;
}

.tag-filters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-tag {
  cursor: pointer;
  transition: all 0.3s ease;
  background: #f5f5f5;
  color: #666666;
  border: 1px solid #e0e0e0;
  border-radius: 16px;
  padding: 4px 12px;
  font-size: 12px;
  margin: 2px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  height: 24px;
}

.filter-tag:hover {
  background: #e8e8e8;
  color: #333333;
  border-color: #d0d0d0;
}

.filter-tag.active {
  background: #e03426;
  color: white;
  border-color: #e03426;
}

.filter-actions {
  display: flex;
  gap: 12px;
}

/* 瀑布流容器 */
.masonry-container {
  padding: 0 0 40px 0;
}

.masonry-grid {
  position: relative;
  margin: 0 auto;
  max-width: 1200px;
  min-height: 200px;
  column-gap: 16px;
  column-fill: balance;
}

.masonry-item {
  transition: all 0.3s ease;
  opacity: 0;
  animation: fadeInUp 0.6s ease forwards;
  break-inside: avoid;
  margin-bottom: 16px;
  display: inline-block;
  width: 100%;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.masonry-item:hover {
  transform: translateY(-4px);
}

.image-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.image-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.image-wrapper {
  position: relative;
  overflow: hidden;
}

.inspiration-image {
  width: 100%;
  height: auto;
  display: block;
  transition: transform 0.3s ease;
}

.image-card:hover .inspiration-image {
  transform: scale(1.05);
}

.image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.6) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.3s ease;
  backdrop-filter: blur(2px);
}

.image-card:hover .image-overlay {
  opacity: 1;
}

.overlay-content {
  text-align: center;
  transform: translateY(20px);
  transition: transform 0.3s ease;
}

.image-card:hover .overlay-content {
  transform: translateY(0);
}

.image-actions {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: center;
}

.action-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn:hover {
  transform: translateY(-3px) scale(1.05);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);
}

.action-btn i {
  font-size: 18px;
}

.view-btn {
  background: linear-gradient(135deg, #e03426 0%, #c41e3a 100%);
  border-color: rgba(224, 52, 38, 0.3);
  color: white;
}

.view-btn:hover {
  background: linear-gradient(135deg, #c41e3a 0%, #a01830 100%);
  color: white;
  border-color: rgba(224, 52, 38, 0.5);
}

.favorite-btn {
  background: linear-gradient(135deg, #e03426 0%, #c41e3a 100%);
  border-color: rgba(224, 52, 38, 0.3);
  color: white;
}

.favorite-btn:hover {
  background: linear-gradient(135deg, #c41e3a 0%, #a01830 100%);
  color: white;
  border-color: rgba(224, 52, 38, 0.5);
}

.favorite-btn.el-button--warning {
  background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
  border-color: rgba(243, 156, 18, 0.3);
  color: white;
}

.favorite-btn.el-button--warning:hover {
  background: linear-gradient(135deg, #e67e22 0%, #d35400 100%);
  color: white;
  border-color: rgba(243, 156, 18, 0.5);
}

.image-info {
  padding: 16px;
}

.image-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.image-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 12px;
  background: #f8f9fa;
  color: #666;
  border: 1px solid #e4e7ed;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  height: 20px;
}

.image-tag.clickable-tag {
  cursor: pointer;
  transition: all 0.3s ease;
}

.image-tag.clickable-tag:hover {
  background: #e03426;
  color: white;
  border-color: #e03426;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(224, 52, 38, 0.3);
}

.more-tags {
  font-size: 11px;
  color: #999;
  align-self: center;
}

.image-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #999;
}

.likes-count {
  display: flex;
  align-items: center;
  gap: 4px;
}

.likes-count i {
  color: #f39c12;
}

.source-info {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}

.source-info:hover {
  color: #e03426;
}

/* 滚动加载提示 */
.scroll-load-section {
  text-align: center;
  padding: 30px 0;
  opacity: 0.8;
}

.scroll-load-text {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  font-weight: 400;
}

.scroll-load-text i {
  font-size: 16px;
  animation: bounce 2s infinite;
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-5px);
  }
  60% {
    transform: translateY(-3px);
  }
}

.loading-container {
  text-align: center;
  padding: 20px 0;
}

.loading-text {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
}

.loading-text i {
  font-size: 16px;
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 加载状态 */
.loading-state {
  text-align: center;
  padding: 60px 20px;
}

.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.loading-spinner i {
  font-size: 32px;
  color: #e03426;
  animation: spin 1s linear infinite;
}

.loading-spinner p {
  font-size: 16px;
  color: #666;
  margin: 0;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}



/* 无结果提示 */
.no-results {
  text-align: center;
  padding: 60px 20px;
  color: #999;
}

.no-results i {
  font-size: 64px;
  margin-bottom: 16px;
  color: #ddd;
}

.no-results p {
  font-size: 18px;
  margin-bottom: 20px;
}

















/* 响应式设计 */
@media (max-width: 1200px) {
  .masonry-grid {
    column-count: 3;
  }
  

}

@media (max-width: 768px) {
  .container {
    padding: 0 15px;
  }
  
  .page-header {
    padding: 30px 0;
  }
  
  .header-content {
    flex-direction: column;
    gap: 20px;
    text-align: center;
  }
  
  .page-title {
    font-size: 24px;
  }
  
  .stats {
    justify-content: center;
  }
  
  .filter-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 15px;
  }
  
  .filter-group {
    justify-content: center;
  }
  
  .filter-actions {
    justify-content: center;
  }
  
  .masonry-grid {
    column-count: 2;
  }
  

}

@media (max-width: 480px) {
  .masonry-grid {
    column-count: 1;
  }
  
  .page-title {
    font-size: 20px;
  }
  
  .page-subtitle {
    font-size: 14px;
  }
  
  .stats {
    flex-direction: column;
    gap: 10px;
  }
  
  .tag-filters {
    justify-content: center;
  }
  

}
</style>

