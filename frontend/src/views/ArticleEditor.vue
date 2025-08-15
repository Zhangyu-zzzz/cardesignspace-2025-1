<template>
  <div class="article-editor-page">
    <!-- 编辑器顶部工具栏 -->
    <div class="editor-header">
      <div class="container">
        <div class="header-content">
          <div class="header-left">
            <el-button 
              type="text" 
              icon="el-icon-arrow-left" 
              @click="handleBack"
              class="back-button"
            >
              返回
            </el-button>
            <span class="editor-title">{{ isEdit ? '编辑文章' : '写文章' }}</span>
          </div>
          
          <div class="header-right">
            <el-button 
              @click="saveDraft" 
              :loading="saving"
              :disabled="!hasContent"
            >
              保存草稿
            </el-button>
            <el-button 
              type="primary" 
              @click="showPublishDialog"
              :disabled="!hasContent"
            >
              发布
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 编辑器主体 -->
    <div class="editor-body">
      <div class="container">
        <div class="editor-wrapper">
          <!-- 文章标题 -->
          <div class="title-section">
            <el-input
              v-model="article.title"
              placeholder="请输入文章标题..."
              class="title-input"
              maxlength="100"
              show-word-limit
              :class="{ 'has-content': article.title }"
            />
          </div>

          <!-- 文章副标题 -->
          <div class="subtitle-section">
            <el-input
              v-model="article.subtitle"
              placeholder="可选：添加文章副标题..."
              class="subtitle-input"
              maxlength="200"
              show-word-limit
            />
          </div>

          <!-- 封面图片 -->
          <div class="cover-section">
            <div class="cover-upload" v-if="!article.coverImage">
              <el-upload
                :action="uploadUrl"
                :headers="uploadHeaders"
                :show-file-list="false"
                :on-success="handleCoverSuccess"
                :on-error="handleUploadError"
                :before-upload="beforeUpload"
                accept="image/*"
                drag
              >
                <i class="el-icon-upload"></i>
                <div class="upload-text">
                  <p>点击或拖拽上传封面图片</p>
                  <p class="upload-hint">建议尺寸：1200x630px，支持 JPG、PNG 格式</p>
                </div>
              </el-upload>
            </div>
            
            <div class="cover-preview" v-else>
              <img :src="article.coverImage" alt="封面图片">
              <div class="cover-overlay">
                <el-button type="text" icon="el-icon-edit" @click="changeCover">更换</el-button>
                <el-button type="text" icon="el-icon-delete" @click="removeCover">删除</el-button>
              </div>
            </div>
          </div>

          <!-- 文章摘要 -->
          <div class="summary-section">
            <el-input
              v-model="article.summary"
              type="textarea"
              :rows="3"
              placeholder="为您的文章写一段精彩的摘要..."
              maxlength="300"
              show-word-limit
              class="summary-input"
            />
          </div>

          <!-- 富文本编辑器 -->
          <div class="content-section">
            <quill-editor
              ref="editor"
              v-model="article.content"
              :options="editorOptions"
              class="content-editor"
              @change="onEditorChange"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 发布对话框 -->
    <el-dialog
      title="发布文章"
      :visible.sync="publishDialogVisible"
      width="500px"
      :close-on-click-modal="false"
    >
      <div class="publish-form">
        <el-form :model="publishForm" label-width="80px">
          <el-form-item label="分类">
            <el-select v-model="publishForm.category" placeholder="选择文章分类" style="width: 100%">
              <el-option label="新车发布" value="新车发布"></el-option>
              <el-option label="试驾评测" value="试驾评测"></el-option>
              <el-option label="行业资讯" value="行业资讯"></el-option>
              <el-option label="技术解析" value="技术解析"></el-option>
              <el-option label="汽车文化" value="汽车文化"></el-option>
              <el-option label="改装案例" value="改装案例"></el-option>
              <el-option label="购车指南" value="购车指南"></el-option>
              <el-option label="维修保养" value="维修保养"></el-option>
              <el-option label="政策法规" value="政策法规"></el-option>
              <el-option label="其他" value="其他"></el-option>
            </el-select>
          </el-form-item>

          <el-form-item label="标签">
            <el-tag
              v-for="tag in publishForm.tags"
              :key="tag"
              closable
              @close="removeTag(tag)"
              class="tag-item"
            >
              {{ tag }}
            </el-tag>
            <el-input
              v-if="tagInputVisible"
              ref="tagInput"
              v-model="tagInputValue"
              size="small"
              @keyup.enter.native="addTag"
              @blur="addTag"
              class="tag-input"
            />
            <el-button v-else size="small" @click="showTagInput">+ 添加标签</el-button>
          </el-form-item>

          <el-form-item label="设置">
            <el-checkbox v-model="publishForm.featured">推荐文章</el-checkbox>
          </el-form-item>

          <el-form-item label="SEO标题">
            <el-input
              v-model="publishForm.seoTitle"
              placeholder="SEO标题（可选）"
              maxlength="60"
              show-word-limit
            />
          </el-form-item>

          <el-form-item label="SEO描述">
            <el-input
              v-model="publishForm.seoDescription"
              type="textarea"
              :rows="2"
              placeholder="SEO描述（可选）"
              maxlength="160"
              show-word-limit
            />
          </el-form-item>
        </el-form>
      </div>

      <div slot="footer" class="dialog-footer">
        <el-button @click="publishDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="publishArticle" :loading="publishing">
          发布文章
        </el-button>
      </div>
    </el-dialog>

    <!-- 隐藏的文件上传 -->
    <el-upload
      ref="coverUpload"
      :action="uploadUrl"
      :headers="uploadHeaders"
      :show-file-list="false"
      :on-success="handleCoverSuccess"
      :on-error="handleUploadError"
      :before-upload="beforeUpload"
      accept="image/*"
      style="display: none"
    />
  </div>
