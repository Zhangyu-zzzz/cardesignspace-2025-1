<template>
  <div class="virtual-image-grid" ref="container" @scroll="handleScroll">
    <!-- 虚拟滚动容器 -->
    <div 
      class="virtual-scroll-container" 
      :style="{ height: totalHeight + 'px' }"
    >
      <!-- 可见区域 -->
      <div 
        class="visible-area" 
        :style="{ 
          transform: `translateY(${offsetY}px)`,
          height: visibleHeight + 'px'
        }"
      >
        <!-- 图片卡片 -->
        <div 
          v-for="(image, index) in visibleImages" 
          :key="image.id"
          class="image-card"
          :style="{ 
            height: itemHeight + 'px',
            width: itemWidth + 'px'
          }"
          @click="openImageModal(image)"
        >
          <div class="image-container">
            <img 
              :src="image.displayUrl || image.url" 
              :alt="image.title || image.filename"
              @load="onImageLoad"
              @error="onImageError"
              loading="lazy"
            >
            <div class="image-overlay">
              <div class="image-info">
                <div class="model-name">{{ image.Model?.Brand?.name }} {{ image.Model?.name }}</div>
                <div class="model-type">{{ image.Model?.type }}</div>
              </div>
            </div>
          </div>
          
          <div class="image-details">
            <div class="filename">{{ image.filename }}</div>
            
            <!-- 标签显示 -->
            <div class="tags-display" v-if="image.tags && image.tags.length > 0">
              <span 
                v-for="tag in image.tags.slice(0, 3)" 
                :key="tag" 
                class="tag"
              >
                {{ tag }}
              </span>
              <span v-if="image.tags.length > 3" class="more-tags">
                +{{ image.tags.length - 3 }}
              </span>
            </div>

            <!-- 风格标签显示 -->
            <div class="style-tags-display" v-if="image.Model?.styleTags && image.Model.styleTags.length > 0">
              <span 
                v-for="tag in image.Model.styleTags.slice(0, 2)" 
                :key="tag" 
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
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-indicator">
      <div class="spinner"></div>
      <span>加载中...</span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'VirtualImageGrid',
  props: {
    images: {
      type: Array,
      default: () => []
    },
    loading: {
      type: Boolean,
      default: false
    },
    itemHeight: {
      type: Number,
      default: 300
    },
    itemWidth: {
      type: Number,
      default: 250
    },
    overscan: {
      type: Number,
      default: 5
    }
  },
  data() {
    return {
      containerHeight: 0,
      scrollTop: 0,
      containerWidth: 0
    }
  },
  computed: {
    // 计算每行显示的图片数量
    itemsPerRow() {
      return Math.floor(this.containerWidth / this.itemWidth) || 1
    },
    
    // 计算总行数
    totalRows() {
      return Math.ceil(this.images.length / this.itemsPerRow)
    },
    
    // 计算总高度
    totalHeight() {
      return this.totalRows * this.itemHeight
    },
    
    // 计算可见区域高度
    visibleHeight() {
      return Math.min(this.containerHeight, this.totalHeight)
    },
    
    // 计算当前可见的行范围
    visibleRowRange() {
      const startRow = Math.floor(this.scrollTop / this.itemHeight)
      const endRow = Math.min(
        startRow + Math.ceil(this.containerHeight / this.itemHeight) + this.overscan,
        this.totalRows
      )
      
      return {
        start: Math.max(0, startRow - this.overscan),
        end: endRow
      }
    },
    
    // 计算可见的图片
    visibleImages() {
      const { start, end } = this.visibleRowRange
      const visibleImages = []
      
      for (let row = start; row < end; row++) {
        const startIndex = row * this.itemsPerRow
        const endIndex = Math.min(startIndex + this.itemsPerRow, this.images.length)
        
        for (let i = startIndex; i < endIndex; i++) {
          if (this.images[i]) {
            visibleImages.push({
              ...this.images[i],
              row,
              index: i
            })
          }
        }
      }
      
      return visibleImages
    },
    
    // 计算偏移量
    offsetY() {
      return this.visibleRowRange.start * this.itemHeight
    }
  },
  mounted() {
    this.updateDimensions()
    window.addEventListener('resize', this.updateDimensions)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.updateDimensions)
  },
  methods: {
    updateDimensions() {
      if (this.$refs.container) {
        const rect = this.$refs.container.getBoundingClientRect()
        this.containerHeight = rect.height
        this.containerWidth = rect.width
      }
    },
    
    handleScroll(event) {
      this.scrollTop = event.target.scrollTop
      
      // 触发滚动事件，用于无限滚动
      this.$emit('scroll', {
        scrollTop: this.scrollTop,
        scrollHeight: event.target.scrollHeight,
        clientHeight: event.target.clientHeight
      })
    },
    
    openImageModal(image) {
      this.$emit('open-modal', image)
    },
    
    onImageLoad() {
      // 图片加载完成
    },
    
    onImageError(event) {
      // 图片加载失败，设置默认图片
      event.target.src = '/default-avatar.svg'
    }
  }
}
</script>

<style scoped>
.virtual-image-grid {
  height: 100%;
  overflow-y: auto;
  position: relative;
}

.virtual-scroll-container {
  position: relative;
}

.visible-area {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  padding: 20px;
}

.image-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  flex-shrink: 0;
}

.image-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(220, 53, 69, 0.15);
}

.image-container {
  position: relative;
  height: 200px;
  overflow: hidden;
}

.image-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
}

.image-card:hover .image-container img {
  transform: scale(1.05);
}

.image-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0,0,0,0.7));
  padding: 15px;
  color: white;
}

.model-name {
  font-weight: bold;
  font-size: 14px;
  margin-bottom: 4px;
}

.model-type {
  font-size: 12px;
  opacity: 0.9;
}

.image-details {
  padding: 15px;
}

.filename {
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
  word-break: break-all;
}

.tags-display, .style-tags-display {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
}

.tag, .style-tag {
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
  background: #f0f0f0;
  color: #555;
}

.style-tag {
  background: #f8d7da;
  color: #721c24;
}

.more-tags, .more-style-tags {
  font-size: 11px;
  color: #999;
  padding: 2px 6px;
}

.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 40px;
  color: #666;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #dc3545;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .visible-area {
    gap: 15px;
    padding: 15px;
  }
  
  .image-card {
    width: calc(50% - 7.5px) !important;
  }
}

@media (max-width: 480px) {
  .image-card {
    width: 100% !important;
  }
}
</style>
