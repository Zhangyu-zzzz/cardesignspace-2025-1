<template>
  <div class="home">

    
    <!-- 品牌导航区域 -->
    <div class="brand-filter-container">
      <div class="letter-filter">
        <button 
          :class="['letter-btn', currentLetter === '不限' ? 'active' : '']"
          @click="currentLetter = '不限'"
        >
          自主品牌
        </button>
        <button 
          v-for="letter in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')" 
          :key="letter"
          :class="['letter-btn', currentLetter === letter ? 'active' : '']"
          @click="currentLetter = letter"
        >
          {{ letter }}
        </button>
      </div>
      
      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="1" animated />
      </div>
      <div v-else-if="error" class="error-message">
        <p>{{ error }}</p>
      </div>
      <div v-else>
        <div v-if="filteredBrands.length === 0" class="no-brands-message">
          没有找到符合条件的品牌
        </div>
        <div v-else class="brands-container">
          <div 
            class="brand-item" 
            v-for="brand in filteredBrands" 
            :key="brand.id" 
            @click="goToBrand(brand.id)"
          >
            <div class="brand-logo">
              <img v-if="brand.logo" :src="brand.logo" alt="品牌Logo">
              <div v-else class="no-logo">{{ brand.name.charAt(0) }}</div>
            </div>
            <div class="brand-name">{{ brand.name }}</div>
          </div>
        </div>
      </div>
    </div>

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
            <img :src="getModelImageUrl(model)" :alt="model.name" @click.stop="goToModel(model.id)">
          </div>
          <div class="model-info">
            <h3 class="model-name">{{ model.name }}</h3>
            <!-- <p v-if="model.Brand" class="brand-name">{{ model.Brand.name }}</p>
            <div class="model-tags">
              <span v-if="model.year" class="year-tag">{{ model.year }}年</span>
              <span v-if="model.type" class="type-tag">{{ model.type }}</span>
            </div> -->
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
        '五菱': 'W'  // 确保"五菱"归到W类
      }
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
      
      if (this.currentLetter === '不限') {
        // 获取所有中国品牌并按照首字母排序
        brands = this.chineseOnlyBrands.slice();
      } else {
        // 获取指定字母的品牌
        brands = this.brandsByLetter[this.currentLetter] || [];
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
      // 优先级顺序：1.thumbnail > 2.Images[0].thumbnailUrl > 3.Images[0].mediumUrl > 4.Images[0].url > 5.默认图片
      
      // 打印调试信息，看看model对象的实际内容
      console.log(`获取图片URL - 车型ID: ${model && model.id || 'undefined'}, 名称: ${model && model.name || 'undefined'}`);
      console.log(`车型数据类型:`, typeof model, Array.isArray(model));
      
      // 防御性检查，确保model是对象
      if (!model || typeof model !== 'object') {
        console.error('无效的模型数据:', model);
        return '/images/default-car.jpg';
      }
      
      console.log(`详细车型数据:`, JSON.stringify(model, null, 2));
      
      // 尝试直接访问thumbnail属性，不通过任何额外处理
      console.log('直接访问model.thumbnail:', model.thumbnail);
      
      // 1. 首先尝试使用模型自身的thumbnail属性
      if (model.thumbnail && typeof model.thumbnail === 'string' && model.thumbnail.trim() !== '') {
        console.log(`使用thumbnail: ${model.thumbnail}`);
        // 检查URL格式是否正确
        if (!model.thumbnail.startsWith('http')) {
          console.warn(`车型 ${model.id} 的thumbnail URL格式可能不正确: ${model.thumbnail}`);
        }
        return model.thumbnail;
      }
      
      // 2. 检查是否有Images集合并且不为空
      if (model.Images && Array.isArray(model.Images) && model.Images.length > 0) {
        // 获取第一张图片（固定使用索引0）
        const image = model.Images[0];
        console.log(`使用第一张图片:`, image);
        
        // 3. 按照固定优先级顺序尝试获取URL
        if (image.thumbnailUrl) {
          console.log(`使用thumbnailUrl: ${image.thumbnailUrl}`);
          return image.thumbnailUrl;
        }
        if (image.mediumUrl) {
          console.log(`使用mediumUrl: ${image.mediumUrl}`);
          return image.mediumUrl;
        }
        if (image.url) {
          console.log(`使用url: ${image.url}`);
          return image.url;
        }
        if (image.originalUrl) {
          console.log(`使用originalUrl: ${image.originalUrl}`);
          return image.originalUrl;
        }
        if (image.largeUrl) {
          console.log(`使用largeUrl: ${image.largeUrl}`);
          return image.largeUrl;
        }
      }
      
      // 4. 如果找不到任何图片，返回默认图片
      console.warn(`车型 ${model.id} 没有找到任何有效的图片URL，使用默认图片`);
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
      
      try {
        // 从cardesignspace数据库获取品牌列表，添加时间戳防止缓存
        const timestamp = Date.now();
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
        
        console.log('处理后的品牌数据:', this.allBrands);
        console.log('中国品牌数量:', this.allBrands.filter(brand => brand.country === '中国').length);
        
        // 如果没有数据，显示提示信息
        if (!this.allBrands || this.allBrands.length === 0) {
          this.error = '数据库中未找到品牌数据';
        }
        
        // 强制刷新筛选状态
        this.currentLetter = '不限';
        
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
        
        const response = await modelAPI.getAll();
        console.log('获取到的原始车型数据:', JSON.stringify(response, null, 2).substring(0, 500) + '...');
        
        // 确保数据结构正确
        let modelsData = [];
        
        if (response.success && Array.isArray(response.data)) {
          // 标准结构: { success: true, data: [...] }
          modelsData = response.data;
          console.log('使用标准结构 { success: true, data: [...] }');
        } else if (Array.isArray(response)) {
          // 数组直接返回
          modelsData = response;
          console.log('使用数组直接返回');
        } else if (response.data && Array.isArray(response.data.data)) {
          // 双层嵌套: { data: { data: [...] } }
          modelsData = response.data.data;
          console.log('使用双层嵌套 { data: { data: [...] } }');
        } else if (response.data && Array.isArray(response.data)) {
          // 单层嵌套: { data: [...] }
          modelsData = response.data;
          console.log('使用单层嵌套 { data: [...] }');
        } else {
          console.error('无法识别的数据结构:', response);
          modelsData = [];
        }
        
        console.log('处理后的车型数据数组大小:', modelsData.length);
        if (modelsData.length > 0) {
          console.log('第一个车型数据示例:', JSON.stringify(modelsData[0], null, 2));
        }
        
        if (modelsData.length > 0) {
          // 检查车型数据是否包含缩略图字段
          const hasThumbnail = modelsData.some(model => model.thumbnail);
          console.log('是否有车型包含thumbnail字段:', hasThumbnail);
          
          // 使用新的排序逻辑：优先按车型名称中的年份排序，再按数据库年份排序
          this.allModelsData = modelsData.sort((a, b) => {
            const yearA = this.getModelYear(a);
            const yearB = this.getModelYear(b);
            
            // 按年份降序排序（新年份在前）
            if (yearA !== yearB) {
              return yearB - yearA;
            }
            
            // 如果年份相同，按车型名称排序
            return a.name.localeCompare(b.name, 'zh-CN');
          });
          
          console.log('排序后的前10个车型:', this.allModelsData.slice(0, 10).map(m => `${m.id}: ${m.name} (年份: ${this.getModelYear(m)})`));
          
          // 初始显示前12个车型
          const initialModels = this.allModelsData.slice(0, this.pageSize);
          
          console.log('初始显示的车型:', initialModels.map(m => `${m.id}: ${m.name}`));
          
          // 检查每个车型的thumbnail字段
          initialModels.forEach(model => {
            console.log(`车型 ${model.id}:${model.name} 的thumbnail:`, model.thumbnail);
          });
          
          // 确保所有车型都有Images数组
          initialModels.forEach(model => {
            if (!model.Images) {
              model.Images = [];
            }
          });
          
          // 使用Promise.all确保所有图片加载完成后再更新模型数据
          await Promise.all(initialModels.map(async (model) => {
            // 如果没有图片数据，尝试获取
            if ((!model.thumbnail || model.thumbnail.trim() === '') && (!model.Images || model.Images.length === 0)) {
              console.log(`车型 ${model.id}:${model.name} 没有图片数据，尝试获取图片`);
              
              try {
                // 使用imageAPI替代axios，保持一致的请求方式
                console.log(`请求图片API: /api/images/model/${model.id}`);
                const imagesResponse = await imageAPI.getByModelId(model.id);
                console.log(`图片API响应:`, imagesResponse);
                
                if (imagesResponse.success && imagesResponse.data) {
                  const imagesData = imagesResponse.data;
                  if (imagesData && imagesData.length > 0) {
                    // 确保图片按照ID排序，保持固定顺序
                    model.Images = imagesData.sort((a, b) => a.id - b.id);
                    console.log(`成功为车型 ${model.id} 获取到 ${model.Images.length} 张图片:`, model.Images[0]);
                    
                    // 设置缩略图（固定使用第一张图片）
                    if ((!model.thumbnail || model.thumbnail.trim() === '') && model.Images.length > 0) {
                      const firstImage = model.Images[0];
                      // 按优先级设置缩略图
                      model.thumbnail = firstImage.thumbnailUrl || 
                                        firstImage.mediumUrl || 
                                        firstImage.url || 
                                        firstImage.originalUrl;
                      console.log(`为车型 ${model.id} 设置缩略图: ${model.thumbnail}`);
                    } else {
                      console.log(`车型 ${model.id} 已有缩略图: ${model.thumbnail}`);
                    }
                  } else {
                    console.warn(`车型 ${model.id} 的图片API返回成功，但没有获取到图片数据`);
                  }
                } else {
                  console.warn(`车型 ${model.id} 的图片API请求失败`);
                }
              } catch (imageError) {
                console.error(`获取车型 ${model.id} 的图片失败:`, imageError);
              }
            } else {
              console.log(`车型 ${model.id} 已有图片数据，thumbnail:`, model.thumbnail);
              if (model.Images && model.Images.length > 0) {
                console.log(`车型 ${model.id} 的Images集合大小:`, model.Images.length);
              }
            }
            
            return model;
          }));
          
          // 所有图片加载完成后，更新模型数据
          console.log('所有车型图片加载完成，更新latestModels，数据:', initialModels.map(m => ({id: m.id, name: m.name, thumbnail: m.thumbnail})));
          this.latestModels = initialModels;
          
          // 检查是否还有更多数据
          this.hasMoreModels = this.allModelsData.length > this.pageSize;
        } else {
          console.log('未从数据库获取到车型数据');
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
      }
    },
    // 加载更多车型
    async loadMoreModels() {
      this.loadingMore = true;
      try {
        // 计算下一批数据的起始和结束索引
        const startIndex = this.currentPage * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        
        console.log(`加载更多车型: 第${this.currentPage + 1}页, 索引${startIndex}-${endIndex}`);
        
        // 从所有数据中获取下一批车型
        const nextBatchModels = this.allModelsData.slice(startIndex, endIndex);
        
        if (nextBatchModels.length > 0) {
          console.log('获取到下一批车型:', nextBatchModels.map(m => `${m.id}: ${m.name}`));
          
          // 为新加载的车型获取图片数据
          await Promise.all(nextBatchModels.map(async (model) => {
            // 确保有Images数组
            if (!model.Images) {
              model.Images = [];
            }
            
            // 如果没有图片数据，尝试获取
            if ((!model.thumbnail || model.thumbnail.trim() === '') && (!model.Images || model.Images.length === 0)) {
              console.log(`车型 ${model.id}:${model.name} 没有图片数据，尝试获取图片`);
              
              try {
                console.log(`请求图片API: /api/images/model/${model.id}`);
                const imagesResponse = await imageAPI.getByModelId(model.id);
                
                if (imagesResponse.success && imagesResponse.data) {
                  const imagesData = imagesResponse.data;
                  if (imagesData && imagesData.length > 0) {
                    // 确保图片按照ID排序，保持固定顺序
                    model.Images = imagesData.sort((a, b) => a.id - b.id);
                    console.log(`成功为车型 ${model.id} 获取到 ${model.Images.length} 张图片`);
                    
                    // 设置缩略图（固定使用第一张图片）
                    if ((!model.thumbnail || model.thumbnail.trim() === '') && model.Images.length > 0) {
                      const firstImage = model.Images[0];
                      // 按优先级设置缩略图
                      model.thumbnail = firstImage.thumbnailUrl || 
                                        firstImage.mediumUrl || 
                                        firstImage.url || 
                                        firstImage.originalUrl;
                      console.log(`为车型 ${model.id} 设置缩略图: ${model.thumbnail}`);
                    }
                  }
                }
              } catch (imageError) {
                console.error(`获取车型 ${model.id} 的图片失败:`, imageError);
              }
            }
            
            return model;
          }));
          
          // 将新车型添加到现有列表中
          this.latestModels = [...this.latestModels, ...nextBatchModels];
          this.currentPage++;
          
          // 检查是否还有更多数据
          this.hasMoreModels = endIndex < this.allModelsData.length;
          
          console.log(`成功加载更多车型，当前显示${this.latestModels.length}个，总共${this.allModelsData.length}个`);
        } else {
          console.log('没有更多车型数据');
          this.hasMoreModels = false;
        }
      } catch (error) {
        console.error('加载更多车型失败:', error);
        this.$message.error('加载更多车型失败，请稍后重试');
      } finally {
        this.loadingMore = false;
      }
    }
  },
  mounted() {
    this.fetchChineseBrands();
    this.fetchLatestModels();
  }
}
</script>

