import contextMenu from './contextMenu';

/**
 * 路由工具函数
 * 提供支持右键新标签打开的链接处理功能
 */

/**
 * 处理链接点击，支持右键新标签打开
 * @param {string} path - 路由路径
 * @param {Object} options - 选项
 * @param {boolean} options.forceNewTab - 强制在新标签中打开
 * @param {Object} options.query - 查询参数
 * @param {Object} options.params - 路由参数
 */
export function handleLinkClick(path, options = {}) {
  const { forceNewTab = false, query = {}, params = {} } = options;
  
  // 构建完整的URL
  let fullPath = path;
  
  // 添加查询参数
  if (Object.keys(query).length > 0) {
    const queryString = Object.keys(query)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`)
      .join('&');
    fullPath += `?${queryString}`;
  }
  
  // 如果是强制新标签打开，或者用户按住了Ctrl/Cmd键
  if (forceNewTab || (window.event && (window.event.ctrlKey || window.event.metaKey))) {
    // 在新标签中打开
    window.open(fullPath, '_blank');
  } else {
    // 在当前标签中打开
    // 尝试从Vue实例获取router
    const app = document.querySelector('#app').__vue__;
    if (app && app.$router) {
      app.$router.push(fullPath);
    } else {
      // 如果没有router实例，使用window.location
      window.location.href = fullPath;
    }
  }
}

/**
 * 处理右键菜单事件
 * @param {Event} event - 右键事件
 * @param {string} path - 路由路径
 * @param {Object} options - 选项
 * @param {string} options.text - 链接文本
 * @param {Array} options.menuItems - 自定义菜单项
 */
export function handleContextMenu(event, path, options = {}) {
  const { text = '', menuItems = null } = options;
  
  // 构建完整的URL
  let fullPath = path;
  
  // 添加查询参数
  if (options.query && Object.keys(options.query).length > 0) {
    const queryString = Object.keys(options.query)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(options.query[key])}`)
      .join('&');
    fullPath += `?${queryString}`;
  }
  
  // 显示自定义右键菜单
  contextMenu.show(event, fullPath, {
    text: text,
    menuItems: menuItems
  });
}

/**
 * 创建支持右键新标签打开的链接元素
 * @param {string} path - 路由路径
 * @param {Object} options - 选项
 * @param {string} options.text - 链接文本
 * @param {string} options.className - CSS类名
 * @param {Object} options.query - 查询参数
 * @param {Object} options.params - 路由参数
 * @returns {HTMLElement} 链接元素
 */
export function createLinkElement(path, options = {}) {
  const { text = '链接', className = '', query = {}, params = {} } = options;
  
  const link = document.createElement('a');
  link.href = '#';
  link.textContent = text;
  link.className = className;
  
  // 添加点击事件
  link.addEventListener('click', (e) => {
    e.preventDefault();
    handleLinkClick(path, { query, params });
  });
  
  // 添加右键菜单事件
  link.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    handleLinkClick(path, { forceNewTab: true, query, params });
  });
  
  return link;
}

/**
 * 为元素添加链接功能
 * @param {HTMLElement} element - 要添加链接功能的元素
 * @param {string} path - 路由路径
 * @param {Object} options - 选项
 * @param {Object} options.query - 查询参数
 * @param {Object} options.params - 路由参数
 */
export function addLinkToElement(element, path, options = {}) {
  const { query = {}, params = {} } = options;
  
  // 添加点击事件
  element.addEventListener('click', (e) => {
    e.preventDefault();
    handleLinkClick(path, { query, params });
  });
  
  // 添加右键菜单事件
  element.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    handleLinkClick(path, { forceNewTab: true, query, params });
  });
  
  // 添加鼠标样式
  element.style.cursor = 'pointer';
}

/**
 * 获取当前页面的完整URL
 * @param {string} path - 相对路径
 * @returns {string} 完整URL
 */
export function getFullUrl(path) {
  const baseUrl = window.location.origin;
  return `${baseUrl}${path}`;
}
