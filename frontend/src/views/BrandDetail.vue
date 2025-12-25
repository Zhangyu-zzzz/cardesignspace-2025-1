<template>
  <div class="brand-detail">
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="5" animated />
    </div>
    <div v-else-if="error" class="error-message">
      <p>{{ error }}</p>
    </div>
    <div v-else>
      <!-- 品牌信息头部 -->
      <div class="brand-header">
        <div class="brand-logo">
          <img :src="brand.logo" :alt="brand.name + '品牌logo'" />
        </div>
        <div class="brand-info">
          <h1>{{ brand.name }}</h1>
          <p v-if="brand.founded_year"><strong>创立年份:</strong> {{ brand.founded_year }}</p>
          <p><strong>国家:</strong> {{ brand.country }}</p>
          <p class="description">{{ brand.description }}</p>
        </div>
      </div>

      <!-- 车型分类筛选 -->
      <div class="model-filter-section">
        <h2>车型</h2>
        <div class="filters-with-toggle">
          <div class="filters">
            <el-button 
              :class="['filter-btn', currentType === '全部车型' ? 'active' : '']" 
              @click="setTypeFilter('全部车型')"
            >
              全部车型
            </el-button>
            <el-button 
              v-for="type in availableTypes" 
              :key="type"
              :class="['filter-btn', currentType === type ? 'active' : '']" 
              @click="setTypeFilter(type)"
            >
              {{ type }}
            </el-button>
          </div>
          <div class="view-toggle">
            <el-button-group>
              <el-button 
                :type="viewMode === 'grid' ? 'primary' : ''"
                size="small"
                @click="setViewMode('grid')"
              >
                <i class="el-icon-menu"></i> 网格
              </el-button>
              <el-button 
                :type="viewMode === 'list' ? 'primary' : ''"
                size="small"
                @click="setViewMode('list')"
              >
                <i class="el-icon-document"></i> 列表
              </el-button>
            </el-button-group>
          </div>
        </div>
      </div>

      <!-- 车型列表部分 -->
      <div class="model-list">
        <div v-if="filteredModels.length === 0" class="no-models">
          <p>该品牌下没有找到符合条件的车型</p>
        </div>
        <!-- 网格视图 -->
        <div v-else-if="viewMode === 'grid'" class="models-grid">
          <div
            v-for="model in filteredModels"
            :key="model.id"
            class="model-card"
            @click="goToModel(model.id)"
            @mouseenter="handleModelHover(model, $event)"
            @mouseleave="hidePreview"
          >
            <div class="model-image">
              <img 
                v-if="getModelImageUrl(model)" 
                :src="getModelImageUrl(model)" 
                :alt="model.name"
                loading="lazy"
                decoding="async"
                fetchpriority="low"
              />
              <div v-else-if="model.isLoadingImage" class="loading-image">
                <i class="el-icon-loading"></i>
                <span>加载中...</span>
              </div>
              <div v-else class="no-image">
                <i class="el-icon-picture-outline"></i>
              </div>
            </div>
            <div class="model-info">
              <h3>{{ model.name }}</h3>
              <div v-if="model.isNew" class="model-tag">
                <el-tag size="small" type="success">新车型</el-tag>
              </div>
            </div>
          </div>
        </div>
        <!-- 列表视图 -->
        <div v-else class="models-list">
          <div class="list-columns">
            <div class="list-column">
              <div
                v-for="(model, index) in leftColumnModels"
                :key="model.id"
                class="model-list-item"
                @click="goToModel(model.id)"
                @mouseenter="handleModelHover(model, $event)"
                @mouseleave="hidePreview"
              >
                {{ model.name }}
              </div>
            </div>
            <div class="list-column">
              <div
                v-for="(model, index) in rightColumnModels"
                :key="model.id"
                class="model-list-item"
                @click="goToModel(model.id)"
                @mouseenter="handleModelHover(model, $event)"
                @mouseleave="hidePreview"
              >
                {{ model.name }}
              </div>
            </div>
          </div>
          
          <!-- 图片预览提示框 -->
          <div 
            v-show="previewVisible" 
            class="image-preview-tooltip"
            :class="previewPosition"
            :style="previewStyle"
          >
            <img 
              v-if="previewModel && getModelImageUrl(previewModel)"
              :src="getModelImageUrl(previewModel)"
              :alt="previewModel.name"
              class="preview-image"
              loading="lazy"
              decoding="async"
            />
            <div v-else-if="isLoadingImage" class="loading-preview-image">
              <i class="el-icon-loading"></i>
              <span>加载中...</span>
            </div>
            <div v-else class="no-preview-image">
              <i class="el-icon-picture-outline"></i>
              <span>暂无图片</span>
            </div>
            <!-- 箭头指示器 -->
            <div class="tooltip-arrow"></div>
          </div>
        </div>
        
        
        
      </div>
    </div>
  </div>
