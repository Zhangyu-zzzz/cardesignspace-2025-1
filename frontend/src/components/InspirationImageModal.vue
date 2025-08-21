<template>
  <div v-if="visible" class="inspiration-image-modal" @click="handleBackdropClick">
    <!-- 模态框内容 -->
    <div class="modal-content" @click.stop>
      <!-- 关闭按钮 -->
      <button class="close-button" @click="$emit('close')" title="关闭 (ESC)">
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>

      <!-- 图片区域 -->
      <div class="image-section">
        <div class="image-container">
          <img 
            :src="imageUrl" 
            :alt="image.filename"
            class="modal-image"
            @load="handleImageLoad"
            @error="handleImageError"
          />
          
          <!-- 加载状态 -->
          <div v-if="imageLoading" class="loading-overlay">
            <div class="loading-spinner">
              <svg viewBox="0 0 50 50" class="spinner">
                <circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-dasharray="31.416" stroke-dashoffset="31.416">
                  <animate attributeName="stroke-array" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
                  <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
                </circle>
              </svg>
              <span>加载中...</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 信息侧边栏 -->
      <div class="info-sidebar">
        <!-- 头部信息 -->
        <div class="info-header">
          <div class="image-stats">
            <div class="stat-item">
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
              </svg>
              <span>{{ formatNumber(image.likes || 0) }}</span>
            </div>
          </div>
        </div>

        <!-- 标签区域 -->
        <div class="tags-section">
          <h3 class="section-title">标签</h3>
          <div class="tags-container">
            <span 
              v-for="tag in (image.tags || [])" 
              :key="tag"
              class="tag-chip"
              @click="handleTagClick(tag)"
            >
              {{ tag }}
            </span>
            <span v-if="!image.tags || image.tags.length === 0" class="no-tags">
              暂无标签
            </span>
          </div>
        </div>

        <!-- 详细信息 -->
        <div class="details-section">
          <h3 class="section-title">详细信息</h3>
          <div class="detail-list">
            <div class="detail-item" v-if="image.source_link || image.sourceLink">
              <span class="detail-label">来源</span>
              <a :href="image.source_link || image.sourceLink" target="_blank" class="detail-value link">
                查看原始来源
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z"/>
                </svg>
              </a>
            </div>
            <div class="detail-item" v-if="image.timestamp">
              <span class="detail-label">采集时间</span>
              <span class="detail-value">{{ formatDate(image.timestamp) }}</span>
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="actions-section">
          <button 
            class="action-button primary"
            :class="{ active: isFavorite }"
            @click="toggleFavorite"
          >
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path v-if="isFavorite" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
              <path v-else d="M12 15.39l-3.76 2.27.99-4.28-3.32-2.88 4.38-.38L12 6.09l1.71 4.03 4.38.38-3.32 2.88.99 4.28M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24z"/>
            </svg>
            <span>{{ isFavorite ? '已收藏' : '收藏' }}</span>
          </button>
          
          <button class="action-button secondary" @click="downloadImage">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z"/>
            </svg>
            <span>下载图片</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'InspirationImageModal',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    image: {
      type: Object,
      default: () => ({})
    }
  },
  data() {
    return {
      imageLoading: true,
      favorites: JSON.parse(localStorage.getItem('inspiration_favorites') || '[]')
    }
  },
  computed: {
    isFavorite() {
      return this.favorites.some(fav => fav.filename === this.image.filename)
    },
    
    imageUrl() {
      // 兼容不同的数据格式
      return this.image.imageUrl || this.image.main_img_url || this.image.image_url || ''
    }
  },
  watch: {
    visible(newVal) {
      if (newVal) {
        this.imageLoading = true
        document.addEventListener('keydown', this.handleKeyDown)
        document.body.style.overflow = 'hidden'
      } else {
        document.removeEventListener('keydown', this.handleKeyDown)
        document.body.style.overflow = ''
      }
    }
  },
  methods: {
    handleBackdropClick() {
      this.$emit('close')
    },
    
    handleKeyDown(event) {
      if (event.key === 'Escape') {
        this.$emit('close')
      }
    },
    
    handleImageLoad() {
      this.imageLoading = false
    },
    
    handleImageError() {
      this.imageLoading = false
    },
    
    handleTagClick(tag) {
      this.$emit('tag-click', tag)
      this.$emit('close')
    },
    
    async toggleFavorite() {
      try {
        // 调用后端API进行收藏操作
        const response = await fetch('/api/inspiration/favorite', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            imageId: this.image.id || this.image.imageId,
            imageUrl: this.imageUrl,
            filename: this.image.filename,
            tags: this.image.tags,
            likes: this.image.likes,
            source_link: this.image.source_link || this.image.sourceLink,
            timestamp: this.image.timestamp
          })
        })
        
        const responseData = await response.json()
        
        if (responseData.success) {
          const isFavorited = responseData.favorited
          
          // 更新本地状态
          const index = this.favorites.findIndex(fav => fav.filename === this.image.filename)
          if (isFavorited && index === -1) {
            this.favorites.push(this.image)
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
        const index = this.favorites.findIndex(fav => fav.filename === this.image.filename)
        if (index > -1) {
          this.favorites.splice(index, 1)
          this.$message.success('已取消收藏')
        } else {
          this.favorites.push(this.image)
          this.$message.success('已添加到收藏')
        }
        localStorage.setItem('inspiration_favorites', JSON.stringify(this.favorites))
      }
    },
    
    async downloadImage() {
      try {
        const response = await fetch(this.imageUrl)
        const blob = await response.blob()
        
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)
        link.href = url
        link.download = this.image.filename || `inspiration_${Date.now()}.jpg`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        
        this.$message.success('图片下载成功')
      } catch (error) {
        console.error('下载图片失败:', error)
        this.$message.error('图片下载失败')
      }
    },
    
    formatNumber(num) {
      if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'k'
      }
      return num.toString()
    },
    
    formatDate(timestamp) {
      return new Date(timestamp * 1000).toLocaleDateString('zh-CN')
    }
  },
  
  beforeDestroy() {
    document.removeEventListener('keydown', this.handleKeyDown)
    document.body.style.overflow = ''
  }
}
</script>

