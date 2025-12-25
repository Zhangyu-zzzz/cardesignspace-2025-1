import scrollPositionManager from './scrollPositionManager';

/**
 * 滚动位置管理 Mixin
 * 为Vue组件提供滚动位置记忆功能
 */
export const scrollPositionMixin = {
  mounted() {
    // 不在这里自动恢复，让组件自己控制恢复时机
    // 这样可以避免与数据加载冲突
  },

  beforeDestroy() {
    // ⭐ 禁用滚动位置保存，提升性能
    // 不再保存滚动位置
    // this.saveScrollPosition();
  },

  watch: {
    // 监听路由变化
    '$route'(to, from) {
      if (from.path !== to.path) {
        // ⭐ 禁用滚动位置恢复功能，提升页面切换性能
        // 不再保存和恢复滚动位置，让页面始终从顶部开始
        // scrollPositionManager.savePosition(from.path);
        // 不再自动恢复滚动位置
        // this.$nextTick(() => {
        //   setTimeout(() => {
        //     this.restoreScrollPosition();
        //   }, 100);
        // });
      }
    }
  },

  methods: {
    /**
     * 保存当前页面的滚动位置
     */
    saveScrollPosition() {
      if (this.$route) {
        scrollPositionManager.savePosition(this.$route.path);
      }
    },

    /**
     * 恢复当前页面的滚动位置
     */
    restoreScrollPosition() {
      if (this.$route) {
        scrollPositionManager.restorePosition(this.$route.path);
      }
    },

    /**
     * 清除当前页面的滚动位置
     */
    clearScrollPosition() {
      if (this.$route) {
        scrollPositionManager.clearPosition(this.$route.path);
      }
    },

    /**
     * 滚动到页面顶部
     */
    scrollToTop() {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    },

    /**
     * 滚动到指定位置
     * @param {number} position - 滚动位置
     * @param {boolean} smooth - 是否平滑滚动
     */
    scrollToPosition(position, smooth = false) {
      window.scrollTo({
        top: position,
        behavior: smooth ? 'smooth' : 'auto'
      });
    },

    /**
     * 等待内容加载完成后恢复滚动位置
     * @param {number} maxWaitTime - 最大等待时间（毫秒）
     * @param {number} checkInterval - 检查间隔（毫秒）
     */
    waitForContentAndRestore(maxWaitTime = 3000, checkInterval = 100) {
      const startTime = Date.now();
      const route = this.$route.path;
      const targetPosition = scrollPositionManager.getPosition(route);
      
      console.log(`尝试恢复滚动位置 - 路由: ${route}, 目标位置: ${targetPosition}px`);
      
      if (targetPosition <= 0) {
        console.log('没有保存的滚动位置，跳过恢复');
        return;
      }
      
      const checkContent = () => {
        const currentTime = Date.now();
        const currentHeight = document.documentElement.scrollHeight;
        const targetHeight = targetPosition + window.innerHeight;
        const elapsedTime = currentTime - startTime;
        
        console.log(`检查内容加载状态 - 当前高度: ${currentHeight}px, 目标高度: ${targetHeight}px, 已等待: ${elapsedTime}ms`);
        
        // 如果页面高度足够或者超时，恢复位置
        if (currentHeight >= targetHeight || elapsedTime > maxWaitTime) {
          const finalPosition = Math.min(targetPosition, currentHeight - window.innerHeight);
          this.scrollToPosition(finalPosition);
          console.log(`✅ 恢复滚动位置成功: ${finalPosition}px (等待了 ${elapsedTime}ms)`);
        } else {
          // 继续等待
          console.log(`⏳ 页面高度不足，继续等待... (${elapsedTime}/${maxWaitTime}ms)`);
          setTimeout(checkContent, checkInterval);
        }
      };
      
      checkContent();
    }
  }
};

export default scrollPositionMixin;
