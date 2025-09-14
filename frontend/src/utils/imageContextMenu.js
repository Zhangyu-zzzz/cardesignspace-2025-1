/**
 * 图片右键菜单工具
 * 专门处理图片的右键菜单，确保图片在新标签中正确显示
 */

import contextMenu from './contextMenu';

// 图片专用的菜单项配置
const imageMenuItems = [
  {
    id: 'view-image',
    label: '在新标签页中查看图片',
    icon: 'el-icon-picture',
    action: 'view-image'
  },
  {
    id: 'download-image',
    label: '下载图片',
    icon: 'el-icon-download',
    action: 'download-image'
  },
  { type: 'separator' },
  {
    id: 'copy-image-url',
    label: '复制图片地址',
    icon: 'el-icon-document-copy',
    action: 'copy-image-url'
  },
  {
    id: 'copy-image',
    label: '复制图片',
    icon: 'el-icon-copy-document',
    action: 'copy-image'
  },
  { type: 'separator' },
  {
    id: 'save-image-as',
    label: '图片另存为',
    icon: 'el-icon-folder-opened',
    action: 'save-image-as'
  },
  {
    id: 'inspect-image',
    label: '检查图片',
    icon: 'el-icon-view',
    action: 'inspect-image'
  }
];

class ImageContextMenu {
  constructor() {
    this.currentImageUrl = null;
    this.currentImageElement = null;
    this.currentImageTitle = null;
  }

  /**
   * 显示图片右键菜单
   * @param {Event} event - 右键事件
   * @param {string} imageUrl - 图片URL
   * @param {Object} options - 选项
   * @param {string} options.title - 图片标题
   * @param {string} options.filename - 文件名
   * @param {Array} options.menuItems - 自定义菜单项
   * @param {boolean} options.useBrowserMenu - 是否使用浏览器默认菜单，默认为true
   */
  show(event, imageUrl, options = {}) {
    // 存储当前图片信息
    this.currentImageUrl = imageUrl;
    this.currentImageElement = event.target;
    this.currentImageTitle = options.title || '图片';

    // 默认使用浏览器默认菜单
    if (options.useBrowserMenu !== false) {
      // 不阻止默认行为，让浏览器显示默认菜单
      return;
    }

    // 如果明确要求使用自定义菜单，则阻止默认行为
    event.preventDefault();
    event.stopPropagation();

    // 构建菜单内容
    const menuItems = options.menuItems || imageMenuItems;
    this.buildMenu(event, menuItems);
  }

