<template>
  <div class="image-tagging">
    <div class="header">
      <h1>图片标签管理</h1>
      <div class="stats">
        <div class="stat-item">
          <span class="label">总图片数:</span>
          <span class="value">{{ pagination.total }}</span>
        </div>
        <div class="stat-item">
          <span class="label">已标签:</span>
          <span class="value">{{ taggedCount }}</span>
        </div>
        <div class="stat-item">
          <span class="label">未标签:</span>
          <span class="value">{{ untaggedCount }}</span>
        </div>
      </div>
    </div>

    <!-- 筛选和搜索 -->
    <div class="filters">
      <div class="filter-group">
        <label>标签状态:</label>
        <select v-model="filters.hasTags" @change="loadImages">
          <option value="">全部</option>
          <option value="true">已标签</option>
          <option value="false">未标签</option>
        </select>
      </div>
      
      <div class="filter-group">
        <label>车型:</label>
        <select v-model="filters.modelId" @change="loadImages">
          <option value="">全部车型</option>
          <option v-for="model in models" :key="model.id" :value="model.id">
            {{ model.Brand?.name }} {{ model.name }}
          </option>
        </select>
      </div>
      
      <div class="filter-group">
        <label>搜索:</label>
        <input 
          type="text" 
          v-model="filters.search" 
          placeholder="搜索图片标题或文件名"
          @input="debounceSearch"
        >
      </div>
    </div>

    <!-- 批量操作 -->
    <div class="batch-actions" v-if="selectedImages.length > 0">
      <div class="selected-info">
        已选择 {{ selectedImages.length }} 张图片
      </div>
      
      <!-- 快速标签选择 -->
      <div class="quick-tags">
        <div class="tag-category">
          <label>图片类型:</label>
          <div class="tag-buttons">
            <button 
              v-for="tag in imageTypeTags" 
              :key="tag"
              @click="addQuickTag(tag)"
              class="tag-btn"
              :class="{ active: selectedQuickTags.includes(tag) }"
            >
              {{ tag }}
            </button>
          </div>
        </div>
        
        <div class="tag-category">
          <label>拍摄角度:</label>
          <div class="tag-buttons">
            <button 
              v-for="tag in angleTags" 
              :key="tag"
              @click="addQuickTag(tag)"
              class="tag-btn"
              :class="{ active: selectedQuickTags.includes(tag) }"
            >
              {{ tag }}
            </button>
          </div>
        </div>
        
        <div class="quick-actions">
          <button @click="applyQuickTags" class="btn-primary">应用选中标签</button>
          <button @click="clearQuickTags" class="btn-secondary">清空选择</button>
        </div>
      </div>
      
      <div class="batch-tags">
        <input 
          type="text" 
          v-model="batchTags" 
          placeholder="输入自定义标签，用逗号分隔"
          @keyup.enter="batchUpdateTags"
        >
        <button @click="batchUpdateTags" class="btn-primary">批量更新标签</button>
      </div>
    </div>

    <!-- 图片网格 -->
    <div class="image-grid">
      <div 
        v-for="image in images" 
        :key="image.id" 
        class="image-card"
        :class="{ selected: selectedImages.includes(image.id) }"
      >
        <div class="image-container">
          <img :src="image.url" :alt="image.title || image.filename" @click="selectImage(image.id)">
          <div class="image-overlay">
            <input 
              type="checkbox" 
              :checked="selectedImages.includes(image.id)"
              @change="toggleImageSelection(image.id)"
            >
          </div>
        </div>
        
        <div class="image-info">
          <div class="model-info">
            <strong>{{ image.Model?.Brand?.name }} {{ image.Model?.name }}</strong>
            <span class="model-type">{{ image.Model?.type || '未分类' }}</span>
          </div>
          
          <div class="filename">{{ image.filename }}</div>
          
          <!-- 标签编辑 -->
          <div class="tags-section">
            <div class="tags-display">
              <span 
                v-for="tag in image.tags || []" 
                :key="tag" 
                class="tag"
                @click="removeTag(image.id, tag)"
              >
                {{ tag }} ×
              </span>
            </div>
            
            <!-- 快速标签选择 -->
            <div class="quick-tag-selector">
              <div class="quick-tag-row">
                <span class="quick-tag-label">类型:</span>
                <div class="mini-tag-buttons">
                  <button 
                    v-for="tag in imageTypeTags" 
                    :key="tag"
                    @click="addTag(image.id, tag)"
                    class="mini-tag-btn"
                  >
                    {{ tag }}
                  </button>
                </div>
              </div>
              <div class="quick-tag-row">
                <span class="quick-tag-label">角度:</span>
                <div class="mini-tag-buttons">
                  <button 
                    v-for="tag in angleTags" 
                    :key="tag"
                    @click="addTag(image.id, tag)"
                    class="mini-tag-btn"
                  >
                    {{ tag }}
                  </button>
                </div>
              </div>
            </div>
            
            <div class="tag-input">
              <input 
                type="text" 
                v-model="image.newTag" 
                placeholder="添加自定义标签"
                @keyup.enter="addTag(image.id, image.newTag)"
              >
              <button @click="addTag(image.id, image.newTag)" class="btn-small">+</button>
            </div>
          </div>
          
          <!-- 车型分类 -->
          <div class="model-type-section">
            <label>车型分类:</label>
            <select 
              v-model="image.Model.type" 
              @change="updateModelType(image.Model.id, image.Model.type)"
            >
              <option value="">未分类</option>
              <option value="轿车">轿车</option>
              <option value="SUV">SUV</option>
              <option value="MPV">MPV</option>
              <option value="WAGON">WAGON</option>
              <option value="SHOOTINGBRAKE">SHOOTINGBRAKE</option>
              <option value="皮卡">皮卡</option>
              <option value="跑车">跑车</option>
              <option value="Hatchback">Hatchback</option>
              <option value="其他">其他</option>
            </select>
          </div>

          <!-- 风格标签 -->
          <div class="style-tags-section">
            <div class="style-tags-header">
              <label>风格标签:</label>
              <button @click="openStyleTagModal(image.Model)" class="btn-style-tags">
                <i class="el-icon-edit"></i> 编辑风格
              </button>
            </div>
            <div class="style-tags-display">
              <span v-if="!image.Model.styleTags || image.Model.styleTags.length === 0" class="no-style-tags">
                暂无风格标签
              </span>
              <div v-else class="style-tags-list">
                <span 
                  v-for="tag in image.Model.styleTags" 
                  :key="tag" 
                  class="style-tag-item"
                >
                  {{ tag }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div class="pagination" v-if="pagination.pages > 1">
      <button 
        @click="changePage(pagination.page - 1)" 
        :disabled="pagination.page <= 1"
        class="btn-page"
      >
        上一页
      </button>
      
      <span class="page-info">
        第 {{ pagination.page }} 页，共 {{ pagination.pages }} 页
      </span>
      
      <button 
        @click="changePage(pagination.page + 1)" 
        :disabled="pagination.page >= pagination.pages"
        class="btn-page"
      >
        下一页
      </button>
    </div>

    <!-- 统计面板 -->
    <div class="stats-panel" v-if="showStats">
      <h3>标签统计</h3>
      <div class="tag-stats">
        <div 
          v-for="tagStat in tagStats" 
          :key="tagStat.tag" 
          class="tag-stat-item"
        >
          <span class="tag-name">{{ tagStat.tag }}</span>
          <span class="tag-count">{{ tagStat.count }}</span>
        </div>
      </div>
    </div>

    <!-- 风格标签模态框 -->
    <div v-if="showStyleTagModal" class="style-tag-modal-overlay" @click="closeStyleTagModal">
      <div class="style-tag-modal" @click.stop>
        <div class="modal-header">
          <h3>编辑风格标签 - {{ currentModelForStyle?.name }}</h3>
          <button @click="closeStyleTagModal" class="close-btn">&times;</button>
        </div>
        
        <div class="modal-content">
          <!-- 已选风格标签 -->
          <div class="selected-style-tags">
            <h4>已选风格标签:</h4>
            <div class="selected-tags-list">
              <span 
                v-for="tag in selectedStyleTags" 
                :key="tag" 
                class="selected-tag"
              >
                {{ tag }}
                <button @click="removeStyleTag(tag)" class="remove-tag-btn">&times;</button>
              </span>
              <span v-if="selectedStyleTags.length === 0" class="no-tags">暂无风格标签</span>
            </div>
          </div>

          <!-- 风格标签选项 -->
          <div class="style-tag-options">
            <h4>选择风格标签:</h4>
            <div v-for="(tags, categoryName) in styleTagOptions" :key="categoryName" class="style-category">
              <h5>{{ categoryName }}</h5>
              <div class="style-tag-buttons">
                <button 
                  v-for="tag in tags" 
                  :key="tag"
                  @click="addStyleTag(tag)"
                  class="style-tag-btn"
                  :class="{ active: selectedStyleTags.includes(tag) }"
                >
                  {{ tag }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button @click="closeStyleTagModal" class="btn-secondary">取消</button>
          <button @click="saveStyleTags" class="btn-primary">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { apiClient } from '@/services/api'

export default {
  name: 'ImageTagging',
  data() {
    return {
      images: [],
      models: [],
      selectedImages: [],
      batchTags: '',
      selectedQuickTags: [], // 选中的快速标签
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        pages: 0
      },
      filters: {
        hasTags: '',
        modelId: '',
        search: ''
      },
      tagStats: [],
      showStats: false,
      searchTimeout: null,
      // 预设标签
      imageTypeTags: ['外型', '内饰', '零部件', '其他'],
      angleTags: ['正前', '正侧', '正后', '前45', '后45', '俯侧', '顶视'],
      // 风格标签相关
      styleTagOptions: {},
      selectedStyleTags: [],
      showStyleTagModal: false,
      currentModelForStyle: null
    }
  },
  computed: {
    taggedCount() {
      return this.images.filter(img => img.tags && img.tags.length > 0).length
    },
    untaggedCount() {
      return this.images.filter(img => !img.tags || img.tags.length === 0).length
    }
  },
  async mounted() {
    await this.loadImages()
    await this.loadModels()
    await this.loadTagStats()
    await this.loadStyleTagOptions()
  },
  methods: {
    async loadImages() {
      try {
        const params = {
          page: this.pagination.page,
          limit: this.pagination.limit,
          ...this.filters
        }
        
        const response = await apiClient.get('/image-tags/images', { params })
        this.images = response.data.images
        this.pagination = response.data.pagination
        
        // 为每个图片添加newTag字段
        this.images.forEach(image => {
          this.$set(image, 'newTag', '')
        })
      } catch (error) {
        console.error('加载图片失败:', error)
        this.$message.error('加载图片失败')
      }
    },
    
    async loadModels() {
      try {
        const response = await apiClient.get('/models')
        this.models = response.data
      } catch (error) {
        console.error('加载车型失败:', error)
      }
    },
    
    async loadTagStats() {
      try {
        const response = await apiClient.get('/image-tags/stats/tags')
        this.tagStats = response.data.data || response.data || []
      } catch (error) {
        console.error('加载标签统计失败:', error)
      }
    },
    
    selectImage(imageId) {
      // 点击图片时切换选中状态
      this.toggleImageSelection(imageId)
    },
    
    toggleImageSelection(imageId) {
      const index = this.selectedImages.indexOf(imageId)
      if (index > -1) {
        this.selectedImages.splice(index, 1)
      } else {
        this.selectedImages.push(imageId)
      }
    },
    
    async addTag(imageId, tag) {
      if (!tag || !tag.trim()) return
      
      const image = this.images.find(img => img.id === imageId)
      if (!image) return
      
      const tags = image.tags || []
      const newTag = tag.trim()
      
      // 检查是否已存在该标签
      if (tags.includes(newTag)) {
        this.$message.warning('标签已存在')
        return
      }
      
      // 准备要添加的标签数组
      const tagsToAdd = [newTag]
      
      // 如果添加的是角度标签，自动添加"外型"标签
      if (this.angleTags.includes(newTag)) {
        const exteriorTag = '外型'
        if (!tags.includes(exteriorTag)) {
          tagsToAdd.push(exteriorTag)
        }
      }
      
      // 添加所有标签
      tags.push(...tagsToAdd)
      
      try {
        await apiClient.put(`/image-tags/images/${imageId}/tags`, { tags })
        image.tags = tags
        image.newTag = ''
        
        // 根据添加的标签数量显示不同的成功消息
        if (tagsToAdd.length > 1) {
          this.$message.success(`标签添加成功：${tagsToAdd.join('、')}`)
        } else {
          this.$message.success('标签添加成功')
        }
      } catch (error) {
        console.error('添加标签失败:', error)
        this.$message.error('添加标签失败')
      }
    },
    
    async removeTag(imageId, tag) {
      const image = this.images.find(img => img.id === imageId)
      if (!image) return
      
      const tags = image.tags || []
      const newTags = tags.filter(t => t !== tag)
      
      try {
        await apiClient.put(`/image-tags/images/${imageId}/tags`, { tags: newTags })
        image.tags = newTags
        this.$message.success('标签删除成功')
      } catch (error) {
        console.error('删除标签失败:', error)
        this.$message.error('删除标签失败')
      }
    },
    
    async updateModelType(modelId, type) {
      try {
        const response = await apiClient.put(`/image-tags/models/${modelId}/type`, { type })
        this.$message.success(response.message || '车型分类更新成功')
        
        // 刷新图片列表以显示更新后的车型分类
        await this.loadImages()
      } catch (error) {
        console.error('更新车型分类失败:', error)
        this.$message.error('更新车型分类失败')
      }
    },
    
    async batchUpdateTags() {
      if (!this.batchTags || !this.batchTags.trim()) {
        this.$message.warning('请输入标签')
        return
      }
      
      const tags = this.batchTags.split(',').map(tag => tag.trim()).filter(tag => tag)
      
      try {
        await apiClient.put('/image-tags/images/batch-tags', {
          imageIds: this.selectedImages,
          tags
        })
        
        // 更新本地数据
        this.images.forEach(image => {
          if (this.selectedImages.includes(image.id)) {
            image.tags = tags
          }
        })
        
        this.$message.success(`成功更新 ${this.selectedImages.length} 张图片的标签`)
        this.selectedImages = []
        this.batchTags = ''
      } catch (error) {
        console.error('批量更新标签失败:', error)
        this.$message.error('批量更新标签失败')
      }
    },
    
    changePage(page) {
      this.pagination.page = page
      this.loadImages()
    },
    
    debounceSearch() {
      clearTimeout(this.searchTimeout)
      this.searchTimeout = setTimeout(() => {
        this.pagination.page = 1
        this.loadImages()
      }, 500)
    },
    
    // 快速标签处理方法
    addQuickTag(tag) {
      const index = this.selectedQuickTags.indexOf(tag)
      if (index > -1) {
        this.selectedQuickTags.splice(index, 1)
      } else {
        this.selectedQuickTags.push(tag)
      }
    },
    
    clearQuickTags() {
      this.selectedQuickTags = []
    },
    
    async applyQuickTags() {
      if (this.selectedQuickTags.length === 0) {
        this.$message.warning('请选择至少一个标签')
        return
      }
      
      // 准备要添加的标签数组
      const tagsToAdd = [...this.selectedQuickTags]
      
      // 检查是否包含角度标签，如果包含则自动添加"外型"标签
      const hasAngleTag = this.selectedQuickTags.some(tag => this.angleTags.includes(tag))
      if (hasAngleTag && !this.selectedQuickTags.includes('外型')) {
        tagsToAdd.push('外型')
      }
      
      try {
        await apiClient.put('/image-tags/images/batch-tags', {
          imageIds: this.selectedImages,
          tags: tagsToAdd
        })
        
        // 更新本地数据
        this.images.forEach(image => {
          if (this.selectedImages.includes(image.id)) {
            image.tags = tagsToAdd
          }
        })
        
        // 根据添加的标签显示不同的成功消息
        if (tagsToAdd.length > this.selectedQuickTags.length) {
          this.$message.success(`成功为 ${this.selectedImages.length} 张图片添加标签: ${tagsToAdd.join(', ')} (已自动添加"外型"标签)`)
        } else {
          this.$message.success(`成功为 ${this.selectedImages.length} 张图片添加标签: ${tagsToAdd.join(', ')}`)
        }
        
        this.selectedImages = []
        this.selectedQuickTags = []
      } catch (error) {
        console.error('应用快速标签失败:', error)
        this.$message.error('应用快速标签失败')
      }
    },

    // 风格标签相关方法
    async loadStyleTagOptions() {
      try {
        const response = await apiClient.get('/image-tags/style-tag-options')
        this.styleTagOptions = response.data.data || response.data || { options: [] }
      } catch (error) {
        console.error('加载风格标签选项失败:', error)
        this.$message.error('加载风格标签选项失败')
      }
    },

    openStyleTagModal(model) {
      this.currentModelForStyle = model
      this.selectedStyleTags = model.styleTags || []
      this.showStyleTagModal = true
    },

    closeStyleTagModal() {
      this.showStyleTagModal = false
      this.currentModelForStyle = null
      this.selectedStyleTags = []
    },

    addStyleTag(tag) {
      if (!this.selectedStyleTags.includes(tag)) {
        this.selectedStyleTags.push(tag)
      }
    },

    removeStyleTag(tag) {
      const index = this.selectedStyleTags.indexOf(tag)
      if (index > -1) {
        this.selectedStyleTags.splice(index, 1)
      }
    },

    async saveStyleTags() {
      if (!this.currentModelForStyle) return

      try {
        await apiClient.put(`/image-tags/models/${this.currentModelForStyle.id}/style-tags`, {
          styleTags: this.selectedStyleTags
        })
        
        // 更新本地数据
        this.currentModelForStyle.styleTags = this.selectedStyleTags
        
        this.$message.success('风格标签更新成功')
        this.closeStyleTagModal()
        
        // 刷新图片列表以显示更新后的风格标签
        await this.loadImages()
      } catch (error) {
        console.error('更新风格标签失败:', error)
        this.$message.error('更新风格标签失败')
      }
    }
  }
}
</script>

<style scoped>
.image-tagging {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header h1 {
  margin: 0;
  color: #333;
}

.stats {
  display: flex;
  gap: 20px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-item .label {
  font-size: 12px;
  color: #666;
}

.stat-item .value {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.filters {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  padding: 15px;
  background: #f5f5f5;
  border-radius: 8px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.filter-group label {
  font-size: 12px;
  color: #666;
}

.filter-group select,
.filter-group input {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  min-width: 150px;
}

.batch-actions {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 20px;
  padding: 15px;
  background: #e3f2fd;
  border-radius: 8px;
}

.batch-actions > div:first-child {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.selected-info {
  font-weight: bold;
  color: #1976d2;
}

.batch-tags {
  display: flex;
  gap: 10px;
  align-items: center;
}

.batch-tags input {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  min-width: 200px;
}

/* 快速标签样式 */
.quick-tags {
  display: flex;
  flex-direction: column;
  gap: 15px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e9ecef;
}

.tag-category {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tag-category label {
  font-weight: bold;
  color: #495057;
  font-size: 14px;
}

.tag-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-btn {
  padding: 6px 12px;
  border: 1px solid #dee2e6;
  border-radius: 20px;
  background: white;
  color: #495057;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 12px;
}

.tag-btn:hover {
  background: #e9ecef;
  border-color: #adb5bd;
}

.tag-btn.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.quick-actions {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.btn-secondary {
  padding: 8px 16px;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-secondary:hover {
  background: #5a6268;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.image-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  background: white;
  transition: all 0.3s ease;
}

.image-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.image-card.selected {
  border-color: #1976d2;
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.2);
}

.image-container {
  position: relative;
  height: 200px;
  overflow: hidden;
}

.image-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  cursor: pointer;
}

.image-overlay {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 2;
}

.image-info {
  padding: 15px;
}

.model-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.model-type {
  font-size: 12px;
  color: #666;
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 4px;
}

.filename {
  font-size: 12px;
  color: #999;
  margin-bottom: 10px;
  word-break: break-all;
}

.tags-section {
  margin-bottom: 10px;
}

.tags-display {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-bottom: 8px;
}

.tag {
  background: #e3f2fd;
  color: #1976d2;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.tag:hover {
  background: #bbdefb;
}

.tag-input {
  display: flex;
  gap: 5px;
}

.tag-input input {
  flex: 1;
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
}

/* 单张图片快速标签样式 */
.quick-tag-selector {
  margin: 8px 0;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 4px;
  border: 1px solid #e9ecef;
}

.quick-tag-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.quick-tag-row:last-child {
  margin-bottom: 0;
}

.quick-tag-label {
  font-size: 11px;
  color: #666;
  min-width: 30px;
  font-weight: bold;
}

.mini-tag-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.mini-tag-btn {
  padding: 2px 6px;
  border: 1px solid #dee2e6;
  border-radius: 12px;
  background: white;
  color: #495057;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 10px;
  line-height: 1.2;
}

.mini-tag-btn:hover {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.btn-small {
  padding: 4px 8px;
  background: #1976d2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.model-type-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.model-type-section label {
  font-size: 12px;
  color: #666;
}

.model-type-section select {
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin-top: 20px;
}

.btn-page {
  padding: 8px 16px;
  background: #1976d2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-page:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.page-info {
  color: #666;
}

.btn-primary {
  padding: 8px 16px;
  background: #1976d2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.stats-panel {
  margin-top: 20px;
  padding: 15px;
  background: #f5f5f5;
  border-radius: 8px;
}

.stats-panel h3 {
  margin: 0 0 15px 0;
  color: #333;
}

.tag-stats {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
}

.tag-stat-item {
  display: flex;
  justify-content: space-between;
  padding: 8px;
  background: white;
  border-radius: 4px;
  border: 1px solid #ddd;
}

.tag-name {
  font-weight: bold;
  color: #333;
}

.tag-count {
  color: #666;
  font-weight: bold;
}

/* 风格标签样式 */
.style-tags-section {
  margin-top: 10px;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e9ecef;
}

.style-tags-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.style-tags-header label {
  font-size: 12px;
  color: #666;
  font-weight: bold;
}

.btn-style-tags {
  padding: 4px 8px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  transition: background 0.2s;
}

.btn-style-tags:hover {
  background: #218838;
}

.style-tags-display {
  min-height: 20px;
}

.no-style-tags {
  color: #999;
  font-size: 11px;
  font-style: italic;
}

.style-tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.style-tag-item {
  padding: 2px 6px;
  background: #e3f2fd;
  color: #1976d2;
  border-radius: 12px;
  font-size: 10px;
  border: 1px solid #bbdefb;
}

/* 风格标签模态框样式 */
.style-tag-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.style-tag-modal {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 800px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e9ecef;
}

.modal-header h3 {
  margin: 0;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
}

.close-btn:hover {
  color: #333;
}

.modal-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.selected-style-tags {
  margin-bottom: 20px;
}

.selected-style-tags h4 {
  margin: 0 0 10px 0;
  color: #333;
}

.selected-tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 30px;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e9ecef;
}

.selected-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: #e3f2fd;
  color: #1976d2;
  border-radius: 16px;
  font-size: 12px;
  border: 1px solid #bbdefb;
}

.remove-tag-btn {
  background: none;
  border: none;
  color: #1976d2;
  cursor: pointer;
  font-size: 14px;
  padding: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.remove-tag-btn:hover {
  background: #1976d2;
  color: white;
}

.no-tags {
  color: #999;
  font-style: italic;
}

.style-tag-options {
  margin-top: 20px;
}

.style-tag-options h4 {
  margin: 0 0 15px 0;
  color: #333;
}

.style-category {
  margin-bottom: 20px;
}

.style-category h5 {
  margin: 0 0 10px 0;
  color: #495057;
  font-size: 16px;
  border-bottom: 2px solid #007bff;
  padding-bottom: 5px;
}

.style-subcategory {
  margin-bottom: 15px;
  padding-left: 15px;
}

.style-subcategory h6 {
  margin: 0 0 8px 0;
  color: #6c757d;
  font-size: 14px;
}

.style-tag-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.style-tag-btn {
  padding: 6px 12px;
  border: 1px solid #dee2e6;
  border-radius: 20px;
  background: white;
  color: #495057;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 12px;
}

.style-tag-btn:hover {
  background: #e9ecef;
  border-color: #adb5bd;
}

.style-tag-btn.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 20px;
  border-top: 1px solid #e9ecef;
  background: #f8f9fa;
}
</style>