</template>

<script>
import { brandAPI, modelAPI, imageAPI } from '@/services/api';

export default {
  name: 'BrandDetail',
  data() {
    return {
      brand: {},
      models: [],
      loading: true,
      error: null,
      currentType: '全部车型',
      allTypes: ['轿车', 'SUV', 'MPV', 'WAGON', 'SHOOTINGBRAKE', '皮卡', '跑车', '其他'],
      viewMode: 'grid', // 'grid' 或 'list' - ⭐ 默认使用网格模式
      // 图片预览相关
      previewVisible: false,
      previewModel: null,
      previewStyle: {},
      previewPosition: 'above', // 'above' 或 'below'
      // 不再需要分页相关数据
      isDataLoading: false, // 防止重复加载
      isLoadingImage: false // 图片加载状态
    };
  },
  computed: {
    availableTypes() {
      return [...new Set(this.models.map(model => model.type))].filter(Boolean);
    },
    filteredModels() {
      if (this.currentType === '全部车型') {
        return this.models;
      } else {
        return this.models.filter(model => model.type === this.currentType);
      }
    },
    leftColumnModels() {
      const models = this.filteredModels;
      const halfLength = Math.ceil(models.length / 2);
      return models.slice(0, halfLength);
    },
    rightColumnModels() {
      const models = this.filteredModels;
      const halfLength = Math.ceil(models.length / 2);
      return models.slice(halfLength);
    }
  },
  methods: {
    // 获取车型图片URL的辅助方法（与首页保持一致：400x300，90%质量，优先medium变体）
    getModelImageUrl(model) {
      // 防御性检查，确保model是对象
      if (!model || typeof model !== 'object') {
        console.error('无效的模型数据:', model);
        return '/images/default-car.jpg';
      }
      
      // ⭐ 卡片显示的目标尺寸（4:3比例，适合卡片显示，与首页保持一致）
      const CARD_IMAGE_WIDTH = 400;
      const CARD_IMAGE_HEIGHT = 300;
      
      // ⭐ 1. 首先尝试从Images中获取合适的变体（优先使用medium，更清晰）
      if (model.Images && Array.isArray(model.Images) && model.Images.length > 0) {
        const image = model.Images[0];
        // 尝试从Assets中获取合适的变体（优先使用medium，更清晰）
        if (image.Assets && Array.isArray(image.Assets)) {
          // ⭐ 优先级调整：medium > small > thumbnail > thumb > 原图（优先使用更大更清晰的变体）
          const medium = image.Assets.find(a => a.variant === 'medium');
          if (medium && medium.url) {
            return medium.url;
          }
          const small = image.Assets.find(a => a.variant === 'small');
          if (small && small.url) {
            return small.url;
          }
          const thumbnail = image.Assets.find(a => a.variant === 'thumbnail' || a.variant === 'thumb');
          if (thumbnail && thumbnail.url) {
            return thumbnail.url;
          }
        }
        // 如果没有Assets，尝试thumbnailUrl
        if (image.thumbnailUrl) {
          return image.thumbnailUrl;
        }
        // ⭐ 回退到原图时，使用buildFallbackImageUrl限制尺寸，但保持较高质量
        if (image.url) {
          return this.buildFallbackImageUrl(image.url, CARD_IMAGE_WIDTH, CARD_IMAGE_HEIGHT, true);
        }
      }
      
      // 2. 其次尝试使用模型自身的thumbnail属性
      if (model.thumbnail && typeof model.thumbnail === 'string' && model.thumbnail.trim() !== '') {
        return model.thumbnail;
      }
      
      // 3. 尝试使用模型自身的coverUrl（封面图），也限制尺寸但保持质量
      if (model.coverUrl && typeof model.coverUrl === 'string' && model.coverUrl.trim() !== '') {
        return this.buildFallbackImageUrl(model.coverUrl, CARD_IMAGE_WIDTH, CARD_IMAGE_HEIGHT, true);
      }
      
      // 4. 如果找不到任何图片，返回默认图片
      return '/images/default-car.jpg';
    },
    getImageUrl(image) {
      // ⭐ 与首页保持一致：优先使用medium变体，更清晰
      if (image.Assets && Array.isArray(image.Assets)) {
        // 优先级调整：medium > small > thumbnail > thumb
        const medium = image.Assets.find(a => a.variant === 'medium');
        if (medium && medium.url) return medium.url;
        
        const small = image.Assets.find(a => a.variant === 'small');
        if (small && small.url) return small.url;
        
        const thumbnail = image.Assets.find(a => a.variant === 'thumbnail' || a.variant === 'thumb');
        if (thumbnail && thumbnail.url) return thumbnail.url;
      }
      if (image.thumbnailUrl) return image.thumbnailUrl;
      if (image.mediumUrl) return image.mediumUrl;
      if (image.url) return this.buildFallbackImageUrl(image.url, 400, 300, true);
      if (image.originalUrl) return this.buildFallbackImageUrl(image.originalUrl, 400, 300, true);
      if (image.largeUrl) return image.largeUrl;
      return '/images/default-car.jpg';
    },
    // ⭐ 构建回退图片URL（与首页保持一致：90%质量）
    buildFallbackImageUrl(url, width, height, highQuality = false) {
      if (!url) return '';

      const safeWidth = width || 600;
      const safeHeight = height || 400;
      
      // ⭐ 根据用途设置质量：卡片使用90%（清晰），其他使用80%
      // highQuality为true时使用90%质量，确保卡片图片非常清晰
      const quality = highQuality ? 90 : (width <= 300 ? 80 : 85);

      if (url.includes('cardesignspace-cos-1-1259492452.cos.ap-shanghai.myqcloud.com')) {
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}imageMogr2/thumbnail/${safeWidth}x${safeHeight}/quality/${quality}`;
      }

      if (url.includes('/api/') || url.startsWith('/')) {
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}w=${safeWidth}&h=${safeHeight}&q=${quality}&f=webp`;
      }

      return url;
    },
    getDisplayName(modelName) {
      if (!modelName || !this.brand.name) return modelName;
      
      // 移除品牌名字（不区分大小写）
      const brandName = this.brand.name.toLowerCase();
      const lowerModelName = modelName.toLowerCase();
      
      // 如果车型名字包含品牌名字，则移除它
      if (lowerModelName.includes(brandName)) {
        // 使用正则表达式移除品牌名字，保持原始大小写
        const regex = new RegExp(this.brand.name, 'gi');
        let result = modelName.replace(regex, '').trim();
        
        // 移除多余的空格
        result = result.replace(/\s+/g, ' ').trim();
        
        return result || modelName; // 如果结果为空，返回原始名字
      }
      
      return modelName;
    },
    setTypeFilter(type) {
      this.currentType = type;
    },
    setViewMode(mode) {
      this.viewMode = mode;
      
      // 如果切换到网格模式且车型数据已加载，则预加载图片
      if (mode === 'grid' && this.models.length > 0) {
        this.preloadGridImages();
      }
    },
    showPreview(model, event, isLoading = false) {
      this.previewModel = model;
      this.previewVisible = true;
      this.isLoadingImage = isLoading;
      
      // 计算预览框位置
      const rect = event.target.getBoundingClientRect();
      const previewHeight = 136; // 预览框预估高度 (120px图片 + 16px padding)
      const previewWidth = 200; // 预览框预估宽度
      
      // 水平居中对齐到车型名称
      const centerX = rect.left + (rect.width / 2) - (previewWidth / 2);
      
      this.previewStyle = {
        position: 'fixed',
        left: Math.max(10, Math.min(centerX, window.innerWidth - previewWidth - 10)) + 'px',
        zIndex: 1000
      };
      
      // 优先显示在上方
      if (rect.top - previewHeight - 10 >= 0) {
        this.previewStyle.top = rect.top - previewHeight - 10 + 'px';
        this.previewPosition = 'above';
      } else {
        // 上方空间不足，显示在下方
        this.previewStyle.top = rect.bottom + 10 + 'px';
        this.previewPosition = 'below';
      }
    },
    hidePreview() {
      this.previewVisible = false;
      this.previewModel = null;
    },
    goToModel(modelId) {
      this.$router.push(`/model/${modelId}`);
    },
    
    // 处理车型悬停事件 - 懒加载图片
    async handleModelHover(model, event) {
      // 如果是网格视图，不需要处理悬停预览
      if (this.viewMode === 'grid') {
        return;
      }
      
      // 如果已经有图片，直接显示预览
      if (model.Images && model.Images.length > 0) {
        this.showPreview(model, event);
        return;
      }
      
      // 如果正在加载，不重复请求
      if (model.isLoadingImage) {
        return;
      }
      
      // 设置加载状态
      this.$set(model, 'isLoadingImage', true);
      
      // 列表视图显示预览
      this.showPreview(model, event, true);
      
      // 懒加载图片
      try {
        const imageResponse = await imageAPI.getByModelId(model.id, { limit: 1 });
        if (imageResponse.success && imageResponse.data && imageResponse.data.length > 0) {
          // 将图片添加到车型数据中
          this.$set(model, 'Images', imageResponse.data);
          // 更新预览
          this.showPreview(model, event);
        } else {
          // 没有图片，显示无图片状态
          this.showPreview(model, event, false);
        }
      } catch (error) {
        console.error('加载车型图片失败:', error);
        // 显示无图片状态
        this.showPreview(model, event, false);
      } finally {
        // 清除加载状态
        this.$set(model, 'isLoadingImage', false);
      }
    },
    async fetchBrandModels() {
      // 防止重复加载
      if (this.isDataLoading) {
        console.log('数据正在加载中，跳过重复请求');
        return;
      }
      
      this.isDataLoading = true;
      this.loading = true;
      this.error = null;
      
      try {
        const brandId = this.$route.params.id;
        console.log(`开始加载品牌详情，品牌ID: ${brandId}`);
        
        // 先获取品牌信息，再获取车型列表，避免并行请求造成阻塞
        const brandResponse = await brandAPI.getById(brandId);
        
        if (brandResponse.success) {
          this.brand = brandResponse.data;
          console.log(`品牌信息加载完成: ${this.brand.name}`);
        } else {
          this.error = '获取品牌数据失败';
          return;
        }
        
        // 然后获取车型列表 - 包含图片信息，确保使用车型详情页的首张图片（按sortOrder排序）
        const modelsResponse = await modelAPI.getAll({ 
          brandId, 
          limit: 1000,  // 设置一个较大的限制，获取所有车型
          page: 1,
          includeImages: true  // ⭐ 包含图片信息，使用按sortOrder排序后的首张图片
        });
        
        // 处理车型列表
        if (modelsResponse.success) {
          this.models = modelsResponse.data || [];
          console.log(`车型列表加载完成，共 ${this.models.length} 个车型`);
          
          // 按年份排序，最新年份排在前面
          this.models.sort((a, b) => {
            const extractYear = (name) => {
              const match = name.match(/\b(19|20)\d{2}\b/);
              return match ? parseInt(match[0]) : 0;
            };
            
            const yearA = extractYear(a.name);
            const yearB = extractYear(b.name);
            
            if (yearA !== yearB) {
              return yearB - yearA;
            }
            
            return a.name.localeCompare(b.name, 'zh-CN');
          });
          
          console.log(`品牌 ${this.brand.name} 车型按年份排序完成，共 ${this.models.length} 个车型`);
          
          // 如果是网格模式，自动加载车型图片
          if (this.viewMode === 'grid') {
            this.preloadGridImages();
          }
        } else {
          this.models = [];
        }
      } catch (error) {
        console.error('获取品牌详情失败:', error);
        this.error = '获取数据失败，请检查网络连接';
      } finally {
        this.loading = false;
        this.isDataLoading = false;
      }
    },
    
    // 预加载网格模式下的车型图片（使用缩略图优化）
    async preloadGridImages() {
      console.log('开始预加载网格模式下的车型缩略图');
      
      // 分批加载图片，避免同时请求过多
      const batchSize = 15; // 缩略图更小，可以增加批次大小
      const batches = [];
      
      for (let i = 0; i < this.models.length; i += batchSize) {
        batches.push(this.models.slice(i, i + batchSize));
      }
      
      // 逐批加载缩略图
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`加载第 ${i + 1}/${batches.length} 批缩略图，共 ${batch.length} 个车型`);
        
        // 并行加载当前批次的缩略图
        const promises = batch.map(async (model) => {
          try {
            // 使用新的缩略图API，专门获取缩略图
            const thumbnailResponse = await imageAPI.getThumbnailsByModelId(model.id, { limit: 1 });
            if (thumbnailResponse.success && thumbnailResponse.data && thumbnailResponse.data.length > 0) {
              // 将缩略图数据存储到车型对象中
              this.$set(model, 'Images', thumbnailResponse.data);
              console.log(`车型 ${model.name} 缩略图加载成功`);
            } else {
              console.log(`车型 ${model.name} 没有缩略图，使用原图`);
              // 如果没有缩略图，回退到原图
              const imageResponse = await imageAPI.getByModelId(model.id, { limit: 1 });
              if (imageResponse.success && imageResponse.data && imageResponse.data.length > 0) {
                this.$set(model, 'Images', imageResponse.data);
              }
            }
          } catch (error) {
            console.warn(`加载车型 ${model.name} 的缩略图失败:`, error);
            // 缩略图加载失败时，尝试加载原图
            try {
              const imageResponse = await imageAPI.getByModelId(model.id, { limit: 1 });
              if (imageResponse.success && imageResponse.data && imageResponse.data.length > 0) {
                this.$set(model, 'Images', imageResponse.data);
              }
            } catch (fallbackError) {
              console.warn(`车型 ${model.name} 的原图也加载失败:`, fallbackError);
            }
          }
        });
        
        await Promise.all(promises);
        
        // 批次间稍作延迟，避免请求过于频繁
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 50)); // 缩略图加载更快，减少延迟
        }
      }
      
      console.log('网格模式车型缩略图预加载完成');
    }
  },
  mounted() {
    this.fetchBrandModels();
  },
  watch: {
    '$route.params.id': function(newId, oldId) {
      // 只有当品牌ID真正改变时才重新加载
      if (newId !== oldId) {
        this.fetchBrandModels();
      }
    }
  }
};
</script>

