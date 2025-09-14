<template>
  <div class="image-viewer-page">
    <div class="image-container">
      <!-- 顶部工具栏 -->
      <div class="toolbar">
        <div class="toolbar-left">
          <h1 class="image-title">{{ imageTitle }}</h1>
        </div>
        <div class="toolbar-right">
          <button class="toolbar-btn" @click="downloadImage">
            <i class="el-icon-download"></i>
            下载
          </button>
          <button class="toolbar-btn" @click="copyImageUrl">
            <i class="el-icon-document-copy"></i>
            复制地址
          </button>
          <button class="toolbar-btn" @click="closeViewer">
            <i class="el-icon-close"></i>
            关闭
          </button>
        </div>
      </div>

      <!-- 图片显示区域 -->
      <div class="image-display" ref="imageContainer">
        <img 
          ref="imageElement"
          :src="imageUrl" 
          :alt="imageTitle"
          :style="imageStyles"
          @load="handleImageLoad"
          @error="handleImageError"
          draggable="false"
          @mousedown="handleMouseDown"
          @wheel="handleWheel"
          @contextmenu="handleImageContextMenu"
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
          <button @click="retryLoad" class="retry-btn">重试</button>
        </div>
      </div>

      <!-- 底部控制栏 -->
      <div class="controls">
        <div class="control-group">
          <button class="control-btn" @click="zoomOut" :disabled="scale <= 0.1">
            <i class="el-icon-zoom-out"></i>
            缩小
          </button>
          
          <button class="control-btn" @click="zoomIn" :disabled="scale >= 5">
            <i class="el-icon-zoom-in"></i>
            放大
          </button>
          
          <button class="control-btn" @click="resetScale">
            <i class="el-icon-refresh"></i>
            1:1
          </button>
          
          <button class="control-btn" @click="fitToScreen">
            <i class="el-icon-full-screen"></i>
            适应屏幕
          </button>
        </div>

        <div class="control-group">
          <button class="control-btn" @click="rotateLeft">
            <i class="el-icon-refresh-left"></i>
            逆时针
          </button>
          
          <button class="control-btn" @click="rotateRight">
            <i class="el-icon-refresh-right"></i>
            顺时针
          </button>
        </div>

        <div class="scale-info">
          {{ Math.round(scale * 100) }}%
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import imageContextMenu from '@/utils/imageContextMenu';

