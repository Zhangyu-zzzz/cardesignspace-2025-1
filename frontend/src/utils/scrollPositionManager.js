/**
 * 滚动位置管理器
 * 用于在页面跳转时保存和恢复滚动位置
 */

class ScrollPositionManager {
  constructor() {
    this.positions = new Map(); // 存储不同路由的滚动位置
    this.modelPositions = new Map(); // 存储不同路由的车型ID位置
    this.currentRoute = null;
    this.isRestoring = false; // 防止恢复位置时触发保存
  }

  /**
   * 保存当前页面的滚动位置
   * @param {string} route - 路由路径
   * @param {number} position - 滚动位置
   */
  savePosition(route, position = null) {
    if (this.isRestoring) return;
    
    const scrollPosition = position !== null ? position : this.getCurrentScrollPosition();
    this.positions.set(route, scrollPosition);
    console.log(`保存滚动位置: ${route} -> ${scrollPosition}px`);
  }

  /**
   * 保存车型ID位置信息
   * @param {string} route - 路由路径
   * @param {string} modelId - 车型ID
   * @param {number} position - 滚动位置
   */
  saveModelPosition(route, modelId, position = null) {
    if (this.isRestoring) return;
    
    const scrollPosition = position !== null ? position : this.getCurrentScrollPosition();
    this.modelPositions.set(route, { modelId, position: scrollPosition });
    console.log(`保存车型位置: ${route} -> 车型${modelId} -> ${scrollPosition}px`);
  }

  /**
   * 获取指定路由的滚动位置
   * @param {string} route - 路由路径
   * @returns {number} 滚动位置
   */
  getPosition(route) {
    return this.positions.get(route) || 0;
  }

  /**
   * 获取指定路由的车型位置信息
   * @param {string} route - 路由路径
   * @returns {Object|null} 车型位置信息 {modelId, position}
   */
  getModelPosition(route) {
    return this.modelPositions.get(route) || null;
  }

  /**
   * 恢复指定路由的滚动位置
   * @param {string} route - 路由路径
   * @param {number} delay - 延迟时间（毫秒）
   * @param {number} maxRetries - 最大重试次数
   */
  restorePosition(route, delay = 100, maxRetries = 5) {
    const position = this.getPosition(route);
    if (position > 0) {
      this.isRestoring = true;
      
      const attemptRestore = (retryCount = 0) => {
        setTimeout(() => {
          const currentHeight = document.documentElement.scrollHeight;
          const targetPosition = Math.min(position, currentHeight - window.innerHeight);
          
          // 如果页面高度足够，直接恢复位置
          if (currentHeight >= position + window.innerHeight) {
            this.scrollToPosition(targetPosition);
            console.log(`恢复滚动位置: ${route} -> ${targetPosition}px (尝试 ${retryCount + 1})`);
            
            // 延迟重置标志，确保滚动事件处理完成
            setTimeout(() => {
              this.isRestoring = false;
            }, 50);
          } else if (retryCount < maxRetries) {
            // 页面高度不够，等待内容加载后重试
            console.log(`页面高度不足，等待内容加载... (尝试 ${retryCount + 1}/${maxRetries})`);
            attemptRestore(retryCount + 1);
          } else {
            // 达到最大重试次数，恢复到最后可能的位置
            this.scrollToPosition(targetPosition);
            console.log(`达到最大重试次数，恢复到最后可能位置: ${route} -> ${targetPosition}px`);
            
            setTimeout(() => {
              this.isRestoring = false;
            }, 50);
          }
        }, delay);
      };
      
      attemptRestore();
    }
  }

  /**
   * 获取当前页面的滚动位置
   * @returns {number} 滚动位置
   */
  getCurrentScrollPosition() {
    return window.pageYOffset || document.documentElement.scrollTop || 0;
  }

  /**
   * 滚动到指定位置
   * @param {number} position - 滚动位置
   */
  scrollToPosition(position) {
    window.scrollTo({
      top: position,
      behavior: 'auto' // 使用瞬间滚动，避免动画干扰
    });
  }

  /**
   * 清除指定路由的滚动位置
   * @param {string} route - 路由路径
   */
  clearPosition(route) {
    this.positions.delete(route);
    this.modelPositions.delete(route);
  }

  /**
   * 清除所有滚动位置
   */
  clearAllPositions() {
    this.positions.clear();
    this.modelPositions.clear();
  }

  /**
   * 设置当前路由
   * @param {string} route - 路由路径
   */
  setCurrentRoute(route) {
    this.currentRoute = route;
  }

  /**
   * 获取当前路由
   * @returns {string} 当前路由
   */
  getCurrentRoute() {
    return this.currentRoute;
  }

  /**
   * 在路由变化时自动保存当前位置
   * @param {string} newRoute - 新路由
   */
  onRouteChange(newRoute) {
    // 保存当前路由的滚动位置
    if (this.currentRoute) {
      this.savePosition(this.currentRoute);
    }
    
    // 设置新路由
    this.setCurrentRoute(newRoute);
  }

  /**
   * 在页面加载时自动恢复位置
   * @param {string} route - 路由路径
   */
  onPageLoad(route) {
    this.setCurrentRoute(route);
    this.restorePosition(route);
  }
}

// 创建全局实例
const scrollPositionManager = new ScrollPositionManager();

export default scrollPositionManager;
