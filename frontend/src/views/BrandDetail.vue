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
          >
            <div class="model-image">
              <img 
                v-if="model.Images && model.Images.length > 0" 
                :src="getImageUrl(model.Images[0])" 
                :alt="model.name" 
              />
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
                @mouseenter="showPreview(model, $event)"
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
                @mouseenter="showPreview(model, $event)"
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
              v-if="previewModel && previewModel.Images && previewModel.Images.length > 0"
              :src="getImageUrl(previewModel.Images[0])"
              :alt="previewModel.name"
              class="preview-image"
            />
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
      viewMode: 'list', // 'grid' 或 'list'
      // 图片预览相关
      previewVisible: false,
      previewModel: null,
      previewStyle: {},
      previewPosition: 'above' // 'above' 或 'below'
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
    getImageUrl(image) {
      if (image.url) return image.url;
      if (image.originalUrl) return image.originalUrl;
      if (image.mediumUrl) return image.mediumUrl;
      if (image.thumbnailUrl) return image.thumbnailUrl;
      if (image.largeUrl) return image.largeUrl;
      return '/images/default-car.jpg';
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
    },
    showPreview(model, event) {
      this.previewModel = model;
      this.previewVisible = true;
      
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
    async fetchBrandModels() {
      this.loading = true;
      this.error = null;
      
      try {
        const brandId = this.$route.params.id;
        
        // 获取品牌信息
        const brandResponse = await brandAPI.getById(brandId);
        if (!brandResponse.success) {
          this.error = brandResponse.message || '获取品牌数据失败';
          return;
        }
        this.brand = brandResponse.data;
        
        // 获取车型列表 - 设置足够大的limit确保获取该品牌的所有车型
        const modelsResponse = await modelAPI.getAll({ 
          brandId, 
          limit: 1000  // 设置足够大的数量限制，确保获取所有车型
        });
        if (modelsResponse && modelsResponse.success) {
          this.models = modelsResponse.data || [];
          
          // 为每个车型获取图片
          for (const model of this.models) {
            if (!model.Images || model.Images.length === 0) {
              try {
                const imagesResponse = await imageAPI.getByModelId(model.id);
                if (imagesResponse.success && imagesResponse.data) {
                  model.Images = imagesResponse.data;
                }
              } catch (error) {
                model.Images = [];
              }
            }
          }
          
          // 按年份排序，最新年份排在前面
          this.models.sort((a, b) => {
            // 从车型名称中提取年份 - 支持更广泛的年份范围
            const extractYear = (name) => {
              // 匹配4位数字年份（1900-2099范围）
              const match = name.match(/\b(19|20)\d{2}\b/);
              return match ? parseInt(match[0]) : 0;
            };
            
            const yearA = extractYear(a.name);
            const yearB = extractYear(b.name);
            
            // 按年份降序排序（新年份在前）
            if (yearA !== yearB) {
              return yearB - yearA;
            }
            
            // 如果年份相同，按名称排序
            return a.name.localeCompare(b.name, 'zh-CN');
          });
          
          console.log(`品牌 ${this.brand.name} 车型按年份排序完成，共 ${this.models.length} 个车型`);
        } else {
          this.models = [];
        }
      } catch (error) {
        console.error('获取品牌详情失败:', error);
        this.error = '获取数据失败，请检查网络连接';
      } finally {
        this.loading = false;
      }
    }
  },
  mounted() {
    this.fetchBrandModels();
  },
  watch: {
    '$route.params.id': function() {
      this.fetchBrandModels();
    }
  }
};
</script>

<style scoped>
.brand-detail {
  min-height: 100vh;
  background: #f8f9fa;
  padding: 20px;
}

.loading-container, .error-message {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px;
  text-align: center;
}

.brand-header {
  max-width: 1200px;
  margin: 0 auto 30px auto;
  background: white;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  gap: 30px;
}

.brand-logo {
  width: 120px;
  height: 120px;
  background: #f8f9fa;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
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
  color: #333;
  font-size: 28px;
  font-weight: 600;
}

.brand-info p {
  margin: 8px 0;
  color: #666;
  line-height: 1.6;
}

.brand-info .description {
  margin-top: 15px;
  font-size: 16px;
}

.model-filter-section {
  max-width: 1200px;
  margin: 0 auto 20px auto;
  background: white;
  border-radius: 12px;
  padding: 25px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.model-filter-section h2 {
  margin: 0 0 20px 0;
  color: #333;
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
  border: 1px solid #ddd;
  background: white;
  color: #666;
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
  background: white;
  border-radius: 12px;
  padding: 25px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.no-models {
  text-align: center;
  padding: 60px 20px;
  color: #999;
}

.models-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
}

.model-card {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s;
  background: white;
  aspect-ratio: 1;
}

.model-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
  border-color: #e03426;
}

.model-image {
  width: 100%;
  height: 75%;
  overflow: hidden;
  background: #f8f9fa;
  display: flex;
  align-items: center;
  justify-content: center;
}

.model-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.no-image {
  color: #ccc;
  font-size: 40px;
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
  color: #333;
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
  background: white;
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
  color: #333;
  line-height: 1.4;
  margin-bottom: 1px;
}

.model-list-item:hover {
  background: #f0f0f0;
  color: #e03426;
}

/* 图片预览提示框样式 */
.image-preview-tooltip {
  position: fixed;
  background: white;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
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
  background: #f8f9fa;
  border-radius: 6px;
  color: #ccc;
}

.no-preview-image i {
  font-size: 32px;
  margin-bottom: 8px;
}

.no-preview-image span {
  font-size: 12px;
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
  border-top: 6px solid white;
  filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.1));
}

.image-preview-tooltip.below .tooltip-arrow {
  top: -6px;
  border-bottom: 6px solid white;
  filter: drop-shadow(0 -1px 1px rgba(0, 0, 0, 0.1));
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