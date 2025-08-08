<template>
  <div class="home">

    
    <!-- 品牌导航区域 -->
    <div class="brand-section">
      <!-- 品牌分类选择器 -->
      <div class="brand-category-tabs">
        <button 
          :class="['category-tab', brandCategory === 'all' ? 'active' : '']"
          @click="setBrandCategory('all')"
        >
          全部品牌
        </button>
        <button 
          :class="['category-tab', brandCategory === 'chinese' ? 'active' : '']"
          @click="setBrandCategory('chinese')"
        >
          自主品牌
        </button>
        <button 
          :class="['category-tab', brandCategory === 'joint' ? 'active' : '']"
          @click="setBrandCategory('joint')"
        >
          合资品牌
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

    <!-- 最新车型展示区域 -->
    <div class="latest-models-section">
      <div class="section-header">
        <h2>最新车型</h2>
        <p>发现最新上市的汽车车型</p>
      </div>

      <div v-if="modelLoading" class="loading-container">
        <el-skeleton :rows="3" animated />
      </div>
      <div v-else class="models-grid">
        <div 
          v-for="model in latestModels" 
          :key="model.id"
          class="model-card"
          @click="goToModel(model.id)"
        >
          <div class="model-image">
            <img 
              :data-src="getModelImageUrl(model)" 
              :alt="model.name" 
              @click.stop="goToModel(model.id)"
              class="lazy-load"
              src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuWKoOi9veS4rS4uLjwvdGV4dD48L3N2Zz4="
            >
          </div>
          <div class="model-info">
            <h3 class="model-name">{{ model.name }}</h3>
          </div>
        </div>
      </div>
      
      <!-- 加载更多按钮 -->
      <div v-if="!modelLoading && latestModels.length > 0" class="load-more-section">
        <el-button 
          v-if="hasMoreModels"
          type="primary" 
          :loading="loadingMore"
          @click="loadMoreModels"
          class="load-more-btn"
        >
          {{ loadingMore ? '加载中...' : '加载更多车型' }}
        </el-button>
        <p v-else class="no-more-text">已显示所有车型</p>
      </div>
    </div>
  </div>
</template>

<script>
import { brandAPI, modelAPI, imageAPI } from '@/services/api';
// 恢复使用chinese-to-pinyin库
import chineseToPinyin from 'chinese-to-pinyin';

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
      allModelsData: [], // 存储所有车型数据
      currentPage: 1,
      pageSize: 12,
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
        
        // 合资品牌
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
      } else if (this.brandCategory === 'chinese') {
        brands = this.allBrands.filter(brand => brand.country === '中国');
      } else if (this.brandCategory === 'joint') {
        // 合资品牌筛选 - 可以根据实际数据调整判断条件
        brands = this.allBrands.filter(brand => 
          brand.country === '合资' || 
          (brand.country && brand.country.includes('合资'))
        );
      } else if (this.brandCategory === 'overseas') {
        brands = this.allBrands.filter(brand => 
          brand.country && brand.country !== '中国' && !brand.country.includes('合资')
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
      
      // 匹配4位数字年份（2019-2030范围内，涵盖更广的年份范围）
      const yearMatch = name.match(/20[1-3][0-9]/g);
      if (yearMatch && yearMatch.length > 0) {
        // 如果有多个年份，返回最大的（最新的）
        const years = yearMatch.map(year => parseInt(year)).filter(year => year >= 2019 && year <= 2030);
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
    // 获取最新车型数据
    async fetchLatestModels() {
      try {
        // 显示加载状态
        this.modelLoading = true;
        console.log('开始加载最新车型...');
        
        // 调用优化后的API，使用分页和latest参数
        const response = await modelAPI.getAll({
          latest: true,
          page: 1,
          limit: this.pageSize
        });
        
        console.log('获取到的车型数据:', response);
        
        if (response.success && Array.isArray(response.data)) {
          // 后端已经返回了包含图片的完整数据
          this.latestModels = response.data;
          this.allModelsData = response.data; // 暂时存储当前页数据
          
          // 设置分页信息
          this.hasMoreModels = response.page < response.totalPages;
          this.currentPage = response.page;
          
          console.log(`成功加载 ${this.latestModels.length} 个车型，总共 ${response.total} 个`);
          
          // 为没有缩略图的车型设置默认图片
          this.latestModels.forEach(model => {
            if (!model.thumbnail && model.Images && model.Images.length > 0) {
              const firstImage = model.Images[0];
              model.thumbnail = firstImage.url;
            }
          });
        } else {
          console.error('无效的响应数据结构:', response);
          this.latestModels = [];
          this.allModelsData = [];
          this.hasMoreModels = false;
        }
      } catch (error) {
        console.error('获取最新车型失败:', error);
        this.latestModels = [];
        this.allModelsData = [];
        this.hasMoreModels = false;
      } finally {
        // 无论成功失败，都关闭加载状态
        this.modelLoading = false;
        console.log('最新车型加载完成');
        
        // 重新初始化懒加载
        this.$nextTick(() => {
          this.initLazyLoading();
        });
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
          limit: this.pageSize
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
          rootMargin: '50px' // 提前50px开始加载，减少初始加载压力
        });
        
        // 观察所有懒加载图片
        this.$nextTick(() => {
          const lazyImages = document.querySelectorAll('.lazy-load');
          lazyImages.forEach(img => {
            this.lazyLoadObserver.observe(img);
          });
        });
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
      } else if (this.brandCategory === 'chinese') {
        return '自主品牌';
      } else if (this.brandCategory === 'joint') {
        return '合资品牌';
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
    this.fetchLatestModels();
    
    // 初始化图片懒加载
    this.initLazyLoading();
  },
  beforeDestroy() {
    // 清理懒加载观察器
    if (this.lazyLoadObserver) {
      this.lazyLoadObserver.disconnect();
    }
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
  color: #409EFF;
}

.menu-nav a.router-link-active {
  color: #409EFF;
  font-weight: bold;
}

/* 品牌展示区域样式优化 */
.brand-section {
  background: #fff;
  margin: 0 16px 20px 16px;
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
  background: rgba(64, 158, 255, 0.08);
  color: #409EFF;
}

.category-tab.active {
  background: #fff;
  color: #409EFF;
  font-weight: 600;
}

.category-tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: #409EFF;
}

/* 字母筛选器优化 */
.alphabet-filter {
  display: flex;
  flex-wrap: wrap;
  padding: 16px 20px;
  gap: 8px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
}

.alphabet-btn {
  min-width: 36px;
  height: 36px;
  padding: 0 8px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: #666;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.alphabet-btn:hover {
  background: #e3f2fd;
  border-color: #90caf9;
  color: #1976d2;
  transform: translateY(-1px);
}

.alphabet-btn.active {
  background: #409EFF;
  border-color: #409EFF;
  color: white;
  box-shadow: 0 2px 6px rgba(64, 158, 255, 0.3);
}

.alphabet-btn:active {
  transform: scale(0.95);
  background: #e3f2fd;
}

/* 品牌展示网格 */
.brands-display {
  padding: 20px 16px;
  background: #fff;
}

.brands-grid {
  display: grid;
  grid-template-columns: repeat(13, 1fr);
  gap: min(1.2vw, 12px);
  margin-bottom: 20px;
  justify-items: center;
  align-items: start;
}

.brand-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: min(1.5vw, 12px) min(1vw, 8px);
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
  padding-top: min(2.5vw, 20px);
}

