import { handleLinkClick, handleContextMenu } from './routerUtils';

/**
 * Vue指令：支持右键新标签打开的链接
 * 使用方法：
 * v-link="{ path: '/brand/1', query: { tab: 'models' } }"
 * 或者简写：
 * v-link="'/brand/1'"
 */
export const linkDirective = {
  bind(el, binding) {
    const value = binding.value;
    let path, options = {};
    
    if (typeof value === 'string') {
      path = value;
    } else if (typeof value === 'object') {
      path = value.path;
      options = { ...value };
      delete options.path;
    } else {
      console.warn('v-link指令需要字符串或对象参数');
      return;
    }
    
    if (!path) {
      console.warn('v-link指令缺少path参数');
      return;
    }
    
    // 存储路径和选项到元素上
    el._linkPath = path;
    el._linkOptions = options;
    
    // 添加点击事件
    el.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleLinkClick(path, options);
    });
    
    // 添加右键菜单事件
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleContextMenu(e, path, options);
    });
    
    // 添加鼠标样式
    el.style.cursor = 'pointer';
    
    // 添加键盘事件支持（Ctrl+点击）
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const isCtrlPressed = e.ctrlKey || e.metaKey;
        handleLinkClick(path, { ...options, forceNewTab: isCtrlPressed });
      }
    });
    
    // 设置tabindex以支持键盘导航
    if (!el.hasAttribute('tabindex')) {
      el.setAttribute('tabindex', '0');
    }
  },
  
  update(el, binding) {
    // 更新时重新绑定
    const value = binding.value;
    let path, options = {};
    
    if (typeof value === 'string') {
      path = value;
    } else if (typeof value === 'object') {
      path = value.path;
      options = { ...value };
      delete options.path;
    }
    
    if (path && path !== el._linkPath) {
      el._linkPath = path;
      el._linkOptions = options;
    }
  },
  
  unbind(el) {
    // 清理事件监听器
    el.removeEventListener('click', el._linkClickHandler);
    el.removeEventListener('contextmenu', el._linkContextMenuHandler);
    el.removeEventListener('keydown', el._linkKeydownHandler);
    
    // 移除存储的数据
    delete el._linkPath;
    delete el._linkOptions;
  }
};

/**
 * 全局注册指令
 */
export function installLinkDirective(Vue) {
  Vue.directive('link', linkDirective);
}