<style scoped>
.inspiration-image-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  backdrop-filter: blur(20px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-content {
  width: 95vw;
  height: 90vh;
  max-width: 1400px;
  background: #1a1a1a;
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  position: relative;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
  animation: slideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(30px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* 关闭按钮 */
.close-button {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 44px;
  height: 44px;
  background: rgba(0, 0, 0, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.close-button:hover {
  background: rgba(224, 52, 38, 0.9);
  border-color: rgba(224, 52, 38, 0.5);
  transform: scale(1.1);
}

.close-button svg {
  fill: currentColor;
}

/* 图片区域 */
.image-section {
  flex: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  position: relative;
}

.image-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.modal-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 8px;
  transition: opacity 0.3s ease;
}

/* 加载状态 */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 16px;
}

.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: white;
}

.spinner {
  width: 40px;
  height: 40px;
  color: #e03426;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 信息侧边栏 */
.info-sidebar {
  flex: 0 0 400px;
  background: #1a1a1a;
  border-left: 1px solid #333;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

/* 头部信息 */
.info-header {
  padding: 24px;
  border-bottom: 1px solid #333;
}

.image-stats {
  display: flex;
  gap: 24px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #ccc;
  font-size: 14px;
}

.stat-item svg {
  fill: #e03426;
}

/* 标签区域 */
.tags-section {
  padding: 24px;
  border-bottom: 1px solid #333;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: white;
  margin: 0 0 16px 0;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-chip {
  background: #333;
  color: white;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid #444;
}

.tag-chip:hover {
  background: #e03426;
  border-color: #e03426;
  transform: translateY(-1px);
}

.no-tags {
  color: #666;
  font-style: italic;
  font-size: 14px;
}

/* 详细信息 */
.details-section {
  padding: 24px;
  border-bottom: 1px solid #333;
  flex: 1;
}

.detail-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-label {
  font-size: 12px;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}

.detail-value {
  color: white;
  font-size: 14px;
}

.detail-value.link {
  color: #e03426;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: color 0.3s ease;
}

.detail-value.link:hover {
  color: #c41e3a;
}

.detail-value.link svg {
  fill: currentColor;
}

/* 操作按钮 */
.actions-section {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.action-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.action-button.primary {
  background: #333;
  color: white;
  border: 1px solid #444;
}

.action-button.primary:hover {
  background: #444;
  transform: translateY(-1px);
}

.action-button.primary.active {
  background: #e03426;
  border-color: #e03426;
}

.action-button.primary.active:hover {
  background: #c41e3a;
}

.action-button.secondary {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.action-button.secondary:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

.action-button svg {
  fill: currentColor;
}

/* 滚动条样式 */
.info-sidebar::-webkit-scrollbar {
  width: 6px;
}

.info-sidebar::-webkit-scrollbar-track {
  background: #1a1a1a;
}

.info-sidebar::-webkit-scrollbar-thumb {
  background: #333;
  border-radius: 3px;
}

.info-sidebar::-webkit-scrollbar-thumb:hover {
  background: #444;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .modal-content {
    width: 98vw;
    height: 95vh;
  }
  
  .info-sidebar {
    flex: 0 0 320px;
  }
}

@media (max-width: 768px) {
  .modal-content {
    flex-direction: column;
    width: 100vw;
    height: 100vh;
    border-radius: 0;
  }
  
  .image-section {
    flex: 1;
  }
  
  .info-sidebar {
    flex: 0 0 auto;
    max-height: 40vh;
    border-left: none;
    border-top: 1px solid #333;
  }
  
  .close-button {
    top: 16px;
    right: 16px;
    width: 40px;
    height: 40px;
  }
}

@media (max-width: 480px) {
  .info-header,
  .tags-section,
  .details-section,
  .actions-section {
    padding: 16px;
  }
  
  .image-stats {
    gap: 16px;
  }
  
  .close-button {
    width: 36px;
    height: 36px;
  }
}
</style>
