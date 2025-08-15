<template>
  <div class="home">

    <!-- 全屏轮播图展示区域 -->
    <div class="fullscreen-carousel" v-if="carouselItems && carouselItems.length > 0">
      <!-- 轮播图容器 -->
      <div 
        class="carousel-container"
        @mousedown="startDrag"
        @mousemove="onDrag"
        @mouseup="endDrag"
        @mouseleave="endDrag"
        @touchstart="startDrag"
        @touchmove="onDrag"
        @touchend="endDrag"
      >
        <div 
          class="carousel-slide" 
          v-for="(item, index) in carouselItems" 
          :key="item.type + '-' + item.id"
          :class="{ active: currentSlide === index }"
          :style="{ transform: `translateX(${(index - currentSlide) * 100}%)` }"
          @click="item.type === 'model' ? goToModel(item.id) : goToArticle(item.id)"
        >
          <div class="slide-image-container">
            <!-- 车型图片 -->
            <img 
              v-if="item.type === 'model' && item.Images && item.Images.length > 0" 
              :src="item.Images[0].url"
              :alt="item.name"
              @load="handleModelImageLoad"
              @error="handleModelImageError"
              class="slide-image"
            >
            <!-- 文章图片 -->
            <img 
              v-else-if="item.type === 'article' && item.coverImage" 
              :src="item.coverImage"
              :alt="item.title"
              @load="handleModelImageLoad"
              @error="handleModelImageError"
              class="slide-image"
            >
            <!-- 占位符 -->
            <div class="slide-placeholder" :class="{ 
              show: (item.type === 'model' && (!item.Images || item.Images.length === 0)) || 
                    (item.type === 'article' && !item.coverImage) ||
                    modelImageLoadError[item.id] 
            }">
              <div class="placeholder-content">
                <i class="el-icon-picture"></i>
                <span>暂无图片</span>
              </div>
            </div>
          </div>
          
          <!-- 信息覆盖层 -->
          <div class="slide-info-overlay">
            <div class="slide-content">
              <!-- 车型信息 -->
              <template v-if="item.type === 'model'">
                <div class="content-type-badge model-badge">车型</div>
                <h2 class="slide-title">{{ item.name }}</h2>
                <p class="slide-brand">{{ item.Brand ? item.Brand.name : '未知品牌' }}</p>
                <button class="view-details-btn" @click.stop="goToModel(item.id)">
                  查看详情
                  <i class="el-icon-arrow-right"></i>
                </button>
              </template>
                             <!-- 文章信息 -->
               <template v-else-if="item.type === 'article'">
                 <div class="content-type-badge article-badge">资讯</div>
                 <h2 class="slide-title">{{ item.title }}</h2>
                 <p class="slide-brand">{{ item.summary || '精彩汽车资讯内容，点击阅读全文了解更多...' }}</p>
                 <button class="view-details-btn" @click.stop="goToArticle(item.id)">
                   阅读全文
                   <i class="el-icon-arrow-right"></i>
                 </button>
               </template>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 导航指示器 -->
      <div class="carousel-indicators">
        <div 
          v-for="(item, index) in carouselItems" 
          :key="item.type + '-' + item.id"
          class="indicator"
          :class="{ active: currentSlide === index }"
          @click="goToSlide(index)"
        ></div>
      </div>
      
      <!-- 左右导航按钮 -->
      <button class="carousel-nav prev" @click="prevSlide">
        <i class="el-icon-arrow-left"></i>
      </button>
      <button class="carousel-nav next" @click="nextSlide">
        <i class="el-icon-arrow-right"></i>
      </button>
    </div>
    
    <!-- 加载状态 -->
    <div v-else-if="latestModelsLoading" class="fullscreen-carousel">
      <div class="loading-container">
        <div class="loading-spinner">
          <i class="el-icon-loading"></i>
          <p>加载最新车型...</p>
        </div>
      </div>
    </div>
    
    <!-- 错误状态 -->
    <div v-else-if="latestModelsError" class="fullscreen-carousel">
      <div class="error-container">
        <div class="error-icon">
          <i class="el-icon-warning"></i>
        </div>
        <p class="error-text">{{ latestModelsError }}</p>
      </div>
    </div>
    
    <!-- 品牌导航区域 -->
    <div class="brand-section">
      <div class="content-container">
      <!-- 品牌分类选择器 -->
      <div class="brand-category-tabs">
        <button 
          :class="['category-tab', brandCategory === 'all' ? 'active' : '']"
          @click="setBrandCategory('all')"
        >
          全部品牌
        </button>
        <button 
          :class="['category-tab', brandCategory === 'domestic' ? 'active' : '']"
          @click="setBrandCategory('domestic')"
        >
          国内品牌
        </button>
        <button 
          :class="['category-tab', brandCategory === 'overseas' ? 'active' : '']"
          @click="setBrandCategory('overseas')"
        >
          海外品牌
        </button>
      </div>
      
      <!-- 字母筛选器 -->
      <div class="alphabet-filter">
        <button 
          :class="['alphabet-btn', currentLetter === '不限' ? 'active' : '']"
          @click="currentLetter = '不限'"
        >
          不限
        </button>
        <button 
          v-for="letter in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')" 
          :key="letter"
          :class="['alphabet-btn', currentLetter === letter ? 'active' : '']"
          @click="currentLetter = letter"
        >
          {{ letter }}
        </button>
      </div>
      
      <!-- 品牌展示区域 -->
      <div class="brands-display">
        <div v-if="loading" class="loading-container">
          <el-skeleton :rows="3" animated />
        </div>
        <div v-else-if="error" class="error-message">
          <p>{{ error }}</p>
        </div>
        <div v-else>
          <div v-if="filteredBrands.length === 0" class="no-brands-message">
            没有找到符合条件的品牌
          </div>
          <div v-else class="brands-grid">
            <div 
              class="brand-card" 
              v-for="brand in filteredBrands" 
              :key="brand.id" 
              @click="goToBrand(brand.id)"
              :data-brand-id="brand.id"
            >
              <div class="brand-logo">
                <img 
                  v-if="brand.logo" 
                  :src="brand.logo"
                  :alt="brand.name"
                  @load="handleLogoLoad"
                  @error="handleLogoError"
                  class="brand-logo-img"
                >
                <div class="no-logo" :class="{ show: !brand.logo || logoLoadError[brand.id] }">
                  {{ brand.name.charAt(0) }}
                </div>
              </div>
              <div class="brand-name">{{ brand.name }}</div>
            </div>
          </div>
        </div>
        
        <!-- 品牌统计信息 -->
        <div class="brand-stats" v-if="!loading && filteredBrands.length > 0">
          <span class="stats-text">共 {{ filteredBrands.length }} 个品牌</span>
          <span v-if="brandCategory !== 'all'" class="category-text">
            （{{ getCategoryName() }}）
          </span>
        </div>
      </div>
      </div>
    </div>

    <!-- 车型展示区域 -->
    <div class="models-display-section">
      <div class="content-container">
      <div class="section-header">
        <div class="section-title">
          <h2>车型展示</h2>
          <p class="section-subtitle">浏览所有车型</p>
        </div>
      </div>
      
      <!-- 筛选控制栏 -->
      <div class="filter-control-bar">
        <!-- 年代筛选 -->
        <div class="decade-control">
          <span class="control-label">年代筛选：</span>
          <div class="decade-buttons">
            <button 
              class="decade-btn" 
              :class="{ active: selectedDecade === '' }"
              @click="selectDecade('')"
            >
              全部
            </button>
            <button 
              v-for="decade in decades" 
              :key="decade.value"
              class="decade-btn" 
              :class="{ active: selectedDecade === decade.value }"
              @click="selectDecade(decade.value)"
            >
              {{ decade.label }}
            </button>
          </div>
        </div>
        
        <!-- 排序控制 -->
        <div class="sort-control">
          <span class="control-label">排序方式：</span>
          <button class="sort-btn" @click="toggleSortOrder">
            <i class="el-icon-sort"></i>
            {{ sortOrder === 'desc' ? '最新优先' : '最老优先' }}
          </button>
        </div>
      </div>
      
      <div class="models-content">
        <div v-if="displayModelsLoading && displayModels.length === 0" class="loading-container">
          <div class="loading-spinner">
            <i class="el-icon-loading"></i>
            <p>加载车型数据...</p>
          </div>
        </div>
        <div v-else-if="displayModelsError" class="error-container">
          <div class="error-icon">
            <i class="el-icon-warning"></i>
          </div>
          <p class="error-text">{{ displayModelsError }}</p>
          <button class="retry-btn" @click="retryFetchDisplayModels">
            <i class="el-icon-refresh"></i>
            重试
          </button>
        </div>
        <div v-else-if="displayModels.length === 0" class="empty-container">
          <div class="empty-icon">
            <i class="el-icon-picture"></i>
          </div>
          <p class="empty-text">暂无车型数据</p>
        </div>
        <div v-else class="models-grid">
          <div 
            class="model-display-card" 
            v-for="model in displayModels" 
            :key="model.id"
            @click="goToModel(model.id)"
          >
            <div class="model-display-image">
              <img 
                v-if="model.Images && model.Images.length > 0" 
                :data-src="getOptimizedImageUrl(model.Images[0].url, 300, 200)"
                :alt="model.name"
                @load="handleModelImageLoad"
                @error="handleModelImageError"
                class="model-display-img lazy-load"
                src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200'%3E%3Crect width='100%25' height='100%25' fill='%23f8f9fa'/%3E%3C/svg%3E"
              >
              <div class="model-display-placeholder" :class="{ show: !model.Images || model.Images.length === 0 || modelImageLoadError[model.id] }">
                <div class="placeholder-content">
                  <i class="el-icon-picture"></i>
                  <span>暂无图片</span>
                </div>
                <!-- 图片加载失败时显示重试按钮 -->
                <button 
                  v-if="modelImageLoadError[model.id]" 
                  class="image-retry-btn" 
                  @click="retryImageLoad(model)"
                >
                  <i class="el-icon-refresh"></i>
                  重试
                </button>
              </div>
              <!-- 加载中的骨架屏 -->
              <div class="model-image-skeleton" v-if="model.Images && model.Images.length > 0">
                <div class="skeleton-shimmer"></div>
              </div>
            </div>
            <div class="model-display-info">
              <h3 class="model-display-name">{{ model.name || '车型名称' }}</h3>
            </div>
          </div>
        </div>
        
        <!-- 加载更多按钮 -->
        <div v-if="hasMoreDisplayModels" class="load-more-container">
          <button 
            class="load-more-btn" 
            @click="loadMoreModels"
            :disabled="displayModelsLoading"
          >
            <span v-if="!displayModelsLoading">加载更多</span>
            <i v-else class="el-icon-loading"></i>
          </button>
        </div>
      </div>
      </div>
    </div>
  </div>
