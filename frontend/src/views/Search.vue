<template>
  <div class="search">
    <!-- 搜索头部 -->
    <div class="search-header">
      <h1>车型搜索</h1>
      <p>搜索您感兴趣的汽车品牌或车型</p>
    </div>
    
    <!-- 搜索框 -->
    <div class="search-box">
      <el-input 
        placeholder="请输入品牌名称或车型名称" 
        v-model="keyword" 
        class="search-input"
        @keyup.enter="handleSearch"
        clearable
      >
        <el-button 
          slot="append" 
          icon="el-icon-search"
          @click="handleSearch"
          :loading="searching"
        ></el-button>
      </el-input>
    </div>

    <!-- 热门搜索 -->
    <div class="hot-searches" v-if="!hasSearched">
      <h3>热门搜索</h3>
      <div class="search-tags">
        <el-tag 
          v-for="tag in popularSearches" 
          :key="tag"
          class="search-tag"
          @click="searchSuggestion(tag)"
        >
          {{ tag }}
        </el-tag>
      </div>
    </div>

    <!-- 搜索结果 -->
    <div class="search-results" v-if="hasSearched">
      <!-- 加载状态 -->
      <div v-if="searching" class="loading">
        <el-skeleton :rows="3" animated />
      </div>
      
      <!-- 无结果 -->
      <div v-else-if="searchResults.length === 0" class="no-results">
        <el-empty description="未找到相关车型">
          <el-button type="primary" @click="clearSearch">重新搜索</el-button>
        </el-empty>
      </div>
      
      <!-- 结果列表 -->
      <div v-else>
        <div class="results-header">
          <h3>搜索结果 ({{ searchResults.length }})</h3>
          <el-button type="text" @click="clearSearch">清除搜索</el-button>
        </div>
        
        <div class="results-grid">
          <div 
            v-for="model in searchResults" 
            :key="model.id"
            class="model-card"
            @click="goToModelDetail(model.id)"
          >
            <div class="model-image">
              <img 
                :src="getModelImage(model)" 
                :alt="model.name"
                @error="handleImageError"
              />
            </div>
            <div class="model-info">
              <h4>{{ model.name }}</h4>
              <p>{{ model.Brand ? model.Brand.name : '未知品牌' }}</p>
              <div class="model-tags">
                <el-tag size="mini">{{ model.type || '轿车' }}</el-tag>
                <el-tag v-if="model.year" size="mini" type="info">{{ model.year }}年</el-tag>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { modelAPI, brandAPI } from '@/services/api';

export default {
  name: 'Search',
  data() {
    return {
      keyword: '',
      searchResults: [],
      searching: false,
      hasSearched: false,
      popularSearches: ['小米', '比亚迪', '启源', '方程豹', '阿维塔', '奔驰', '宝马', '奥迪']
    }
  },
  methods: {
    // 执行搜索
    async handleSearch() {
      if (!this.keyword.trim()) {
        this.$message.warning('请输入搜索关键词');
        return;
      }
      
      this.searching = true;
      this.hasSearched = true;
      
      try {
        const response = await modelAPI.getAll({ search: this.keyword.trim() });
        
        if (response.success) {
          this.searchResults = response.data || [];
        } else {
          throw new Error(response.message || '搜索失败');
        }
      } catch (error) {
        console.error('搜索错误:', error);
        this.$message.error('搜索失败，请稍后重试');
        this.searchResults = [];
      } finally {
        this.searching = false;
      }
    },
    
    // 清除搜索
    clearSearch() {
      this.keyword = '';
      this.searchResults = [];
      this.hasSearched = false;
    },
    
    // 点击热门搜索
    searchSuggestion(suggestion) {
      this.keyword = suggestion;
      this.handleSearch();
    },
    
    // 跳转到车型详情
    goToModelDetail(modelId) {
      this.$router.push(`/model/${modelId}`);
    },
    
    // 获取车型图片
    getModelImage(model) {
      if (model.Images && model.Images.length > 0) {
        const image = model.Images[0];
        return image.url || image.originalUrl || image.mediumUrl || image.thumbnailUrl || '/images/default-car.jpg';
      }
      return '/images/default-car.jpg';
    },
    
    // 图片加载错误处理
    handleImageError(event) {
      event.target.src = '/images/default-car.jpg';
    }
  }
}
</script>

<style scoped>
.search {
  min-height: 100vh;
  background: #f8f9fa;
  padding: 20px;
}

.search-header {
  text-align: center;
  margin-bottom: 30px;
}

.search-header h1 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 28px;
  font-weight: 600;
}

.search-header p {
  margin: 0;
  color: #666;
  font-size: 16px;
}

.search-box {
  max-width: 600px;
  margin: 0 auto 40px auto;
}

.search-input {
  width: 100%;
}

.hot-searches {
  max-width: 800px;
  margin: 0 auto;
  text-align: center;
  background: white;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.hot-searches h3 {
  margin: 0 0 20px 0;
  color: #333;
  font-size: 18px;
  font-weight: 600;
}

.search-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
}

.search-tag {
  cursor: pointer;
  transition: all 0.3s;
  border-radius: 6px;
  padding: 6px 12px;
}

.search-tag:hover {
  background: #409EFF;
  color: white;
  transform: translateY(-1px);
}

.search-results {
  max-width: 1200px;
  margin: 0 auto;
}

.loading {
  padding: 40px;
  text-align: center;
}

.no-results {
  text-align: center;
  padding: 60px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.results-header h3 {
  margin: 0;
  color: #333;
  font-size: 18px;
  font-weight: 600;
}

.results-grid {
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
  border-color: #409EFF;
}

.model-image {
  width: 100%;
  height: 180px;
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

.model-info {
  padding: 16px;
}

.model-info h4 {
  margin: 0 0 8px 0;
  color: #333;
  font-size: 16px;
  font-weight: 600;
}

.model-info p {
  margin: 0 0 10px 0;
  color: #666;
  font-size: 14px;
}

.model-tags {
  display: flex;
  gap: 6px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .search {
    padding: 10px;
  }
  
  .search-header h1 {
    font-size: 24px;
  }
  
  .results-grid {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 15px;
  }
  
  .results-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    padding: 16px;
  }
  
  .hot-searches {
    padding: 20px;
  }
}

@media (max-width: 480px) {
  .results-grid {
    grid-template-columns: 1fr;
  }
  
  .search-tags {
    gap: 8px;
  }
}
</style> 