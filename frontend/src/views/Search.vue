<template>
  <div class="search">
    <!-- 搜索头部 -->
    <div class="search-header">
      <h1>车型搜索</h1>
      <p>搜索您感兴趣的汽车品牌或车型</p>
    </div>
    
    <!-- 搜索框和工具栏 -->
    <div class="search-toolbar">
      <div class="search-box">
        <el-input 
          placeholder="请输入品牌名称或车型名称" 
          v-model="keyword" 
          class="search-input"
          @keyup.enter.native="handleSearch"
          @keydown.enter.native="handleSearch"
          clearable
          ref="searchInput"
        >
          <el-button 
            slot="append" 
            icon="el-icon-search"
            @click="handleSearch"
            :loading="searching"
          ></el-button>
        </el-input>
      </div>
      
      <!-- 高级筛选按钮 -->
      <div class="toolbar-actions">
        <el-button 
          type="text" 
          icon="el-icon-s-operation"
          @click="showAdvancedFilters = !showAdvancedFilters"
        >
          高级筛选
        </el-button>
        <el-divider direction="vertical"></el-divider>
        <el-radio-group v-model="viewMode" size="small">
          <el-radio-button label="grid">
            <i class="el-icon-s-grid"></i>
          </el-radio-button>
          <el-radio-button label="list">
            <i class="el-icon-s-data"></i>
          </el-radio-button>
        </el-radio-group>
      </div>
    </div>
    
    <!-- 高级筛选面板 -->
    <div v-show="showAdvancedFilters" class="advanced-filters">
      <el-form :model="filters" label-width="80px" size="small">
        <el-row :gutter="20">
          <el-col :span="6">
            <el-form-item label="品牌">
              <el-select 
                v-model="filters.brand" 
                placeholder="选择品牌"
                clearable
                filterable
                @change="handleFilterChange"
              >
                <el-option
                  v-for="brand in brands"
                  :key="brand.id"
                  :label="brand.name"
                  :value="brand.id"
                >
                  <span style="float: left">{{ brand.name }}</span>
                  <span style="float: right; color: #8492a6; font-size: 13px">
                    {{ brand.country || '未知' }}
                  </span>
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
          
          <el-col :span="6">
            <el-form-item label="年份">
              <el-select 
                v-model="filters.year" 
                placeholder="选择年份"
                clearable
                @change="handleFilterChange"
              >
                <el-option
                  v-for="year in yearOptions"
                  :key="year"
                  :label="year + '年'"
                  :value="year"
                ></el-option>
              </el-select>
            </el-form-item>
          </el-col>
          
          <el-col :span="6">
            <el-form-item label="车型">
              <el-select 
                v-model="filters.type" 
                placeholder="选择类型"
                clearable
                @change="handleFilterChange"
              >
                <el-option
                  v-for="type in carTypes"
                  :key="type.value"
                  :label="type.label"
                  :value="type.value"
                ></el-option>
              </el-select>
            </el-form-item>
          </el-col>
          
          <el-col :span="6">
            <el-form-item label="价格区间">
              <el-select 
                v-model="filters.priceRange" 
                placeholder="选择价格区间"
                clearable
                @change="handleFilterChange"
              >
                <el-option
                  v-for="range in priceRanges"
                  :key="range.value"
                  :label="range.label"
                  :value="range.value"
                ></el-option>
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="6">
            <el-form-item label="变速箱">
              <el-select 
                v-model="filters.transmission" 
                placeholder="选择变速箱"
                clearable
                @change="handleFilterChange"
              >
                <el-option label="自动" value="auto"></el-option>
                <el-option label="手动" value="manual"></el-option>
                <el-option label="双离合" value="dct"></el-option>
                <el-option label="CVT" value="cvt"></el-option>
              </el-select>
            </el-form-item>
          </el-col>
          
          <el-col :span="6">
            <el-form-item label="驱动方式">
              <el-select 
                v-model="filters.drive" 
                placeholder="选择驱动方式"
                clearable
                @change="handleFilterChange"
              >
                <el-option label="前驱" value="fwd"></el-option>
                <el-option label="后驱" value="rwd"></el-option>
                <el-option label="四驱" value="awd"></el-option>
              </el-select>
            </el-form-item>
          </el-col>
          
          <el-col :span="6">
            <el-form-item label="排序">
              <el-select 
                v-model="filters.sort" 
                placeholder="排序方式"
                @change="handleFilterChange"
              >
                <el-option label="最新发布" value="latest"></el-option>
                <el-option label="最多浏览" value="views"></el-option>
                <el-option label="最多收藏" value="favorites"></el-option>
                <el-option label="价格从低到高" value="price_asc"></el-option>
                <el-option label="价格从高到低" value="price_desc"></el-option>
              </el-select>
            </el-form-item>
          </el-col>
          
          <el-col :span="6">
            <el-form-item label="状态">
              <el-select 
                v-model="filters.status" 
                placeholder="选择状态"
                clearable
                @change="handleFilterChange"
              >
                <el-option label="在售" value="selling"></el-option>
                <el-option label="停售" value="stopped"></el-option>
                <el-option label="预售" value="presell"></el-option>
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="标签">
              <el-checkbox-group v-model="filters.tags" @change="handleFilterChange">
                <el-checkbox label="新能源">新能源</el-checkbox>
                <el-checkbox label="插电混动">插电混动</el-checkbox>
                <el-checkbox label="增程式">增程式</el-checkbox>
                <el-checkbox label="性能车">性能车</el-checkbox>
                <el-checkbox label="豪华品牌">豪华品牌</el-checkbox>
                <el-checkbox label="合资品牌">合资品牌</el-checkbox>
                <el-checkbox label="自主品牌">自主品牌</el-checkbox>
              </el-checkbox-group>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      
      <div class="filter-actions">
        <el-button type="primary" @click="applyFilters">应用筛选</el-button>
        <el-button @click="resetFilters">重置</el-button>
      </div>
    </div>

    <!-- 热门搜索和搜索历史 -->
    <div class="search-suggestions" v-if="!hasSearched">
      <div class="suggestions-section hot-searches">
        <h3>
          <i class="el-icon-star-on"></i>
          热门搜索
        </h3>
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
      
      <div class="suggestions-section search-history" v-if="searchHistory.length > 0">
        <h3>
          <i class="el-icon-time"></i>
          搜索历史
          <el-button 
            type="text" 
            class="clear-history"
            @click="clearSearchHistory"
          >
            清除历史
          </el-button>
        </h3>
        <div class="search-tags">
          <el-tag 
            v-for="(item, index) in searchHistory" 
            :key="index"
            class="search-tag"
            closable
            @click="searchSuggestion(item)"
            @close="removeFromHistory(index)"
          >
            {{ item }}
          </el-tag>
        </div>
      </div>
    </div>

    <!-- 搜索结果 -->
    <div class="search-results" v-if="hasSearched">
      <!-- 结果统计 -->
      <div class="results-header">
        <div class="results-stats">
          <h3>搜索结果 ({{ totalResults }})</h3>
          <span class="stats-detail" v-if="totalResults > 0">
            找到 {{ totalResults }} 个车型
            <template v-if="filters.brand">· {{ getBrandName(filters.brand) }}</template>
            <template v-if="filters.year">· {{ filters.year }}年</template>
            <template v-if="filters.type">· {{ getTypeName(filters.type) }}</template>
          </span>
        </div>
        <el-button type="text" @click="clearSearch">清除搜索</el-button>
      </div>
      
      <!-- 加载状态 -->
      <div v-if="searching && currentPage === 1" class="loading">
        <el-skeleton :rows="3" animated />
      </div>
      
      <!-- 无结果 -->
      <div v-else-if="searchResults.length === 0 && !searching" class="no-results">
        <el-empty description="未找到相关车型">
          <el-button type="primary" @click="clearSearch">重新搜索</el-button>
        </el-empty>
      </div>
      
      <!-- 结果列表 -->
      <div v-else>
        <!-- 网格视图 -->
        <div v-if="viewMode === 'grid'" class="results-grid">
          <div 
            v-for="model in searchResults" 
            :key="model.id"
            class="model-card"
            @click="goToModelDetail(model.id)"
            :data-model-id="model.id"
          >
            <div class="model-image">
              <img 
                :src="model.displayImage || getModelImage(model)" 
                :alt="model.name"
                @error="handleImageError"
                class="model-image-item"
              />
              <div class="image-overlay">
                <span class="model-brand">{{ model.Brand ? model.Brand.name : '未知品牌' }}</span>
              </div>
            </div>
            <div class="model-info">
              <h4>{{ model.name }}</h4>
              <div class="model-tags">
                <el-tag size="mini">{{ model.type || '轿车' }}</el-tag>
                <el-tag v-if="model.year" size="mini" type="info">{{ model.year }}年</el-tag>
              </div>
              <div class="model-stats">
                <span><i class="el-icon-view"></i> {{ model.views || 0 }}</span>
                <span><i class="el-icon-star-off"></i> {{ model.favorites || 0 }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 列表视图 -->
        <div v-else class="results-list">
          <el-table
            :data="searchResults"
            style="width: 100%"
            @row-click="(row) => goToModelDetail(row.id)"
          >
            <el-table-column
              label="车型"
              min-width="200"
            >
              <template slot-scope="scope">
                <div class="list-item-main">
                  <img 
                    :src="scope.row.displayImage || getModelImage(scope.row)" 
                    :alt="scope.row.name"
                    @error="handleImageError"
                    class="list-item-image"
                  />
                  <div class="list-item-info">
                    <h4>{{ scope.row.name }}</h4>
                    <p>{{ scope.row.Brand ? scope.row.Brand.name : '未知品牌' }}</p>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column
              prop="type"
              label="类型"
              width="120"
            >
              <template slot-scope="scope">
                <el-tag size="mini">{{ scope.row.type || '轿车' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column
              prop="year"
              label="年份"
              width="100"
            >
              <template slot-scope="scope">
                <span>{{ scope.row.year }}年</span>
              </template>
            </el-table-column>
            <el-table-column
              label="数据"
              width="150"
            >
              <template slot-scope="scope">
                <span class="list-item-stats">
                  <el-tooltip content="浏览量">
                    <span><i class="el-icon-view"></i> {{ scope.row.views || 0 }}</span>
                  </el-tooltip>
                  <el-tooltip content="收藏数">
                    <span><i class="el-icon-star-off"></i> {{ scope.row.favorites || 0 }}</span>
                  </el-tooltip>
                </span>
              </template>
            </el-table-column>
          </el-table>
        </div>
        
        <!-- 加载更多按钮 -->
        <div class="load-more-section" v-if="hasMoreResults">
          <el-button 
            type="primary" 
            :loading="searching"
            @click="loadMoreResults"
            class="load-more-btn"
          >
            {{ searching ? '加载中...' : '加载更多' }}
          </el-button>
        </div>
        
        <!-- 已加载完所有结果 -->
        <div v-else-if="searchResults.length > 0" class="no-more-results">
          <p>已显示所有搜索结果</p>
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
      currentPage: 1,
      pageSize: 20, // 每页显示20个结果
      totalResults: 0,
      hasMoreResults: false,
      popularSearches: ['小米', '比亚迪', '启源', '方程豹', '阿维塔', '奔驰', '宝马', '奥迪'],
      showAdvancedFilters: false,
      viewMode: 'grid', // 'grid' or 'list'
      filters: {
        brand: '',
        year: '',
        type: '',
        priceRange: '',
        transmission: '',
        drive: '',
        sort: 'latest',
        status: '',
        tags: []
      },
      brands: [],
      years: [],
      carTypes: [
        { label: '轿车', value: 'sedan' },
        { label: 'SUV', value: 'suv' },
        { label: 'MPV', value: 'mpv' },
        { label: '跑车', value: 'sports' },
        { label: '皮卡', value: 'pickup' },
        { label: '微型车', value: 'micro' },
        { label: '其他', value: 'other' }
      ],
      searchHistory: JSON.parse(localStorage.getItem('searchHistory') || '[]'),
      yearOptions: this.generateYearOptions(),
      priceRanges: [
        { label: '10万以下', value: '0-100000' },
        { label: '10-15万', value: '100000-150000' },
        { label: '15-20万', value: '150000-200000' },
        { label: '20-30万', value: '200000-300000' },
        { label: '30-50万', value: '300000-500000' },
        { label: '50万以上', value: '500000-999999999' }
      ],
      carTypes: [
        { label: '轿车', value: 'sedan' },
        { label: 'SUV', value: 'suv' },
        { label: 'MPV', value: 'mpv' },
        { label: '跑车', value: 'sports' },
        { label: '皮卡', value: 'pickup' },
        { label: '新能源', value: 'ev' },
        { label: '微型车', value: 'mini' }
      ]
    }
  },
  methods: {
    // 执行搜索
    async handleSearch() {
      if (!this.keyword.trim()) {
        this.$message.warning('请输入搜索关键词');
        return;
      }
      
      // 添加到搜索历史
      this.addToSearchHistory(this.keyword.trim());

      // 重置搜索状态
      this.currentPage = 1;
      this.searchResults = [];
      this.totalResults = 0;
      this.hasMoreResults = false;
      this.showAdvancedFilters = false; // 关闭高级筛选
      this.filters = {
        brand: '',
        year: '',
        type: '',
        priceRange: '',
        transmission: '',
        drive: '',
        sort: 'latest',
        status: '',
        tags: []
      };
      
      this.searching = true;
      this.hasSearched = true;
      
      try {
        await this.performSearch();
      } catch (error) {
        console.error('搜索错误:', error);
        this.$message.error('搜索失败，请稍后重试');
        this.searchResults = [];
        this.totalResults = 0;
        this.hasMoreResults = false;
      } finally {
        this.searching = false;
      }
    },
    
    // 获取默认图片
    getDefaultImage() {
      // 使用base64格式的占位图，确保始终可用
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNGMEYyRjUiLz4KICA8cGF0aCBkPSJNMTAwIDcwQzg4Ljk1NDMgNzAgODAgNzguOTU0MyA4MCA5MEM4MCAxMDEuMDQ2IDg4Ljk1NDMgMTEwIDEwMCAxMTBDMTExLjA0NiAxMTAgMTIwIDEwMS4wNDYgMTIwIDkwQzEyMCA3OC45NTQzIDExMS4wNDYgNzAgMTAwIDcwWk04NSA5MEM4NSA4MS43MTU3IDkxLjcxNTcgNzUgMTAwIDc1QzEwOC4yODQgNzUgMTE1IDgxLjcxNTcgMTE1IDkwQzExNSA5OC4yODQzIDEwOC4yODQgMTA1IDEwMCAxMDVDOTEuNzE1NyAxMDUgODUgOTguMjg0MyA4NSA5MFoiIGZpbGw9IiNEMEQ1REQiLz4KICA8cGF0aCBkPSJNNjUgMTMwTDkwIDkwTDExMCAxMjBMMTM1IDgwTDE1MCAxMzBINjVaIiBmaWxsPSIjRDBENUREIi8+Cjwvc3ZnPg==';
    },

    // 获取车型图片
    getModelImage(model) {
      if (!model) return this.getDefaultImage();
      
      // 1. 检查缩略图
      if (model.thumbnail) {
        return model.thumbnail;
      }
      
      // 2. 检查主图片
      if (model.mainImage) {
        return model.mainImage;
      }
      
      // 3. 检查图片数组
      if (model.Images && Array.isArray(model.Images) && model.Images.length > 0) {
        const image = model.Images[0];
        if (typeof image === 'string') {
          return image;
        }
        if (image && typeof image === 'object') {
          return image.url || image.thumbnailUrl || image.mediumUrl || image.originalUrl;
        }
      }
      
      // 4. 检查单张图片
      if (model.image) {
        return model.image;
      }
      
      // 5. 默认图片
      return this.getDefaultImage();
    },
    
    // 执行实际的搜索请求
    async performSearch() {
      try {
        const params = {
          search: this.keyword.trim(),
          page: this.currentPage,
          limit: this.pageSize,
          ...this.filters
        };
        
        console.log('搜索参数:', params);
        const response = await modelAPI.getAll(params);
        console.log('搜索返回数据:', response);
        
        if (response.success) {
          const newResults = response.data || [];
          
          // 预处理图片URL
          newResults.forEach(model => {
            if (!model.processedImages) {
              model.processedImages = true;
              // 预加载图片
              const img = new Image();
              img.onload = () => {
                model.imageLoaded = true;
                model.imageError = false;
                this.$forceUpdate(); // 强制更新视图
              };
              img.onerror = () => {
                model.imageLoaded = true;
                model.imageError = true;
                this.$forceUpdate(); // 强制更新视图
              };
              model.displayImage = this.getModelImage(model);
              img.src = model.displayImage;
            }
          });
          
          if (this.currentPage === 1) {
            // 第一页，直接替换结果
            this.searchResults = newResults;
          } else {
            // 后续页面，追加结果
            this.searchResults = [...this.searchResults, ...newResults];
          }
          
          // 更新总数和是否有更多结果
          this.totalResults = response.total || this.searchResults.length;
          this.hasMoreResults = newResults.length === this.pageSize;
          
          console.log(`搜索结果: 当前页=${this.currentPage}, 本页结果=${newResults.length}, 总结果=${this.totalResults}`);
        } else {
          throw new Error(response.message || '搜索失败');
        }
      } catch (error) {
        console.error('搜索错误:', error);
        throw error;
      }
    },
    
    // 加载更多结果
    async loadMoreResults() {
      if (this.searching || !this.hasMoreResults) return;
      
      this.currentPage++;
      this.searching = true;
      
      try {
        await this.performSearch();
      } catch (error) {
        console.error('加载更多结果错误:', error);
        this.$message.error('加载失败，请稍后重试');
        // 回退页码
        this.currentPage--;
      } finally {
        this.searching = false;
      }
    },
    
    // 清除搜索
    clearSearch() {
      this.keyword = '';
      this.searchResults = [];
      this.hasSearched = false;
      this.currentPage = 1;
      this.totalResults = 0;
      this.hasMoreResults = false;
      this.showAdvancedFilters = false; // 关闭高级筛选
      this.filters = {
        brand: '',
        year: '',
        type: '',
        priceRange: '',
        transmission: '',
        drive: '',
        sort: 'latest',
        status: '',
        tags: []
      };
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
    
    // 应用筛选
    async applyFilters() {
      this.currentPage = 1; // 重置到第一页
      this.searchResults = [];
      this.totalResults = 0;
      this.hasMoreResults = false;
      this.searching = true;
      this.hasSearched = true;

      try {
        await this.performSearch();
      } catch (error) {
        console.error('应用筛选错误:', error);
        this.$message.error('应用筛选失败，请稍后重试');
        this.searchResults = [];
        this.totalResults = 0;
        this.hasMoreResults = false;
      } finally {
        this.searching = false;
      }
    },

    // 重置筛选
    resetFilters() {
      this.filters = {
        brand: '',
        year: '',
        type: '',
        priceRange: '',
        transmission: '',
        drive: '',
        sort: 'latest',
        status: '',
        tags: []
      };
      this.applyFilters();
    },

    // 获取品牌名称
    getBrandName(brandId) {
      const brand = this.brands.find(b => b.id === brandId);
      return brand ? brand.name : '未知品牌';
    },

    // 获取车型名称
    getTypeName(typeValue) {
      const type = this.carTypes.find(t => t.value === typeValue);
      return type ? type.label : '其他';
    },

    // 添加到搜索历史
    addToSearchHistory(keyword) {
      if (!keyword) return;
      
      // 移除重复项
      const index = this.searchHistory.indexOf(keyword);
      if (index > -1) {
        this.searchHistory.splice(index, 1);
      }
      
      // 添加到开头
      this.searchHistory.unshift(keyword);
      
      // 限制历史记录数量
      if (this.searchHistory.length > 10) {
        this.searchHistory.pop();
      }
      
      // 保存到本地存储
      localStorage.setItem('searchHistory', JSON.stringify(this.searchHistory));
    },
    
    // 从历史记录中移除
    removeFromHistory(index) {
      this.searchHistory.splice(index, 1);
      localStorage.setItem('searchHistory', JSON.stringify(this.searchHistory));
    },
    
    // 清除搜索历史
    clearSearchHistory() {
      this.$confirm('确定要清除所有搜索历史吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.searchHistory = [];
        localStorage.removeItem('searchHistory');
        this.$message.success('搜索历史已清除');
      }).catch(() => {});
    },
    
    // 图片加载错误处理
    handleImageError(event) {
      console.warn('图片加载失败:', event.target.src);
      event.target.src = this.getDefaultImage();
      event.target.onerror = null; // 防止循环加载
      
      // 添加错误状态类
      const imageContainer = event.target.closest('.model-image');
      if (imageContainer) {
        imageContainer.classList.add('error');
      }
      
      // 更新模型数据
      const modelCard = event.target.closest('.model-card');
      if (modelCard) {
        const modelId = modelCard.dataset.modelId;
        const model = this.searchResults.find(m => m.id === modelId);
        if (model) {
          model.imageError = true;
          this.$forceUpdate(); // 强制更新视图
        }
      }
    },

    // 生成年份选项（最近20年）
    generateYearOptions() {
      const currentYear = new Date().getFullYear();
      const years = [];
      for (let i = 0; i < 20; i++) {
        years.push(currentYear - i);
      }
      return years;
    },
    
    // 处理筛选条件变化
    handleFilterChange() {
      if (this.autoApplyFilter) {
        this.applyFilters();
      }
    }
  },
  
  mounted() {
    // 从URL参数获取搜索关键词
    const urlKeyword = this.$route.query.keyword;
    if (urlKeyword) {
      this.keyword = urlKeyword;
      this.handleSearch();
    }
    
    // 获取品牌列表
    this.fetchBrands();
  },
  
  // 监听路由变化
  watch: {
    '$route.query.keyword': {
      handler(newKeyword) {
        if (newKeyword && newKeyword !== this.keyword) {
          this.keyword = newKeyword;
          this.handleSearch();
        }
      },
      immediate: true
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

.search-toolbar {
  max-width: 1200px;
  margin: 0 auto 40px auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.search-box {
  flex-grow: 1;
  max-width: 600px;
}

.search-input {
  width: 100%;
}

/* 自定义搜索框样式 */
.search-input >>> .el-input__inner {
  border: 2px solid #e03426;
  color: #333;
  background-color: #fff;
}

.search-input >>> .el-input__inner:focus {
  border-color: #b8251a;
  box-shadow: 0 0 0 2px rgba(224, 52, 38, 0.2);
}

.search-input >>> .el-input__inner::placeholder {
  color: #999;
}

.search-input >>> .el-input-group__append {
  border: 2px solid #e03426;
  border-left: none;
  background-color: #e03426;
}

.search-input >>> .el-input-group__append .el-button {
  background-color: transparent;
  border: none;
  color: #fff;
}

.search-input >>> .el-input-group__append .el-button:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.advanced-filters {
  max-width: 1200px;
  margin: 0 auto 20px auto;
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.advanced-filters .el-form-item {
  margin-bottom: 18px;
}

.advanced-filters .el-select {
  width: 100%;
}

.advanced-filters .el-checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.filter-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
}

/* 高级筛选按钮样式 */
.toolbar-actions >>> .el-button--text {
  color: #333 !important;
  background-color: transparent !important;
}

.toolbar-actions >>> .el-button--text:hover {
  color: #000 !important;
  background-color: transparent !important;
}

.toolbar-actions >>> .el-button--text:focus {
  color: #333 !important;
  background-color: transparent !important;
}

/* 清除搜索按钮样式 */
.results-header >>> .el-button--text {
  color: #333 !important;
}

.results-header >>> .el-button--text:hover {
  color: #000 !important;
  background-color: transparent !important;
}

.results-header >>> .el-button--text:focus {
  color: #333 !important;
  background-color: transparent !important;
}

/* 筛选面板应用按钮样式 */
.filter-actions .el-button--primary {
  background-color: #e03426;
  border-color: #e03426;
}

.filter-actions .el-button--primary:hover {
  background-color: #b8251a;
  border-color: #b8251a;
}

/* 搜索标签样式 */
.search-tag {
  background-color: #fdf0f0;
  border-color: #e03426;
  color: #e03426;
}

.search-tag:hover {
  background-color: #e03426;
  color: #fff;
  cursor: pointer;
}

/* 车型标签样式 */
.model-tags .el-tag {
  background-color: #fdf0f0;
  border-color: #e8b4b0;
  color: #e03426;
}

.model-tags .el-tag--info {
  background-color: #fdf0f0;
  border-color: #e8b4b0;
  color: #e03426;
}

/* 加载更多按钮样式 */
.load-more-btn.el-button--primary {
  background-color: #e03426;
  border-color: #e03426;
}

.load-more-btn.el-button--primary:hover {
  background-color: #b8251a;
  border-color: #b8251a;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .search {
    padding: 10px;
  }
  
  .search-header h1 {
    font-size: 24px;
  }

  .search-toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .search-box {
    width: 100%;
  }

  .toolbar-actions {
    width: 100%;
    justify-content: center;
  }

  .advanced-filters {
    padding: 16px;
    margin: 0 10px 20px 10px;
  }

  .advanced-filters .el-form-item {
    margin-bottom: 12px;
  }

  .filter-actions {
    margin-top: 16px;
    padding-top: 16px;
  }
  
  .el-checkbox-group {
    gap: 8px;
  }

  /* 移动端搜索结果样式 */
  .results-grid {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 15px;
    padding: 0 5px;
  }

  .model-image {
    height: 160px;
  }

  .model-info {
    padding: 12px;
  }

  .model-info h4 {
    font-size: 14px;
  }

  .model-tags {
    gap: 4px;
  }

  .model-stats {
    gap: 10px;
    font-size: 11px;
  }
}

@media (max-width: 480px) {
  .results-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .model-image {
    height: 140px;
  }

  .model-info {
    padding: 10px;
  }

  .model-info h4 {
    font-size: 13px;
  }

  .search-tags {
    gap: 8px;
  }

  .results-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .results-stats h3 {
    font-size: 18px;
  }
}

/* 搜索结果样式 */
.search-results {
  max-width: 1200px;
  margin: 0 auto;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 0 10px;
}

.results-stats h3 {
  margin: 0 0 5px 0;
  color: #333;
  font-size: 20px;
  font-weight: 600;
}

.stats-detail {
  color: #666;
  font-size: 14px;
}

.loading {
  padding: 20px;
}

.no-results {
  text-align: center;
  padding: 40px 20px;
}

/* 网格视图样式 */
.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  padding: 0 10px;
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

.image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom, transparent 0%, rgba(0, 0, 0, 0.3) 100%);
  display: flex;
  align-items: flex-end;
  padding: 15px;
  opacity: 0;
  transition: opacity 0.3s;
}

.model-card:hover .image-overlay {
  opacity: 1;
}

.model-brand {
  color: white;
  font-size: 12px;
  font-weight: 500;
  background: rgba(0, 0, 0, 0.6);
  padding: 4px 8px;
  border-radius: 4px;
}

.model-info {
  padding: 15px;
}

.model-info h4 {
  margin: 0 0 8px 0;
  color: #333;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.3;
}

.model-tags {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}

.model-stats {
  display: flex;
  gap: 15px;
  color: #666;
  font-size: 12px;
}

.model-stats span {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 列表视图样式 */
.results-list {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.list-item-main {
  display: flex;
  align-items: center;
  gap: 15px;
}

.list-item-image {
  width: 80px;
  height: 60px;
  object-fit: cover;
  border-radius: 6px;
}

.list-item-info h4 {
  margin: 0 0 5px 0;
  color: #333;
  font-size: 16px;
  font-weight: 600;
}

.list-item-info p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

/* 分页样式 */
.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 30px;
  padding: 0 10px;
}

/* 添加图片加载状态样式 */
.model-image::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #f0f2f5;
  opacity: 0;
  transition: opacity 0.3s;
}

.model-image.loading::before {
  opacity: 1;
}

.model-image.error::before {
  background: #fdf6f6;
}

/* 搜索建议区域样式 */
.search-suggestions {
  max-width: 1200px;
  margin: 0 auto 40px auto;
}

.suggestions-section h3 {
  color: #333;
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 15px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.suggestions-section h3 i {
  color: #e03426;
  font-size: 18px;
}

.search-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.hot-searches {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  margin-bottom: 20px;
}

.search-history {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.clear-history {
  color: #e03426 !important;
  font-size: 12px;
  margin-left: auto;
}

.clear-history:hover {
  color: #b8251a !important;
  background-color: rgba(224, 52, 38, 0.1) !important;
}

/* 视图切换按钮样式 */
.toolbar-actions >>> .el-radio-group .el-radio-button__inner {
  background-color: #fff !important;
  border-color: #e03426 !important;
  color: #e03426 !important;
}

.toolbar-actions >>> .el-radio-group .el-radio-button__orig-radio:checked + .el-radio-button__inner {
  background-color: #e03426 !important;
  border-color: #e03426 !important;
  color: #fff !important;
  box-shadow: -1px 0 0 0 #e03426 !important;
}

.toolbar-actions >>> .el-radio-group .el-radio-button__inner:hover {
  color: #b8251a !important;
  border-color: #b8251a !important;
}

.toolbar-actions >>> .el-radio-group .el-radio-button:first-child .el-radio-button__inner {
  border-left-color: #e03426 !important;
}
</style> 