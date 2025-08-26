<template>
  <div class="test-image-context-menu">
    <div class="container">
      <h1>图片右键菜单功能测试</h1>
      
      <div class="test-section">
        <h2>测试说明</h2>
        <p>右键点击以下图片，会显示自定义的右键菜单，包含以下选项：</p>
        <ul>
          <li><strong>在新标签页中查看图片</strong> - 在新标签页中打开专门的图片查看器</li>
          <li><strong>下载图片</strong> - 直接下载图片到本地</li>
          <li><strong>复制图片地址</strong> - 复制图片URL到剪贴板</li>
          <li><strong>复制图片</strong> - 复制图片到剪贴板（如果浏览器支持）</li>
        </ul>
      </div>

      <div class="test-section">
        <h2>测试图片</h2>
        <div class="test-images">
          <div class="image-item">
            <h3>车型图片 1</h3>
            <img 
              src="https://via.placeholder.com/400x300/FF6B6B/FFFFFF?text=Car+Image+1"
              alt="车型图片1"
              @contextmenu="handleImageContextMenu($event, 'https://via.placeholder.com/400x300/FF6B6B/FFFFFF?text=Car+Image+1', '车型图片1')"
              class="test-image"
            />
            <p>右键点击此图片测试菜单功能</p>
          </div>
          
          <div class="image-item">
            <h3>车型图片 2</h3>
            <img 
              src="https://via.placeholder.com/400x300/4ECDC4/FFFFFF?text=Car+Image+2"
              alt="车型图片2"
              @contextmenu="handleImageContextMenu($event, 'https://via.placeholder.com/400x300/4ECDC4/FFFFFF?text=Car+Image+2', '车型图片2')"
              class="test-image"
            />
            <p>右键点击此图片测试菜单功能</p>
          </div>
          
          <div class="image-item">
            <h3>车型图片 3</h3>
            <img 
              src="https://via.placeholder.com/400x300/45B7D1/FFFFFF?text=Car+Image+3"
              alt="车型图片3"
              @contextmenu="handleImageContextMenu($event, 'https://via.placeholder.com/400x300/45B7D1/FFFFFF?text=Car+Image+3', '车型图片3')"
              class="test-image"
            />
            <p>右键点击此图片测试菜单功能</p>
          </div>
        </div>
      </div>

      <div class="test-section">
        <h2>对比：浏览器原生右键菜单</h2>
        <p>以下图片使用浏览器原生的右键菜单（会直接下载图片）：</p>
        <div class="test-images">
          <div class="image-item">
            <h3>原生菜单图片</h3>
            <img 
              src="https://via.placeholder.com/400x300/96CEB4/FFFFFF?text=Native+Menu"
              alt="原生菜单图片"
              class="test-image"
            />
            <p>右键点击此图片会显示浏览器原生菜单</p>
          </div>
        </div>
      </div>

      <div class="test-section">
        <h2>功能说明</h2>
        <div class="feature-list">
          <div class="feature-item">
            <h4>✅ 在新标签页中查看图片</h4>
            <p>点击后会打开专门的图片查看器页面，支持：</p>
            <ul>
              <li>缩放功能（鼠标滚轮、按钮、键盘快捷键）</li>
              <li>旋转功能</li>
              <li>拖拽移动</li>
              <li>适应屏幕</li>
              <li>下载和复制功能</li>
            </ul>
          </div>
          
          <div class="feature-item">
            <h4>✅ 下载图片</h4>
            <p>直接下载图片到本地，自动生成合适的文件名</p>
          </div>
          
          <div class="feature-item">
            <h4>✅ 复制图片地址</h4>
            <p>将图片的完整URL复制到剪贴板</p>
          </div>
          
          <div class="feature-item">
            <h4>✅ 复制图片</h4>
            <p>将图片本身复制到剪贴板（需要浏览器支持）</p>
          </div>
        </div>
      </div>

      <div class="test-section">
        <h2>键盘快捷键</h2>
        <p>在图片查看器页面中可以使用以下快捷键：</p>
        <div class="shortcuts">
          <div class="shortcut-item">
            <kbd>+</kbd> 或 <kbd>=</kbd> - 放大
          </div>
          <div class="shortcut-item">
            <kbd>-</kbd> - 缩小
          </div>
          <div class="shortcut-item">
            <kbd>0</kbd> - 重置缩放
          </div>
          <div class="shortcut-item">
            <kbd>F</kbd> - 适应屏幕
          </div>
          <div class="shortcut-item">
            <kbd>←</kbd> - 逆时针旋转
          </div>
          <div class="shortcut-item">
            <kbd>→</kbd> - 顺时针旋转
          </div>
          <div class="shortcut-item">
            <kbd>ESC</kbd> - 关闭查看器
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import imageContextMenu from '@/utils/imageContextMenu';

export default {
  name: 'TestImageContextMenu',
  methods: {
    handleImageContextMenu(event, imageUrl, imageTitle) {
      imageContextMenu.show(event, imageUrl, {
        title: imageTitle
      });
    }
  }
}
</script>

<style scoped>
.test-image-context-menu {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.container {
  background: white;
  border-radius: 8px;
  padding: 30px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

h1 {
  color: #2c3e50;
  margin-bottom: 30px;
  text-align: center;
}

.test-section {
  margin-bottom: 40px;
  padding: 20px;
  border: 1px solid #e1e8ed;
  border-radius: 8px;
  background: #f8f9fa;
}

.test-section h2 {
  color: #e03426;
  margin-bottom: 15px;
  font-size: 1.3rem;
}

.test-section p {
  color: #666;
  margin-bottom: 15px;
  line-height: 1.6;
}

.test-section ul {
  margin-bottom: 20px;
  padding-left: 20px;
}

.test-section li {
  margin-bottom: 5px;
  color: #555;
}

.test-images {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.image-item {
  text-align: center;
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: white;
}

.image-item h3 {
  margin-bottom: 10px;
  color: #333;
  font-size: 16px;
}

.test-image {
  width: 100%;
  max-width: 400px;
  height: auto;
  border-radius: 6px;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.test-image:hover {
  transform: scale(1.02);
}

.image-item p {
  margin-top: 10px;
  color: #666;
  font-size: 14px;
}

.feature-list {
  display: grid;
  gap: 20px;
}

.feature-item {
  padding: 15px;
  border: 1px solid #e1e8ed;
  border-radius: 6px;
  background: white;
}

.feature-item h4 {
  color: #e03426;
  margin-bottom: 10px;
  font-size: 16px;
}

.feature-item ul {
  margin-top: 10px;
  padding-left: 20px;
}

.feature-item li {
  margin-bottom: 3px;
  color: #555;
}

.shortcuts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.shortcut-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: white;
  border: 1px solid #e1e8ed;
  border-radius: 6px;
  font-size: 14px;
}

kbd {
  background: #f1f3f4;
  border: 1px solid #dadce0;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 12px;
  font-family: monospace;
  color: #333;
}

@media (max-width: 768px) {
  .test-images {
    grid-template-columns: 1fr;
  }
  
  .shortcuts {
    grid-template-columns: 1fr;
  }
}
</style>