<style scoped>
.brand-detail {
  min-height: 100vh;
  background: #0a0a0a;
  padding: 20px 0;
}

.brand-detail > * {
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
  padding-left: 20px;
  padding-right: 20px;
}

.loading-container, .error-message {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px;
  text-align: center;
  color: rgba(255, 255, 255, 0.7);
}

.brand-header {
  max-width: 1200px;
  margin: 0 auto 30px auto;
  /* ⭐ 移除背景框，让界面更简洁 */
  background: transparent;
  border: none;
  border-radius: 0;
  padding: 30px 0;
  box-shadow: none;
  display: flex;
  align-items: center;
  gap: 30px;
}

.brand-logo {
  width: 120px;
  height: 120px;
  /* ⭐ 添加白色背景，确保深色logo在深色背景下可见 */
  background: #fff;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 15px;
}

.brand-logo img {
  max-width: 80px;
  max-height: 80px;
  object-fit: contain;
}

.brand-info {
  flex: 1;
}

.brand-info h1 {
  margin: 0 0 15px 0;
  color: rgba(255, 255, 255, 0.9);
  font-size: 28px;
  font-weight: 600;
}

.brand-info p {
  margin: 8px 0;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.6;
}

.brand-info .description {
  margin-top: 15px;
  font-size: 16px;
}

