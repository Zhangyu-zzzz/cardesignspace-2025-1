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
   */
  show(event, imageUrl, options = {}) {
    event.preventDefault();
    event.stopPropagation();

    this.currentImageUrl = imageUrl;
    this.currentImageElement = event.target;
    this.currentImageTitle = options.title || '图片';

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
      // 创建一个canvas来复制图片
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // 等待图片加载完成
      if (!this.currentImageElement.complete) {
        await new Promise((resolve) => {
          this.currentImageElement.onload = resolve;
        });
      }
      
      canvas.width = this.currentImageElement.naturalWidth;
      canvas.height = this.currentImageElement.naturalHeight;
      ctx.drawImage(this.currentImageElement, 0, 0);
      
      // 将canvas转换为blob
      canvas.toBlob(async (blob) => {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({
              [blob.type]: blob
            })
          ]);
          this.showNotification('图片已复制到剪贴板');
        } catch (err) {
          this.showNotification('复制图片失败，请使用复制图片地址');
        }
      });
    } catch (err) {
      this.showNotification('复制图片失败，请使用复制图片地址');
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
