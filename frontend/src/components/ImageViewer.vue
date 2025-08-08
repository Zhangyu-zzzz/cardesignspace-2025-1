<template>
  <div v-if="visible" class="image-viewer-overlay" @click="handleMaskClick">
    <div class="image-viewer-container" @click.stop>
      <!-- 顶部工具栏 -->
      <div class="image-viewer-toolbar">
        <div class="toolbar-left">
          <span class="image-title">{{ (currentImage && currentImage.title) || '图片预览' }}</span>
        </div>
        <div class="toolbar-right">
          <span class="image-counter">{{ currentIndex + 1 }} / {{ images.length }}</span>
          <button class="toolbar-btn" @click="$emit('close')">
            <i class="el-icon-close"></i>
          </button>
        </div>
      </div>

      <!-- 图片显示区域 -->
      <div class="image-display-area" ref="imageContainer">
        <img 
          ref="imageElement"
          :src="currentImageUrl" 
          :alt="(currentImage && currentImage.title) || '图片'"
          :style="imageStyles"
          @load="handleImageLoad"
          @error="handleImageError"
          draggable="false"
          @mousedown="handleMouseDown"
        />
        
        <!-- 加载中 -->
        <div v-if="imageLoading" class="image-loading">
          <i class="el-icon-loading"></i>
          <span>加载中...</span>
        </div>
        
        <!-- 错误提示 -->
        <div v-if="imageError" class="image-error">
          <i class="el-icon-warning"></i>
          <span>图片加载失败</span>
        </div>
      </div>

      <!-- 底部控制栏 -->
      <div class="image-controls">
        <!-- 导航按钮 -->
        <div class="navigation-controls">
          <button 
            class="control-btn"
            :disabled="currentIndex === 0"
            @click="prevImage"
          >
            <i class="el-icon-arrow-left"></i>
            <span>上一张</span>
          </button>
          <button 
            class="control-btn"
            :disabled="currentIndex === images.length - 1"
            @click="nextImage"
          >
            <i class="el-icon-arrow-right"></i>
            <span>下一张</span>
          </button>
        </div>

        <!-- 主要控制按钮 -->
        <div class="main-controls">
          <button class="control-btn" @click="zoomOut" :disabled="scale <= 0.1">
            <i class="el-icon-zoom-out"></i>
            <span>缩小</span>
          </button>
          
          <button class="control-btn" @click="zoomIn" :disabled="scale >= 5">
            <i class="el-icon-zoom-in"></i>
            <span>放大</span>
          </button>
          
          <button class="control-btn" @click="resetScale">
            <i class="el-icon-refresh"></i>
            <span>1:1</span>
          </button>
          
          <button class="control-btn" @click="rotateLeft">
            <i class="el-icon-refresh-left"></i>
            <span>逆时针</span>
          </button>
          
          <button class="control-btn" @click="rotateRight">
            <i class="el-icon-refresh-right"></i>
            <span>顺时针</span>
          </button>
          
          <button class="control-btn" @click="toggleFullscreen">
            <i :class="isFullscreen ? 'el-icon-copy-document' : 'el-icon-full-screen'"></i>
            <span>{{ isFullscreen ? '退出全屏' : '全屏' }}</span>
          </button>
          
          <!-- 抠图按钮 -->
          <button 
            class="control-btn matting-btn" 
            @click="performMatting"
            :disabled="mattingLoading"
          >
            <i :class="mattingLoading ? 'el-icon-loading' : 'el-icon-scissors'"></i>
            <span>{{ mattingLoading ? '抠图中...' : '抠图' }}</span>
          </button>
          
          <!-- 下载按钮 -->
          <button class="control-btn" @click="downloadImage">
            <i class="el-icon-download"></i>
            <span>下载</span>
          </button>
        </div>

        <!-- 缩放显示 -->
        <div class="zoom-info">
          {{ Math.round(scale * 100) }}%
        </div>
      </div>
    </div>

    <!-- 抠图结果预览对话框 -->
    <el-dialog
      title="抠图结果"
      :visible.sync="mattingResultVisible"
      width="80%"
      center
      :before-close="closeMattingResult"
    >
      <div class="matting-result-container">
        <div class="result-images">
          <div class="original-image">
            <h4>原图</h4>
            <img :src="currentImageUrl" alt="原图" />
          </div>
          <div class="matted-image">
            <h4>抠图结果</h4>
            <div class="matted-image-wrapper">
              <img 
                v-if="mattingResult" 
                :src="mattingResult.processedImageUrl" 
                alt="抠图结果"
                class="result-image"
              />
              <div v-else class="no-result">
                <i class="el-icon-picture"></i>
                <span>暂无结果</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="result-actions">
          <el-button @click="closeMattingResult">关闭</el-button>
          <el-button 
            type="primary" 
            @click="downloadMattingResult"
            :disabled="!mattingResult"
          >
            下载抠图结果
          </el-button>
          <el-button 
            type="success" 
            @click="saveMattingResult"
            :disabled="!mattingResult || savingResult"
            :loading="savingResult"
          >
            保存到相册
          </el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { apiClient } from '@/services/api';