</template>

<script>
import axios from 'axios'
import { quillEditor } from 'vue-quill-editor'
import 'quill/dist/quill.core.css'
import 'quill/dist/quill.snow.css'
import 'quill/dist/quill.bubble.css'

// 创建API客户端实例
const apiClient = axios.create({
  baseURL: process.env.NODE_ENV === 'development' ? 'http://localhost:3000/api' : '/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

// 添加请求拦截器
apiClient.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 添加响应拦截器，专门处理文章编辑器的错误
apiClient.interceptors.response.use(
  response => response,
  error => {
    // 只记录错误，不进行全局处理
    console.error('ArticleEditor API错误:', {
      url: error.config && error.config.url,
      status: error.response && error.response.status,
      data: error.response && error.response.data
    })
    return Promise.reject(error)
  }
)

export default {
  name: 'ArticleEditor',
  components: {
    quillEditor
  },
  data() {
    return {
      article: {
        title: '',
        subtitle: '',
        content: '',
        summary: '',
        coverImage: '',
        category: '其他',
        tags: [],
        featured: false,
        seoTitle: '',
        seoDescription: '',
        status: 'draft'
      },
      publishForm: {
        category: '其他',
        tags: [],
        featured: false,
        seoTitle: '',
        seoDescription: ''
      },
      publishDialogVisible: false,
      tagInputVisible: false,
      tagInputValue: '',
      saving: false,
      publishing: false,
      isEdit: false,
      articleId: null,
      editorOptions: {
        theme: 'snow',
        modules: {
          toolbar: [
            ['bold', 'italic', 'underline', 'strike'],
            ['blockquote', 'code-block'],
            [{ 'header': 1 }, { 'header': 2 }],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            [{ 'script': 'sub'}, { 'script': 'super' }],
            [{ 'indent': '-1'}, { 'indent': '+1' }],
            [{ 'direction': 'rtl' }],
            [{ 'size': ['small', false, 'large', 'huge'] }],
            [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'font': [] }],
            [{ 'align': [] }],
            ['clean'],
            ['link', 'image', 'video']
          ]
        },
        placeholder: '开始写作...'
      }
    }
  },
  computed: {
    hasContent() {
      return this.article.title.trim() && this.article.content.trim()
    },
    uploadUrl() {
      // 在生产环境使用相对路径，开发环境使用完整URL
      if (process.env.NODE_ENV === 'production') {
        return '/api/upload/cover'
      }
      return `${process.env.VUE_APP_API_BASE_URL || 'http://localhost:3000'}/api/upload/cover`
    },
    uploadHeaders() {
      const token = localStorage.getItem('token')
      return token ? { Authorization: `Bearer ${token}` } : {}
    }
  },
  mounted() {
    // 检查是否是编辑模式
    if (this.$route.params.id) {
      this.isEdit = true
      this.articleId = this.$route.params.id
      this.loadArticle()
    }
    
    // 定期自动保存
    this.autoSaveInterval = setInterval(() => {
      if (this.hasContent && !this.saving) {
        this.autoSave()
      }
    }, 30000) // 每30秒自动保存
    
    // 配置 Quill 编辑器的图片处理
    this.$nextTick(() => {
      if (this.$refs.editor) {
        const editor = this.$refs.editor.quill
        
        // 自定义图片处理
        const toolbar = editor.getModule('toolbar')
        toolbar.addHandler('image', () => {
          this.handleImageUpload()
        })
        
        // 获取剪贴板模块
        const clipboard = editor.getModule('clipboard')
        
        // 添加原生粘贴事件监听，处理混合内容
        editor.root.addEventListener('paste', (event) => {
          console.log('🔍 原生粘贴事件触发')
          console.log('📋 剪贴板类型:', Array.from(event.clipboardData.types))
          
          // 检查是否包含图片数据
          const hasImage = event.clipboardData.types.some(type => type.startsWith('image/'))
          const hasFiles = event.clipboardData.types.includes('Files')
          const hasRtf = event.clipboardData.types.includes('text/rtf')
          const hasHtml = event.clipboardData.types.includes('text/html')
          const hasText = event.clipboardData.types.includes('text/plain')
          
          // 如果是 Word 格式（包含 RTF），只处理文本，提示用户单独插入图片
          if (hasRtf && (hasImage || hasFiles)) {
            console.log('📄 检测到 Word 格式的混合内容，只处理文本')
            event.preventDefault()
            this.handleWordTextOnly(event)
          } else if (hasFiles || hasImage) {
            console.log('🔄 检测到包含图片的内容，使用自定义处理')
            event.preventDefault()
            this.handleMixedContentPaste(event)
          }
        })
      }
    })
  },
  beforeDestroy() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval)
    }
  },
  methods: {
    async loadArticle() {
      try {
        const response = await apiClient.get(`/articles/${this.articleId}`)
        if (response.data.status === 'success') {
          const article = response.data.data.article
          this.article = {
            title: article.title || '',
            subtitle: article.subtitle || '',
            content: article.content || '',
            summary: article.summary || '',
            coverImage: article.coverImage || '',
            category: article.category || '其他',
            tags: article.tags || [],
            featured: article.featured || false,
            seoTitle: article.seoTitle || '',
            seoDescription: article.seoDescription || '',
            status: article.status || 'draft'
          }
          
          // 初始化发布表单
          this.publishForm = {
            category: this.article.category,
            tags: [...this.article.tags],
            featured: this.article.featured,
            seoTitle: this.article.seoTitle,
            seoDescription: this.article.seoDescription
          }
        }
      } catch (error) {
        console.error('加载文章失败:', error)
        this.$message.error('加载文章失败')
        this.handleBack()
      }
    },

    onEditorChange() {
      // 编辑器内容变化
    },

    // 处理粘贴事件，支持图片粘贴
    handlePaste(event) {
      console.log('🔍 粘贴事件触发')
      console.log('📋 剪贴板类型:', event.clipboardData.types)
      
      // 检查是否包含图片数据
      const hasImage = event.clipboardData.types.some(type => type.startsWith('image/'))
      console.log('🖼️ 是否包含图片:', hasImage)
      
      if (hasImage) {
        event.preventDefault()
        event.stopPropagation()
        this.handleImagePaste(event)
      }
    },

    // 处理图片粘贴
    async handleImagePaste(event) {
      try {
        console.log('🖼️ 开始处理图片粘贴')
        const items = event.clipboardData.items
        console.log('📦 剪贴板项目数量:', items.length)
        let imageCount = 0
        
        for (let i = 0; i < items.length; i++) {
          const item = items[i]
          console.log(`📦 项目 ${i}:`, item.type)
          
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile()
            console.log('📁 获取到文件:', file ? {
              name: file.name,
              size: file.size,
              type: file.type
            } : 'null')
            
            if (file) {
              imageCount++
              // 显示上传进度
              this.$message.info(`正在上传第 ${imageCount} 张图片...`)
              
              // 验证文件大小
              if (file.size > 10 * 1024 * 1024) {
                this.$message.error(`图片 ${imageCount} 大小超过10MB，已跳过`)
                continue
              }
              
              // 上传图片
              console.log('🚀 开始上传图片...')
              const imageUrl = await this.uploadPastedImage(file)
              console.log('✅ 上传完成，图片URL:', imageUrl)
              
              if (imageUrl) {
                // 在编辑器中插入图片
                const editor = this.$refs.editor.quill
                const range = editor.getSelection()
                console.log('📝 编辑器范围:', range)
                
                if (range) {
                  editor.insertEmbed(range.index, 'image', imageUrl)
                  editor.setSelection(range.index + 1)
                  console.log('✅ 图片已插入编辑器')
                }
                this.$message.success(`第 ${imageCount} 张图片上传成功`)
              }
            }
          }
        }
        
        if (imageCount === 0) {
          this.$message.warning('未检测到可粘贴的图片')
        }
      } catch (error) {
        console.error('❌ 处理粘贴图片失败:', error)
        this.$message.error('图片上传失败，请重试')
      }
    },

    // 上传粘贴的图片
    async uploadPastedImage(file) {
      try {
        console.log('📤 开始上传图片到服务器')
        console.log('📁 文件信息:', {
          name: file.name,
          size: file.size,
          type: file.type
        })
        
        const formData = new FormData()
        formData.append('image', file)
        formData.append('title', `粘贴图片_${Date.now()}`)
        formData.append('description', '从剪贴板粘贴的图片')
        
        console.log('🌐 发送请求到:', '/upload/article-image')
        const response = await apiClient.post('/upload/article-image', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
        
        console.log('📥 服务器响应:', response.data)
        
        if (response.data.status === 'success') {
          const imageUrl = response.data.data.url
          console.log('✅ 上传成功，图片URL:', imageUrl)
          return imageUrl
        } else {
          console.error('❌ 服务器返回错误:', response.data)
          throw new Error(response.data.message || '上传失败')
        }
      } catch (error) {
        console.error('❌ 上传粘贴图片失败:', error)
        if (error.response) {
          console.error('❌ 错误响应:', {
            status: error.response.status,
            data: error.response.data
          })
        }
        throw error
      }
    },

    // 处理工具栏图片上传
    handleImageUpload() {
      // 创建隐藏的文件输入
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.style.display = 'none'
      
      input.onchange = async (event) => {
        const file = event.target.files[0]
        if (file) {
          // 验证文件大小
          if (file.size > 10 * 1024 * 1024) {
            this.$message.error('图片大小不能超过10MB')
            document.body.removeChild(input)
            return
          }
          
          try {
            this.$message.info('正在上传图片...')
            const imageUrl = await this.uploadPastedImage(file)
            if (imageUrl) {
              const editor = this.$refs.editor.quill
              const range = editor.getSelection()
              if (range) {
                editor.insertEmbed(range.index, 'image', imageUrl)
                editor.setSelection(range.index + 1)
              }
              this.$message.success('图片上传成功')
            }
          } catch (error) {
            console.error('上传图片失败:', error)
            this.$message.error('图片上传失败，请重试')
          }
        }
        
        // 清理
        document.body.removeChild(input)
      }
      
      document.body.appendChild(input)
      input.click()
    },

    // 上传 base64 图片
    async uploadBase64Image(base64Data) {
      try {
        console.log('🖼️ 开始上传 base64 图片')
        
        // 将 base64 转换为文件
        const response = await fetch(base64Data)
        const blob = await response.blob()
        const file = new File([blob], `pasted-image-${Date.now()}.png`, { type: blob.type })
        
        console.log('📁 转换后的文件:', {
          name: file.name,
          size: file.size,
          type: file.type
        })
        
        // 验证文件大小
        if (file.size > 10 * 1024 * 1024) {
          this.$message.error('图片大小不能超过10MB')
          return
        }
        
        this.$message.info('正在上传粘贴的图片...')
        const imageUrl = await this.uploadPastedImage(file)
        
        if (imageUrl) {
          const editor = this.$refs.editor.quill
          const range = editor.getSelection()
          if (range) {
            editor.insertEmbed(range.index, 'image', imageUrl)
            editor.setSelection(range.index + 1)
          }
          this.$message.success('图片上传成功')
        }
      } catch (error) {
        console.error('❌ 上传 base64 图片失败:', error)
        this.$message.error('图片上传失败，请重试')
      }
    },

    // 上传多张 base64 图片
    async uploadMultipleBase64Images(base64Images) {
      try {
        console.log(`🖼️ 开始上传 ${base64Images.length} 张 base64 图片`)
        
        this.$message.info(`正在上传 ${base64Images.length} 张图片...`)
        
        const editor = this.$refs.editor.quill
        const range = editor.getSelection()
        let insertIndex = range ? range.index : 0
        
        for (let i = 0; i < base64Images.length; i++) {
          const base64Data = base64Images[i]
          console.log(`📤 上传第 ${i + 1} 张图片`)
          
          try {
            // 将 base64 转换为文件
            const response = await fetch(base64Data)
            const blob = await response.blob()
            const file = new File([blob], `pasted-image-${Date.now()}-${i}.png`, { type: blob.type })
            
            // 验证文件大小
            if (file.size > 10 * 1024 * 1024) {
              console.warn(`图片 ${i + 1} 大小超过10MB，已跳过`)
              continue
            }
            
            // 上传图片
            const imageUrl = await this.uploadPastedImage(file)
            
            if (imageUrl) {
              // 插入图片
              editor.insertEmbed(insertIndex, 'image', imageUrl)
              insertIndex += 1
              
              // 如果不是最后一张图片，添加换行
              if (i < base64Images.length - 1) {
                editor.insertText(insertIndex, '\n')
                insertIndex += 1
              }
              
              console.log(`✅ 第 ${i + 1} 张图片上传成功`)
            }
          } catch (error) {
            console.error(`❌ 第 ${i + 1} 张图片上传失败:`, error)
          }
        }
        
        // 设置光标位置
        editor.setSelection(insertIndex)
        this.$message.success(`成功上传 ${base64Images.length} 张图片`)
        
      } catch (error) {
        console.error('❌ 批量上传 base64 图片失败:', error)
        this.$message.error('图片上传失败，请重试')
      }
    },

    // 处理 Word 纯文本粘贴
    async handleWordTextOnly(event) {
      try {
        console.log('📄 开始处理 Word 纯文本粘贴')
        
        const items = event.clipboardData.items
        let textContent = ''
        
        // 只提取文本，忽略图片
        for (let i = 0; i < items.length; i++) {
          const item = items[i]
          
          if (item.type === 'text/plain') {
            const text = await new Promise((resolve) => {
              item.getAsString((text) => {
                resolve(text)
              })
            })
            if (text && text.trim()) {
              textContent = text
              console.log('📝 从 Word 获取到纯文本:', text.substring(0, 100) + '...')
              break
            }
          }
        }
        
        // 插入文本
        if (textContent && textContent.trim()) {
          const editor = this.$refs.editor.quill
          const range = editor.getSelection()
          const insertIndex = range ? range.index : 0
          
          editor.insertText(insertIndex, textContent)
          editor.setSelection(insertIndex + textContent.length)
          
          console.log('✅ Word 文本插入成功')
          
          // 提示用户关于图片的处理
          this.$message({
            message: '文字已粘贴。如需插入图片，请使用工具栏的图片按钮单独上传，以确保图片质量。',
            type: 'info',
            duration: 5000
          })
        }
        
      } catch (error) {
        console.error('❌ 处理 Word 文本失败:', error)
        this.$message.error('处理内容失败，请重试')
      }
    },

    // 处理混合内容粘贴（文字+图片）
    async handleMixedContentPaste(event) {
      try {
        console.log('🔄 开始处理混合内容粘贴')
        console.log('📋 剪贴板项目数量:', event.clipboardData.items.length)
        
        const items = event.clipboardData.items
        let textContent = ''
        let imageFiles = []
        
        // 处理所有剪贴板项目
        console.log(`🔄 开始处理 ${items.length} 个项目`)
        
        // 使用 Promise.all 并行处理所有项目
        const promises = Array.from(items).map(async (item, index) => {
          console.log(`📦 处理项目 ${index}:`, item.type)
          
          try {
            if (item.type === 'text/plain') {
              // 获取纯文本
              const text = await new Promise((resolve) => {
                item.getAsString((text) => {
                  resolve(text)
                })
              })
              if (text && text.trim()) {
                return { type: 'text', content: text }
              }
            } else if (item.type === 'text/rtf') {
              // 处理 Word RTF 格式
              console.log('📄 检测到 RTF 格式（Word 文档）')
              const rtf = await new Promise((resolve) => {
                item.getAsString((rtf) => {
                  resolve(rtf)
                })
              })
              console.log('📄 RTF 内容预览:', rtf ? rtf.substring(0, 200) + '...' : '空')
              
              // 从 RTF 中提取文本（简单处理）
              if (rtf) {
                const textMatch = rtf.match(/\\par\s*([^\\]+)/g)
                if (textMatch) {
                  const text = textMatch.map(match => match.replace(/\\par\s*/, '')).join('\n')
                  return { type: 'text', content: text }
                }
              }
            } else if (item.type === 'text/html') {
              // 处理 HTML 格式（只提取纯图片，不处理合成图片）
              console.log('🌐 检测到 HTML 格式')
              const html = await new Promise((resolve) => {
                item.getAsString((html) => {
                  resolve(html)
                })
              })
              
              if (html) {
                // 从 HTML 中提取 base64 图片
                const tempDiv = document.createElement('div')
                tempDiv.innerHTML = html
                
                const images = tempDiv.querySelectorAll('img')
                console.log(`🖼️ 从 HTML 中提取到 ${images.length} 张图片`)
                
                const imagePromises = []
                for (let j = 0; j < images.length; j++) {
                  const img = images[j]
                  const src = img.getAttribute('src')
                  console.log(`🖼️ 图片 ${j + 1} src:`, src ? src.substring(0, 100) + '...' : 'null')
                  
                  if (src && src.startsWith('data:')) {
                    try {
                      // 将 base64 转换为文件
                      const response = await fetch(src)
                      const blob = await response.blob()
                      const file = new File([blob], `html-image-${Date.now()}-${j}.png`, { type: blob.type })
                      imagePromises.push(file)
                      console.log(`✅ 成功转换 HTML 图片 ${j + 1}`)
                    } catch (fetchError) {
                      console.error(`❌ 转换 HTML 图片 ${j + 1} 失败:`, fetchError)
                    }
                  } else if (src && src.startsWith('file://')) {
                    console.log(`⚠️ 跳过本地文件路径图片: ${src}`)
                  }
                }
                if (imagePromises.length > 0) {
                  return { type: 'images', files: imagePromises }
                }
              }
            } else if (item.type.startsWith('image/')) {
              // 直接图片文件
              const file = item.getAsFile()
              if (file) {
                return { type: 'images', files: [file] }
              }
            } else if (item.type === 'Files') {
              // 文件列表中的图片
              console.log('📁 检测到 Files 类型')
              const files = item.getAsFileList()
              
              if (files && files.length > 0) {
                console.log(`📁 文件列表长度: ${files.length}`)
                const imageFiles = []
                for (let j = 0; j < files.length; j++) {
                  const file = files[j]
                  console.log(`📁 文件 ${j}:`, {
                    name: file.name,
                    size: file.size,
                    type: file.type
                  })
                  
                  if (file.type.startsWith('image/')) {
                    imageFiles.push(file)
                    console.log('🖼️ 从文件列表获取到图片')
                  }
                }
                if (imageFiles.length > 0) {
                  return { type: 'images', files: imageFiles }
                }
              } else {
                console.log('❌ 无法获取文件列表或文件列表为空')
              }
            }
          } catch (itemError) {
            console.error(`❌ 处理项目 ${index} 失败:`, itemError)
          }
          
          return null
        })
        
        // 等待所有处理完成
        const results = await Promise.all(promises)
        console.log('📊 处理结果:', results)
        
        // 整理结果 - 优先处理直接的图片文件，避免使用合成图片
        let hasDirectImages = false
        
        // 第一遍：查找直接的图片文件和文本
        for (const result of results) {
          if (result) {
            if (result.type === 'text' && result.content) {
              textContent = result.content
              console.log('📝 获取到文本:', textContent.substring(0, 100) + '...')
            } else if (result.type === 'images' && result.files) {
              // 检查是否是直接的图片文件（不是从 HTML 转换的）
              const directImages = result.files.filter(file => 
                file.name && !file.name.startsWith('html-image-')
              )
              if (directImages.length > 0) {
                imageFiles.push(...directImages)
                hasDirectImages = true
                console.log(`🖼️ 获取到 ${directImages.length} 张直接图片文件`)
              }
            }
          }
        }
        
        // 第二遍：如果没有直接的图片文件，才使用 HTML 中的图片
        if (!hasDirectImages) {
          for (const result of results) {
            if (result && result.type === 'images' && result.files) {
              const htmlImages = result.files.filter(file => 
                file.name && file.name.startsWith('html-image-')
              )
              if (htmlImages.length > 0) {
                imageFiles.push(...htmlImages)
                console.log(`🖼️ 作为备选，获取到 ${htmlImages.length} 张 HTML 图片`)
              }
            }
          }
        }
        
        console.log(`🔄 处理完成，共处理 ${items.length} 个项目`)
        
        console.log(`📊 处理结果: 文本长度=${textContent.length}, 图片数量=${imageFiles.length}`)
        
        // 插入内容
        const editor = this.$refs.editor.quill
        const range = editor.getSelection()
        let insertIndex = range ? range.index : 0
        
        // 先插入文本
        if (textContent && textContent.trim()) {
          editor.insertText(insertIndex, textContent)
          insertIndex += textContent.length
          console.log('✅ 文本插入成功')
        }
        
        // 再插入图片
        if (imageFiles.length > 0) {
          this.$message.info(`正在上传 ${imageFiles.length} 张图片...`)
          
          for (let i = 0; i < imageFiles.length; i++) {
            const file = imageFiles[i]
            
            try {
              // 验证文件大小
              if (file.size > 10 * 1024 * 1024) {
                console.warn(`图片 ${i + 1} 大小超过10MB，已跳过`)
                continue
              }
              
              // 上传图片
              const imageUrl = await this.uploadPastedImage(file)
              
              if (imageUrl) {
                // 添加换行
                editor.insertText(insertIndex, '\n')
                insertIndex += 1
                
                // 插入图片
                editor.insertEmbed(insertIndex, 'image', imageUrl)
                insertIndex += 1
                
                console.log(`✅ 第 ${i + 1} 张图片上传成功`)
              }
            } catch (error) {
              console.error(`❌ 第 ${i + 1} 张图片上传失败:`, error)
            }
          }
          
          this.$message.success(`成功上传 ${imageFiles.length} 张图片`)
        }
        
        // 设置光标位置
        editor.setSelection(insertIndex)
        console.log('✅ 混合内容粘贴处理完成')
        
      } catch (error) {
        console.error('❌ 处理混合内容粘贴失败:', error)
        this.$message.error('处理内容失败，请重试')
      }
    },

    async saveDraft() {
      console.log('🚀 saveDraft方法被调用')
      
      if (!this.hasContent) {
        this.$message.warning('请输入标题和内容')
        return
      }

      // 检查登录状态
      const token = localStorage.getItem('token')
      const user = localStorage.getItem('user')
      
      if (!token || !user) {
        this.$message.warning('请先登录后再保存草稿')
        return
      }
      
      // 验证Vuex状态与localStorage的一致性
      if (!this.$store.state.isAuthenticated || !this.$store.state.user) {
        console.log('🔄 Vuex状态不一致，尝试恢复认证状态')
        try {
          const restored = await this.$store.dispatch('checkAuth')
          if (!restored) {
            this.$message.warning('登录状态异常，请重新登录')
            return
          }
        } catch (error) {
          console.error('恢复认证状态失败:', error)
          this.$message.warning('登录状态异常，请重新登录')
          return
        }
      }

      try {
        this.saving = true
        const articleData = {
          ...this.article,
          status: 'draft'
        }

        console.log('📝 开始保存草稿:', articleData)
        console.log('📊 数据大小:', JSON.stringify(articleData).length, '字节')
        
        let response
        if (this.isEdit) {
          console.log('📝 更新现有文章:', this.articleId)
          response = await apiClient.put(`/articles/${this.articleId}`, articleData)
        } else {
          console.log('📝 创建新文章')
          response = await apiClient.post('/articles', articleData)
          if (response.data.status === 'success') {
            this.isEdit = true
            this.articleId = response.data.data.id
            // 更新路由但不触发导航
            history.replaceState(null, '', `/articles/edit/${this.articleId}`)
          }
        }

        console.log('✅ 保存成功:', response.data)
        if (response.data.status === 'success') {
          this.$message.success('草稿已保存')
        }
      } catch (error) {
        console.error('❌ 保存草稿失败:', error)
        console.error('❌ 错误详情:', {
          status: error.response && error.response.status,
          statusText: error.response && error.response.statusText,
          data: error.response && error.response.data,
          message: error.message
        })
        
        // 根据错误类型显示不同的消息
        if (error.response && error.response.status === 413) {
          this.$message.error('文章内容过大，请删减部分内容后重试')
        } else if (error.response && error.response.status === 401) {
          const errorMessage = (error.response.data && error.response.data.message) || ''
          if (errorMessage.includes('The user belonging to this token no longer exists')) {
            this.$message.error('用户账户不存在，请重新登录')
            // 清除用户数据并跳转到登录页面
            this.$store.dispatch('logout')
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            this.$router.push('/login')
          } else {
            this.$message.error('登录已过期，请重新登录')
            // 尝试重新验证token
            try {
              const restored = await this.$store.dispatch('checkAuth')
              if (!restored) {
                this.$store.dispatch('logout')
                localStorage.removeItem('token')
                localStorage.removeItem('user')
                this.$router.push('/login')
              }
            } catch (authError) {
              console.error('重新验证失败:', authError)
              this.$store.dispatch('logout')
              localStorage.removeItem('token')
              localStorage.removeItem('user')
              this.$router.push('/login')
            }
          }
        } else {
          const errorMsg = (error.response && error.response.data && error.response.data.message) || error.message || '网络错误'
          this.$message.error('保存草稿失败：' + errorMsg)
        }
      } finally {
        this.saving = false
      }
    },

    async autoSave() {
      if (!this.hasContent) return
      
      try {
        const articleData = {
          ...this.article,
          status: 'draft'
        }

        if (this.isEdit) {
          await apiClient.put(`/articles/${this.articleId}`, articleData)
        } else {
          const response = await apiClient.post('/articles', articleData)
          if (response.data.status === 'success') {
            this.isEdit = true
            this.articleId = response.data.data.id
            history.replaceState(null, '', `/articles/edit/${this.articleId}`)
          }
        }
      } catch (error) {
        console.error('自动保存失败:', error)
        // 如果是401错误，记录详细信息但不显示给用户（避免频繁弹窗）
        if (error.response && error.response.status === 401) {
          console.log('自动保存遇到401错误，可能是认证问题')
          // 不在这里清除用户数据，让用户手动操作时再处理
        }
      }
    },

    showPublishDialog() {
      if (!this.hasContent) {
        this.$message.warning('请输入标题和内容')
        return
      }

      // 同步数据到发布表单
      this.publishForm.category = this.article.category
      this.publishForm.tags = [...this.article.tags]
      this.publishForm.featured = this.article.featured
      this.publishForm.seoTitle = this.article.seoTitle
      this.publishForm.seoDescription = this.article.seoDescription

      this.publishDialogVisible = true
    },

    async publishArticle() {
      try {
        this.publishing = true
        
        // 先保存草稿确保数据完整
        await this.saveDraft()

        const articleData = {
          ...this.article,
          ...this.publishForm,
          status: 'published',
          publishedAt: new Date()
        }

        const response = await apiClient.put(`/articles/${this.articleId}`, articleData)
        
        if (response.data.status === 'success') {
          this.$message.success('文章发布成功！')
          this.publishDialogVisible = false
          // 跳转到文章详情页
          this.$router.push(`/articles/${this.articleId}`)
        }
      } catch (error) {
        console.error('发布文章失败:', error)
        this.$message.error('发布文章失败')
      } finally {
        this.publishing = false
      }
    },

    showTagInput() {
      this.tagInputVisible = true
      this.$nextTick(() => {
        this.$refs.tagInput.$refs.input.focus()
      })
    },

    addTag() {
      const value = this.tagInputValue.trim()
      if (value && !this.publishForm.tags.includes(value)) {
        this.publishForm.tags.push(value)
      }
      this.tagInputVisible = false
      this.tagInputValue = ''
    },

    removeTag(tag) {
      const index = this.publishForm.tags.indexOf(tag)
      if (index > -1) {
        this.publishForm.tags.splice(index, 1)
      }
    },

    changeCover() {
      this.$refs.coverUpload.$el.querySelector('input').click()
    },

    removeCover() {
      this.article.coverImage = ''
    },

    beforeUpload(file) {
      const isImage = file.type.startsWith('image/')
      const isLt5M = file.size / 1024 / 1024 < 10

      if (!isImage) {
        this.$message.error('只能上传图片文件!')
        return false
      }
      if (!isLt5M) {
        this.$message.error('图片大小不能超过 10MB!')
        return false
      }
      return true
    },

    handleCoverSuccess(response) {
      console.log('上传响应:', response)
      if (response.success || response.status === 'success') {
        this.article.coverImage = (response.data && response.data.url) || response.url
        this.$message.success('封面上传成功')
      } else {
        this.$message.error('封面上传失败')
      }
    },

    handleUploadError() {
      this.$message.error('上传失败，请重试')
    },

    handleBack() {
      if (this.hasContent) {
        this.$confirm('确定要离开吗？未保存的内容将会丢失。', '提示', {
          confirmButtonText: '离开',
          cancelButtonText: '取消',
          type: 'warning'
        }).then(() => {
          this.$router.go(-1)
        })
      } else {
        this.$router.go(-1)
      }
    },

    // 处理搜索
    handleSearch() {
      if (!this.searchKeyword.trim()) return;
      this.$router.push({
        path: '/search',
        query: { keyword: this.searchKeyword.trim() }
      });
    }
  }
}
</script>