<style scoped>
.home {
  padding: 0;
  font-family: Arial, "Microsoft YaHei", sans-serif;
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

/* 品牌筛选区域样式 */
.brand-filter-container {
  background-color: #f8f9fa;
  padding: 20px;
  margin: 20px;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.letter-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 16px;
  background-color: #fff;
  border-radius: 12px;
  margin-bottom: 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

.letter-btn {
  padding: 8px 16px;
  background: #f5f7fa;
  border: 1px solid #e4e7ed;
  cursor: pointer;
  font-size: 14px;
  color: #606266;
  border-radius: 8px;
  transition: all 0.3s ease;
  font-weight: 500;
}

.letter-btn:hover {
  background-color: #ecf5ff;
  border-color: #b3d8ff;
  color: #409EFF;
  transform: translateY(-1px);
}

.letter-btn.active {
  background-color: #409EFF;
  border-color: #409EFF;
  color: white;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
}

.brand-title {
  text-align: right;
  padding: 10px 20px;
  font-size: 16px;
  font-weight: bold;
}

/* 品牌展示区域样式 */
.brands-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 12px;
  padding: 0;
  background-color: #fff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

.brand-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 8px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 12px;
  /* background-color: #fafbfc; */
  border: 1px solid #f0f2f5;
}

.brand-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  background-color: #fff;
  border-color: #d9ecff;
}

