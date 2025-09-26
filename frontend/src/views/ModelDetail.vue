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
            <el-select 
              v-model="model.type" 
              placeholder="选择车型类型"
              size="medium"
              @change="updateModelType"
              class="model-type-select"
              :loading="typeUpdating"
            >
              <el-option
                v-for="type in modelTypeOptions"
                :key="type"
                :label="type"
                :value="type"
              />
            </el-select>
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
              @click="openImageViewer(index)"
            >
                          <img 
              :src="getOptimizedImageUrlSync(image)" 
              :alt="image.title || model.name"
              class="grid-image"
              @contextmenu="handleImageContextMenu($event, image)"
            />
              <!-- 添加图片信息覆盖层 -->
              <div class="image-overlay">
                <div class="image-title" v-if="image.title">{{ image.title }}</div>
                <div class="image-user-info" v-if="image.User">
                  <el-avatar 
                    :size="20" 
                    :src="image.User.avatar" 
                    icon="el-icon-user-solid"
                    @click.native.stop="goToUserProfile(image.User.id)"
                    class="clickable-avatar"
                  ></el-avatar>
                  <span 
                    class="username clickable-username" 
                    @click.stop="goToUserProfile(image.User.id)"
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

        <!-- 自定义图片查看器 -->
        <ImageViewer
          :visible="imageViewerVisible"
          :images="filteredImages"
          :initial-index="selectedImageIndex"
          @close="closeImageViewer"
        />

        <!-- 车型描述区域 -->
        <div class="model-description-section" v-if="model.description">
          <h2 class="description-title">
            <i class="el-icon-document"></i>
            车型描述
          </h2>
          <div class="description-container">
            <div class="description-content">
              <p class="description-text">{{ model.description }}</p>
            </div>
            <div class="description-meta">
              <div class="meta-item">
                <i class="el-icon-time"></i>
                <span>更新时间：{{ formatDate(model.updatedAt) }}</span>
              </div>
              <div class="meta-item" v-if="model.year">
                <i class="el-icon-date"></i>
                <span>车型年份：{{ model.year }}年</span>
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
  import { brandAPI, modelAPI, imageAPI, apiClient } from '@/services/api';