export default {
  name: 'ImageViewer',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    images: {
      type: Array,
      default: () => []
    },
    initialIndex: {
      type: Number,
      default: 0
    }
  },
  data() {
    return {
      currentIndex: 0,
      scale: 1,
      rotation: 0,
      translateX: 0,
      translateY: 0,
      isFullscreen: false,
      imageLoading: false,
      imageError: false,
      isDragging: false,
      lastMouseX: 0,
      lastMouseY: 0,
      mattingLoading: false,
      mattingResult: null,
      mattingResultVisible: false,
      savingResult: false
    };
  },
  computed: {
    currentImage() {
      return this.images[this.currentIndex] || null;
    },
    currentImageUrl() {
      if (!this.currentImage) return '';
      return this.currentImage.url || this.currentImage.originalUrl || this.currentImage;
    },
    imageStyles() {
      return {
        transform: `scale(${this.scale}) rotate(${this.rotation}deg) translate(${this.translateX}px, ${this.translateY}px)`,
        transformOrigin: 'center center',
        transition: this.isDragging ? 'none' : 'transform 0.3s ease',
        cursor: this.isDragging ? 'grabbing' : 'grab',
        maxWidth: 'none',
        maxHeight: 'none'
      };
    }
  },
  watch: {
    visible(newVal) {
      if (newVal) {
        this.currentIndex = this.initialIndex;
        this.resetTransform();
        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('wheel', this.handleWheel, { passive: false });
      } else {
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('wheel', this.handleWheel);
        this.exitFullscreen();
      }
    },
    currentIndex() {
      this.resetTransform();
      this.imageLoading = true;
      this.imageError = false;
    }
  },
  methods: {
    // 图片加载处理
    handleImageLoad() {
      this.imageLoading = false;
      this.imageError = false;
      this.autoFitImage();
    },
    
    handleImageError() {
      this.imageLoading = false;
      this.imageError = true;
    },
    
    // 自动适应图片大小
    autoFitImage() {
      this.$nextTick(() => {
        const img = this.$refs.imageElement;
        const container = this.$refs.imageContainer;
        
        if (!img || !container) return;
        
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        const imageWidth = img.naturalWidth;
        const imageHeight = img.naturalHeight;
        
        // 计算适合的缩放比例
        const scaleX = (containerWidth * 0.9) / imageWidth;
        const scaleY = (containerHeight * 0.9) / imageHeight;
        
        this.scale = Math.min(scaleX, scaleY, 1); // 最大不超过原始大小
      });
    },
    
    // 导航控制
    prevImage() {
      if (this.currentIndex > 0) {
        this.currentIndex--;
      }
    },
    
    nextImage() {
      if (this.currentIndex < this.images.length - 1) {
        this.currentIndex++;
      }
    },
    
    // 缩放控制
    zoomIn() {
      this.scale = Math.min(this.scale * 1.2, 5);
    },
    
    zoomOut() {
      this.scale = Math.max(this.scale / 1.2, 0.1);
    },
    
    resetScale() {
      this.scale = 1;
      this.translateX = 0;
      this.translateY = 0;
    },
    
    // 旋转控制
    rotateLeft() {
      this.rotation -= 90;
    },
    
    rotateRight() {
      this.rotation += 90;
    },
    
    // 重置变换
    resetTransform() {
      this.scale = 1;
      this.rotation = 0;
      this.translateX = 0;
      this.translateY = 0;
    },
    
    // 全屏控制
    toggleFullscreen() {
      if (!this.isFullscreen) {
        this.enterFullscreen();
      } else {
        this.exitFullscreen();
      }
    },
    
    enterFullscreen() {
      const element = this.$el;
      if (element.requestFullscreen) {
        element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
      } else if (element.mozRequestFullScreen) {
        element.mozRequestFullScreen();
      } else if (element.msRequestFullscreen) {
        element.msRequestFullscreen();
      }
      this.isFullscreen = true;
    },
    
    exitFullscreen() {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
      this.isFullscreen = false;
    },
    
    // 鼠标拖拽
    handleMouseDown(event) {
      if (this.scale <= 1) return;
      
      this.isDragging = true;
      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;
      
      document.addEventListener('mousemove', this.handleMouseMove);
      document.addEventListener('mouseup', this.handleMouseUp);
      
      event.preventDefault();
    },
    
    handleMouseMove(event) {
      if (!this.isDragging) return;
      
      const deltaX = event.clientX - this.lastMouseX;
      const deltaY = event.clientY - this.lastMouseY;
      
      this.translateX += deltaX / this.scale;
      this.translateY += deltaY / this.scale;
      
      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;
    },
    
    handleMouseUp() {
      this.isDragging = false;
      document.removeEventListener('mousemove', this.handleMouseMove);
      document.removeEventListener('mouseup', this.handleMouseUp);
    },
    
    // 键盘事件
    handleKeyDown(event) {
      switch (event.key) {
        case 'Escape':
          this.$emit('close');
          break;
        case 'ArrowLeft':
          this.prevImage();
          break;
        case 'ArrowRight':
          this.nextImage();
          break;
        case '+':
        case '=':
          this.zoomIn();
          break;
        case '-':
          this.zoomOut();
          break;
        case '0':
          this.resetScale();
          break;
        case 'f':
        case 'F':
          this.toggleFullscreen();
          break;
      }
    },
    
    // 鼠标滚轮缩放
    handleWheel(event) {
      event.preventDefault();
      
      const delta = event.deltaY;
      if (delta > 0) {
        this.zoomOut();
      } else {
        this.zoomIn();
      }
    },
    
    // 遮罩点击
    handleMaskClick() {
      this.$emit('close');
    },
    
    // 下载图片
    async downloadImage() {
      try {
        const imageUrl = this.currentImageUrl;
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = (this.currentImage && this.currentImage.filename) || `image_${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        this.$message.success('图片下载成功');
      } catch (error) {
        console.error('下载图片失败:', error);
        this.$message.error('图片下载失败');
      }
    },
    
    // 抠图功能
    async performMatting() {
      if (!this.currentImage) {
        this.$message.error('没有选中的图片');
        return;
      }
      
      this.mattingLoading = true;
      
      try {
        const response = await apiClient.post('/api/image/remove-background', {
          imageUrl: this.currentImageUrl,
          imageId: this.currentImage.id
        });
        
        if (response.data.status === 'success') {
          this.mattingResult = response.data.data;
          this.mattingResultVisible = true;
          this.$message.success('抠图成功！');
        } else {
          throw new Error(response.data.message || '抠图失败');
        }
      } catch (error) {
        console.error('抠图失败:', error);
        this.$message.error((error.response && error.response.data && error.response.data.message) || '抠图失败，请稍后重试');
      } finally {
        this.mattingLoading = false;
      }
    },
    
    // 关闭抠图结果对话框
    closeMattingResult() {
      this.mattingResultVisible = false;
      this.mattingResult = null;
    },
    
    // 下载抠图结果
    async downloadMattingResult() {
      if (!this.mattingResult) return;
      
      try {
        const response = await fetch(this.mattingResult.processedImageUrl);
        const blob = await response.blob();
        
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = `matted_${(this.currentImage && this.currentImage.filename) || Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        this.$message.success('抠图结果下载成功');
      } catch (error) {
        console.error('下载抠图结果失败:', error);
        this.$message.error('下载失败');
      }
    },
    
    // 保存抠图结果到相册
    async saveMattingResult() {
      if (!this.mattingResult) return;
      
      this.savingResult = true;
      
      try {
        const response = await apiClient.post('/api/image/save-processed', {
          originalImageId: this.currentImage && this.currentImage.id,
          processedImageUrl: this.mattingResult.processedImageUrl,
          processType: 'remove_background',
          title: `${(this.currentImage && this.currentImage.title) || '抠图'} - 背景移除`
        });
        
        if (response.data.status === 'success') {
          this.$message.success('抠图结果已保存到相册');
          this.closeMattingResult();
        } else {
          throw new Error(response.data.message || '保存失败');
        }
      } catch (error) {
        console.error('保存抠图结果失败:', error);
        this.$message.error((error.response && error.response.data && error.response.data.message) || '保存失败，请稍后重试');
      } finally {
        this.savingResult = false;
      }
    }
  },
  
  beforeDestroy() {
    // 清理事件监听器
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('wheel', this.handleWheel);
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
  }
};
</script>

