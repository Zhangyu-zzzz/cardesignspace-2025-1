<template>
    <div class="model-detail">
      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="5" animated />
      </div>
      <div v-else-if="error" class="error-message">
        <p>{{ error }}</p>
      </div>
      <div v-else class="model-content">
        <!-- 车型信息头部 -->
        <div class="model-header">
          <div class="model-title">
            <h1>{{ model.name }}</h1>
            <el-tag size="medium" effect="dark">{{ model.type }}</el-tag>
            <!-- <el-tag v-if="model.year" size="medium" type="info" class="year-tag">{{ model.year }}年</el-tag> -->
          </div>
          <div class="model-brand">
            <img v-if="brand.logo" :src="brand.logo" :alt="brand.name" class="brand-logo" />
            <span class="brand-name" @click="goToBrand(model.brandId)">{{ brand.name }}</span>
          </div>
        </div>
  
        <!-- 车型基本信息 -->
        <!-- <div class="model-info-section">
          <h2>基本参数</h2>
          <div class="specs-grid">
            <div v-if="parsedSpecs" class="spec-item">
              <template v-for="(categorySpecs, category) in parsedSpecs">
                <div class="spec-category">
                  <h3>{{ category }}</h3>
                  <div v-for="(value, label) in categorySpecs" :key="label" class="spec-row">
                    <span class="spec-label">{{ label }}</span>
                    <span class="spec-value">{{ value }}</span>
                  </div>
                </div>
              </template>
            </div>
            <div v-else class="price-info">
              <template v-if="model.price">
                <span class="label">指导价格:</span>
                <span class="price">¥{{ formatPrice(model.price) }}</span>
              </template>
            </div>
            <div v-else class="specs-info">
              <template v-if="model.specs">
                <span class="label">参数:</span>
                <span class="specs">¥{{ formatPrice(model.specs) }}</span>
              </template>
              
            </div>
          </div>
          <div v-if="model.description" class="model-description">
            <p>{{ model.description }}</p>
          </div>
        </div> -->
  
        <!-- 图片库 -->
        <div class="images-section">
          <!-- <h2>图片库</h2> -->
          
          <!-- 图片筛选选项卡 -->
          <!-- <el-tabs v-model="activeTab" type="card">
            <el-tab-pane label="全部图片" name="all"></el-tab-pane>
            <el-tab-pane label="外观" name="exterior"></el-tab-pane>
            <el-tab-pane label="内饰" name="interior"></el-tab-pane>
            <el-tab-pane label="细节" name="detail"></el-tab-pane>
          </el-tabs> -->
          
          <!-- 图片网格 -->
          <div v-if="filteredImages.length === 0" class="no-images">
            暂无符合条件的图片
          </div>
          <div v-else class="images-grid">
            <div
              v-for="(image, index) in filteredImages"
              :key="image.id || index"
              class="image-card"
            >
              <el-image
                :src="getImageUrl(image)"
                :alt="image.title || model.name"
                fit="cover"
                :preview-src-list="allImageUrls"
                :initial-index="index"
                class="grid-image"
              />
              <!-- 添加图片信息覆盖层 -->
              <div class="image-overlay">
                <div class="image-title" v-if="image.title">{{ image.title }}</div>
                <div class="image-user-info" v-if="image.User">
                  <el-avatar 
                    :size="20" 
                    :src="image.User.avatar" 
                    icon="el-icon-user-solid"
                    @click.native="goToUserProfile(image.User.id)"
                    class="clickable-avatar"
                  ></el-avatar>
                  <span 
                    class="username clickable-username" 
                    @click="goToUserProfile(image.User.id)"
                  >{{ image.User.username }}</span>
                  <span class="upload-date">{{ formatDate(image.uploadDate) }}</span>
                </div>
                <div class="image-user-info" v-else>
                  <el-avatar :size="20" icon="el-icon-user-solid"></el-avatar>
                  <span class="username">匿名用户</span>
                  <span class="upload-date">{{ formatDate(image.uploadDate) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 车型参数展示 -->
        <div class="model-specs-section" v-if="orderedSpecs && orderedSpecs.length > 0">
          <h2 class="specs-title">
            <i class="el-icon-data-line"></i>
            车型参数
          </h2>
          <div class="specs-container">
            <div class="specs-grid">
              <div 
                v-for="spec in orderedSpecs" 
                :key="spec.key" 
                class="spec-item"
              >
                <div class="spec-icon">
                  <i :class="getSpecIcon(spec.key)"></i>
                </div>
                <div class="spec-content">
                  <div class="spec-label">{{ spec.label }}</div>
                  <div class="spec-value">{{ spec.value }}</div>
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
    name: 'ModelDetail',
    data() {
      return {
        model: {},
        brand: {},
        images: [],
        loading: true,
        error: null,
        activeTab: 'all'
      };
    },
    computed: {
      // 解析specs JSON字符串
      parsedSpecs() {
        try {
          // 如果specs已经是对象，直接返回
          if (typeof this.model.specs === 'object' && this.model.specs !== null) {
            return this.model.specs;
          }
          // 如果specs是字符串，尝试解析
          if (typeof this.model.specs === 'string') {
            return JSON.parse(this.model.specs);
          }
          // 其他情况返回null
          return null;
        } catch (e) {
          console.error('解析specs失败:', e);
          return null;
        }
      },
      // 根据标签页筛选图片
      filteredImages() {
        console.log('当前选中标签页:', this.activeTab);
        console.log('筛选前图片数量:', this.images.length);
        
        let result = [];
        if (this.activeTab === 'all') {
          result = this.images;
        } else {
          result = this.images.filter(image => image.category === this.activeTab);
        }
        
        console.log('筛选后图片数量:', result.length);
        return result;
      },
      // 获取所有图片URL列表用于预览
      allImageUrls() {
        return this.filteredImages.map(img => this.getImageUrl(img));
      },
      // 获取车型参数
      orderedSpecs() {
        if (!this.parsedSpecs || typeof this.parsedSpecs !== 'object') {
          return [];
        }
        
        // 定义参数顺序和中文标签的映射，匹配数据库中的实际键名
        const specOrder = [
          { key: '长', label: '长', unit: 'mm' },
          { key: 'length', label: '长', unit: 'mm' },
          { key: '长度', label: '长', unit: 'mm' },
          { key: '宽', label: '宽', unit: 'mm' },
          { key: 'width', label: '宽', unit: 'mm' },
          { key: '宽度', label: '宽', unit: 'mm' },
          { key: '高', label: '高', unit: 'mm' },
          { key: 'height', label: '高', unit: 'mm' },
          { key: '高度', label: '高', unit: 'mm' },
          { key: '轴距', label: '轴距', unit: 'mm' },
          { key: 'wheelbase', label: '轴距', unit: 'mm' },
          { key: '前轮胎', label: '轮胎', unit: '' },
          { key: '后轮胎', label: '轮胎', unit: '' },
          { key: '轮胎', label: '轮胎', unit: '' },
          { key: 'tire', label: '轮胎', unit: '' },
          { key: 'tireSize', label: '轮胎', unit: '' }
        ];
        
        const result = [];
        
        // 按顺序查找参数，避免重复添加相同标签的参数
        specOrder.forEach(spec => {
          if (this.parsedSpecs[spec.key] && !result.find(r => r.label === spec.label)) {
            let value = this.parsedSpecs[spec.key];
            // 对于轮胎参数，如果有前后轮胎，优先显示前轮胎，或者合并显示
            if (spec.label === '轮胎' && spec.key === '前轮胎' && this.parsedSpecs['后轮胎']) {
              // 如果前后轮胎相同，只显示一个，如果不同，显示前轮胎规格
              value = this.parsedSpecs['前轮胎'];
            }
            
            result.push({
              key: spec.key,
              label: spec.label,
              value: value + (spec.unit ? spec.unit : ''),
              rawValue: value
            });
          }
        });
        
        console.log('解析的参数:', this.parsedSpecs);
        console.log('排序后的参数:', result);
        
        return result;
      }
    },
    methods: {
      // 格式化日期
      formatDate(date) {
        if (!date) return '未知时间'
        const d = new Date(date)
        return d.toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      },
      // 获取图片URL的辅助方法
      getImageUrl(image) {
        // 检查图片对象的不同URL属性
        if (image.url) return image.url;
        if (image.originalUrl) return image.originalUrl;
        if (image.mediumUrl) return image.mediumUrl;
        if (image.thumbnailUrl) return image.thumbnailUrl;
        if (image.largeUrl) return image.largeUrl;
        // 如果没有找到任何URL，返回默认图片
        return '/images/default-car.jpg';
      },
      // 跳转到品牌详情页
      goToBrand(brandId) {
        this.$router.push(`/brand/${brandId}`);
      },
      // 格式化价格
      formatPrice(price) {
        return Number(price).toLocaleString('zh-CN');
      },
      // 加载车型详情和图片
      async fetchModelDetails() {
        this.loading = true;
        this.error = null;
        
        const modelId = this.$route.params.id;
        console.log('正在加载车型详情，ID:', modelId);
        
        try {
          // 使用API服务获取车型数据
          const modelResponse = await modelAPI.getById(modelId);
          console.log('获取到的模型数据:', modelResponse);
          
          if (!modelResponse.success) {
            throw new Error(modelResponse.message || '获取模型数据失败');
          }
          
          this.model = modelResponse.data;
          this.brand = modelResponse.data.Brand || {};
          
          // 获取图片数据
          try {
            const imagesResponse = await imageAPI.getByModelId(modelId);
            if (imagesResponse.success && imagesResponse.data) {
              this.images = imagesResponse.data;
              console.log('获取到图片数量:', this.images.length);
            }
          } catch (imageError) {
            console.warn('获取图片失败:', imageError);
            // 如果模型中包含图片，使用模型中的图片
            if (this.model.Images) {
              this.images = this.model.Images;
              console.log('从模型数据中获取到图片:', this.images.length);
            }
          }
          
          console.log('成功加载车型:', this.model.name);
        } catch (error) {
          console.error('获取车型详情失败:', error);
          this.error = `获取车型数据失败: ${error.message}`;
        } finally {
          this.loading = false;
        }
      },
      // 获取车型参数图标
      getSpecIcon(key) {
        const icons = {
          // 长度相关 - 使用水平箭头表示长度
          '长': 'el-icon-right',
          'length': 'el-icon-right',
          '长度': 'el-icon-right',
          // 宽度相关 - 使用双向箭头表示宽度
          '宽': 'el-icon-sort',
          'width': 'el-icon-sort',
          '宽度': 'el-icon-sort',
          // 高度相关 - 使用向上箭头表示高度
          '高': 'el-icon-top',
          'height': 'el-icon-top',
          '高度': 'el-icon-top',
          // 轴距相关 - 使用连接线表示轴距
          '轴距': 'el-icon-minus',
          'wheelbase': 'el-icon-minus',
          // 轮胎相关 - 使用圆形图标表示轮胎
          '前轮胎': 'el-icon-refresh',
          '后轮胎': 'el-icon-refresh',
          '轮胎': 'el-icon-refresh',
          'tire': 'el-icon-refresh',
          'tireSize': 'el-icon-refresh'
        };
        return icons[key] || 'el-icon-data-line';
      },
      // 跳转到用户个人主页
      goToUserProfile(userId) {
        this.$router.push(`/user/${userId}`);
      }
    },
    mounted() {
      this.fetchModelDetails();
    },
    // 当路由参数变化时重新加载数据
    watch: {
      '$route.params.id': function() {
        this.fetchModelDetails();
      }
    }
  };
  </script>
  
  <style scoped>
  .model-detail {
    padding: 0px;
    max-width: 1200px;
    margin: 0 auto;
  }
  
  .loading-container, .error-message {
    padding: 40px;
    text-align: center;
  }
  
  .error-message {
    color: #F56C6C;
  }
  
  .model-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    padding: 0 10px;
  }
  
  .model-title {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
  }
  
  .model-title h1 {
    margin: 0 15px 0 0;
    font-size: 20px;
    /* font-weight: 600; */
    color: #333;
  }
  
  .year-tag {
    margin-left: 10px;
  }
  
  .model-brand {
    display: flex;
    align-items: center;
    cursor: pointer;
  }
  
  .brand-logo {
    width: 32px;
    height: 32px;
    object-fit: contain;
    margin-right: 8px;
  }
  
  .brand-name {
    font-size: 14px;
    color: #333;
    font-weight: 500;
  }
  
  .model-info-section {
    margin-bottom: 40px;
    padding: 20px;
    background-color: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
  }
  
  .model-info-section h2 {
    margin-top: 0;
    margin-bottom: 20px;
    font-size: 22px;
    color: #333;
    border-bottom: 1px solid #eee;
    padding-bottom: 10px;
  }
  
  .specs-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
  }
  
  .spec-category {
    margin-bottom: 20px;
    padding: 15px;
    background-color: #f8f9fa;
    border-radius: 8px;
  }
  
  .spec-category h3 {
    margin: 0 0 15px 0;
    font-size: 18px;
    color: #333;
    border-bottom: 1px solid #eee;
    padding-bottom: 8px;
  }
  
  .spec-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;
    font-size: 14px;
  }
  
  .spec-label {
    color: #666;
    flex: 1;
  }
  
  .spec-value {
    color: #333;
    font-weight: 500;
    flex: 1;
    text-align: right;
  }
  
  .price-info {
    font-size: 16px;
  }
  
  .price-info .label {
    font-weight: bold;
    color: #666;
  }
  
  .price-info .price {
    font-size: 24px;
    color: #F56C6C;
    font-weight: bold;
  }
  
  .model-description {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px dashed #eee;
    color: #606266;
    line-height: 1.6;
  }
  
  .images-section {
    margin-bottom: 40px;
    padding: 0 10px;
  }
  
  .images-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
    margin-top: 20px;
    padding: 0;
  }
  
  .image-card {
    border-radius: 16px;
    overflow: hidden;
    transition: all 0.3s ease;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    background-color: #fff;
    position: relative;
  }
  
  .image-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
  }
  
  .grid-image {
    width: 100%;
    height: 240px;
    display: block;
    cursor: pointer;
  }
  
  .grid-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
  }
  
  .image-card:hover .grid-image img {
    transform: scale(1.02);
  }
  
  /* 图片覆盖层样式 */
  .image-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
    color: white;
    padding: 12px;
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  .image-card:hover .image-overlay {
    opacity: 1;
  }
  
  .image-title {
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 8px;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
  }
  
  .image-user-info {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
  }
  
  .image-user-info .username {
    font-weight: 500;
  }
  
  .image-user-info .upload-date {
    margin-left: auto;
    opacity: 0.8;
  }
  
  /* 可点击的头像和用户名样式 */
  .clickable-avatar {
    cursor: pointer;
    transition: all 0.3s ease;
  }
  
  .clickable-avatar:hover {
    transform: scale(1.1);
    opacity: 0.8;
  }
  
  .clickable-username {
    cursor: pointer;
    transition: all 0.3s ease;
  }
  
  .clickable-username:hover {
    color: #409EFF !important;
    text-decoration: underline;
  }
  
  .no-images {
    text-align: center;
    padding: 40px;
    color: #909399;
    font-size: 16px;
  }
  
  /* 响应式设计 - Pinterest风格 */
  @media (max-width: 1200px) {
    .images-grid {
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 14px;
    }
  }
  
  @media (max-width: 768px) {
    .model-header {
      padding: 0 5px;
    }
    
    .images-section {
      padding: 0 5px;
    }
    
    .images-grid {
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 12px;
    }
    
    .grid-image {
      height: 200px;
    }
  }
  
  @media (max-width: 480px) {
    .model-header {
      padding: 0 5px;
    }
    
    .model-title h1 {
      font-size: 20px;
    }
    
    .brand-logo {
      width: 28px;
      height: 28px;
    }
    
    .brand-name {
      font-size: 12px;
    }
    
    .images-grid {
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    
    .image-card {
      border-radius: 8px;
    }
    
    .grid-image {
      height: 180px;
    }
  }

  /* 车型参数展示样式 */
  .model-specs-section {
    margin: 40px 10px 20px 10px;
    padding: 25px;
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    border: 1px solid #e3e6ea;
  }

  .specs-title {
    margin: 0 0 25px 0;
    font-size: 22px;
    color: #2c3e50;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 10px;
    padding-bottom: 15px;
    border-bottom: 2px solid #3498db;
    position: relative;
  }

  .specs-title::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 0;
    width: 60px;
    height: 2px;
    background: linear-gradient(90deg, #3498db, #2980b9);
    border-radius: 1px;
  }

  .specs-title i {
    color: #3498db;
    font-size: 24px;
  }

  .specs-container {
    padding: 10px 0;
  }

  .specs-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
    margin-top: 10px;
  }

  .spec-item {
    display: flex;
    align-items: center;
    padding: 20px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
    transition: all 0.3s ease;
    border: 1px solid #f1f3f4;
    position: relative;
    overflow: hidden;
  }

  .spec-item::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background: linear-gradient(45deg, #3498db, #2980b9);
    transition: width 0.3s ease;
  }

  .spec-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);
  }

  .spec-item:hover::before {
    width: 6px;
  }

  .spec-icon {
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, #3498db, #2980b9);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 16px;
    box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3);
    transition: all 0.3s ease;
  }

  .spec-item:hover .spec-icon {
    transform: scale(1.05);
    box-shadow: 0 6px 20px rgba(52, 152, 219, 0.4);
  }

  .spec-icon i {
    color: white;
    font-size: 20px;
    font-weight: bold;
  }

  .spec-content {
    flex: 1;
    min-width: 0;
  }

  .spec-label {
    font-size: 14px;
    color: #7f8c8d;
    font-weight: 500;
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .spec-value {
    font-size: 18px;
    color: #2c3e50;
    font-weight: 700;
    line-height: 1.2;
    word-break: break-all;
  }

  /* 响应式设计 */
  @media (max-width: 768px) {
    .model-specs-section {
      margin: 30px 5px 15px 5px;
      padding: 20px 15px;
    }

    .specs-title {
      font-size: 20px;
      margin-bottom: 20px;
    }

    .specs-grid {
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 15px;
    }

    .spec-item {
      padding: 15px;
    }

    .spec-icon {
      width: 40px;
      height: 40px;
      margin-right: 12px;
    }

    .spec-icon i {
      font-size: 18px;
    }

    .spec-value {
      font-size: 16px;
    }
  }

  @media (max-width: 480px) {
    .model-specs-section {
      margin: 20px 5px 10px 5px;
      padding: 15px 10px;
    }

    .specs-title {
      font-size: 18px;
      margin-bottom: 15px;
    }

    .specs-grid {
      grid-template-columns: 1fr;
      gap: 12px;
    }

    .spec-item {
      padding: 12px;
    }

    .spec-icon {
      width: 36px;
      height: 36px;
      margin-right: 10px;
    }

    .spec-icon i {
      font-size: 16px;
    }

    .spec-label {
      font-size: 12px;
    }

    .spec-value {
      font-size: 15px;
    }
  }
  </style>