.brand-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
  background: #fff;
  border-color: #409EFF;
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
  margin-bottom: clamp(2px, 0.5vw, 6px);
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
  background: linear-gradient(135deg, #409EFF, #67C23A);
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
  margin-bottom: clamp(1px, 0.5vw, 4px);
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
  color: #409EFF;
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

.latest-models-section {
  padding: 12px;
  background-color: #f8f9fa;
  border-radius: 16px;
  margin: 8px 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.section-header {
  text-align: center;
  margin-bottom: 12px;
}

.section-header h2 {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.section-header p {
  font-size: 14px;
  color: #606266;
  margin: 0;
}

.models-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.model-card {
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.model-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);
}

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

.model-info {
  padding: 16px;
}

.model-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0 0 8px 0;
  line-height: 1.4;
}

.brand-name {
  font-size: 14px;
  color: #666;
  margin: 0 0 10px 0;
}

.model-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.year-tag,
.type-tag {
  padding: 4px 8px;
  background-color: #f0f2f5;
  color: #606266;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
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
  background: linear-gradient(135deg, #409EFF, #67C23A);
  border: none;
  color: white;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

.load-more-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(64, 158, 255, 0.4);
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

/* 防止水平滚动 */
body, html {
  overflow-x: hidden;
}

.home * {
  box-sizing: border-box;
}

.brand-card, .alphabet-btn, .category-tab {
  -webkit-tap-highlight-color: rgba(64, 158, 255, 0.2);
  user-select: none;
}

/* 响应式设计 */
@media (max-width: 1400px) {
  .brands-grid {
    grid-template-columns: repeat(12, 1fr);
  }
}

@media (max-width: 1200px) {
  .brands-grid {
    grid-template-columns: repeat(10, 1fr);
  }
  
  .latest-models-section {
    margin: 6px 15px;
    padding: 10px;
  }
  
  .models-grid {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 16px;
  }
}

@media (max-width: 768px) {
  .home {
    padding: 0;
  }
  
  .brand-filter-container,
  .latest-models-section {
    margin: 4px 10px;
    padding: 8px;
    border-radius: 12px;
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
  
  .models-grid {
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 12px;
  }
  
  .model-image {
    height: 160px;
  }
  
  .model-info {
    padding: 12px;
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
  .home {
    padding: 0;
  }
  
  .brand-section {
    margin: 0 8px 20px 8px;
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
    padding: 16px 12px;
  }
  
  .brands-grid {
    grid-template-columns: repeat(8, 1fr);
    gap: 8px;
  }
  
  .brand-card {
    padding: 8px 4px;
    aspect-ratio: 1 / 1;
    max-width: none;
    height: auto;
    min-height: 0;
    padding-top: 16px;
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
    gap: 5px;
  }
  
  .brand-card {
    padding: 6px 2px;
    min-height: 70px;
    max-width: none;
    aspect-ratio: 1 / 1;
    height: auto;
    padding-top: 12px;
  }
  
  .brands-display {
    padding: 12px 8px;
  }
  
  .brand-card .brand-logo {
    width: 24px;
    height: 24px;
    margin-bottom: 4px;
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
    min-height: 20px;
    -webkit-line-clamp: 2;
    color: #333333;
    font-family: "Microsoft YaHei", "PingFang SC", "Helvetica Neue", Arial, sans-serif;
    margin-bottom: 2px;
  }
}

@media (max-width: 480px) {
  .brand-section,
  .latest-models-section {
    margin: 4px 4px;
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
    padding: 8px 6px;
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
  
  .models-grid {
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  
  .model-image {
    height: 140px;
  }
  
  .model-name {
    font-size: 14px;
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
</style> 