.model-filter-section {
  max-width: 1200px;
  margin: 0 auto 20px auto;
  /* ⭐ 移除背景框，让筛选器更简洁 */
  background: transparent;
  border: none;
  border-radius: 0;
  padding: 0 0 20px 0;
  box-shadow: none;
}

.model-filter-section h2 {
  margin: 0 0 20px 0;
  color: rgba(255, 255, 255, 0.9);
  font-size: 22px;
  font-weight: 600;
}

.filters-with-toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.view-toggle {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  flex: 1;
}

.filter-btn {
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.7);
  border-radius: 6px;
  padding: 8px 16px;
  cursor: pointer;
  transition: all 0.3s;
}

.filter-btn:hover {
  border-color: #e03426;
  color: #e03426;
}

.filter-btn.active {
  background: #e03426;
  color: white;
  border-color: #e03426;
}

.model-list {
  max-width: 1200px;
  margin: 0 auto;
  /* ⭐ 移除背景框，让车型网格更突出 */
  background: transparent;
  border: none;
  border-radius: 0;
  padding: 0;
  box-shadow: none;
}

.no-models {
  text-align: center;
  padding: 60px 20px;
  color: rgba(255, 255, 255, 0.5);
}

.models-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
}

.model-card {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s;
  background: rgba(255, 255, 255, 0.03);
  aspect-ratio: 1;
  /* ⭐ GPU加速优化，提升渲染性能 */
  transform: translateZ(0);
  backface-visibility: hidden;
  will-change: transform;
}