<style scoped>
.image-viewer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.9);
  z-index: 2000;
  display: flex;
  flex-direction: column;
  user-select: none;
}

.image-viewer-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* 顶部工具栏 */
.image-viewer-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background-color: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  color: white;
}

.toolbar-left .image-title {
  font-size: 16px;
  font-weight: 500;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.image-counter {
  font-size: 14px;
  color: #ccc;
}

.toolbar-btn {
  background: none;
  border: none;
  color: white;
  font-size: 18px;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.toolbar-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

/* 图片显示区域 */
.image-display-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.image-display-area img {
  max-width: 90%;
  max-height: 90%;
  object-fit: contain;
}

.image-loading,
.image-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: white;
  font-size: 16px;
}

.image-loading i,
.image-error i {
  font-size: 48px;
  margin-bottom: 12px;
}

.image-loading i {
  animation: rotating 2s linear infinite;
}

@keyframes rotating {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 底部控制栏 */
.image-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background-color: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
}

.navigation-controls,
.main-controls {
  display: flex;
  gap: 8px;
}

.control-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.3s;
  min-width: 60px;
}

.control-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
}

.control-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.control-btn i {
  font-size: 18px;
  margin-bottom: 4px;
}

.control-btn span {
  font-size: 11px;
  line-height: 1;
}

