<template>
  <div class="drafts-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="container">
        <div class="header-content">
          <div class="header-left">
            <h1 class="page-title">我的草稿</h1>
            <p class="page-subtitle">管理您的草稿文章</p>
          </div>
          <div class="header-right">
            <el-button 
              type="primary" 
              @click="createNewArticle" 
              icon="el-icon-edit"
              size="small"
            >
              写新文章
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 草稿列表 -->
    <div class="drafts-section">
      <div class="container">
        <div v-loading="loading" class="drafts-content">
          <!-- 空状态 -->
          <div v-if="!loading && drafts.length === 0" class="empty-state">
            <i class="el-icon-document"></i>
            <h3>暂无草稿</h3>
            <p>您还没有保存任何草稿文章</p>
            <el-button type="primary" @click="createNewArticle">
              开始写文章
            </el-button>
          </div>

          <!-- 草稿列表 -->
          <div v-else-if="!loading" class="drafts-list">
            <div
              v-for="draft in drafts"
              :key="draft.id"
              class="draft-item"
            >
              <div class="draft-content">
                <div class="draft-header">
                  <h3 class="draft-title">{{ draft.title || '无标题草稿' }}</h3>
                  <div class="draft-actions">
                    <el-button 
                      size="small" 
                      @click="editDraft(draft.id)"
                      type="primary"
                    >
                      继续编辑
                    </el-button>
                    <el-button 
                      size="small" 
                      @click="deleteDraft(draft.id)"
                      type="danger"
                    >
                      删除
                    </el-button>
                  </div>
                </div>
                
                <div class="draft-info">
                  <p v-if="draft.summary" class="draft-summary">{{ draft.summary }}</p>
                  <p v-else class="draft-summary no-summary">暂无摘要</p>
                  
                  <div class="draft-meta">
                    <span class="meta-item">
                      <i class="el-icon-time"></i>
                      {{ formatDate(draft.updatedAt) }}
                    </span>
                    <span v-if="draft.category" class="meta-item">
                      <i class="el-icon-folder"></i>
                      {{ draft.category }}
                    </span>
                    <span class="meta-item">
                      <i class="el-icon-document"></i>
                      {{ getContentLength(draft.content) }} 字
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 错误状态 -->
          <div v-if="loadError" class="error-state">
            <i class="el-icon-warning"></i>
            <h3>加载失败</h3>
            <p>{{ errorMessage }}</p>
            <el-button @click="loadDrafts">重试</el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'

