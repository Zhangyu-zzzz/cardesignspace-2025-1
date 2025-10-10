const NodeCache = require('node-cache');

// 创建缓存实例
const cache = new NodeCache({
  stdTTL: 300,        // 默认5分钟过期
  checkperiod: 60,    // 检查过期键的间隔
  useClones: false,   // 不克隆对象，提高性能
  maxKeys: 1000       // 最大缓存键数
});

// 缓存键前缀
const CACHE_PREFIXES = {
  IMAGES: 'images:',
  FILTERED_IMAGES: 'filtered_images:',
  BRANDS: 'brands:',
  MODELS: 'models:',
  POPULAR_TAGS: 'popular_tags:',
  STYLE_TAGS: 'style_tags:',
  IMAGE_VARIANTS: 'image_variants:'
};

class CacheService {
  /**
   * 生成缓存键
   */
  static generateKey(prefix, ...params) {
    return prefix + params.join(':');
  }

  /**
   * 获取缓存
   */
  static get(key) {
    try {
      return cache.get(key);
    } catch (error) {
      console.warn('缓存获取失败:', error.message);
      return undefined;
    }
  }

  /**
   * 设置缓存
   */
  static set(key, value, ttl = 300) {
    try {
      return cache.set(key, value, ttl);
    } catch (error) {
      console.warn('缓存设置失败:', error.message);
      return false;
    }
  }

  /**
   * 删除缓存
   */
  static del(key) {
    try {
      return cache.del(key);
    } catch (error) {
      console.warn('缓存删除失败:', error.message);
      return false;
    }
  }

  /**
   * 批量删除缓存
   */
  static delPattern(pattern) {
    try {
      const keys = cache.keys();
      const matchingKeys = keys.filter(key => key.includes(pattern));
      if (matchingKeys.length > 0) {
        return cache.del(matchingKeys);
      }
      return true;
    } catch (error) {
      console.warn('批量删除缓存失败:', error.message);
      return false;
    }
  }

  /**
   * 清空所有缓存
   */
  static flush() {
    try {
      cache.flushAll();
      return true;
    } catch (error) {
      console.warn('清空缓存失败:', error.message);
      return false;
    }
  }

  /**
   * 获取缓存统计信息
   */
  static getStats() {
    try {
      return cache.getStats();
    } catch (error) {
      console.warn('获取缓存统计失败:', error.message);
      return null;
    }
  }

  // 图片相关缓存方法
  static getImages(page, limit, filters) {
    const key = this.generateKey(
      CACHE_PREFIXES.FILTERED_IMAGES,
      page,
      limit,
      JSON.stringify(filters)
    );
    return this.get(key);
  }

  static setImages(page, limit, filters, data, ttl = 300) {
    const key = this.generateKey(
      CACHE_PREFIXES.FILTERED_IMAGES,
      page,
      limit,
      JSON.stringify(filters)
    );
    return this.set(key, data, ttl);
  }

  static invalidateImages() {
    return this.delPattern(CACHE_PREFIXES.FILTERED_IMAGES);
  }

  // 品牌缓存方法
  static getBrands() {
    return this.get(CACHE_PREFIXES.BRANDS);
  }

  static setBrands(data, ttl = 600) {
    return this.set(CACHE_PREFIXES.BRANDS, data, ttl);
  }

  // 热门标签缓存方法
  static getPopularTags(limit) {
    const key = this.generateKey(CACHE_PREFIXES.POPULAR_TAGS, limit);
    return this.get(key);
  }

  static setPopularTags(limit, data, ttl = 600) {
    const key = this.generateKey(CACHE_PREFIXES.POPULAR_TAGS, limit);
    return this.set(key, data, ttl);
  }

  // 风格标签缓存方法
  static getStyleTags() {
    return this.get(CACHE_PREFIXES.STYLE_TAGS);
  }

  static setStyleTags(data, ttl = 600) {
    return this.set(CACHE_PREFIXES.STYLE_TAGS, data, ttl);
  }

  // 图片变体缓存方法
  static getImageVariants(imageId) {
    const key = this.generateKey(CACHE_PREFIXES.IMAGE_VARIANTS, imageId);
    return this.get(key);
  }

  static setImageVariants(imageId, data, ttl = 1800) {
    const key = this.generateKey(CACHE_PREFIXES.IMAGE_VARIANTS, imageId);
    return this.set(key, data, ttl);
  }

  // 缓存装饰器
  static withCache(cacheKey, ttl = 300) {
    return function(target, propertyName, descriptor) {
      const method = descriptor.value;
      
      descriptor.value = async function(...args) {
        const key = typeof cacheKey === 'function' ? cacheKey(...args) : cacheKey;
        
        // 尝试从缓存获取
        const cached = CacheService.get(key);
        if (cached !== undefined) {
          console.log(`缓存命中: ${key}`);
          return cached;
        }
        
        // 执行原方法
        const result = await method.apply(this, args);
        
        // 缓存结果
        CacheService.set(key, result, ttl);
        console.log(`缓存设置: ${key}`);
        
        return result;
      };
      
      return descriptor;
    };
  }
}

// 缓存中间件
const cacheMiddleware = (ttl = 300) => {
  return (req, res, next) => {
    const originalSend = res.send;
    const cacheKey = req.originalUrl + JSON.stringify(req.query);
    
    // 尝试从缓存获取
    const cached = CacheService.get(cacheKey);
    if (cached !== undefined) {
      console.log(`中间件缓存命中: ${cacheKey}`);
      return res.json(cached);
    }
    
    // 拦截响应
    res.send = function(data) {
      try {
        const jsonData = JSON.parse(data);
        CacheService.set(cacheKey, jsonData, ttl);
        console.log(`中间件缓存设置: ${cacheKey}`);
      } catch (error) {
        console.warn('中间件缓存设置失败:', error.message);
      }
      
      originalSend.call(this, data);
    };
    
    next();
  };
};

module.exports = {
  CacheService,
  cacheMiddleware,
  CACHE_PREFIXES
};
