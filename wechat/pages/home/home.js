// pages/home/home.js
import { modelAPI } from '../../utils/api';
import { getOptimizedImageUrl } from '../../utils/util';
import { enableShareMenu, buildShareMessage } from '../../utils/share';

function getModelYear(model) {
  if (!model) return 0;
  if (model.year) {
    const num = parseInt(model.year, 10);
    if (!Number.isNaN(num)) {
      return num;
    }
  }
  const source = model.name || '';
  const match = source.match(/(19|20)\d{2}/);
  if (match) {
    return parseInt(match[0], 10);
  }
  return 0;
}

function getBestImageUrl(model) {
  if (!model) return '';
  if (model.Images && Array.isArray(model.Images) && model.Images.length > 0) {
    const image = model.Images[0];
    if (image) {
      return (
        image.mediumUrl ||
        image.medium_url ||
        image.url ||
        image.image_url ||
        image.thumbnailUrl ||
        image.thumbnail_url ||
        ''
      );
    }
  }
  if (model.image) return model.image;
  if (model.Brand && model.Brand.logo) return model.Brand.logo;
  return '';
}

Page({
  data: {
    carouselItems: [],
    currentSlide: 0,
    latestModels: [],
    loading: true,
    error: null,
    isDomainError: false,  // 标记是否为域名错误
    // 分页相关
    currentPage: 1,
    pageSize: 20,
    hasMoreModels: true,
    loadingMore: false
  },

  onLoad() {
    console.log('首页 onLoad 触发');
    console.log('当前页面路径:', getCurrentPages());
    this.initShareConfig();
    this.loadData();
  },

  onShow() {
    // 只在首次显示时加载，避免重复加载
    // 如果需要刷新，可以手动下拉刷新
  },

  // 加载数据
  async loadData() {
    console.log('=== 开始加载首页数据 ===');
    this.setData({ loading: true, error: null });
    
    try {
      // 分别加载，避免一个失败影响另一个
      // 重置分页状态
      this.setData({
        currentPage: 1,
        hasMoreModels: true,
        loadingMore: false
      });
      
      const results = await Promise.allSettled([
        this.loadLatestModels(true)  // 重置加载
        // 已移除中国品牌部分
        // this.loadChineseBrands()
      ]);
      
      // 检查是否有失败
      const errors = results.filter(r => r.status === 'rejected');
      if (errors.length > 0) {
        console.warn('部分数据加载失败:', errors);
        // 如果两个都失败，才显示错误
        if (errors.length === 2) {
          const errorMsg = errors[0].reason?.message || '数据加载失败';
          this.setData({ error: errorMsg });
          wx.showToast({
            title: errorMsg,
            icon: 'none',
            duration: 3000
          });
        }
      }
      
      console.log('=== 首页数据加载完成 ===');
      console.log('当前数据状态:', {
        carouselItems: this.data.carouselItems.length,
        latestModels: this.data.latestModels.length
      });
    } catch (error) {
      console.error('加载数据失败:', error);
      console.error('错误堆栈:', error.stack);
      
      let errorMsg = error.message || '加载失败，请检查网络连接';
      let isDomainError = false;
      
      // 如果是域名问题，给出更明确的提示
      if (error.message && (error.message.includes('域名') || error.message.includes('domain') || error.message.includes('不在以下'))) {
        errorMsg = '域名未配置！请在微信公众平台配置合法域名：https://www.cardesignspace.com';
        isDomainError = true;
      }
      
      this.setData({ error: errorMsg, isDomainError: isDomainError });
      
      // 真机上显示错误提示（延长显示时间）
      wx.showToast({
        title: errorMsg.length > 20 ? errorMsg.substring(0, 20) + '...' : errorMsg,
        icon: 'none',
        duration: 5000
      });
      
      // 在控制台输出详细错误信息
      console.error('=== 错误详情 ===');
      console.error('错误消息:', errorMsg);
      console.error('如果是域名问题，请参考：wechat/真机调试问题排查.md');
    } finally {
      this.setData({ loading: false });
      console.log('=== 加载状态结束 ===');
      console.log('最终页面状态:', {
        loading: this.data.loading,
        error: this.data.error,
        hasCarousel: this.data.carouselItems.length > 0,
        hasModels: this.data.latestModels.length > 0
      });
    }
  },

  // 加载最新车型（支持分页）
  async loadLatestModels(reset = false) {
    try {
      // 如果是重置，重置分页状态
      if (reset) {
        this.setData({
          currentPage: 1,
          hasMoreModels: true,
          latestModels: []
        });
      }
      
      // 如果正在加载更多或没有更多数据，直接返回
      if (this.data.loadingMore || !this.data.hasMoreModels) {
        console.log('跳过加载：', { loadingMore: this.data.loadingMore, hasMoreModels: this.data.hasMoreModels });
        return;
      }
      
      // 设置加载状态
      this.setData({ loadingMore: true });
      
      console.log(`开始加载最新车型，第 ${this.data.currentPage} 页...`);
      const app = getApp();
      console.log('API Base URL:', app.globalData.apiBaseUrl);
      
      // 请求参数：确保获取最新上传的车型
      const requestParams = {
        page: this.data.currentPage,
        limit: this.data.pageSize,
        latest: 'true',
        sortBy: 'createdAt',  // 按创建时间排序
        sortOrder: 'desc'     // 降序，最新的在前
      };
      
      // 如果是第一页，需要获取至少6个车型用于轮播图
      if (this.data.currentPage === 1) {
        requestParams.limit = Math.max(this.data.pageSize, 6);
      }
      
      console.log('请求参数:', requestParams);
      const res = await modelAPI.getAll({ ...requestParams });
      
      console.log('车型数据响应:', res);
      console.log('响应类型:', typeof res);
      console.log('响应是否为数组:', Array.isArray(res));
      
      // 处理不同的响应格式
      let models = [];
      let pagination = null;
      
      if (Array.isArray(res)) {
        models = res;
      } else if (res.data && Array.isArray(res.data)) {
        models = res.data;
        pagination = res.pagination;
      } else if (res.data && res.data.data && Array.isArray(res.data.data)) {
        models = res.data.data;
        pagination = res.data.pagination;
      }
      
      console.log('解析后的车型数量:', models.length);
      
      if (!Array.isArray(models)) {
        console.error('车型数据格式错误，不是数组:', models);
        throw new Error('车型数据格式错误');
      }
      
      // 处理车型数据，添加_key和_imageUrl，并按创建时间排序
      const processedModels = models.map((model, index) => {
        const imageUrl = getBestImageUrl(model);
        const yearValue = getModelYear(model);
        return {
          ...model,
          _key: model.id || `model_${this.data.latestModels.length + index}`,
          _imageUrl: imageUrl,
          // 添加排序用的时间戳
          _sortTime: new Date(model.createdAt || model.created_at || 0).getTime(),
          _yearSort: yearValue
        };
      });
      
      // 按创建时间降序排序，确保最新的在前
      processedModels.sort((a, b) => {
        if (b._sortTime !== a._sortTime) {
          return b._sortTime - a._sortTime; // 按上传时间
        }
        if (b._yearSort !== a._yearSort) {
          return b._yearSort - a._yearSort; // 同一时间按年份
        }
        return (a.name || '').localeCompare(b.name || ''); // 再按名称
      });
      
      // 如果是第一页，设置轮播图（取最新上传的6个）
      if (this.data.currentPage === 1 && processedModels.length > 0) {
        // 取前6个作为轮播图（已经排序过了）
        const carouselItems = processedModels.slice(0, 6).map((model, index) => ({
          ...model,
          type: 'model'
        }));
        
        console.log('设置轮播图，数量:', carouselItems.length);
        this.setData({ 
          carouselItems: carouselItems,
          currentSlide: 0  // 重置到第一张
        });
      }
      
      // 追加到现有列表，并去重
      let newModels = [];
      if (this.data.currentPage === 1) {
        newModels = processedModels;
      } else {
        // 合并现有列表和新数据，并去重（基于id）
        const existingIds = new Set(this.data.latestModels.map(m => m.id));
        const uniqueNewModels = processedModels.filter(m => !existingIds.has(m.id));
        newModels = [...this.data.latestModels, ...uniqueNewModels];
        console.log(`去重后新增 ${uniqueNewModels.length} 个车型，当前共 ${newModels.length} 个`);
      }
      
      // 判断是否还有更多数据
      let hasMore = true;
      if (pagination) {
        hasMore = this.data.currentPage < pagination.pages;
      } else {
        // 如果没有分页信息，根据返回的数据量判断
        hasMore = models.length === this.data.pageSize;
      }
      
      this.setData({
        latestModels: newModels,
        hasMoreModels: hasMore,
        currentPage: this.data.currentPage + 1,
        loadingMore: false
      });
      
      console.log(`车型数据设置完成，当前共 ${newModels.length} 个车型，还有更多: ${hasMore}`);
    } catch (error) {
      console.error('加载最新车型失败:', error);
      console.error('错误详情:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      this.setData({ loadingMore: false });
      
      // 如果是第一页加载失败，设置空数组
      if (this.data.currentPage === 1) {
        this.setData({
          latestModels: [],
          carouselItems: []
        });
        // 抛出错误，让 loadData 知道失败了
        throw error;
      }
    }
  },

  // 加载中国品牌
  async loadChineseBrands() {
    try {
      console.log('开始加载品牌...');
      const app = getApp();
      console.log('API Base URL:', app.globalData.apiBaseUrl);
      
      const res = await brandAPI.getAll();
      console.log('品牌数据响应:', res);
      console.log('响应类型:', typeof res);
      console.log('响应是否为数组:', Array.isArray(res));
      
      const brands = res.data || res || [];
      console.log('解析后的品牌数量:', brands.length);
      
      if (!Array.isArray(brands)) {
        console.error('品牌数据格式错误，不是数组:', brands);
        throw new Error('品牌数据格式错误');
      }
      
      // 筛选中国品牌
      const chineseBrands = brands.filter(brand => 
        brand.country === '中国' || 
        brand.country === 'China' ||
        ['比亚迪', '吉利', '长城', '奇瑞', '长安', '上汽', '一汽', '广汽', '东风', '北汽'].includes(brand.name)
      );
      
      const brandsWithKey = chineseBrands.slice(0, 12).map((brand, index) => ({
        ...brand,
        _key: brand.id || `brand_${index}`
      }));
      
      this.setData({ chineseBrands: brandsWithKey });
      console.log('品牌数据设置完成');
    } catch (error) {
      console.error('加载品牌失败:', error);
      console.error('错误详情:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      // 设置空数组避免页面报错
      this.setData({ chineseBrands: [] });
      
      // 抛出错误，让 loadData 知道失败了
      throw error;
    }
  },

  // 轮播图切换事件（swiper 自动触发）
  onSwiperChange(e) {
    const current = e.detail.current;
    this.setData({ currentSlide: current });
    console.log('轮播图切换到第', current + 1, '张');
  },

  // 查看车型详情
  viewModelDetail(e) {
    const modelId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/model-detail/model-detail?id=${modelId}`
    });
  },

  // 查看品牌详情
  viewBrandDetail(e) {
    const brandId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/brand-detail/brand-detail?id=${brandId}`
    });
  },

  // 搜索
  onSearch() {
    wx.navigateTo({
      url: '/pages/search/search'
    });
  },

  // 滚动到底部，加载更多
  onReachBottom() {
    console.log('滚动到底部，准备加载更多车型');
    console.log('当前状态:', {
      hasMoreModels: this.data.hasMoreModels,
      loadingMore: this.data.loadingMore,
      loading: this.data.loading,
      currentPage: this.data.currentPage
    });
    
    if (this.data.hasMoreModels && !this.data.loadingMore && !this.data.loading) {
      this.loadLatestModels(false);
    } else {
      console.log('跳过加载更多:', {
        hasMoreModels: this.data.hasMoreModels,
        loadingMore: this.data.loadingMore,
        loading: this.data.loading
      });
    }
  },

  // 获取优化图片URL
  getOptimizedImageUrl,

  initShareConfig() {
    try {
      enableShareMenu();
    } catch (error) {
      console.warn('初始化分享菜单失败:', error);
    }
  },

  getShareImage() {
    const { carouselItems, latestModels } = this.data;
    if (carouselItems && carouselItems.length > 0) {
      const firstCarousel = carouselItems[0];
      return firstCarousel._imageUrl || firstCarousel.image || firstCarousel._fallbackImage || '';
    }
    if (latestModels && latestModels.length > 0) {
      const firstModel = latestModels[0];
      return firstModel._imageUrl || firstModel.image || firstModel._fallbackImage || '';
    }
    return '';
  },

  onShareAppMessage() {
    const imageUrl = this.getShareImage();
    return buildShareMessage({
      title: 'CarDesignSpace · 最新概念车速览',
      path: '/pages/home/home',
      imageUrl
    });
  },

  onShareTimeline() {
    const imageUrl = this.getShareImage();
    return {
      title: 'CarDesignSpace · 最新概念车速览',
      imageUrl
    };
  },

  onUnload() {
    this.stopAutoPlay();
  },

  // 车型图片加载错误处理
  onModelImageError(e) {
    const index = e.currentTarget.dataset.index;
    const models = this.data.latestModels;
    if (models[index] && models[index].Brand && models[index].Brand.logo) {
      // 如果车型图片加载失败，尝试使用品牌logo
      models[index]._fallbackImage = models[index].Brand.logo;
      this.setData({
        'latestModels': models
      });
    }
  },

  // 品牌图片加载错误处理（已移除中国品牌部分，保留函数以防其他地方调用）
  onBrandImageError(e) {
    // 已移除中国品牌部分，此函数不再使用
  },

  // 轮播图图片加载错误处理
  onCarouselImageError(e) {
    const index = e.currentTarget.dataset.index;
    const items = this.data.carouselItems;
    if (items[index] && items[index].Brand && items[index].Brand.logo) {
      // 如果轮播图图片加载失败，尝试使用品牌logo
      items[index]._fallbackImage = items[index].Brand.logo;
      this.setData({
        'carouselItems': items
      });
    }
  }
});