  buildMenu(event, menuItems) {
    // 创建临时菜单容器
    const menuContainer = document.createElement('div');
    menuContainer.className = 'image-context-menu';
    menuContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      background: white;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      z-index: 9999;
      min-width: 200px;
      max-width: 300px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
      font-size: 14px;
      user-select: none;
    `;

    // 构建菜单项
    menuItems.forEach(item => {
      if (item.type === 'separator') {
        const separator = document.createElement('div');
        separator.style.cssText = `
          height: 1px;
          background: #e5e7eb;
          margin: 4px 0;
        `;
        menuContainer.appendChild(separator);
        return;
      }

      const menuItem = document.createElement('div');
      menuItem.className = 'image-menu-item';
      menuItem.style.cssText = `
        padding: 8px 12px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: background-color 0.15s ease;
        border-radius: 4px;
        margin: 2px 4px;
      `;

      // 图标
      if (item.icon) {
        const icon = document.createElement('i');
        icon.className = item.icon;
        icon.style.cssText = `
          font-size: 16px;
          color: #6b7280;
          width: 16px;
          text-align: center;
        `;
        menuItem.appendChild(icon);
      }

      // 标签
      const label = document.createElement('span');
      label.textContent = item.label;
      label.style.cssText = `
        color: #374151;
        flex: 1;
      `;
      menuItem.appendChild(label);

      // 悬停效果
      menuItem.addEventListener('mouseenter', () => {
        menuItem.style.backgroundColor = '#f3f4f6';
      });

      menuItem.addEventListener('mouseleave', () => {
        menuItem.style.backgroundColor = 'transparent';
      });

      // 点击事件
      menuItem.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handleMenuItemClick(item);
        this.hide(menuContainer);
      });

      menuContainer.appendChild(menuItem);
    });

    // 计算菜单位置
    const rect = menuContainer.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = event.clientX;
    let y = event.clientY;

    // 确保菜单不超出视口
    if (x + rect.width > viewportWidth) {
      x = viewportWidth - rect.width - 10;
    }
    if (y + rect.height > viewportHeight) {
      y = viewportHeight - rect.height - 10;
    }

    // 设置菜单位置并显示
    menuContainer.style.left = `${x}px`;
    menuContainer.style.top = `${y}px`;
    document.body.appendChild(menuContainer);

    // 绑定全局事件来关闭菜单
    const closeMenu = (e) => {
      if (!menuContainer.contains(e.target)) {
        this.hide(menuContainer);
        document.removeEventListener('click', closeMenu);
        document.removeEventListener('keydown', closeMenu);
      }
    };

    const handleKeydown = (e) => {
      if (e.key === 'Escape') {
        this.hide(menuContainer);
        document.removeEventListener('click', closeMenu);
        document.removeEventListener('keydown', handleKeydown);
      }
    };

    // 延迟绑定事件，避免立即触发
    setTimeout(() => {
      document.addEventListener('click', closeMenu);
      document.addEventListener('keydown', handleKeydown);
    }, 0);
  }

  handleMenuItemClick(item) {
    switch (item.action) {
      case 'view-image':
        this.viewImageInNewTab();
        break;
      case 'download-image':
        this.downloadImage();
        break;
      case 'copy-image-url':
        this.copyImageUrl();
        break;
      case 'copy-image':
        this.copyImage();
        break;
      case 'save-image-as':
        this.saveImageAs();
        break;
      case 'inspect-image':
        this.inspectImage();
        break;
      default:
        if (item.handler) {
          item.handler(this.currentImageUrl, this.currentImageTitle, this.currentImageElement);
        }
    }
  }

  /**
   * 在新标签页中查看图片
   */
  viewImageInNewTab() {
    if (!this.currentImageUrl) return;

    // 创建一个专门的图片查看页面URL
    const imageViewerUrl = `/image-viewer?url=${encodeURIComponent(this.currentImageUrl)}&title=${encodeURIComponent(this.currentImageTitle)}`;
    window.open(imageViewerUrl, '_blank');
  }

  /**
   * 图片另存为
   */
  saveImageAs() {
    if (!this.currentImageUrl) return;
    
    // 创建一个临时的a标签来触发下载
    const link = document.createElement('a');
    link.href = this.currentImageUrl;
    link.download = this.getImageFilename();
    link.target = '_blank';
    
    // 添加时间戳避免缓存问题
    if (this.currentImageUrl.includes('?')) {
      link.href += `&_t=${Date.now()}`;
    } else {
      link.href += `?_t=${Date.now()}`;
    }
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    this.showNotification('图片下载已开始');
  }

  /**
   * 检查图片
   */
  inspectImage() {
    if (!this.currentImageElement) return;
    
    // 隐藏当前自定义菜单
    const existingMenu = document.querySelector('.image-context-menu');
    if (existingMenu) {
      existingMenu.remove();
    }
    
    // 创建一个新的右键事件来触发开发者工具
    const rect = this.currentImageElement.getBoundingClientRect();
    const event = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
      button: 2,
      buttons: 2
    });
    
    // 临时移除事件监听器
    const originalHandler = this.currentImageElement.oncontextmenu;
    this.currentImageElement.oncontextmenu = null;
    
    // 触发右键事件
    this.currentImageElement.dispatchEvent(event);
    
    // 恢复事件监听器
    setTimeout(() => {
      this.currentImageElement.oncontextmenu = originalHandler;
    }, 100);
  }

  /**
   * 下载图片
   */
  downloadImage() {
    if (!this.currentImageUrl) return;

    // 创建一个临时的a标签来下载图片
    const link = document.createElement('a');
    link.href = this.currentImageUrl;
    link.download = this.getImageFilename();
    link.target = '_blank';
    
    // 添加时间戳避免缓存问题
    if (this.currentImageUrl.includes('?')) {
      link.href += `&_t=${Date.now()}`;
    } else {
      link.href += `?_t=${Date.now()}`;
    }
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * 复制图片URL
   */
  copyImageUrl() {
    if (!this.currentImageUrl) return;

    navigator.clipboard.writeText(this.currentImageUrl).then(() => {
      this.showNotification('图片地址已复制到剪贴板');
    }).catch(() => {
      this.fallbackCopy(this.currentImageUrl);
    });
  }

  /**
   * 复制图片到剪贴板
   */
  async copyImage() {
    if (!this.currentImageElement) return;

    try {
      // 检查是否支持 Clipboard API
      if (!navigator.clipboard || !navigator.clipboard.write) {
        this.showNotification('当前浏览器不支持复制图片，请使用复制图片地址');
        return;
      }

      // 检查是否在安全上下文中
      if (!window.isSecureContext) {
        this.showNotification('复制图片需要HTTPS环境，请使用复制图片地址');
        return;
      }

      // 尝试通过代理服务器获取图片数据
      try {
        const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(this.currentImageUrl)}`;
        const response = await fetch(proxyUrl);
        
        if (!response.ok) {
          throw new Error('无法通过代理获取图片数据');
        }
        
        const blob = await response.blob();
        
        // 检查blob类型
        if (!blob.type.startsWith('image/')) {
          throw new Error('不是有效的图片格式');
        }
        
        // 直接复制blob到剪贴板
        await navigator.clipboard.write([
          new ClipboardItem({
            [blob.type]: blob
          })
        ]);
        
        this.showNotification('图片已复制到剪贴板');
        return;
        
      } catch (proxyError) {
        console.log('代理方法失败，尝试直接fetch:', proxyError);
        
        // 如果代理失败，尝试直接fetch
        try {
          const response = await fetch(this.currentImageUrl, {
            mode: 'cors',
            credentials: 'omit'
          });
          
          if (!response.ok) {
            throw new Error('无法获取图片数据');
          }
          
          const blob = await response.blob();
          
          // 检查blob类型
          if (!blob.type.startsWith('image/')) {
            throw new Error('不是有效的图片格式');
          }
          
          // 直接复制blob到剪贴板
          await navigator.clipboard.write([
            new ClipboardItem({
              [blob.type]: blob
            })
          ]);
          
          this.showNotification('图片已复制到剪贴板');
          return;
          
        } catch (fetchError) {
          console.log('直接fetch失败，尝试canvas方法:', fetchError);
          
          // 如果直接fetch也失败，尝试canvas方法
          await this.copyImageViaCanvas();
        }
      }
      
    } catch (err) {
      console.error('复制图片过程出错:', err);
      this.showNotification('复制图片失败，请使用复制图片地址');
    }
  }

  /**
   * 通过Canvas复制图片（备用方法）
   */
  async copyImageViaCanvas() {
    // 检查图片是否跨域
    if (this.isCrossOriginImage()) {
      this.showNotification('跨域图片无法直接复制，请使用复制图片地址');
      return;
    }

    // 创建一个canvas来复制图片
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // 等待图片加载完成
    if (!this.currentImageElement.complete) {
      await new Promise((resolve) => {
        this.currentImageElement.onload = resolve;
        this.currentImageElement.onerror = resolve; // 处理加载失败
      });
    }
    
    // 检查图片是否加载成功
    if (!this.currentImageElement.naturalWidth || !this.currentImageElement.naturalHeight) {
      this.showNotification('图片加载失败，请使用复制图片地址');
      return;
    }
    
    canvas.width = this.currentImageElement.naturalWidth;
    canvas.height = this.currentImageElement.naturalHeight;
    
    try {
      ctx.drawImage(this.currentImageElement, 0, 0);
    } catch (drawError) {
      // 跨域图片可能无法绘制到canvas
      this.showNotification('图片受跨域限制，请使用复制图片地址');
      return;
    }
    
    // 检查canvas是否被污染
    try {
      canvas.toDataURL();
    } catch (taintError) {
      this.showNotification('图片受跨域限制，请使用复制图片地址');
      return;
    }
    
    // 将canvas转换为blob
    canvas.toBlob(async (blob) => {
      if (!blob) {
        this.showNotification('图片转换失败，请使用复制图片地址');
        return;
      }

      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            [blob.type]: blob
          })
        ]);
        this.showNotification('图片已复制到剪贴板');
      } catch (clipboardError) {
        console.error('复制到剪贴板失败:', clipboardError);
        this.showNotification('复制图片失败，请使用复制图片地址');
      }
    }, 'image/png'); // 指定输出格式
  }

  /**
   * 检查图片是否跨域
   */
  isCrossOriginImage() {
    if (!this.currentImageElement || !this.currentImageUrl) return false;
    
    try {
      const imgUrl = new URL(this.currentImageUrl);
      const currentUrl = new URL(window.location.href);
      
      // 检查协议、域名、端口是否相同
      return imgUrl.protocol !== currentUrl.protocol || 
             imgUrl.hostname !== currentUrl.hostname || 
             imgUrl.port !== currentUrl.port;
    } catch (err) {
      // URL解析失败，假设是跨域
      return true;
    }
  }

  /**
   * 获取图片文件名
   */
  getImageFilename() {
    if (!this.currentImageUrl) return 'image.jpg';
    
    try {
      const url = new URL(this.currentImageUrl);
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
  }

  /**
   * 降级复制方案
   */
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
  }

  /**
   * 显示通知
   */
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
  }

  /**
   * 隐藏菜单
   */
  hide(menuContainer) {
    if (menuContainer && menuContainer.parentNode) {
      menuContainer.parentNode.removeChild(menuContainer);
    }
  }
}

// 创建全局实例
const imageContextMenu = new ImageContextMenu();

export default imageContextMenu;
