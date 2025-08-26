import { handleLinkClick, handleContextMenu } from './routerUtils';

/**
 * Vue Mixin：提供支持右键新标签打开的链接方法
 * 使用方法：
 * 在组件中混入此mixin，然后使用 this.$linkTo(path, options) 方法
 */
export const linkMixin = {
  methods: {
    /**
     * 导航到指定路径，支持右键新标签打开
     * @param {string} path - 路由路径
     * @param {Object} options - 选项
     * @param {boolean} options.forceNewTab - 强制在新标签中打开
     * @param {Object} options.query - 查询参数
     * @param {Object} options.params - 路由参数
     */
    $linkTo(path, options = {}) {
      handleLinkClick(path, options);
    },
    
    /**
     * 在新标签中打开链接
     * @param {string} path - 路由路径
     * @param {Object} options - 选项
     */
    $linkToNewTab(path, options = {}) {
      this.$linkTo(path, { ...options, forceNewTab: true });
    },
    
    /**
     * 处理链接点击事件
     * @param {Event} event - 点击事件
     * @param {string} path - 路由路径
     * @param {Object} options - 选项
     */
    $handleLinkClick(event, path, options = {}) {
      event.preventDefault();
      event.stopPropagation();
      
      // 检查是否按住了Ctrl/Cmd键
      const isCtrlPressed = event.ctrlKey || event.metaKey;
      this.$linkTo(path, { ...options, forceNewTab: isCtrlPressed });
    },
    
    /**
     * 处理右键菜单事件
     * @param {Event} event - 右键事件
     * @param {string} path - 路由路径
     * @param {Object} options - 选项
     */
    $handleLinkContextMenu(event, path, options = {}) {
      handleContextMenu(event, path, options);
    }
  }
};

/**
 * 全局混入
 */
export function installLinkMixin(Vue) {
  Vue.mixin(linkMixin);
}
