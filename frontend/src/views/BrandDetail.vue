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
      </div>

      <!-- 车型列表部分 -->
      <div class="model-list">
        <div v-if="filteredModels.length === 0" class="no-models">
          <p>该品牌下没有找到符合条件的车型</p>
        </div>
        <div v-else class="models-grid">
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
      allTypes: ['轿车', 'SUV', 'MPV', 'WAGON', 'SHOOTINGBRAKE', '皮卡', '跑车', '其他']
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
    setTypeFilter(type) {
      this.currentType = type;
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
            // 从车型名称中提取年份
            const extractYear = (name) => {
              const match = name.match(/^(20\d{2})/);
              return match ? parseInt(match[1]) : 0;
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

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
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
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.model-card {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s;
  background: white;
}

.model-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
  border-color: #e03426;
}

.model-image {
  width: 100%;
  height: 200px;
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
  padding: 16px;
}

.model-info h3 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 16px;
  font-weight: 600;
}

.model-tag {
  margin-top: 10px;
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
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 15px;
  }
  
  .model-filter-section,
  .model-list {
    padding: 20px;
  }
}

@media (max-width: 480px) {
  .models-grid {
    grid-template-columns: 1fr;
  }
}
</style> 