// pages/search/search.js
import { searchAPI, modelAPI } from '../../utils/api';

function getBestImageUrlFromItem(item) {
  // 防御性检查，确保item是对象
  if (!item || typeof item !== 'object') {
    return '';
  }
  
  // 1. 首先尝试使用模型自身的coverUrl（封面图）- 与网页端保持一致
  if (item.coverUrl && typeof item.coverUrl === 'string' && item.coverUrl.trim() !== '') {
    return item.coverUrl;
  }
  
  // 2. 其次尝试使用模型自身的thumbnail属性 - 与网页端保持一致
  if (item.thumbnail && typeof item.thumbnail === 'string' && item.thumbnail.trim() !== '') {
    return item.thumbnail;
  }
  
  // 3. 检查是否有Images集合并且不为空
  if (item.Images && Array.isArray(item.Images) && item.Images.length > 0) {
    // 获取第一张图片的URL（后端已按sortOrder排序，所以第一张就是sortOrder最小的）
    const image = item.Images[0];
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
  
  // 4. 兼容旧字段
  if (item.image) return item.image;
  
  // 5. 最后尝试使用品牌logo作为占位符
  if (item.Brand && item.Brand.logo) return item.Brand.logo;
  
  return '';
}

Page({
  data: {
    keyword: '',
    results: {
      brands: [],
      models: [],
      images: []
    },
    loading: false,
    hasSearched: false
  },

  onLoad(options) {
    if (options.keyword) {
      this.setData({ keyword: options.keyword });
      this.performSearch(options.keyword);
    }
  },

  // 搜索输入
  onSearchInput(e) {
    const keyword = e.detail.value;
    this.setData({ keyword: keyword });
  },

  // 执行搜索 - 与网页端保持一致，只搜索车型
  async performSearch(keyword) {
    if (!keyword.trim()) {
      wx.showToast({
        title: '请输入搜索关键词',
        icon: 'none'
      });
      return;
    }

    this.setData({ loading: true, hasSearched: true });
    
    try {
      // 使用 modelAPI.getAll 搜索车型，与网页端保持一致
      const res = await modelAPI.getAll({ 
        search: keyword.trim(),
        page: 1,
        limit: 20
      });
      
      // 处理返回数据：可能是 { success: true, data: [...] } 或直接是数组
      let models = [];
      if (res.success && Array.isArray(res.data)) {
        models = res.data;
      } else if (Array.isArray(res)) {
        models = res;
      } else if (Array.isArray(res.data)) {
        models = res.data;
      }
      
      // 处理每个车型，获取图片URL
      const processedModels = models.map((item, index) => {
        const imageUrl = getBestImageUrlFromItem(item);
        return {
          ...item,
          _key: item.model_id || item.id || `model_${index}`,
          _imageUrl: imageUrl
        };
      });

      // 对于没有图片的车型，尝试获取第一张图片
      const modelsWithoutImage = processedModels.filter(model => !model._imageUrl && model.id);
      if (modelsWithoutImage.length > 0) {
        await Promise.all(modelsWithoutImage.map(async (model) => {
          try {
            const resImages = await modelAPI.getImages(model.id, { limit: 1 });
            const imageList = resImages?.data || resImages || [];
            if (Array.isArray(imageList) && imageList.length > 0) {
              const img = imageList[0];
              model._imageUrl = img.mediumUrl || img.medium_url || img.url || img.image_url || '';
            }
          } catch (err) {
            console.error(`加载车型 ${model.id} 图片失败:`, err);
          }
        }));
      }
      
      this.setData({
        results: {
          brands: [],
          models: processedModels,
          images: []
        }
      });
    } catch (error) {
      console.error('搜索失败:', error);
      wx.showToast({
        title: error.message || '搜索失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 搜索按钮点击
  onSearch() {
    this.performSearch(this.data.keyword);
  },

  // 查看品牌详情
  viewBrandDetail(e) {
    const brandId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/brand-detail/brand-detail?id=${brandId}`
    });
  },

  // 查看车型详情
  viewModelDetail(e) {
    const modelId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/model-detail/model-detail?id=${modelId}`
    });
  },

  // 预览图片
  previewImage(e) {
    const url = e.currentTarget.dataset.url;
    const { results } = this.data;
    const urls = results.images.map(img => img.url || img.image_url).filter(u => u);
    const index = urls.indexOf(url);
    
    if (urls.length > 0) {
      wx.previewImage({
        urls: urls,
        current: url
      });
    }
  },

  // 图片加载错误处理
  onImageError(e) {
    const index = e.currentTarget.dataset.index;
    const models = this.data.results.models;
    if (models[index]) {
      // 如果图片加载失败，尝试使用品牌logo
      if (models[index].Brand && models[index].Brand.logo) {
        models[index]._imageUrl = models[index].Brand.logo;
        this.setData({
          'results.models': models
        });
      }
    }
  }
});