<style scoped>
.article-editor-page {
  min-height: 100vh;
  background: #f8f9fa;
}

.container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 20px;
}

/* 顶部工具栏 */
.editor-header {
  background: white;
  border-bottom: 1px solid #e4e7ed;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 64px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-button {
  color: #606266;
  font-size: 16px;
}

.back-button:hover {
  color: #e03426;
}

.editor-title {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
}

.header-right {
  display: flex;
  gap: 12px;
}

/* 编辑器主体 */
.editor-body {
  padding: 40px 0;
}

.editor-wrapper {
  background: white;
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.04);
}

/* 标题输入 */
.title-section {
  margin-bottom: 24px;
}

.title-input >>> .el-input__inner {
  border: none;
  font-size: 32px;
  font-weight: 700;
  line-height: 1.2;
  color: #2c3e50;
  padding: 0;
  background: transparent;
}

.title-input >>> .el-input__inner:focus {
  border: none;
  box-shadow: none;
}

.title-input >>> .el-input__inner::placeholder {
  color: #c0c4cc;
  font-weight: 400;
}

.title-input.has-content >>> .el-input__inner {
  color: #2c3e50;
}

/* 副标题输入 */
.subtitle-section {
  margin-bottom: 32px;
}

.subtitle-input >>> .el-input__inner {
  border: none;
  font-size: 18px;
  color: #666;
  padding: 0;
  background: transparent;
}

