// utils/share.js
const DEFAULT_SHARE_INFO = {
  title: 'CarDesignSpace · 最新汽车资讯',
  path: '/pages/home/home',
  imageUrl: '',
  desc: '分享最新汽车设计资讯。'
};

let hasInjectedGlobalShare = false;

// 统一调用以确保右上角分享菜单可见
export const enableShareMenu = () => {
  if (typeof wx?.showShareMenu !== 'function') return;
  wx.showShareMenu({
    withShareTicket: true,
    menus: ['shareAppMessage', 'shareTimeline']
  });
};

// 构造分享数据；空字段由微信客户端忽略
export const buildShareMessage = (overrides = {}) => {
  return {
    ...DEFAULT_SHARE_INFO,
    ...cleanObject(overrides)
  };
};

// 自动为所有页面注入分享能力
export const injectGlobalShareHandlers = () => {
  if (hasInjectedGlobalShare || typeof Page !== 'function') return;
  hasInjectedGlobalShare = true;

  const originalPage = Page;
  Page = function enhancedPage(pageConfig = {}) {
    const {
      onLoad,
      onShareAppMessage,
      onShareTimeline
    } = pageConfig;

    pageConfig.onLoad = function wrappedOnLoad(...args) {
      try {
        enableShareMenu();
      } catch (error) {
        console.warn('显示分享菜单失败:', error);
      }
      if (typeof onLoad === 'function') {
        return onLoad.apply(this, args);
      }
      return undefined;
    };

    pageConfig.onShareAppMessage = function wrappedOnShareAppMessage(...args) {
      if (typeof onShareAppMessage === 'function') {
        return onShareAppMessage.apply(this, args);
      }
      const overrides = deriveShareOverrides(this);
      return buildShareMessage(overrides);
    };

    pageConfig.onShareTimeline = function wrappedOnShareTimeline(...args) {
      if (typeof onShareTimeline === 'function') {
        return onShareTimeline.apply(this, args);
      }
      const overrides = deriveShareOverrides(this);
      return cleanObject({
        title: overrides.title || DEFAULT_SHARE_INFO.title,
        imageUrl: overrides.imageUrl || overrides.image || DEFAULT_SHARE_INFO.imageUrl,
        query: overrides.query || ''
      });
    };

    return originalPage(pageConfig);
  };
};

const deriveShareOverrides = (context) => {
  if (!context) return {};
  if (typeof context.getSharePayload === 'function') {
    const payload = context.getSharePayload();
    if (payload && typeof payload === 'object') {
      return payload;
    }
  }
  if (typeof context.getShareImage === 'function') {
    const imageUrl = context.getShareImage();
    if (imageUrl) {
      return { imageUrl };
    }
  }
  if (context.data && typeof context.data.shareInfo === 'object') {
    return context.data.shareInfo;
  }
  return {};
};

// 过滤 undefined / null，避免覆盖默认配置
const cleanObject = (obj = {}) => {
  const result = {};
  Object.keys(obj).forEach((key) => {
    if (obj[key] !== undefined && obj[key] !== null) {
      result[key] = obj[key];
    }
  });
  return result;
};