.matting-btn {
  background: linear-gradient(135deg, #ff6b6b, #ee5a24);
  border-color: #ff6b6b;
}

.matting-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #ff5252, #e55100);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
}

.zoom-info {
  color: #ccc;
  font-size: 14px;
  min-width: 50px;
  text-align: right;
}

/* 抠图结果对话框 */
.matting-result-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.result-images {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.original-image,
.matted-image {
  text-align: center;
}

.original-image h4,
.matted-image h4 {
  margin: 0 0 12px 0;
  color: #333;
  font-size: 16px;
  font-weight: 600;
}

.original-image img,
.matted-image img {
  max-width: 100%;
  max-height: 300px;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.matted-image-wrapper {
  background: linear-gradient(45deg, #f0f0f0 25%, transparent 25%), 
              linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), 
              linear-gradient(45deg, transparent 75%, #f0f0f0 75%), 
              linear-gradient(-45deg, transparent 75%, #f0f0f0 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}

.result-image {
  border-radius: 8px;
}

.no-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #999;
}

.no-result i {
  font-size: 48px;
  margin-bottom: 8px;
}

.result-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .image-viewer-toolbar {
    padding: 8px 12px;
  }
  
  .toolbar-left .image-title {
    font-size: 14px;
  }
  
  .image-controls {
    padding: 12px;
    flex-wrap: wrap;
    gap: 12px;
  }
  
  .navigation-controls,
  .main-controls {
    gap: 6px;
  }
  
  .control-btn {
    padding: 6px 8px;
    min-width: 50px;
  }
  
  .control-btn i {
    font-size: 16px;
  }
  
  .control-btn span {
    font-size: 10px;
  }
  
  .result-images {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .result-actions {
    flex-direction: column;
  }
}

@media (max-width: 480px) {
  .main-controls {
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .image-controls {
    flex-direction: column;
    gap: 8px;
  }
}
</style> 