import ImageViewer from '@/components/ImageViewer.vue';
import imageContextMenu from '@/utils/imageContextMenu';
  
  export default {
    name: 'ModelDetail',
    components: {
      ImageViewer
    },
    data() {
      return {
        model: {},
        brand: {},
        images: [],
        loading: true,
        error: null,
        activeTab: 'all',
        imageViewerVisible: false,
        selectedImageIndex: 0,
        typeUpdating: false,
        originalType: null,
        modelTypeOptions: ['轿车', 'SUV', 'MPV', 'WAGON', 'SHOOTINGBRAKE', '皮卡', '跑车', 'Hatchback', '其他']
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
        
        // 首先过滤掉.txt文件
        let imageFiles = this.images.filter(image => {
          // 检查图片URL是否包含.txt扩展名
          const imageUrl = this.getOptimizedImageUrlSync(image);
          return !imageUrl.toLowerCase().includes('.txt');
        });
        
        let result = [];
        if (this.activeTab === 'all') {
          result = imageFiles;
        } else {
          result = imageFiles.filter(image => image.category === this.activeTab);
        }
        
        console.log('筛选后图片数量:', result.length);
        return result;
      },
      // 获取所有图片URL列表用于预览
      allImageUrls() {
        return this.filteredImages.map(img => this.getOptimizedImageUrlSync(img));
      },
      // 获取车型参数
      orderedSpecs() {
        if (!this.parsedSpecs || typeof this.parsedSpecs !== 'object') {
          return [];
        }
        
        // 定义参数顺序和中文标签的映射，匹配数据库中的实际键名
        const specOrder = [
          // 车身尺寸参数 - 首先检查 dimensions 嵌套对象
          { key: 'dimensions.length', label: '长', unit: 'mm' },
          { key: '长', label: '长', unit: 'mm' },
          { key: 'length', label: '长', unit: 'mm' },
          { key: '长度', label: '长', unit: 'mm' },
          
          { key: 'dimensions.width', label: '宽', unit: 'mm' },
          { key: '宽', label: '宽', unit: 'mm' },
          { key: 'width', label: '宽', unit: 'mm' },
          { key: '宽度', label: '宽', unit: 'mm' },
          
          { key: 'dimensions.height', label: '高', unit: 'mm' },
          { key: '高', label: '高', unit: 'mm' },
          { key: 'height', label: '高', unit: 'mm' },
          { key: '高度', label: '高', unit: 'mm' },
          
          { key: 'dimensions.wheelbase', label: '轴距', unit: 'mm' },
          { key: '轴距', label: '轴距', unit: 'mm' },
          { key: 'wheelbase', label: '轴距', unit: 'mm' },
          
          // 轮胎参数
          { key: 'front_tire', label: '前轮胎', unit: '' },
          { key: 'rear_tire', label: '后轮胎', unit: '' },
          { key: '前轮胎', label: '前轮胎', unit: '' },
          { key: '后轮胎', label: '后轮胎', unit: '' },
          { key: '轮胎', label: '轮胎', unit: '' },
          { key: 'tire', label: '轮胎', unit: '' },
          { key: 'tireSize', label: '轮胎', unit: '' },
          
          // 其他参数
          { key: 'doors', label: '车门数', unit: '门' },
          { key: 'drive', label: '驱动方式', unit: '' },
          { key: 'body_structure', label: '车身结构', unit: '' }
        ];
        
        const result = [];
        
        // 辅助函数：根据键路径获取嵌套对象的值
        const getNestedValue = (obj, keyPath) => {
          const keys = keyPath.split('.');
          let value = obj;
          for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
              value = value[key];
            } else {
              return undefined;
            }
          }
          return value;
        };
        
        // 按顺序查找参数，避免重复添加相同标签的参数
        specOrder.forEach(spec => {
          let value;
          
          // 检查是否是嵌套键路径
          if (spec.key.includes('.')) {
            value = getNestedValue(this.parsedSpecs, spec.key);
          } else {
            value = this.parsedSpecs[spec.key];
          }
          
          // 如果找到值且没有重复的标签
          if (value !== undefined && value !== null && !result.find(r => r.label === spec.label)) {
            // 特殊处理：如果是轮胎相关参数，检查前后轮胎是否相同
            if (spec.label === '前轮胎' && this.parsedSpecs.rear_tire) {
              // 如果前后轮胎相同，只显示一个"轮胎"标签
              if (value === this.parsedSpecs.rear_tire) {
                // 检查是否已经添加了轮胎参数
                if (!result.find(r => r.label === '轮胎')) {
                  result.push({
                    key: 'front_tire',
                    label: '轮胎',
                    value: value + spec.unit,
                    rawValue: value
                  });
                }
                return; // 跳过添加前轮胎
              }
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
      // 获取图片URL的辅助方法（同步版本，用于模板）
      getOptimizedImageUrlSync(image, width = 400, height = 300, context = 'detail') {
        // 检查图片对象的不同URL属性
        let originalUrl = '';
        if (image.url) originalUrl = image.url;
        else if (image.originalUrl) originalUrl = image.originalUrl;
        else if (image.mediumUrl) originalUrl = image.mediumUrl;
        else if (image.thumbnailUrl) originalUrl = image.thumbnailUrl;
        else if (image.largeUrl) originalUrl = image.largeUrl;
        else return '/images/default-car.jpg';
        
        // 直接使用腾讯云COS优化参数，避免异步调用
        if (originalUrl.includes('cardesignspace-cos-1-1259492452.cos.ap-shanghai.myqcloud.com')) {
          const separator = originalUrl.includes('?') ? '&' : '?';
          return `${originalUrl}${separator}imageMogr2/thumbnail/${width}x${height}/quality/80`;
        }
        
        return originalUrl;
      },
      
      // 获取图片URL的辅助方法（异步版本，使用变体系统）
      async getImageUrl(image, width = 400, height = 300, context = 'detail') {
        // 检查图片对象的不同URL属性
        let originalUrl = '';
        if (image.url) originalUrl = image.url;
        else if (image.originalUrl) originalUrl = image.originalUrl;
        else if (image.mediumUrl) originalUrl = image.mediumUrl;
        else if (image.thumbnailUrl) originalUrl = image.thumbnailUrl;
        else if (image.largeUrl) originalUrl = image.largeUrl;
        else return '/images/default-car.jpg';
        
        // 使用变体系统优化图片URL
        return await this.getOptimizedImageUrl(originalUrl, width, height, context);
      },
      
      // 优化图片URL（使用变体系统）
      async getOptimizedImageUrl(url, width = 400, height = 300, context = 'detail') {
        if (!url) return '';
        
        // 尝试从URL中提取图片ID
        const imageIdMatch = url.match(/\/(\d+)\.(jpg|jpeg|png|webp)$/) || 
                            url.match(/\/(\d+)\/(\d+)\.(jpg|jpeg|png|webp)$/) ||
                            url.match(/\/(\d+)\/([^\/]+)\.(jpg|jpeg|png|webp)$/);
        
        if (imageIdMatch) {
          try {
            // 调用变体API获取最佳变体
            const response = await apiClient.get(`/image-variants/best/${imageIdMatch[1]}`, {
              params: {
                variant: this.getVariantForContext(context),
                width,
                height,
                preferWebp: true
              }
            });
            
            if (response.data.success && response.data.data.bestUrl) {
              console.log('使用变体URL:', response.data.data.bestUrl);
              return response.data.data.bestUrl;
            }
          } catch (error) {
            console.warn('获取图片变体失败，使用原图:', error.message);
          }
        }
        
        // 回退到原始URL，添加腾讯云COS优化参数
        if (url.includes('cardesignspace-cos-1-1259492452.cos.ap-shanghai.myqcloud.com')) {
          const separator = url.includes('?') ? '&' : '?';
          return `${url}${separator}imageMogr2/thumbnail/${width}x${height}/quality/80`;
        }
        
        return url;
      },
      
      // 根据上下文获取变体类型
      getVariantForContext(context) {
        switch (context) {
          case 'detail':
            return 'medium';
          case 'card':
            return 'small';
          case 'thumbnail':
            return 'thumb';
          case 'gallery':
            return 'large';
          default:
            return 'medium';
        }
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
        console.log('🔄 正在加载车型详情，ID:', modelId);
        
        try {
          // 使用API服务获取车型数据
          const modelResponse = await modelAPI.getById(modelId);
          console.log('📡 获取到的模型数据:', modelResponse);
          
          if (!modelResponse.success) {
            throw new Error(modelResponse.message || '获取模型数据失败');
          }
          
          console.log('📝 更新本地车型数据:', {
            oldType: this.model.type,
            newType: modelResponse.data.type,
            modelName: modelResponse.data.name
          });
          
          this.model = modelResponse.data;
          this.brand = modelResponse.data.Brand || {};
          // 保存原始类型用于回滚
          this.originalType = this.model.type;
          
          console.log('✅ 车型数据加载完成:', {
            modelType: this.model.type,
            originalType: this.originalType
          });
          
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
          'dimensions.length': 'el-icon-right',
          
          // 宽度相关 - 使用双向箭头表示宽度
          '宽': 'el-icon-sort',
          'width': 'el-icon-sort',
          '宽度': 'el-icon-sort',
          'dimensions.width': 'el-icon-sort',
          
          // 高度相关 - 使用向上箭头表示高度
          '高': 'el-icon-top',
          'height': 'el-icon-top',
          '高度': 'el-icon-top',
          'dimensions.height': 'el-icon-top',
          
          // 轴距相关 - 使用连接线表示轴距
          '轴距': 'el-icon-minus',
          'wheelbase': 'el-icon-minus',
          'dimensions.wheelbase': 'el-icon-minus',
          
          // 轮胎相关 - 使用圆形图标表示轮胎
          '前轮胎': 'el-icon-refresh',
          '后轮胎': 'el-icon-refresh',
          '轮胎': 'el-icon-refresh',
          'front_tire': 'el-icon-refresh',
          'rear_tire': 'el-icon-refresh',
          'tire': 'el-icon-refresh',
          'tireSize': 'el-icon-refresh',
          
          // 其他参数
          'doors': 'el-icon-house',
          '车门数': 'el-icon-house',
          'drive': 'el-icon-setting',
          '驱动方式': 'el-icon-setting',
          'body_structure': 'el-icon-office-building',
          '车身结构': 'el-icon-office-building'
        };
        return icons[key] || 'el-icon-data-line';
      },
      // 跳转到用户个人主页
      goToUserProfile(userId) {
        this.$router.push(`/user/${userId}`);
      },
      openImageViewer(index) {
        this.selectedImageIndex = index;
        this.imageViewerVisible = true;
      },
      closeImageViewer() {
        this.imageViewerVisible = false;
      },
      
      // 处理图片右键菜单
      handleImageContextMenu(event, image) {
        const imageUrl = this.getOptimizedImageUrlSync(image);
        const imageTitle = image.title || this.model.name;
        
        // 使用浏览器默认菜单
        imageContextMenu.show(event, imageUrl, {
          title: imageTitle,
          useBrowserMenu: true
        });
      },
      
      // 只获取图片数据
      async fetchImages() {
        try {
          const modelId = this.$route.params.id;
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
      },
      
      // 更新车型类型
      async updateModelType(newType) {
        console.log('🔄 开始更新车型类型:', {
          modelId: this.model.id,
          modelName: this.model.name,
          oldType: this.model.type,
          newType: newType
        });
        
        if (!newType) {
          console.log('❌ 无需更新: 新类型为空');
          return;
        }
        
        if (newType === this.model.type) {
          console.log('⚠️ 前端显示类型与选择类型相同，但可能存在数据不一致');
          console.log('🔄 强制从服务器获取最新数据...');
          // 强制从服务器获取最新数据
          await this.fetchModelDetails();
          // 如果获取后还是相同，则提示用户
          if (newType === this.model.type) {
            this.$message.info('当前车型类型已经是 ' + newType + '，无需更新');
            return;
          }
        }
        
        this.typeUpdating = true;
        
        try {
          console.log('📡 发送API请求...');
          const response = await apiClient.put(`/image-tags/models/${this.model.id}/type`, {
            type: newType
          });
          
          console.log('📡 API响应:', response);
          
          if (response.status === 'success') {
            console.log('✅ 更新成功，更新本地数据');
            this.$message.success(response.message);
            
            // 更新本地数据
            const oldType = this.model.type;
            this.model.type = newType;
            this.originalType = newType;
            
            console.log('📝 本地数据已更新:', {
              oldType: oldType,
              newType: this.model.type,
              originalType: this.originalType
            });
            
            // 只刷新图片数据，不重新获取车型数据
            console.log('🖼️ 刷新图片数据...');
            await this.fetchImages();
            
            console.log('✅ 更新完成，当前车型类型:', this.model.type);
          } else {
            console.log('❌ API返回失败:', response.message);
            this.$message.error(response.message || '更新失败');
            // 恢复原值
            this.model.type = this.originalType;
          }
        } catch (error) {
          console.error('❌ 更新车型类型失败:', error);
          this.$message.error('更新车型类型失败，请重试');
          // 恢复原值
          this.model.type = this.originalType;
        } finally {
          this.typeUpdating = false;
          console.log('🏁 更新流程结束');
        }
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
  padding: 20px 0px;
  max-width: 1200px;
  margin: 0 auto;
}
  
  .loading-container, .error-message {
    padding: 40px;
    text-align: center;
  }
  
  .error-message {
    color: #e03426;
  }
  
  .model-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    padding: 0 10px;
  }

  /* 车型类型选择框样式 */
  .model-type-select {
    margin-left: 15px;
    min-width: 120px;
  }

  .model-type-select .el-input__inner {
    background-color: #e03426 !important;
    border-color: #e03426 !important;
    color: white !important;
    font-weight: 500;
  }

  .model-type-select .el-input__inner:focus {
    background-color: #c12e21 !important;
    border-color: #c12e21 !important;
  }

  .model-type-select .el-input__suffix {
    color: white !important;
  }

  .model-type-select .el-input__suffix .el-input__icon {
    color: white !important;
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
    color: #e03426;
    font-weight: bold;
  }
  
  .model-description {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px dashed #eee;
    color: #666;
    line-height: 1.6;
  }
  
  .images-section {
    margin-bottom: 40px;
    padding: 0 10px;
  }
  
  .images-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
  margin-top: 20px;
  padding: 0;
}
  
  .image-card {
    border-radius: 8px;
    overflow: hidden;
    transition: all 0.3s ease;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    background-color: #fff;
    position: relative;
    cursor: pointer; /* Added cursor pointer for clickability */
    aspect-ratio: 1;
  }
  
  .image-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
  }
  
  .grid-image {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover; /* Changed to object-fit: cover */
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
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
    color: white;
    padding: 8px 12px 12px 12px;
    opacity: 0;
    transition: opacity 0.3s ease;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  
  .image-card:hover .image-overlay {
    opacity: 1;
  }
  
  .image-title {
    font-size: 13px;
    font-weight: 500;
    margin-bottom: 0;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .image-user-info {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    line-height: 1.2;
  }
  
  .image-user-info .username {
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 80px;
  }
  
  .image-user-info .upload-date {
    margin-left: auto;
    opacity: 0.9;
    font-size: 10px;
    white-space: nowrap;
  }
  
  /* 可点击的头像和用户名样式 */
  .clickable-avatar {
    cursor: pointer;
    transition: all 0.3s ease;
  }
  
  /* 确保头像为正圆形 */
  .image-user-info .el-avatar {
    border-radius: 50% !important;
    width: 20px !important;
    height: 20px !important;
    flex-shrink: 0;
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
    color: #e03426 !important;
    text-decoration: underline;
  }
  
  .no-images {
    text-align: center;
    padding: 40px;
    color: #666;
    font-size: 16px;
  }
  
  /* 响应式设计 - Pinterest风格 */
  @media (max-width: 1200px) {
    .images-grid {
      grid-template-columns: repeat(5, 1fr);
      gap: 8px;
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
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
    }
    
    .grid-image {
      height: 100%;
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
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
    }
    
    .image-card {
      border-radius: 6px;
    }
    
    .grid-image {
      height: 100%;
    }
  }

  /* 车型描述区域样式 */
  .model-description-section {
    margin: 40px 10px 20px 10px;
    padding: 30px;
    background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    border: 1px solid #e3e6ea;
    position: relative;
    overflow: hidden;
  }

  .model-description-section::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #e03426, #ff6b6b, #e03426);
    border-radius: 4px 4px 0 0;
  }

  .description-title {
    margin: 0 0 25px 0;
    font-size: 22px;
    color: #333;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 10px;
    padding-bottom: 15px;
    border-bottom: 2px solid #e9ecef;
    position: relative;
  }

  .description-title i {
    color: #e03426;
    font-size: 24px;
  }

  .description-container {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .description-content {
    flex: 1;
  }

  .description-text {
    font-size: 16px;
    line-height: 1.8;
    color: #555;
    margin: 0;
    text-align: justify;
    word-break: break-word;
    white-space: pre-wrap;
  }

  .description-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    padding-top: 20px;
    border-top: 1px solid #e9ecef;
    margin-top: 10px;
  }

  .meta-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: #666;
    padding: 8px 12px;
    background: #f8f9fa;
    border-radius: 8px;
    border: 1px solid #e9ecef;
  }

  .meta-item i {
    color: #e03426;
    font-size: 16px;
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
    color: #333;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 10px;
    padding-bottom: 15px;
    border-bottom: 2px solid #e03426;
    position: relative;
  }

  .specs-title::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 0;
    width: 60px;
    height: 2px;
    background: linear-gradient(90deg, #e03426, #c12e21);
    border-radius: 1px;
  }

  .specs-title i {
    color: #e03426;
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
    background: linear-gradient(45deg, #e03426, #c12e21);
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
    background: linear-gradient(135deg, #e03426, #c12e21);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 16px;
    box-shadow: 0 4px 12px rgba(224, 52, 38, 0.3);
    transition: all 0.3s ease;
  }

  .spec-item:hover .spec-icon {
    transform: scale(1.05);
    box-shadow: 0 6px 20px rgba(224, 52, 38, 0.4);
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
    color: #666;
    font-weight: 500;
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .spec-value {
    font-size: 18px;
    color: #333;
    font-weight: 700;
    line-height: 1.2;
    word-break: break-all;
  }

  /* 响应式设计 */
  @media (max-width: 768px) {
    .model-description-section {
      margin: 30px 5px 15px 5px;
      padding: 20px 15px;
    }

    .description-title {
      font-size: 20px;
      margin-bottom: 20px;
    }

    .description-text {
      font-size: 15px;
      line-height: 1.7;
    }

    .description-meta {
      gap: 15px;
      padding-top: 15px;
    }

    .meta-item {
      font-size: 13px;
      padding: 6px 10px;
    }

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
    .model-description-section {
      margin: 20px 5px 10px 5px;
      padding: 15px 10px;
    }

    .description-title {
      font-size: 18px;
      margin-bottom: 15px;
    }

    .description-text {
      font-size: 14px;
      line-height: 1.6;
    }

    .description-meta {
      gap: 10px;
      padding-top: 12px;
      flex-direction: column;
    }

    .meta-item {
      font-size: 12px;
      padding: 5px 8px;
    }

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