export default {
  name: 'ImageViewer',
  data() {
    return {
      imageUrl: '',
      imageTitle: '图片查看器',
      imageLoading: true,
      imageError: false,
      scale: 1,
      rotation: 0,
      isDragging: false,
      dragStart: { x: 0, y: 0 },
      position: { x: 0, y: 0 }
    }
  },
  computed: {
    imageStyles() {
      return {
        transform: `translate(${this.position.x}px, ${this.position.y}px) scale(${this.scale}) rotate(${this.rotation}deg)`,
        cursor: this.isDragging ? 'grabbing' : 'grab'
      }
    }
  },
  mounted() {
    this.initFromQueryParams();
    this.bindKeyboardEvents();
  },
  beforeDestroy() {
    this.unbindKeyboardEvents();
  },
  methods: {
    initFromQueryParams() {
      const urlParams = new URLSearchParams(window.location.search);
      this.imageUrl = urlParams.get('url') || '';
      this.imageTitle = urlParams.get('title') || '图片查看器';
      
      if (!this.imageUrl) {
        this.imageError = true;
        this.imageLoading = false;
      }
    },

    handleImageLoad() {
      this.imageLoading = false;
      this.imageError = false;
      this.fitToScreen();
    },

    handleImageError() {
      this.imageLoading = false;
      this.imageError = true;
    },

    handleImageContextMenu(event) {
      // 使用浏览器默认菜单
      imageContextMenu.show(event, this.imageUrl, {
        title: this.imageTitle,
        useBrowserMenu: true
      });
    },

    retryLoad() {
      this.imageLoading = true;
      this.imageError = false;
      this.$nextTick(() => {
        this.$refs.imageElement.src = this.imageUrl;
      });
    },

    zoomIn() {
      this.scale = Math.min(this.scale * 1.2, 5);
    },

    zoomOut() {
      this.scale = Math.max(this.scale / 1.2, 0.1);
    },

    resetScale() {
      this.scale = 1;
      this.position = { x: 0, y: 0 };
    },

    fitToScreen() {
      if (!this.$refs.imageElement || !this.$refs.imageContainer) return;
      
      const container = this.$refs.imageContainer;
      const image = this.$refs.imageElement;
      
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      const imageWidth = image.naturalWidth;
      const imageHeight = image.naturalHeight;
      
      const scaleX = containerWidth / imageWidth;
      const scaleY = containerHeight / imageHeight;
      const scale = Math.min(scaleX, scaleY, 1); // 不超过100%
      
      this.scale = scale;
      this.position = { x: 0, y: 0 };
    },

    rotateLeft() {
      this.rotation = (this.rotation - 90) % 360;
    },

    rotateRight() {
      this.rotation = (this.rotation + 90) % 360;
    },

    handleMouseDown(event) {
      if (event.button !== 0) return; // 只处理左键
      
      this.isDragging = true;
      this.dragStart = {
        x: event.clientX - this.position.x,
        y: event.clientY - this.position.y
      };
      
      document.addEventListener('mousemove', this.handleMouseMove);
      document.addEventListener('mouseup', this.handleMouseUp);
    },

    handleMouseMove(event) {
      if (!this.isDragging) return;
      
      this.position = {
        x: event.clientX - this.dragStart.x,
        y: event.clientY - this.dragStart.y
      };
    },

    handleMouseUp() {
      this.isDragging = false;
      document.removeEventListener('mousemove', this.handleMouseMove);
      document.removeEventListener('mouseup', this.handleMouseUp);
    },

    handleWheel(event) {
      event.preventDefault();
      
      if (event.deltaY < 0) {
        this.zoomIn();
      } else {
        this.zoomOut();
      }
    },

    downloadImage() {
      const link = document.createElement('a');
      link.href = this.imageUrl;
      link.download = this.getImageFilename();
      link.target = '_blank';
      
      // 添加时间戳避免缓存问题
      if (this.imageUrl.includes('?')) {
        link.href += `&_t=${Date.now()}`;
      } else {
        link.href += `?_t=${Date.now()}`;
      }
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },

    copyImageUrl() {
      navigator.clipboard.writeText(this.imageUrl).then(() => {
        this.showNotification('图片地址已复制到剪贴板');
      }).catch(() => {
        this.fallbackCopy(this.imageUrl);
      });
    },

    fallbackCopy(text) {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        this.showNotification('已复制到剪贴板');
      } catch (err) {
        this.showNotification('复制失败');
      }
      document.body.removeChild(textArea);
    },

    showNotification(message) {
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 12px 16px;
        border-radius: 6px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        z-index: 10000;
        font-size: 14px;
        max-width: 300px;
        word-wrap: break-word;
      `;
      notification.textContent = message;
      
      document.body.appendChild(notification);
      
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 3000);
    },

    getImageFilename() {
      if (!this.imageUrl) return 'image.jpg';
      
      try {
        const url = new URL(this.imageUrl);
        const pathname = url.pathname;
        const filename = pathname.split('/').pop();
        
        if (filename && filename.includes('.')) {
          return filename;
        }
      } catch (err) {
        // URL解析失败，使用默认文件名
      }
      
      // 根据URL生成默认文件名
      const timestamp = Date.now();
      return `image_${timestamp}.jpg`;
    },

    closeViewer() {
      window.close();
    },

    bindKeyboardEvents() {
      document.addEventListener('keydown', this.handleKeydown);
    },

    unbindKeyboardEvents() {
      document.removeEventListener('keydown', this.handleKeydown);
    },

    handleKeydown(event) {
      switch (event.key) {
        case 'Escape':
          this.closeViewer();
          break;
        case '+':
        case '=':
          event.preventDefault();
          this.zoomIn();
          break;
        case '-':
          event.preventDefault();
          this.zoomOut();
          break;
        case '0':
          event.preventDefault();
          this.resetScale();
          break;
        case 'f':
        case 'F':
          event.preventDefault();
          this.fitToScreen();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          this.rotateLeft();
          break;
        case 'ArrowRight':
          event.preventDefault();
          this.rotateRight();
          break;
      }
    }
  }
}
</script>

<style scoped>
.image-viewer-page {
  width: 100vw;
  height: 100vh;
  background: #000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.image-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  z-index: 100;
}

.toolbar-left {
  display: flex;
  align-items: center;
}

.image-title {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
}

.toolbar-right {
  display: flex;
  gap: 10px;
}

.toolbar-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 14px;
  transition: all 0.2s ease;
}

.toolbar-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.image-display {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  overflow: hidden;
}

.image-display img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  transition: transform 0.1s ease;
  user-select: none;
}

.image-loading,
.image-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: white;
  font-size: 16px;
}

.image-loading i {
  font-size: 24px;
  animation: spin 1s linear infinite;
}

.image-error i {
  font-size: 24px;
  color: #ef4444;
}

.retry-btn {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.retry-btn:hover {
  background: #2563eb;
}

.controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  padding: 15px 20px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
}

.control-group {
  display: flex;
  gap: 5px;
}

.control-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 14px;
  transition: all 0.2s ease;
}

.control-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
}

.control-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.scale-info {
  font-size: 14px;
  font-weight: 500;
  min-width: 60px;
  text-align: center;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .toolbar {
    padding: 8px 15px;
  }
  
  .image-title {
    font-size: 16px;
  }
  
  .toolbar-btn {
    padding: 6px 10px;
    font-size: 12px;
  }
  
  .controls {
    padding: 10px 15px;
    gap: 10px;
  }
  
  .control-btn {
    padding: 6px 10px;
    font-size: 12px;
  }
}
</style>