export default {
  name: 'ArticleDrafts',
  data() {
    return {
      loading: false,
      loadError: false,
      errorMessage: '',
      drafts: []
    }
  },
  mounted() {
    this.loadDrafts()
  },
  methods: {
    async loadDrafts() {
      try {
        this.loading = true
        this.loadError = false
        this.errorMessage = ''
        
        console.log('正在加载草稿...')
        const response = await axios.get('/api/articles/drafts')
        console.log('草稿API响应:', response.data)
        
        if (response.data.status === 'success') {
          this.drafts = response.data.data.drafts || []
        } else {
          throw new Error(response.data.message || '获取草稿数据失败')
        }
      } catch (error) {
        console.error('加载草稿失败:', error)
        this.loadError = true
        
        if (error.response) {
          console.error('错误响应:', error.response.data)
          this.errorMessage = error.response.data.message || '服务器错误'
        } else if (error.request) {
          console.error('网络错误:', error.request)
          this.errorMessage = '网络连接失败，请检查网络连接'
        } else {
          this.errorMessage = error.message
        }
      } finally {
        this.loading = false
      }
    },

    editDraft(draftId) {
      this.$router.push(`/articles/edit/${draftId}`)
    },

    async deleteDraft(draftId) {
      try {
        await this.$confirm(
          '确定要删除这个草稿吗？删除后无法恢复。',
          '确认删除',
          {
            confirmButtonText: '删除',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )
        
        const response = await axios.delete(`/api/articles/${draftId}`)
        
        if (response.data.status === 'success') {
          this.$message.success('草稿已删除')
          this.loadDrafts() // 重新加载列表
        } else {
          throw new Error(response.data.message || '删除失败')
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('删除草稿失败:', error)
          this.$message.error('删除草稿失败')
        }
      }
    },

    createNewArticle() {
      this.$router.push('/articles/edit')
    },

    formatDate(dateString) {
      const date = new Date(dateString)
      const now = new Date()
      const diff = now - date

      if (diff < 60000) {
        return '刚刚'
      } else if (diff < 3600000) {
        return `${Math.floor(diff / 60000)} 分钟前`
      } else if (diff < 86400000) {
        return `${Math.floor(diff / 3600000)} 小时前`
      } else if (diff < 604800000) {
        return `${Math.floor(diff / 86400000)} 天前`
      } else {
        return date.toLocaleDateString('zh-CN')
      }
    },

    getContentLength(content) {
      if (!content) return 0
      // 移除HTML标签，计算纯文本长度
      const textContent = content.replace(/<[^>]*>/g, '')
      return textContent.length
    }
  }
}
</script>

<style scoped>
.drafts-page {
  min-height: 100vh;
  background: #f8f9fa;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

/* 页面头部 */
.page-header {
  background: #000000;
  color: white;
  padding: 30px 0;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  text-align: left;
}

.header-left {
  flex: 1;
}

.header-right {
  flex-shrink: 0;
}

.page-title {
  font-size: 2.2rem;
  font-weight: 700;
  margin: 0 0 10px 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.page-subtitle {
  font-size: 1.1rem;
  margin: 0;
  opacity: 0.9;
  font-weight: 300;
}

/* 草稿列表区域 */
.drafts-section {
  padding: 40px 0;
}

.drafts-content {
  min-height: 400px;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: #666;
}

.empty-state i {
  font-size: 4rem;
  color: #ddd;
  margin-bottom: 20px;
}

.empty-state h3 {
  font-size: 1.5rem;
  margin: 0 0 10px 0;
  color: #999;
}

.empty-state p {
  margin: 0 0 30px 0;
  opacity: 0.8;
}

/* 草稿列表 */
.drafts-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.draft-item {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.draft-item:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.draft-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.draft-title {
  font-size: 1.3rem;
  font-weight: 600;
  margin: 0;
  color: #333;
  flex: 1;
  margin-right: 20px;
}

.draft-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.draft-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.draft-summary {
  margin: 0;
  color: #666;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.draft-summary.no-summary {
  color: #999;
  font-style: italic;
}

.draft-meta {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #888;
  font-size: 0.9rem;
}

.meta-item i {
  font-size: 0.8rem;
}

/* 错误状态 */
.error-state {
  text-align: center;
  padding: 60px 20px;
  color: #666;
}

.error-state i {
  font-size: 4rem;
  color: #f56c6c;
  margin-bottom: 20px;
}

.error-state h3 {
  font-size: 1.2rem;
  margin: 0 0 10px 0;
  color: #f56c6c;
}

.error-state p {
  margin: 0 0 20px 0;
  opacity: 0.8;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .container {
    padding: 0 15px;
  }
  
  .page-header {
    padding: 20px 0;
  }
  
  .page-title {
    font-size: 1.8rem;
  }
  
  .page-subtitle {
    font-size: 1rem;
  }
  
  .drafts-section {
    padding: 20px 0;
  }
  
  .draft-item {
    padding: 16px;
  }
  
  .draft-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
  
  .draft-title {
    margin-right: 0;
    font-size: 1.1rem;
  }
  
  .draft-actions {
    justify-content: flex-end;
  }
  
  .draft-meta {
    gap: 12px;
  }
  
  .meta-item {
    font-size: 0.8rem;
  }
}
</style>