.model-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(224, 52, 38, 0.3);
  border-color: #e03426;
}

.model-card:hover .model-image img {
  transform: scale(1.05);
}

.model-image {
  width: 100%;
  height: 75%;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.02);
  display: flex;
  align-items: center;
  justify-content: center;
}

.model-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  /* ⭐ GPU加速优化，提升渲染性能 */
  transform: translateZ(0);
  will-change: transform;
  transition: transform 0.3s ease;
}

.no-image {
  color: #ccc;
  font-size: 40px;
}

.loading-image {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 120px;
  color: #999;
}

.loading-image i {
  font-size: 24px;
  margin-bottom: 8px;
  animation: rotating 2s linear infinite;
}

.loading-image span {
  font-size: 12px;
}

.model-info {
  padding: 6px 8px 8px 8px;
  height: 25%;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}

.model-info h3 {
  margin: 0 0 2px 0;
  color: rgba(255, 255, 255, 0.9);
  font-size: 11px;
  font-weight: 600;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  height: 26px;
}

.model-tag {
  margin-top: 2px;
}

.model-tag .el-tag {
  font-size: 10px;
  height: 18px;
  line-height: 16px;
  padding: 0 6px;
}

/* 列表视图样式 */
.models-list {
  background: transparent;
  border-radius: 8px;
  padding: 20px;
}

