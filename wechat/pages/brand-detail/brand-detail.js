// pages/brand-detail/brand-detail.js
import { brandAPI, modelAPI } from '../../utils/api';

function getModelYear(model) {
  if (!model) return 0;
  if (model.year) {
    const num = parseInt(model.year, 10);
    if (!Number.isNaN(num)) return num;
  }
  const source = model.name || '';
  const match = source.match(/(19|20)\d{2}/);
  if (match) return parseInt(match[0], 10);
  return 0;
}

const modelCache = {};
const CACHE_TTL = 5 * 60 * 1000; // 5分钟

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
    brand: null,
    models: [],
    loading: true,
    modelsLoading: true,
    error: null,
    // 分页相关
    page: 1,
    limit: 12,
    hasMore: true,
    loadingMore: false
  },

  onLoad(options) {
    this.brandId = options.id;
    if (this.brandId) {
      this.loadBrandDetail(this.brandId);
      this.loadModels(this.brandId, true);
    }
  },

  // 加载品牌详情
  async loadBrandDetail(brandId) {
    this.setData({ loading: true, error: null });
    
    try {
      const res = await brandAPI.getById(brandId);
      const brand = res.data || res;
      
      this.setData({ brand: brand });
      
      wx.setNavigationBarTitle({
        title: brand.name || '品牌详情'
      });
    } catch (error) {
      console.error('加载品牌详情失败:', error);
      this.setData({ error: error.message || '加载失败' });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 加载品牌下的车型
  async loadModels(brandId, reset = false) {
    if (!brandId) return;
    
    if (reset) {
      const cached = modelCache[brandId];
      if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        console.log('使用品牌车型缓存数据');
        this.setData({
          models: cached.models,
          loading: false,
          modelsLoading: false,
          hasMore: false,
          page: cached.page
        });
        return;
      }
    }
    
    if (reset) {
      this.setData({
        page: 1,
        models: [],
        hasMore: true,
        loading: true,
        modelsLoading: true,
        error: null
      });
    } else if (!this.data.hasMore) {
      return;
    }
    
    try {
      const allModels = [];
      let page = 1;
      const limit = this.data.limit;
      let hasMore = true;
      
      while (hasMore) {
        const params = {
          brandId,
          page,
          limit,
          sortBy: 'createdAt',
          sortOrder: 'desc',
          includeImages: 'true'
        };
        
        const res = await modelAPI.getAll(params);
        let modelsData = [];
        let pagination = null;
        
        if (Array.isArray(res)) {
          modelsData = res;
        } else if (res.data && Array.isArray(res.data)) {
          modelsData = res.data;
          pagination = res.pagination;
        } else if (res.data && res.data.data && Array.isArray(res.data.data)) {
          modelsData = res.data.data;
          pagination = res.data.pagination;
        } else {
          modelsData = [];
        }
        
        if (modelsData.length === 0) {
          hasMore = false;
          break;
        }
        
        const processed = modelsData.map((item, index) => {
          const imageUrl = getBestImageUrl(item);
          const yearValue = getModelYear(item);
          return {
            ...item,
            _key: item.id || `model_${allModels.length + index}`,
            _imageUrl: imageUrl,
            _yearSort: yearValue
          };
        });
        
        allModels.push(...processed);
        
        if (pagination && pagination.pages) {
          hasMore = page < pagination.pages;
        } else {
          hasMore = modelsData.length === limit;
        }
        
        page += 1;
      }
      
      const uniqueMap = new Map();
      for (const model of allModels) {
        if (!uniqueMap.has(model.id)) {
          uniqueMap.set(model.id, model);
        }
      }
      const uniqueModels = Array.from(uniqueMap.values());
      
      uniqueModels.sort((a, b) => {
        if ((b._yearSort || 0) !== (a._yearSort || 0)) {
          return (b._yearSort || 0) - (a._yearSort || 0);
        }
        return (a.name || '').localeCompare(b.name || '');
      });
      
      this.setData({
        models: uniqueModels,
        hasMore: false,
        loading: false,
        modelsLoading: false,
        loadingMore: false,
        page
      });
      
      modelCache[brandId] = {
        models: uniqueModels,
        timestamp: Date.now(),
        page
      };
    } catch (error) {
      console.error('加载车型失败:', error);
      this.setData({
        error: error.message || '加载车型失败',
        loading: false,
        modelsLoading: false,
        loadingMore: false
      });
    }
  },

  // 重试加载
  retryLoad() {
    if (this.brandId) {
      this.loadBrandDetail(this.brandId);
      this.loadModels(this.brandId, true);
    }
  },

  // 查看车型详情
  viewModelDetail(e) {
    const modelId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/model-detail/model-detail?id=${modelId}`
    });
  },
  
  onReachBottom() {
    // 已一次性加载全部车型，不再处理滚动加载
  }
});