</template>

<script>
import { brandAPI, modelAPI, imageAPI, articleAPI } from '@/services/api';
// 恢复使用chinese-to-pinyin库
import chineseToPinyin from 'chinese-to-pinyin'

export default {
  name: 'Home',
  data() {
    return {
      carouselItems: [
        {
          title: '中国自主品牌',
          description: '浏览中国自主品牌最新车型的官方高清图片',
          imageUrl: 'https://via.placeholder.com/1920x1080?text=Chinese+Brands'
        },
        {
          title: '专业车辆图库',
          description: '发现超过10,000张高清汽车官方图片',
          imageUrl: 'https://via.placeholder.com/1920x1080?text=Car+Image+2'
        },
        {
          title: '360°全景查看',
          description: '体验车辆内外的细节',
          imageUrl: 'https://via.placeholder.com/1920x1080?text=Car+Image+3'
        }
      ],
      chineseBrands: [],
      allBrands: [],
      loading: true,
      modelLoading: true,
      error: null,
      latestModels: [],
      latestArticles: [], // 最新文章
      carouselItems: [], // 轮播项目（车型+文章）
      allModelsData: [], // 存储所有车型数据
      currentPage: 1,
      pageSize: 24,
      hasMoreModels: true,
      loadingMore: false,
      letters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
      currentLetter: '不限',
      onlyShowingSelling: false,
      originFilter: 'china', // 默认显示中国品牌
      specialBrandMapping: {
        // 中国品牌
        '蔚来': 'W', // 确保"蔚来"归到W类
        '哪吒': 'N', // 确保"哪吒"归到N类
        '威马': 'W', // 确保"威马"归到W类
        '理想': 'L', // 确保"理想"归到L类
        '小鹏': 'X', // 确保"小鹏"归到X类
        '极氪': 'J', // 确保"极氪"归到J类
        '几何': 'J', // 确保"几何"归到J类
        '深蓝': 'S', // 确保"深蓝"归到S类
        '长安': 'C', // 修复"长安"的首字母
        '长城': 'C', // 修复"长城"的首字母
        '长': 'C',   // 修复所有"长"字开头的品牌
        '奇瑞': 'Q', // 确保"奇瑞"归到Q类
        '广汽': 'G', // 确保"广汽"归到G类
        '吉利': 'J',  // 确保"吉利"归到J类
        '奥迪': 'A',
        '埃安': 'A',
        '欧拉': 'O',
        '阿维塔': 'A',
        '五菱': 'W',  // 确保"五菱"归到W类
        
        // 合资品牌（现归类为国内品牌）
        '一汽-大众': 'Y',
        '上汽大众': 'S',
        '一汽丰田': 'Y',
        '广汽丰田': 'G',
        '东风日产': 'D',
        '广汽本田': 'G',
        '东风本田': 'D',
        '北京现代': 'B',
        '东风悦达起亚': 'D',
        '长安福特': 'C',
        '上汽通用': 'S',
        '华晨宝马': 'H',
        '北京奔驰': 'B',
        '一汽奥迪': 'Y',
        
        // 海外品牌首字母映射
        // 英文品牌直接使用首字母
        'BMW': 'B',
        'MINI': 'M',
        'Jeep': 'J',
        
        // 其他可能需要特殊处理的品牌可以在这里添加
      },
      brandCategory: 'all', // 新增：品牌分类
      logoLoadError: {},
      latestModelsLoading: true,
      latestModelsError: null,
      modelImageLoadError: {},
      
      // 轮播图相关数据
      currentSlide: 0,
      autoPlayInterval: null,
      isDragging: false,
      dragStartX: 0,
      dragCurrentX: 0,
      
      // 车型展示相关数据
      displayModels: [],
      displayModelsLoading: false,
      displayModelsError: null,
      sortOrder: 'desc', // 'desc' 为最新优先，'asc' 为最老优先
      currentDisplayPage: 1,
      displayPageSize: 24,
      hasMoreDisplayModels: true,
      
      // 年代筛选相关
      selectedDecade: '', // 当前选中的年代
      decades: [
        { label: '2020s', value: '2020s' },
        { label: '2010s', value: '2010s' },
        { label: '2000s', value: '2000s' },
        { label: '90s', value: '1990s' },
        { label: '80s', value: '1980s' },
        { label: '70s', value: '1970s' },
        { label: '60s', value: '1960s' },
        { label: '50s', value: '1950s' },
        { label: '40s', value: '1940s' },
        { label: '30s', value: '1930s' },
        { label: '20s', value: '1920s' },
        { label: '10s', value: '1910s' },
        { label: '00s', value: '1900s' }
      ],
    }
  },
  computed: {
    // 仅保留中国品牌
    chineseOnlyBrands() {
      return this.allBrands.filter(brand => brand.country === '中国');
    },
    
    // 品牌按拼音首字母分组
    brandsByLetter() {
      const result = {};
      
      // 初始化所有字母的空数组
      this.letters.forEach(letter => {
        result[letter] = [];
      });
      
      // 将中国品牌根据拼音首字母进行分组
      this.chineseOnlyBrands.forEach(brand => {
        const firstLetter = this.getFirstLetter(brand.name);
        if (result[firstLetter]) {
          result[firstLetter].push(brand);
        } else {
          // 如果不在A-Z内，归类到其他类别
          if (!result['#']) {
            result['#'] = [];
          }
          result['#'].push(brand);
        }
      });
      
      return result;
    },
    // 可用的字母筛选（有对应品牌的字母）
    availableLetters() {
      return this.letters.filter(letter => {
        return this.brandsByLetter[letter] && this.brandsByLetter[letter].length > 0;
      });
    },
    // 根据筛选条件过滤品牌
    filteredBrands() {
      let brands = [];
      
      // 首先根据品牌分类筛选
      if (this.brandCategory === 'all') {
        brands = this.allBrands.slice();
      } else if (this.brandCategory === 'domestic') {
        // 国内品牌（包括自主品牌和合资品牌）
        brands = this.allBrands.filter(brand => 
          brand.country === '中国' || 
          brand.country === '合资' || 
          (brand.country && brand.country.includes('合资'))
        );
      } else if (this.brandCategory === 'overseas') {
        // 海外品牌（排除中国和合资品牌）
        brands = this.allBrands.filter(brand => 
          brand.country && 
          brand.country !== '中国' && 
          brand.country !== '合资' && 
          !brand.country.includes('合资')
        );
      }
      
      // 然后根据字母筛选
      if (this.currentLetter !== '不限') {
        brands = brands.filter(brand => {
          const firstLetter = this.getFirstLetter(brand.name);
          return firstLetter === this.currentLetter;
        });
      }
      
      // 根据拼音首字母和品牌名排序
      return brands.sort((a, b) => {
        // 首先按照首字母排序
        const letterA = this.getFirstLetter(a.name);
        const letterB = this.getFirstLetter(b.name);
        
        if (letterA !== letterB) {
          return letterA.localeCompare(letterB);
        }
        
        // 如果首字母相同，按照品牌名称排序
        return a.name.localeCompare(b.name, 'zh-CN');
      });
    }
  },
  methods: {
    // 获取车型图片URL的辅助方法
    getModelImageUrl(model) {
      // 防御性检查，确保model是对象
      if (!model || typeof model !== 'object') {
        console.error('无效的模型数据:', model);
        return '/images/default-car.jpg';
      }
      
      // 1. 首先尝试使用模型自身的thumbnail属性
      if (model.thumbnail && typeof model.thumbnail === 'string' && model.thumbnail.trim() !== '') {
        return model.thumbnail;
      }
      
      // 2. 检查是否有Images集合并且不为空
      if (model.Images && Array.isArray(model.Images) && model.Images.length > 0) {
        // 获取第一张图片的URL
        const image = model.Images[0];
        if (image && image.url) {
          return image.url;
        }
      }
      
      // 3. 如果找不到任何图片，返回默认图片
      return '/images/default-car.jpg';
    },
    // 获取品牌名称拼音首字母
    getFirstLetter(name) {
      if (!name) return '#';
      
      // 1. 首先检查特殊品牌映射表
      if (this.specialBrandMapping[name]) {
        return this.specialBrandMapping[name];
      }
      
      // 2. 检查常见品牌前缀（2-3字品牌名前缀）
      if (name.length >= 2) {
        const prefix2 = name.substring(0, 2);
        if (this.specialBrandMapping[prefix2]) {
          return this.specialBrandMapping[prefix2];
        }
        
        if (name.length >= 3) {
          const prefix3 = name.substring(0, 3);
          if (this.specialBrandMapping[prefix3]) {
            return this.specialBrandMapping[prefix3];
          }
        }
      }
      
      // 3. 使用chinese-to-pinyin库获取拼音
      try {
        // 获取第一个汉字的拼音
        const firstChar = name.charAt(0);
        const pinyinStr = chineseToPinyin(firstChar, { removeSpace: true, firstCharacter: true });
        if (pinyinStr && pinyinStr.length > 0) {
          return pinyinStr.toUpperCase();
        }
      } catch (error) {
        console.error('获取拼音出错:', error);
      }
      
      // 4. 处理英文品牌
      const firstChar = name.charAt(0);
      const firstCharCode = firstChar.charCodeAt(0);
      
      // 如果是字母，直接返回大写
      if ((firstCharCode >= 65 && firstCharCode <= 90) || (firstCharCode >= 97 && firstCharCode <= 122)) {
        return firstChar.toUpperCase();
      }
      
      // 5. 如果以上方法都无法确定，返回#
      return '#';
    },
    // 从车型名称中提取年份
    extractYearFromName(name) {
      if (!name) return null;
      
      // 匹配4位数字年份（1900-2099范围内，支持更广泛的年份范围）
      const yearMatch = name.match(/\b(19|20)\d{2}\b/g);
      if (yearMatch && yearMatch.length > 0) {
        // 如果有多个年份，返回最大的（最新的）
        const years = yearMatch.map(year => parseInt(year)).filter(year => year >= 1900 && year <= 2099);
        if (years.length > 0) {
          return Math.max(...years);
        }
      }
      
      return null;
    },
    // 获取车型的最终年份（优先使用名称中的年份，其次使用数据库年份）
    getModelYear(model) {
      // 1. 优先从车型名称中提取年份
      const nameYear = this.extractYearFromName(model.name);
      if (nameYear) {
        return nameYear;
      }
      
      // 2. 使用数据库中的年份
      if (model.year && model.year > 0) {
        return model.year;
      }
      
      // 3. 默认返回一个较小的年份，确保排在后面
      return 1900;
    },
    // 导航到品牌详情页
    goToBrand(brandId) {
      this.$router.push(`/brand/${brandId}`);
    },
    // 导航到车型详情页
    goToModel(modelId) {
      this.$router.push(`/model/${modelId}`);
    },
    // 导航到文章详情页
    goToArticle(articleId) {
      this.$router.push(`/articles/${articleId}`);
    },
    // 获取品牌列表
    async fetchChineseBrands() {
      this.loading = true;
      this.error = null;
      this.resetLogoLoadState();
      
      try {
        // 检查本地缓存（10分钟有效期）
        const cacheKey = 'brands_cache';
        const cacheTimeKey = 'brands_cache_time';
        const cachedData = localStorage.getItem(cacheKey);
        const cacheTime = localStorage.getItem(cacheTimeKey);
        const now = Date.now();
        const cacheValidTime = 10 * 60 * 1000; // 10分钟
        
        if (cachedData && cacheTime && (now - parseInt(cacheTime)) < cacheValidTime) {
          console.log('使用缓存的品牌数据');
          this.allBrands = JSON.parse(cachedData);
          this.loading = false;
          return;
        }
        
        // 从API获取品牌列表
        const response = await brandAPI.getAll();
        console.log('API返回的原始品牌数据:', response);
        
        // 适配/upload/brands接口的返回格式 { status: 'success', data: [...] }
        if (response.status === 'success' && Array.isArray(response.data)) {
          this.allBrands = response.data;
        } else if (response.data && Array.isArray(response.data)) {
          // 兼容原有格式 { success: true, data: [...] }
          this.allBrands = response.data;
        } else {
          // 如果response.data不存在或不是数组，使用整个response作为数据
          this.allBrands = Array.isArray(response) ? response : [];
        }
        
        // 缓存数据
        if (this.allBrands && this.allBrands.length > 0) {
          localStorage.setItem(cacheKey, JSON.stringify(this.allBrands));
          localStorage.setItem(cacheTimeKey, now.toString());
        }
        
        // 如果没有数据，显示提示信息
        if (!this.allBrands || this.allBrands.length === 0) {
          this.error = '数据库中未找到品牌数据';
        }
        
        // 强制刷新筛选状态
        this.currentLetter = '不限';
        this.brandCategory = 'all'; // 重置分类
        
      } catch (error) {
        console.error('获取品牌列表失败:', error);
        if (error.response) {
          // 服务器响应了错误状态码
          this.error = `连接数据库失败 (${error.response.status}): ${error.response.data.message || '请检查网络连接或联系管理员'}`;
        } else if (error.request) {
          // 请求发送了但没有收到响应
          this.error = '无法连接到服务器，请检查后端服务是否正在运行';
        } else {
          // 请求设置时发生错误
          this.error = '连接数据库失败，请检查网络连接或联系管理员';
        }
      } finally {
        this.loading = false;
      }
    },
    // 加载更多车型
    async loadMoreModels() {
      this.loadingMore = true;
      try {
        const nextPage = this.currentPage + 1;
        console.log(`加载第 ${nextPage} 页车型`);
        
        // 调用API获取下一页数据
        const response = await modelAPI.getAll({
          latest: true,
          page: nextPage,
          limit: this.pageSize,
          sortOrder: 'desc' // 确保按年份降序排列，最新车型在前
        });
        
        if (response.success && Array.isArray(response.data)) {
          // 为新加载的车型设置缩略图
          response.data.forEach(model => {
            if (!model.thumbnail && model.Images && model.Images.length > 0) {
              const firstImage = model.Images[0];
              model.thumbnail = firstImage.url;
            }
          });
          
          // 将新数据添加到现有列表
          this.latestModels = [...this.latestModels, ...response.data];
          this.currentPage = response.page;
          this.hasMoreModels = response.page < response.totalPages;
          
          console.log(`成功加载第 ${nextPage} 页，新增 ${response.data.length} 个车型`);
        } else {
          console.error('加载更多车型失败：无效的响应数据');
          this.hasMoreModels = false;
        }
      } catch (error) {
        console.error('加载更多车型失败:', error);
        this.$message.error('加载更多车型失败，请稍后重试');
      } finally {
        this.loadingMore = false;
        
        // 重新初始化懒加载
        this.$nextTick(() => {
          this.initLazyLoading();
        });
      }
    },
    // 初始化图片懒加载
    initLazyLoading() {
      // 检查浏览器是否支持Intersection Observer
      if ('IntersectionObserver' in window) {
        this.lazyLoadObserver = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const img = entry.target;
              const dataSrc = img.getAttribute('data-src');
              
              if (dataSrc) {
                // 创建一个新的图片对象来预加载
                const newImg = new Image();
                newImg.onload = () => {
                  // 图片加载完成后替换src
                  img.src = dataSrc;
                  img.classList.remove('lazy-load');
                  img.classList.add('loaded');
                  
                  // 隐藏骨架屏
                  const nextElement = img.nextElementSibling;
                  if (nextElement && nextElement.querySelector) {
                    const skeleton = nextElement.querySelector('.model-image-skeleton');
                    if (skeleton) {
                      skeleton.style.display = 'none';
                    }
                  }
                };
                newImg.onerror = () => {
                  // 根据图片类型设置不同的默认图片
                  if (img.classList.contains('brand-logo-img')) {
                    // 品牌logo加载失败，显示文字logo
                    img.style.display = 'none';
                    const noLogoElement = img.nextElementSibling;
                    if (noLogoElement && noLogoElement.classList.contains('no-logo')) {
                      noLogoElement.style.display = 'flex';
                    }
                  } else {
                    // 车型图片加载失败，显示默认图片
                    img.src = '/images/default-car.jpg';
                  }
                  img.classList.remove('lazy-load');
                  img.classList.add('error');
                };
                newImg.src = dataSrc;
                
                // 停止观察这个元素
                this.lazyLoadObserver.unobserve(img);
              }
            }
          });
        }, {
          rootMargin: '100px', // 提前100px开始加载，改善用户体验
          threshold: 0.1 // 当图片10%进入视口时开始加载
        });
        
        // 观察所有懒加载图片
        this.observeLazyImages();
      } else {
        // 浏览器不支持Intersection Observer，直接加载所有图片
        this.$nextTick(() => {
          const lazyImages = document.querySelectorAll('.lazy-load');
          lazyImages.forEach(img => {
            const dataSrc = img.getAttribute('data-src');
            if (dataSrc) {
              img.src = dataSrc;
              img.classList.remove('lazy-load');
            }
          });
        });
      }
    },
    
    // 观察懒加载图片
    observeLazyImages() {
      this.$nextTick(() => {
        const lazyImages = document.querySelectorAll('.lazy-load:not([data-observed])');
        lazyImages.forEach(img => {
          if (this.lazyLoadObserver) {
            this.lazyLoadObserver.observe(img);
            img.setAttribute('data-observed', 'true');
          }
        });
      });
    },
    
    // 预加载下一批图片
    preloadNextBatchImages(models) {
      // 只预加载前6张图片，避免过度预加载
      const imagesToPreload = models.slice(0, 6);
      
      imagesToPreload.forEach((model, index) => {
        if (model.Images && model.Images.length > 0) {
          // 延迟预加载，避免阻塞当前渲染
          setTimeout(() => {
            const img = new Image();
            img.src = model.Images[0].url;
            // 不需要处理onload/onerror，只是预加载
          }, index * 100); // 每100ms预加载一张图片
        }
      });
    },
    
    // 优化图片URL（添加压缩参数）
    getOptimizedImageUrl(url, width = 300, height = 200) {
      if (!url) return '';
      
      // 如果是本地图片URL，添加压缩参数
      if (url.includes('/api/') || url.startsWith('/')) {
        // 假设后端支持图片压缩参数
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}w=${width}&h=${height}&q=80&f=webp`;
      }
      
      return url;
    },
    
    // 预加载品牌logo
    preloadBrandLogos() {
      if (!this.allBrands) return;
      
      // 创建一个Map来存储已加载的图片
      const loadedImages = new Map();
      
      this.allBrands.forEach(brand => {
        if (brand.logo && !loadedImages.has(brand.logo)) {
          const img = new Image();
          img.onload = () => {
            loadedImages.set(brand.logo, true);
          };
          img.onerror = () => {
            this.$set(this.logoLoadError, brand.id, true);
          };
          img.src = brand.logo;
        }
      });
    },

    // 初始化品牌数据
    async initializeBrands() {
      try {
        await this.fetchChineseBrands();
        // 数据加载完成后预加载logo
        this.$nextTick(() => {
          this.preloadBrandLogos();
        });
      } catch (error) {
        console.error('初始化品牌数据失败:', error);
      }
    },
    // 设置品牌分类
    setBrandCategory(category) {
      this.brandCategory = category;
      this.currentLetter = '不限'; // 重置字母筛选
    },
    // 获取当前品牌分类的名称
    getCategoryName() {
      if (this.brandCategory === 'all') {
        return '全部';
      } else if (this.brandCategory === 'domestic') {
        return '国内品牌';
      } else if (this.brandCategory === 'overseas') {
        return '海外品牌';
      }
      return '';
    },
    // 处理品牌logo加载失败
    handleBrandLogoError(event) {
      const img = event.target;
      img.style.display = 'none';
      img.nextElementSibling.style.display = 'flex'; // 显示no-logo
    },
         // 获取占位符图片URL
     getPlaceholderImage() {
       // 使用轻量级的SVG占位符，避免额外的HTTP请求
       return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iNCIgZmlsbD0iI0Y1RjVGNSIvPgo8L3N2Zz4K';
     },

    handleLogoLoad(event) {
      const img = event.target;
      img.classList.add('loaded');
      // 获取品牌ID
      const brandId = this.getBrandIdFromImg(img);
      if (brandId) {
        this.$set(this.logoLoadError, brandId, false);
      }
    },

    handleLogoError(event) {
      const img = event.target;
      img.style.display = 'none';
      // 获取品牌ID
      const brandId = this.getBrandIdFromImg(img);
      if (brandId) {
        this.$set(this.logoLoadError, brandId, true);
      }
    },

    // 获取轮播图内容（5个车型+3篇文章）
    async fetchCarouselModels() {
      this.latestModelsLoading = true;
      this.latestModelsError = null;
      
      try {
        console.log('开始获取轮播图内容...');
        
        // 获取车型数据
        const modelsResponse = await modelAPI.getAll({
          latest: true,
          limit: 5,
          page: 1,
          sortOrder: 'desc' // 确保按年份降序排列，最新车型在前
        });
        
        // 尝试获取文章数据（如果失败，继续使用车型数据）
        let articlesResponse = null;
        try {
          articlesResponse = await articleAPI.getAll({
            limit: 3,
            page: 1,
            sort: 'createdAt',
            order: 'desc'
          });
        } catch (articleError) {
          console.warn('获取文章数据失败，将只显示车型:', articleError);
          articlesResponse = { data: [] };
        }
        
        console.log('轮播图车型API响应:', modelsResponse);
        console.log('轮播图文章API响应:', articlesResponse);
        
        // 处理车型数据
        if (modelsResponse && modelsResponse.data && Array.isArray(modelsResponse.data)) {
          this.latestModels = modelsResponse.data;
        } else if (Array.isArray(modelsResponse)) {
          this.latestModels = modelsResponse;
        } else {
          console.warn('无效的车型响应格式:', modelsResponse);
          this.latestModels = [];
        }
        
        // 处理文章数据
        if (articlesResponse && articlesResponse.data && articlesResponse.data.articles && Array.isArray(articlesResponse.data.articles)) {
          this.latestArticles = articlesResponse.data.articles;
        } else if (articlesResponse && articlesResponse.data && Array.isArray(articlesResponse.data)) {
          this.latestArticles = articlesResponse.data;
        } else if (Array.isArray(articlesResponse)) {
          this.latestArticles = articlesResponse;
        } else {
          console.warn('无效的文章响应格式:', articlesResponse);
          this.latestArticles = [];
        }
        
        // 合并车型和文章到轮播项目中
        this.carouselItems = [
          ...this.latestModels.map(model => ({ ...model, type: 'model' })),
          ...this.latestArticles.map(article => ({ ...article, type: 'article' }))
        ];
        
        console.log('获取到轮播图内容:', this.carouselItems);
        console.log('车型数量:', this.latestModels.length);
        console.log('文章数量:', this.latestArticles.length);
        
        // 如果没有任何内容（车型和文章都没有），使用车型数据作为fallback
        if (this.carouselItems.length === 0 && this.latestModels.length > 0) {
          this.carouselItems = this.latestModels.map(model => ({ ...model, type: 'model' }));
          console.log('使用车型数据作为fallback:', this.carouselItems);
        }
        
        // 如果有内容，启动自动播放
        if (this.carouselItems.length > 0) {
          this.startAutoPlay();
        } else {
          console.warn('没有可用的轮播内容');
        }
      } catch (error) {
        console.error('获取轮播图内容失败:', error);
        this.latestModelsError = error.message || '获取轮播图内容失败';
      } finally {
        this.latestModelsLoading = false;
      }
    },
    
    // 轮播图控制方法
    startAutoPlay() {
      if (this.carouselItems.length > 1) {
        this.autoPlayInterval = setInterval(() => {
          this.nextSlide();
        }, 3000);
      }
    },
    
    stopAutoPlay() {
      if (this.autoPlayInterval) {
        clearInterval(this.autoPlayInterval);
        this.autoPlayInterval = null;
      }
    },
    
    nextSlide() {
      if (this.carouselItems.length > 1) {
        this.currentSlide = (this.currentSlide + 1) % this.carouselItems.length;
      }
    },
    
    prevSlide() {
      if (this.carouselItems.length > 1) {
        this.currentSlide = this.currentSlide === 0 
          ? this.carouselItems.length - 1 
          : this.currentSlide - 1;
      }
    },
    
    goToSlide(index) {
      this.currentSlide = index;
    },
    
    // 拖拽相关方法
    startDrag(event) {
      this.isDragging = true;
      this.dragStartX = event.type === 'mousedown' ? event.clientX : event.touches[0].clientX;
      this.dragCurrentX = this.dragStartX;
      this.stopAutoPlay();
    },
    
    onDrag(event) {
      if (!this.isDragging) return;
      
      event.preventDefault();
      this.dragCurrentX = event.type === 'mousemove' ? event.clientX : event.touches[0].clientX;
    },
    
    endDrag() {
      if (!this.isDragging) return;
      
      const dragDistance = this.dragCurrentX - this.dragStartX;
      const threshold = 100; // 拖拽阈值
      
      if (Math.abs(dragDistance) > threshold) {
        if (dragDistance > 0) {
          this.prevSlide();
        } else {
          this.nextSlide();
        }
      }
      
      this.isDragging = false;
      this.startAutoPlay();
    },
    
    // 获取车型展示数据
    async fetchDisplayModels() {
      this.displayModelsLoading = true;
      this.displayModelsError = null;
      
      try {
        console.log('开始获取车型展示数据...');
        console.log('排序参数:', this.sortOrder);
        console.log('年代筛选:', this.selectedDecade);
        
        // 构建API请求参数
        const params = {
          limit: this.displayPageSize,
          page: this.currentDisplayPage,
          sortOrder: this.sortOrder
        };
        
        // 如果选择了年代筛选，添加年代参数
        if (this.selectedDecade) {
          params.decade = this.selectedDecade;
        }
        
        const response = await modelAPI.getAll(params);
        
        console.log('车型展示API响应:', response);
        
        // 处理不同的响应格式
        if (response && response.data && Array.isArray(response.data)) {
          const newModels = response.data;
          if (this.currentDisplayPage === 1) {
            this.displayModels = newModels;
          } else {
            this.displayModels = [...this.displayModels, ...newModels];
          }
          this.hasMoreDisplayModels = newModels.length === this.displayPageSize;
          console.log('获取到车型展示数据:', this.displayModels);
          
          // 预加载下一批图片
          this.preloadNextBatchImages(newModels);
        } else if (Array.isArray(response)) {
          const newModels = response;
          if (this.currentDisplayPage === 1) {
            this.displayModels = newModels;
          } else {
            this.displayModels = [...this.displayModels, ...newModels];
          }
          this.hasMoreDisplayModels = newModels.length === this.displayPageSize;
          console.log('获取到车型展示数据(数组格式):', this.displayModels);
          
          // 预加载下一批图片
          this.preloadNextBatchImages(newModels);
        } else {
          console.error('无效的车型展示响应格式:', response);
          throw new Error('获取车型展示数据失败');
        }
      } catch (error) {
        console.error('获取车型展示数据失败:', error);
        this.displayModelsError = error.message || '获取车型展示数据失败';
      } finally {
        this.displayModelsLoading = false;
      }
    },
    
    // 切换排序方式
    toggleSortOrder() {
      this.sortOrder = this.sortOrder === 'desc' ? 'asc' : 'desc';
      console.log('切换排序方式:', this.sortOrder);
      this.currentDisplayPage = 1;
      this.fetchDisplayModels();
    },
    
    // 选择年代筛选
    selectDecade(decade) {
      this.selectedDecade = decade;
      console.log('选择年代筛选:', decade);
      this.currentDisplayPage = 1;
      this.fetchDisplayModels();
    },
    
    // 加载更多车型
    loadMoreModels() {
      if (this.hasMoreDisplayModels && !this.displayModelsLoading) {
        this.currentDisplayPage++;
        this.fetchDisplayModels().then(() => {
          // 新加载的车型图片也需要懒加载
          this.observeLazyImages();
        });
      }
    },
    
    // 重试获取车型数据
    retryFetchDisplayModels() {
      this.currentDisplayPage = 1;
      this.displayModels = [];
      this.fetchDisplayModels().then(() => {
        this.observeLazyImages();
      });
    },
    
    // 重试单个图片加载
    retryImageLoad(model) {
      if (model.Images && model.Images.length > 0) {
        // 重置错误状态
        this.$set(this.modelImageLoadError, model.id, false);
        
        // 找到对应的图片元素并重新加载
        this.$nextTick(() => {
          const img = document.querySelector(`img[alt="${model.name}"]`);
          if (img) {
            img.src = this.getOptimizedImageUrl(model.Images[0].url, 300, 200);
          }
        });
      }
    },

    // 处理车型图片加载成功
    handleModelImageLoad(event) {
      const img = event.target;
      img.classList.add('loaded');
      // 获取车型ID
      const modelId = this.getModelIdFromImg(img);
      if (modelId) {
        this.$set(this.modelImageLoadError, modelId, false);
      }
    },

    // 处理车型图片加载失败
    handleModelImageError(event) {
      const img = event.target;
      img.style.display = 'none';
      // 获取车型ID
      const modelId = this.getModelIdFromImg(img);
      if (modelId) {
        this.$set(this.modelImageLoadError, modelId, true);
      }
    },

    // 从图片元素获取车型ID
    getModelIdFromImg(img) {
      const modelCard = img.closest('.model-card');
      if (modelCard) {
        return modelCard.getAttribute('data-model-id');
      }
      return null;
    },

    getBrandIdFromImg(img) {
      // 通过DOM遍历找到对应的brand-card元素
      let current = img;
      while (current && !current.classList.contains('brand-card')) {
        current = current.parentElement;
      }
      if (current) {
        return current.dataset.brandId;
      }
      return null;
    },

    // 重置logo加载状态
    resetLogoLoadState() {
      this.logoLoadError = {};
      // 移除所有loaded类
      const logos = document.querySelectorAll('.brand-logo-img');
      logos.forEach(logo => {
        logo.classList.remove('loaded');
        logo.style.display = '';
      });
    }
  },
  mounted() {
    this.initializeBrands();
    this.fetchCarouselModels();
    this.fetchDisplayModels().then(() => {
      // 初始化图片懒加载
      this.initLazyLoading();
      // 观察初始加载的图片
      this.observeLazyImages();
    });
  },
  beforeDestroy() {
    // 清理懒加载观察器
    if (this.lazyLoadObserver) {
      this.lazyLoadObserver.disconnect();
    }
    // 停止自动播放
    this.stopAutoPlay();
  },
  watch: {
    // 监听路由变化，重置logo加载状态
    '$route'() {
      this.resetLogoLoadState();
    }
  }
}
</script>

<style scoped>
.home {
  padding: 0;
  font-family: Arial, "Microsoft YaHei", sans-serif;
  overflow-x: hidden;
  width: 100%;
}

/* 顶部导航栏样式 */
.top-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  border-bottom: 1px solid #e0e0e0;
  background-color: #fff;
}

.logo-nav {
  font-size: 16px;
  color: #333;
  font-weight: 500;
}

.menu-nav {
  display: flex;
}

.menu-nav a {
  margin-left: 25px;
  cursor: pointer;
  font-size: 14px;
  color: #333;
  text-decoration: none;
}

.menu-nav a:hover {
  color: #e03426;
}

.menu-nav a.router-link-active {
  color: #e03426;
  font-weight: bold;
}

/* 全屏轮播图样式 */
/* 全局内容容器 - 自适应布局 */
.content-container {
  width: 100%;
  margin: 0 auto;
  padding: 0 12px;
  box-sizing: border-box;
}

.fullscreen-carousel {
  position: relative;
  width: 100%;
  height: 70vh;
  overflow: hidden;
  background: #000;
  margin: 0 0 20px 0;
}

.carousel-container {
  position: relative;
  width: 100%;
  height: 100%;
  cursor: grab;
}

.carousel-container:active {
  cursor: grabbing;
}

.carousel-slide {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transition: transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.slide-image-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.slide-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

.slide-placeholder {
  display: none;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  align-items: center;
  justify-content: center;
  color: white;
}

.slide-placeholder.show {
  display: flex;
}

.placeholder-content {
  text-align: center;
}

.placeholder-content i {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.7;
}

.placeholder-content span {
  font-size: 18px;
  font-weight: 500;
}

.slide-info-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
  color: white;
  padding: 60px 12px 40px;
  z-index: 10;
}

.slide-content {
  max-width: none;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.content-type-badge {
  display: inline-block;
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 20px;
}

.model-badge {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
}

.article-badge {
  background: linear-gradient(135deg, #4dabf7 0%, #339af0 100%);
}

.slide-title {
  font-size: 48px;
  font-weight: 700;
  margin: 0 0 12px 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.slide-brand {
  font-size: 24px;
  margin: 0 0 20px 0;
  opacity: 0.9;
  font-weight: 300;
}

.view-details-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 12px 24px;
  border-radius: 50px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  gap: 8px;
}

.view-details-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-2px);
}

/* 导航指示器 */
.carousel-indicators {
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 12px;
  z-index: 20;
}

.indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  cursor: pointer;
  transition: all 0.3s ease;
}

.indicator.active {
  background: white;
  transform: scale(1.2);
}



/* 左右导航按钮 */
.carousel-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.carousel-nav:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-50%) scale(1.1);
}

.carousel-nav.prev {
  left: 20px;
}

.carousel-nav.next {
  right: 20px;
}

/* 加载和错误状态 */
.loading-container,
.error-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  color: white;
  text-align: center;
}

.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.loading-spinner i {
  font-size: 48px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.error-icon {
  font-size: 64px;
  margin-bottom: 20px;
  opacity: 0.7;
}

.error-text {
  font-size: 18px;
  font-weight: 500;
}

/* 车型展示区域样式 */
.models-display-section {
  background: #fff;
  margin: 20px 0;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.section-header {
  padding: 24px 24px 16px 24px;
  border-bottom: 1px solid #f0f0f0;
  text-align: center;
}

.section-title {
  text-align: center;
}

.section-title h2 {
  margin: 0 0 4px 0;
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.section-subtitle {
  font-size: 14px;
  color: #666;
  margin: 0;
}

.sort-btn {
  background: #e03426;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 6px;
}

.sort-btn:hover {
  background: #d02e20;
}

/* 筛选控制栏样式 */
.filter-control-bar {
  padding: 16px 16px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: flex-start;
  justify-content: center;
}

.sort-control,
.decade-control {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.control-label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
}

.decade-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.decade-btn {
  padding: 8px 16px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 20px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: #666;
  transition: all 0.2s ease;
  min-width: 60px;
  text-align: center;
}

.decade-btn:hover {
  background: #fce4e4;
  border-color: #f5a5a5;
  color: #e03426;
  transform: translateY(-1px);
}

.decade-btn.active {
  background: #e03426;
  border-color: #e03426;
  color: white;
  box-shadow: 0 2px 6px rgba(224, 52, 38, 0.3);
}

.decade-btn:active {
  transform: scale(0.95);
}

.models-content {
  padding: 12px 8px 16px 8px;
}

.models-content .models-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
  padding: 0 4px;
}

.model-display-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid #f0f0f0;
  aspect-ratio: 4/5;
  min-height: 200px;
}

.model-display-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);
  border-color: #e03426;
}

.model-display-image {
  position: relative;
  height: 75%;
  overflow: hidden;
  background: #f8f9fa;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px 12px 0 0;
}

.model-display-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.model-display-card:hover .model-display-img {
  transform: scale(1.05);
}

.model-display-placeholder {
  display: none;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #ccc;
  font-size: 48px;
}

.model-display-placeholder.show {
  display: flex;
}

.model-display-info {
  padding: 10px 8px 12px 8px;
  height: 25%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: #fff;
  position: relative;
  z-index: 10;
  border-radius: 0 0 12px 12px;
}

.model-display-name {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #333;
  line-height: 1.3;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  max-height: 100%;
  width: 100%;
}



.load-more-container {
  text-align: center;
  margin-top: 30px;
}

.load-more-btn {
  background: #e03426;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 auto;
}

.load-more-btn:hover:not(:disabled) {
  background: #d02e20;
}

.load-more-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.hero-header {
  max-width: 1200px;
  margin: 0 auto 50px;
  padding: 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  z-index: 2;
}

.hero-title h1 {
  font-size: 48px;
  font-weight: 700;
  color: white;
  margin: 0 0 12px 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.hero-subtitle {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
  font-weight: 300;
}

.view-all-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 12px 24px;
  border-radius: 50px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  gap: 8px;
}

.view-all-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-2px);
}

.hero-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  position: relative;
  z-index: 2;
}

.hero-content .models-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 30px;
  margin-top: 40px;
}

.model-hero-card {
  background: white;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  position: relative;
  animation: slideInUp 0.6s ease forwards;
  opacity: 0;
  transform: translateY(30px);
}

@keyframes slideInUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.model-hero-card:hover {
  transform: translateY(-15px) scale(1.02);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.25);
}

.model-image-container {
  position: relative;
  height: 280px;
  overflow: hidden;
}

.model-hero-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.model-hero-card:hover .model-hero-image {
  transform: scale(1.1);
}

.model-placeholder {
  display: none;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  align-items: center;
  justify-content: center;
  color: white;
}

.model-placeholder.show {
  display: flex;
}

.placeholder-content {
  text-align: center;
}

.placeholder-content i {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.7;
}

.placeholder-content span {
  font-size: 16px;
  font-weight: 500;
}

.model-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.model-hero-card:hover .model-overlay {
  opacity: 1;
}

.overlay-content {
  color: white;
  text-align: center;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 500;
}

.model-hero-info {
  padding: 30px;
  position: relative;
}

.model-badge {
  position: absolute;
  top: -15px;
  right: 30px;
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.model-hero-name {
  font-size: 24px;
  font-weight: 700;
  color: #333;
  margin: 0 0 12px 0;
  line-height: 1.3;
}

.model-hero-brand {
  font-size: 16px;
  color: #666;
  margin: 0;
  font-weight: 500;
}

/* 加载状态样式 */
.loading-skeleton {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 30px;
}

.skeleton-card {
  height: 400px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  border-radius: 20px;
  animation: loading 1.5s infinite;
}

@keyframes loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* 错误和空状态样式 */
.error-container,
.empty-container {
  text-align: center;
  padding: 60px 20px;
  color: white;
}

.error-icon,
.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
  opacity: 0.7;
}

.error-text,
.empty-text {
  font-size: 18px;
  font-weight: 500;
}

/* 品牌展示区域样式优化 */
.brand-section {
  background: #fff;
  margin: 20px 0;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

/* 品牌分类标签页 */
.brand-category-tabs {
  display: flex;
  background: #f8f9fa;
  padding: 0;
  border-bottom: 1px solid #e9ecef;
}

.category-tab {
  flex: 1;
  padding: 16px 20px;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #666;
  transition: all 0.3s ease;
  position: relative;
}

.category-tab:hover {
  background: rgba(224, 52, 38, 0.08);
  color: #e03426;
}

.category-tab.active {
  background: #fff;
  color: #e03426;
  font-weight: 600;
}

.category-tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: #e03426;
}

/* 字母筛选器优化 */
.alphabet-filter {
  display: flex;
  flex-wrap: wrap;
  padding: 12px 16px;
  gap: 6px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
}

.alphabet-btn {
  min-width: 32px;
  height: 32px;
  padding: 0 6px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  color: #666;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.alphabet-btn:hover {
  background: #fce4e4;
  border-color: #f5a5a5;
  color: #e03426;
  transform: translateY(-1px);
}

.alphabet-btn.active {
  background: #e03426;
  border-color: #e03426;
  color: white;
  box-shadow: 0 2px 6px rgba(224, 52, 38, 0.3);
}

.alphabet-btn:active {
  transform: scale(0.95);
  background: #fce4e4;
}

/* 品牌展示网格 */
.brands-display {
  padding: 16px 12px;
  background: #fff;
}

.brands-grid {
  display: grid;
  grid-template-columns: repeat(13, 1fr);
  gap: min(0.8vw, 8px);
  margin-bottom: 16px;
  justify-items: center;
  align-items: start;
}

.brand-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: min(1vw, 8px) min(0.6vw, 6px);
  background: #ffffff;
  border: 1px solid #f0f2f5;
  border-radius: min(1vw, 8px);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  aspect-ratio: 1 / 1;
  justify-content: flex-start;
  position: relative;
  width: 100%;
  max-width: 100px;
  height: auto;
  min-height: 0;
  padding-top: min(1.8vw, 14px);
}

.brand-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
  background: #fff;
  border-color: #e03426;
}

.brand-card:active {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.brand-card .brand-logo {
  position: relative;
  width: clamp(20px, 3.2vw, 32px);
  height: clamp(20px, 3.2vw, 32px);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: clamp(1px, 0.3vw, 4px);
  border-radius: clamp(2px, 0.5vw, 4px);
  flex-shrink: 0;
  background: #fff;
  overflow: hidden;
}

.brand-logo::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.2),
    transparent
  );
  animation: loading-shimmer 1.5s infinite;
}

@keyframes loading-shimmer {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}

.brand-logo img.loaded + .no-logo {
  display: none;
}

.brand-logo img.loaded {
  opacity: 1;
}

.brand-logo img.loaded ~ .loading-shimmer {
  display: none;
}

.brand-logo-img {
  max-width: clamp(16px, 2.8vw, 28px);
  max-height: clamp(16px, 2.8vw, 28px);
  object-fit: contain;
  image-rendering: -webkit-optimize-contrast;
  image-rendering: crisp-edges;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.brand-logo-img.loaded {
  opacity: 1;
}

.brand-logo .no-logo {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e03426, #67C23A);
  color: white;
  font-size: clamp(6px, 1.2vw, 12px);
  font-weight: 600;
  font-family: "Microsoft YaHei", "PingFang SC", "Helvetica Neue", Arial, sans-serif;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.brand-logo .no-logo.show {
  opacity: 1;
}

.brand-card .brand-name {
  font-size: clamp(9px, 1.4vw, 13px);
  text-align: center;
  color: #333333;
  font-weight: 500;
  line-height: 1.2;
  max-width: 100%;
  word-break: break-word;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  margin-top: auto;
  padding: 0 clamp(1px, 0.3vw, 3px);
  min-height: clamp(16px, 2.8vw, 24px);
  font-family: "Microsoft YaHei", "PingFang SC", "Helvetica Neue", Arial, sans-serif;
  margin-bottom: clamp(1px, 0.3vw, 3px);
}

/* 品牌统计信息 */
.brand-stats {
  text-align: center;
  padding: 16px 0;
  font-size: 14px;
  color: #909399;
  border-top: 1px solid #f0f0f0;
  background: #fafbfc;
  margin: 0 -20px -20px -20px;
}

.stats-text {
  margin-right: 8px;
}

.category-text {
  font-weight: 600;
  color: #e03426;
}

/* 移除旧的样式 */
.brand-filter-container,
.brand-category-filter,
.letter-filter,
.brands-container,
.brand-item {
  /* 这些类将被新样式替代 */
}

/* 旧的品牌展示样式已移除，使用新的样式 */

.loading-container {
  padding: 12px;
  margin-bottom: 12px;
}

.error-message {
  color: #F56C6C;
  text-align: center;
  padding: 12px;
}

.no-brands-message {
  text-align: center;
  padding: 12px;
  color: #909399;
  font-size: 14px;
}

.image {
  width: 100%;
  height: 200px;
  object-fit: cover;
  display: block;
  cursor: pointer;
}

.model-card {
  cursor: pointer;
  transition: transform 0.3s, box-shadow 0.3s;
}

.model-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2) !important;
}

.bottom {
  margin-top: 13px;
  line-height: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.time {
  font-size: 13px;
  color: #999;
}

.button {
  padding: 0;
  float: right;
}

.el-divider {
  margin: 16px 0 12px 0;
}

.el-row {
  margin-bottom: 12px;
}

.load-more-section {
  text-align: center;
  margin-top: 16px;
  padding: 12px;
}

.load-more-btn {
  padding: 12px 32px;
  font-size: 16px;
  border-radius: 8px;
  background: #e03426;
  border: none;
  color: white;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(224, 52, 38, 0.3);
}

.load-more-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(224, 52, 38, 0.4);
}

.load-more-btn:active {
  transform: translateY(0);
}

.no-more-text {
  color: #909399;
  font-size: 14px;
  margin: 0;
  padding: 12px;
  background-color: #f5f7fa;
  border-radius: 8px;
  display: inline-block;
}

/* 移动端优化 */
* {
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
}

/* 防止水平滚动和确保页面背景 */
body, html {
  overflow-x: hidden;
  margin: 0;
  padding: 0;
  background-color: #f5f5f5;
}

.home {
  background-color: #f5f5f5;
  min-height: 100vh;
  margin: 0;
  padding: 0;
}

.home * {
  box-sizing: border-box;
}

.brand-card, .alphabet-btn, .category-tab {
  -webkit-tap-highlight-color: rgba(224, 52, 38, 0.2);
  user-select: none;
}

/* 响应式设计 - 自适应padding */
@media (min-width: 1400px) {
  .content-container {
    padding: 0 20px;
  }
  
  .slide-info-overlay {
    padding: 60px 20px 40px;
  }
}

@media (max-width: 1200px) {
  .content-container {
    padding: 0 12px;
  }
  
  .slide-info-overlay {
    padding: 60px 12px 40px;
  }
}

@media (max-width: 1400px) {
.brands-grid {
    grid-template-columns: repeat(12, 1fr);
  }
}

@media (max-width: 1200px) {
  .brands-grid {
    grid-template-columns: repeat(10, 1fr);
  }
  
  .models-display-section {
    margin: 6px 15px;
    padding: 10px;
  }
  
  .filter-control-bar {
    flex-direction: column;
    gap: 16px;
    align-items: center;
  }
  
  .sort-control,
  .decade-control {
    justify-content: center;
  }
  
  .models-content .models-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
  }
}

@media (max-width: 768px) {
  .home {
    padding: 0;
  }
  
  .brand-filter-container,
  .models-display-section {
    margin: 4px 10px;
    padding: 8px;
    border-radius: 12px;
  }
  
  .filter-control-bar {
    padding: 16px 12px;
    flex-direction: column;
    gap: 12px;
  }
  
  .sort-control,
  .decade-control {
    flex-direction: column;
    gap: 8px;
    text-align: center;
  }
  
  .decade-buttons {
    justify-content: center;
  }
  
  .brand-category-filter {
    padding: 12px;
    gap: 6px;
  }

  .category-btn {
    padding: 6px 12px;
    font-size: 13px;
  }

  .letter-filter {
    padding: 12px;
    gap: 6px;
  }
  
  .letter-btn {
    padding: 6px 12px;
    font-size: 13px;
  }
  
  .brands-container {
    grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
    gap: 8px;
    padding: 12px;
  }
  
  .brand-item {
    padding: 8px 4px;
  }
  
  .brand-logo {
    width: 28px;
    height: 28px;
  }
  
  .brand-logo img {
    max-width: 24px;
    max-height: 24px;
  }
  
  .no-logo {
    width: 24px;
    height: 24px;
    font-size: 12px;
  }
  
  .brand-name {
    font-size: 11px;
  }
  
  .brand-stats {
    padding: 10px 12px;
    font-size: 13px;
  }

  .stats-text {
    margin-right: 3px;
  }

  .category-text {
    font-size: 13px;
  }
  
  .section-header h2 {
    font-size: 20px;
  }
  
  .fullscreen-carousel {
    height: 60vh;
  }
  
  .slide-title {
    font-size: 36px;
  }
  
  .slide-brand {
    font-size: 20px;
  }
  
  .slide-info-overlay {
    padding: 50px 25px 35px;
  }
  
  .carousel-nav {
    width: 40px;
    height: 40px;
    font-size: 16px;
  }
  
  .carousel-nav.prev {
    left: 15px;
  }
  
  .carousel-nav.next {
    right: 15px;
  }
  
  .carousel-indicators {
    bottom: 20px;
  }
  
  .indicator {
    width: 10px;
    height: 10px;
  }
  
  .model-brand {
    font-size: 11px;
  }
  
  .model-series {
    font-size: 10px;
  }
  
  .models-content .models-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
    padding: 0 2px;
  }
  
  .model-image,
  .model-display-image {
    height: 70% !important;
  }
  
  .model-info {
    padding: 12px;
  }
  
  .model-display-card {
    min-height: 160px !important;
  }
  
  .model-display-info {
    height: 30% !important;
    padding: 8px 6px 10px 6px !important;
    background: #fff !important;
    border-top: 1px solid #eee !important;
  }
  
  .model-display-name {
    font-size: 13px !important;
    line-height: 1.3 !important;
    color: #333 !important;
    font-weight: 600 !important;
    text-align: center !important;
    display: block !important;
  }
  
  .model-name {
    font-size: 15px;
  }
  
  .load-more-section {
    margin-top: 12px;
    padding: 10px;
  }
  
  .load-more-btn {
    padding: 10px 24px;
    font-size: 14px;
  }
}

@media (max-width: 768px) {
  .content-container {
    padding: 0 12px;
  }
  
  .models-content {
    padding: 12px 6px 16px 6px;
  }
  
  .filter-control-bar {
    padding: 12px 8px;
    gap: 15px;
    flex-direction: column;
    align-items: stretch;
  }
  
  .decade-control,
  .sort-control {
    gap: 8px;
  }
  
  .decade-buttons {
    gap: 6px;
  }
  
  .decade-btn {
    padding: 6px 12px;
    font-size: 12px;
    min-width: 50px;
  }
  
  .slide-info-overlay {
    padding: 50px 10px 35px;
  }
  
  .home {
    padding: 0;
  }
  
  .brand-section {
    margin: 0 0 20px 0;
    border-radius: 8px;
  }
  
  .brand-category-tabs {
    flex-wrap: nowrap;
    overflow-x: auto;
    padding: 0;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  
  .brand-category-tabs::-webkit-scrollbar {
    display: none;
  }
  
  .category-tab {
    padding: 8px 12px;
    font-size: 12px;
    white-space: nowrap;
    flex-shrink: 0;
    min-width: auto;
  }
  
  .alphabet-filter {
    padding: 12px 16px;
    gap: 4px;
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  
  .alphabet-filter::-webkit-scrollbar {
    display: none;
  }
  
  .alphabet-btn {
    min-width: 28px;
    height: 28px;
    font-size: 11px;
    flex-shrink: 0;
    padding: 0 6px;
  }
  
  .brands-display {
    padding: 12px 8px;
  }
  
  .brands-grid {
    grid-template-columns: repeat(8, 1fr);
    gap: 6px;
  }
  
  .brand-card {
    padding: 6px 3px;
    aspect-ratio: 1 / 1;
    max-width: none;
    height: auto;
    min-height: 0;
    padding-top: 12px;
  }
  
  .brand-card .brand-logo {
    width: 26px;
    height: 26px;
  }
  
  .brand-card .brand-logo img {
    max-width: 22px;
    max-height: 22px;
  }
  
  .brand-card .no-logo {
    width: 22px;
    height: 22px;
    font-size: 11px;
  }
  
  .brand-card .brand-name {
    font-size: 10px;
    color: #333333;
    font-family: "Microsoft YaHei", "PingFang SC", "Helvetica Neue", Arial, sans-serif;
    margin-bottom: 3px;
  }
}

@media (max-width: 600px) {
  .brand-section {
    margin: 0 6px 16px 6px;
  }
  
  .brands-grid {
    grid-template-columns: repeat(6, 1fr);
    gap: 4px;
  }
  
  .brand-card {
    padding: 4px 2px;
    min-height: 70px;
    max-width: none;
    aspect-ratio: 1 / 1;
    height: auto;
    padding-top: 10px;
  }
  
  .brands-display {
    padding: 10px 4px;
  }
  
  .brand-card .brand-logo {
    width: 24px;
    height: 24px;
    margin-bottom: 2px;
  }
  
  .brand-card .brand-logo img {
    max-width: 20px;
    max-height: 20px;
  }
  
  .brand-card .no-logo {
    width: 20px;
    height: 20px;
    font-size: 10px;
  }
  
  .brand-card .brand-name {
    font-size: 10px;
    line-height: 1.1;
    min-height: 18px;
    -webkit-line-clamp: 2;
    color: #333333;
    font-family: "Microsoft YaHei", "PingFang SC", "Helvetica Neue", Arial, sans-serif;
    margin-bottom: 1px;
  }
}

@media (max-width: 480px) {
  .content-container {
    padding: 0 8px;
  }
  
  .slide-info-overlay {
    padding: 40px 8px 30px;
  }
  
  .brand-section,
  .latest-models-section {
    margin: 4px 0;
    border-radius: 6px;
  }
  
  .brand-section {
    padding: 0;
  }
  
  .brand-category-tabs {
    padding: 0;
    gap: 0;
  }
  
  .category-tab {
    padding: 6px 10px;
    font-size: 11px;
    border-radius: 0;
    min-width: 60px;
  }
  
  .alphabet-filter {
    padding: 6px 8px;
    gap: 2px;
  }
  
  .alphabet-btn {
    min-width: 20px;
    height: 20px;
    font-size: 8px;
    padding: 0 2px;
  }
  
  .brands-display {
    padding: 8px 4px;
  }
  
  .brands-grid {
    grid-template-columns: repeat(5, 1fr);
    gap: 3px;
  }
  
  .brand-card {
    padding: 6px 2px;
    aspect-ratio: 1 / 1;
    min-height: 60px;
    max-width: none;
    height: auto;
    padding-top: 10px;
  }
  
  .brand-card .brand-logo {
    width: 20px;
    height: 20px;
    margin-bottom: 4px;
  }
  
  .brand-card .brand-logo img {
    max-width: 16px;
    max-height: 16px;
  }
  
  .brand-card .no-logo {
    width: 16px;
    height: 16px;
    font-size: 8px;
  }
  
  .brand-card .brand-name {
    font-size: 9px;
    margin-top: auto;
    padding: 0 1px;
    line-height: 1.1;
    min-height: 18px;
    -webkit-line-clamp: 2;
    word-break: break-word;
    color: #333333;
    font-family: "Microsoft YaHei", "PingFang SC", "Helvetica Neue", Arial, sans-serif;
    margin-bottom: 1px;
  }
  
  .models-content .models-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
    padding: 0 4px;
  }
  
  .models-content {
    padding: 12px 6px 16px 6px;
  }
  
  .filter-control-bar {
    padding: 10px 6px;
    gap: 12px;
  }
  
  .decade-btn {
    padding: 5px 10px;
    font-size: 11px;
    min-width: 45px;
  }
  
  .sort-btn {
    padding: 5px 10px;
    font-size: 11px;
  }
  
  .model-image,
  .model-display-image {
    height: 65% !important;
  }
  
  .model-name {
    font-size: 14px;
  }
  
  .model-display-name {
    font-size: 12px !important;
    line-height: 1.3 !important;
    height: auto !important;
    max-height: none !important;
    padding: 4px 6px !important;
    color: #333 !important;
    font-weight: 600 !important;
    text-align: center !important;
    display: block !important;
    overflow: visible !important;
    background: rgba(255, 255, 255, 0.9) !important;
    min-height: 20px !important;
  }
  
  .model-display-card {
    min-height: 180px !important;
    aspect-ratio: 1/1 !important;
  }
  
  .model-display-info {
    height: 35% !important;
    padding: 8px 6px 10px 6px !important;
    display: flex !important;
    flex-direction: column !important;
    justify-content: center !important;
    background: #fff !important;
    border-top: 1px solid #eee !important;
    position: relative !important;
    z-index: 100 !important;
  }
  
  /* 确保骨架屏不会覆盖文字区域 */
  .model-image-skeleton {
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    z-index: 1 !important;
  }
  
  .brand-name {
    font-size: 12px;
  }
  
  .load-more-section {
    margin-top: 10px;
    padding: 8px;
  }
  
  .load-more-btn {
    padding: 8px 20px;
    font-size: 13px;
    width: 100%;
    max-width: 200px;
  }
  
  .no-more-text {
    font-size: 13px;
    padding: 10px;
  }
}

/* 懒加载图片样式 */
.lazy-load {
  opacity: 0.6;
  transition: opacity 0.4s ease;
  background: #f8f9fa;
}

.lazy-load.loaded {
  opacity: 1;
}

.lazy-load.error {
  opacity: 0.8;
  background: #f8f9fa;
}

/* 品牌logo专用样式 */
.brand-logo-img {
  background: #fff;
}

.brand-logo-img.loaded {
  opacity: 1;
  transform: scale(1);
}

.brand-logo-img.lazy-load {
  opacity: 0.3;
  transform: scale(0.95);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 图片加载动画 */
.model-image {
  position: relative;
  height: 200px;
  overflow: hidden;
}

.model-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.model-card:hover .model-image img {
  transform: scale(1.02);
}

/* 车型图片骨架屏 */
.model-image-skeleton {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #f8f9fa;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}

.skeleton-shimmer {
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    #f8f9fa 25%,
    #e9ecef 50%,
    #f8f9fa 75%
  );
  background-size: 200% 100%;
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

/* 车型展示图片样式优化 */
.model-display-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: all 0.3s ease;
  position: relative;
  z-index: 2;
}

.model-display-img.lazy-load {
  opacity: 0;
}

.model-display-img.loaded {
  opacity: 1;
}

.model-display-image {
  position: relative;
  width: 100%;
  height: 200px;
  overflow: hidden;
  background: #f8f9fa;
  border-radius: 8px;
}

/* 重试按钮样式 */
.retry-btn {
  margin-top: 16px;
  padding: 8px 16px;
  background: #e03426;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: background 0.3s ease;
}

.retry-btn:hover {
  background: #c12e21;
}

.retry-btn i {
  font-size: 16px;
}

/* 加载更多状态优化 */
.loading-more-container {
  text-align: center;
  padding: 20px;
  margin-top: 16px;
}

.loading-more-spinner {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #666;
  font-size: 14px;
}

.loading-more-spinner i {
  font-size: 16px;
  animation: rotating 1s linear infinite;
}

/* 图片加载失败时的重试按钮 */
.image-retry-btn {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(224, 52, 38, 0.9);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 12px;
  z-index: 3;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.model-display-image:hover .image-retry-btn {
  opacity: 1;
}

/* 优化加载动画 */
@keyframes rotating {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style> 