.list-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
}

.list-column {
  display: flex;
  flex-direction: column;
}

.model-list-item {
  padding: 4px 12px;
  cursor: pointer;
  transition: all 0.2s;
  border-radius: 4px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.4;
  margin-bottom: 1px;
}

.model-list-item:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #e03426;
}

/* 图片预览提示框样式 */
.image-preview-tooltip {
  position: fixed;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
  padding: 8px;
  z-index: 1000;
  pointer-events: none;
  max-width: 200px;
  transition: opacity 0.2s ease;
}

.preview-image {
  width: 100%;
  height: 120px;
  object-fit: cover;
  border-radius: 6px;
  display: block;
}

.no-preview-image {
  width: 100%;
  height: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.4);
}

.no-preview-image i {
  font-size: 32px;
  margin-bottom: 8px;
}

.no-preview-image span {
  font-size: 12px;
}

.loading-preview-image {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 120px;
  color: #999;
}

.loading-preview-image i {
  font-size: 24px;
  margin-bottom: 8px;
  animation: rotating 2s linear infinite;
}

.loading-preview-image span {
  font-size: 12px;
}

@keyframes rotating {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* 箭头指示器 */
.tooltip-arrow {
  position: absolute;
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  left: 50%;
  transform: translateX(-50%);
}

.image-preview-tooltip.above .tooltip-arrow {
  bottom: -6px;
  border-top: 6px solid rgba(255, 255, 255, 0.05);
  filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.3));
}

.image-preview-tooltip.below .tooltip-arrow {
  top: -6px;
  border-bottom: 6px solid rgba(255, 255, 255, 0.05);
  filter: drop-shadow(0 -1px 1px rgba(0, 0, 0, 0.3));
}



/* 响应式设计 */
@media (max-width: 768px) {
  .brand-detail {
    padding: 10px;
  }
  
  .brand-header {
    flex-direction: column;
    text-align: center;
    gap: 20px;
    padding: 20px;
  }
  
  .brand-logo {
    width: 100px;
    height: 100px;
  }
  
  .brand-info h1 {
    font-size: 24px;
  }
  
  .models-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
  }
  
  .model-filter-section,
  .model-list {
    padding: 20px;
  }
  
  .filters-with-toggle {
    flex-direction: column;
    align-items: stretch;
    gap: 15px;
  }
  
  .view-toggle {
    align-self: center;
  }
  
  .list-columns {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  
  .models-list {
    padding: 15px;
  }
}

@media (max-width: 480px) {
  .models-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
  }
}
</style> 