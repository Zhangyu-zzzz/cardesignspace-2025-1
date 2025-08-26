/**
 * 自定义右键菜单工具
 */

// 菜单项配置
const defaultMenuItems = [
  {
    id: 'new-tab',
    label: '在新标签页中打开链接',
    icon: 'el-icon-folder-opened',
    action: 'new-tab'
  },
  {
    id: 'new-window',
    label: '在新窗口中打开链接',
    icon: 'el-icon-folder-add',
    action: 'new-window'
  },
  {
    id: 'incognito',
    label: '在隐身窗口中打开链接',
    icon: 'el-icon-view',
    action: 'incognito'
  },
  { type: 'separator' },
  {
    id: 'copy-link',
    label: '复制链接地址',
    icon: 'el-icon-document-copy',
    action: 'copy-link'
  },
  {
    id: 'copy-text',
    label: '复制',
    icon: 'el-icon-copy-document',
    action: 'copy-text'
  }
];

class ContextMenu {
  constructor() {
    this.menu = null;
    this.currentPath = null;
    this.currentText = null;
    this.currentElement = null;
    this.isVisible = false;
    
    this.init();
  }

  init() {
    // 创建菜单元素
    this.createMenuElement();
    
    // 绑定全局事件
    this.bindGlobalEvents();
  }

  createMenuElement() {
    this.menu = document.createElement('div');
    this.menu.className = 'custom-context-menu';
    this.menu.style.cssText = `
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
      display: none;
      user-select: none;
    `;
    
    document.body.appendChild(this.menu);
  }

  bindGlobalEvents() {
    // 点击其他地方关闭菜单
    document.addEventListener('click', (e) => {
      if (!this.menu.contains(e.target)) {
        this.hide();
      }
    });

    // ESC键关闭菜单
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hide();
      }
    });

    // 窗口大小改变时关闭菜单
    window.addEventListener('resize', () => {
      this.hide();
    });
  }

  show(event, path, options = {}) {
    event.preventDefault();
    event.stopPropagation();

    this.currentPath = path;
    this.currentText = options.text || '';
    this.currentElement = event.target;

    // 构建菜单内容
    this.buildMenu(options.menuItems || defaultMenuItems);

    // 计算菜单位置
    const rect = this.menu.getBoundingClientRect();
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

    // 设置菜单位置
    this.menu.style.left = `${x}px`;
    this.menu.style.top = `${y}px`;
    this.menu.style.display = 'block';
    this.isVisible = true;
  }

  buildMenu(menuItems) {
    this.menu.innerHTML = '';

    menuItems.forEach(item => {
      if (item.type === 'separator') {
        const separator = document.createElement('div');
        separator.className = 'menu-separator';
        separator.style.cssText = `
          height: 1px;
          background: #e5e7eb;
          margin: 4px 0;
        `;
        this.menu.appendChild(separator);
        return;
      }

      const menuItem = document.createElement('div');
      menuItem.className = 'menu-item';
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
        this.hide();
      });

      this.menu.appendChild(menuItem);
    });
  }

  handleMenuItemClick(item) {
    switch (item.action) {
      case 'new-tab':
        this.openInNewTab();
        break;
      case 'new-window':
        this.openInNewWindow();
        break;
      case 'incognito':
        this.openInIncognito();
        break;
      case 'copy-link':
        this.copyLink();
        break;
      case 'copy-text':
        this.copyText();
        break;
      default:
        if (item.handler) {
          item.handler(this.currentPath, this.currentText, this.currentElement);
        }
    }
  }

  openInNewTab() {
    if (this.currentPath) {
      window.open(this.currentPath, '_blank');
    }
  }

  openInNewWindow() {
    if (this.currentPath) {
      window.open(this.currentPath, '_blank', 'width=1200,height=800');
    }
  }

  openInIncognito() {
    // 注意：由于浏览器安全限制，无法直接打开隐身窗口
    // 这里显示一个提示
    this.showNotification('由于浏览器安全限制，无法直接打开隐身窗口。请手动打开隐身窗口后访问链接。');
    this.openInNewTab(); // 作为备选方案，在新标签中打开
  }

  copyLink() {
    if (this.currentPath) {
      navigator.clipboard.writeText(this.currentPath).then(() => {
        this.showNotification('链接已复制到剪贴板');
      }).catch(() => {
        // 降级方案
        this.fallbackCopy(this.currentPath);
      });
    }
  }

  copyText() {
    if (this.currentText) {
      navigator.clipboard.writeText(this.currentText).then(() => {
        this.showNotification('文本已复制到剪贴板');
      }).catch(() => {
        this.fallbackCopy(this.currentText);
      });
    }
  }

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

  showNotification(message) {
    // 创建通知元素
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
    
    // 3秒后自动移除
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }

  hide() {
    if (this.menu) {
      this.menu.style.display = 'none';
      this.isVisible = false;
    }
  }

  destroy() {
    if (this.menu && this.menu.parentNode) {
      this.menu.parentNode.removeChild(this.menu);
    }
  }
}

// 创建全局实例
const contextMenu = new ContextMenu();

export default contextMenu;