.subtitle-input >>> .el-input__inner:focus {
  border: none;
  box-shadow: none;
}

.subtitle-input >>> .el-input__inner::placeholder {
  color: #c0c4cc;
}

/* 封面图片 */
.cover-section {
  margin-bottom: 32px;
}

.cover-upload {
  border: 2px dashed #d3dce6;
  border-radius: 12px;
  padding: 40px;
  text-align: center;
  transition: all 0.3s ease;
}

.cover-upload:hover {
  border-color: #e03426;
}

.cover-upload >>> .el-upload-dragger {
  border: none;
  background: transparent;
  width: 100%;
  height: auto;
}

.upload-text p {
  margin: 8px 0;
  color: #606266;
}

.upload-hint {
  font-size: 12px;
  color: #909399;
}

.cover-preview {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
}

.cover-preview img {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.cover-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.cover-preview:hover .cover-overlay {
  opacity: 1;
}

.cover-overlay .el-button {
  color: white;
  border-color: white;
}

.cover-overlay .el-button:hover {
  background: white;
  color: #e03426;
}

/* 摘要输入 */
.summary-section {
  margin-bottom: 32px;
}

.summary-input >>> .el-textarea__inner {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.6;
  resize: none;
}

.summary-input >>> .el-textarea__inner:focus {
  border-color: #e03426;
  box-shadow: 0 0 0 2px rgba(224, 52, 38, 0.1);
}

/* 富文本编辑器 */
.content-section {
  margin-bottom: 32px;
}

.content-editor {
  background: white;
}

.content-editor >>> .ql-toolbar {
  border-top: 1px solid #e4e7ed;
  border-left: 1px solid #e4e7ed;
  border-right: 1px solid #e4e7ed;
  border-bottom: none;
  border-radius: 8px 8px 0 0;
  background: #f8f9fa;
}

.content-editor >>> .ql-container {
  border: 1px solid #e4e7ed;
  border-radius: 0 0 8px 8px;
  font-size: 16px;
  line-height: 1.8;
  min-height: 400px;
}

.content-editor >>> .ql-editor {
  min-height: 400px;
  padding: 24px;
}

.content-editor >>> .ql-editor.ql-blank::before {
  color: #c0c4cc;
  font-style: normal;
}

/* 发布对话框 */
.publish-form {
  padding: 16px 0;
}

.tag-item {
  margin-right: 8px;
  margin-bottom: 8px;
}

.tag-input {
  width: 120px;
  margin-left: 8px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .container {
    padding: 0 15px;
  }
  
  .editor-wrapper {
    padding: 24px;
    border-radius: 12px;
  }
  
  .header-content {
    height: 56px;
  }
  
  .title-input >>> .el-input__inner {
    font-size: 24px;
  }
  
  .subtitle-input >>> .el-input__inner {
    font-size: 16px;
  }
  
  .content-editor >>> .ql-editor {
    min-height: 300px;
    padding: 16px;
  }
  
  .cover-upload {
    padding: 24px;
  }
}
</style> 