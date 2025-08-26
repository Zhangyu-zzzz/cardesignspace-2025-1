<template>
  <div class="brands">
    <div class="header-container">
      <h1>品牌页面</h1>
      <button @click="refreshData" class="refresh-btn">
        刷新数据
        <span v-if="refreshing" class="spinner"></span>
      </button>
    </div>
    
    <div v-if="loading" class="loading">
      <p>正在加载品牌数据...</p>
    </div>
    
    <div v-else-if="error" class="error">
      <p>加载品牌数据失败: {{ error }}</p>
    </div>
    
    <div v-else class="brand-list">
      <div class="brand-grid">
        <div v-for="brand in brands" :key="brand.id" class="brand-card">
          <div class="brand-logo">
            <img v-if="brand.logo" :src="brand.logo" :alt="brand.name + '标志'" />
            <div v-else class="no-logo">{{ brand.name.charAt(0) }}</div>
          </div>
          <div class="brand-info">
            <h2>{{ brand.name }}</h2>
            <p v-if="brand.country" class="country">国家: {{ brand.country }}</p>
            <p v-if="brand.founded_year" class="year">成立年份: {{ brand.founded_year }}</p>
            <p v-if="brand.description" class="description">{{ brand.description }}</p>
            <a 
              href="#" 
              class="view-details" 
              @click="$handleLinkClick($event, `/brand/${brand.id}`)"
              @contextmenu="$handleLinkContextMenu($event, `/brand/${brand.id}`)"
            >
              查看详情
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { brandAPI } from '@/services/api';

export default {
  name: 'Brands',
  data() {
    return {
      brands: [],
      loading: true,
      refreshing: false,
      error: null,
      refreshTimer: null
    }
  },
  created() {
    this.fetchBrands();
    // 设置定时刷新（每60秒）
    this.refreshTimer = setInterval(this.fetchBrands, 60000);
  },
  beforeDestroy() {
    // 组件销毁前清除定时器
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
  },
  methods: {
    async fetchBrands() {
      try {
        if (!this.refreshing) {
          this.loading = !this.brands.length; // 只在首次加载时显示loading
          const response = await brandAPI.getAll({
            // 添加时间戳参数防止缓存
            t: new Date().getTime()
          });
          this.brands = response.data;
          this.loading = false;
          this.error = null;
        }
      } catch (error) {
        console.error('获取品牌数据失败:', error);
        this.error = error.message || '获取品牌数据失败';
        this.loading = false;
      }
    },
    async refreshData() {
      try {
        this.refreshing = true;
        // 强制请求新数据，添加时间戳避免缓存
        const response = await brandAPI.getAll({
          t: new Date().getTime(),
          forceRefresh: true
        });
        this.brands = response.data;
        this.error = null;
      } catch (error) {
        console.error('刷新品牌数据失败:', error);
        this.error = error.message || '刷新品牌数据失败';
      } finally {
        this.refreshing = false;
      }
    }
  }
}
</script>

<style scoped>
.brands {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.header-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.refresh-btn {
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: background-color 0.3s;
}

.refresh-btn:hover {
  background-color: #2980b9;
}

.spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 1s ease-in-out infinite;
  margin-left: 8px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading, .error {
  text-align: center;
  margin: 40px 0;
  font-size: 16px;
}

.error {
  color: #e74c3c;
}

.brand-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.brand-card {
  border: 1px solid #eaeaea;
  border-radius: 8px;
  overflow: hidden;
  transition: transform 0.3s, box-shadow 0.3s;
  background-color: #fff;
}

.brand-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0,0,0,0.1);
}

.brand-logo {
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f9f9f9;
  padding: 10px;
}

.brand-logo img {
  max-width: 100%;
  max-height: 100px;
  object-fit: contain;
}

.no-logo {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background-color: #3498db;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: bold;
}

.brand-info {
  padding: 15px;
}

.brand-info h2 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #333;
  font-size: 18px;
}

.country, .year {
  color: #666;
  margin: 5px 0;
  font-size: 14px;
}

.description {
  margin: 10px 0;
  color: #555;
  font-size: 14px;
  line-height: 1.4;
  max-height: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.view-details {
  display: inline-block;
  margin-top: 10px;
  color: #3498db;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
}

.view-details:hover {
  text-decoration: underline;
}
</style> 