.brand-logo {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
  border-radius: 8px;
  /* background-color: #fff; */
  /* box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); */
}

.brand-logo img {
  max-width: 28px;
  max-height: 28px;
  object-fit: contain;
}

.no-logo {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: linear-gradient(135deg, #409EFF, #67C23A);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
}

.brand-name {
  font-size: 12px;
  text-align: center;
  color: #606266;
  font-weight: 500;
  line-height: 1.2;
  max-width: 100%;
  word-break: break-all;
}

.loading-container {
  padding: 20px;
  margin-bottom: 20px;
}

.error-message {
  color: #F56C6C;
  text-align: center;
  padding: 20px;
}

.no-brands-message {
  text-align: center;
  padding: 20px;
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
  margin: 30px 0 20px 0;
}

.el-row {
  margin-bottom: 20px;
}

.latest-models-section {
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 16px;
  margin: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.section-header {
  text-align: center;
  margin-bottom: 20px;
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
  margin-top: 30px;
  padding: 20px;
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

/* 响应式设计 */
@media (max-width: 1200px) {
  .brand-filter-container,
  .latest-models-section {
    margin: 15px;
    padding: 15px;
  }
  
  .brands-container {
    grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
    gap: 10px;
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
    margin: 10px;
    padding: 12px;
    border-radius: 12px;
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
    margin-top: 20px;
    padding: 16px;
  }
  
  .load-more-btn {
    padding: 10px 24px;
    font-size: 14px;
  }
}

@media (max-width: 480px) {
  .brand-filter-container,
  .latest-models-section {
    margin: 8px;
    padding: 10px;
  }
  
  .brands-container {
    grid-template-columns: repeat(auto-fill, minmax(50px, 1fr));
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
    margin-top: 16px;
    padding: 12px;
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
</style> 