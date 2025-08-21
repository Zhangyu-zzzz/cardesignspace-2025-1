<template>
  <div class="wechat-editor">
    <!-- 顶部导航栏 -->
    <div class="editor-header">
          <div class="header-left">
        <div class="logo">
          <i class="el-icon-edit"></i>
          <span>文章编辑器</span>
        </div>
          </div>
          
          <div class="header-right">
        <el-button size="small" @click="handleBack" v-if="isEdit">
          取消编辑
        </el-button>
        <el-button size="small" @click="saveDraft" :loading="saving">
              保存草稿
            </el-button>
        <el-button type="primary" size="small" @click="showPublishDialog">
          发布文章
            </el-button>
          </div>
        </div>

    <!-- 主要内容区域 -->
    <div class="editor-main">
      <!-- 左侧预览区 -->
      <div class="preview-panel">
        <div class="preview-header">
          <div class="account-info">
            <div class="account-avatar">
              <i class="el-icon-user"></i>
            </div>
            <div class="account-name">CarDesignSpace</div>
      </div>
    </div>

        <div class="preview-content">
          <div class="article-preview" v-if="hasContent">
            <div class="preview-cover" v-if="article.coverImage">
              <img :src="article.coverImage" alt="封面">
            </div>
            <div class="preview-title">{{ article.title || '请输入标题' }}</div>
            <div class="preview-summary">{{ article.summary || '请输入摘要' }}</div>
            <div class="preview-meta">
              <span class="preview-date">{{ new Date().toLocaleDateString() }}</span>
              <span class="preview-reads">阅读 0</span>
            </div>
          </div>
          <div class="preview-placeholder" v-else>
            <i class="el-icon-picture"></i>
            <p>文章预览</p>
            <p class="preview-hint">开始编辑后，这里将显示文章预览</p>
          </div>
        </div>
        
        <div class="preview-actions">
          <el-button size="small" icon="el-icon-plus" @click="createNewArticle">
            新建文章
          </el-button>
          <el-button size="small" icon="el-icon-document" @click="showHistory">
            历史版本
          </el-button>
        </div>
      </div>

      <!-- 右侧编辑区 -->
      <div class="edit-panel">
        <div class="edit-header">
          <!-- 工具栏放在左边 -->
          <div class="edit-toolbar">
            <div class="toolbar-group">
              <button class="toolbar-btn" data-action="bold" @click="formatText('bold')" title="粗体">
                <strong>B</strong>
              </button>
              <button class="toolbar-btn" data-action="italic" @click="formatText('italic')" title="斜体">
                <em>I</em>
              </button>
              <button class="toolbar-btn" data-action="underline" @click="formatText('underline')" title="下划线">
                <u>U</u>
              </button>
            </div>
            
            <div class="toolbar-group">
              <button class="toolbar-btn" data-action="align" data-value="left" @click="formatText('align', 'left')" title="左对齐">
                <i class="el-icon-arrow-left"></i>
              </button>
              <button class="toolbar-btn" data-action="align" data-value="center" @click="formatText('align', 'center')" title="居中">
                <i class="el-icon-s-unfold"></i>
              </button>
              <button class="toolbar-btn" data-action="align" data-value="right" @click="formatText('align', 'right')" title="右对齐">
                <i class="el-icon-arrow-right"></i>
              </button>
            </div>
            
            <div class="toolbar-group">
              <button class="toolbar-btn" data-action="list" data-value="bullet" @click="formatText('list', 'bullet')" title="无序列表">
                <span style="font-size: 16px;">•</span>
              </button>
              <button class="toolbar-btn" data-action="list" data-value="ordered" @click="formatText('list', 'ordered')" title="有序列表">
                <span style="font-size: 16px;">1.</span>
              </button>
            </div>
            
            <div class="toolbar-group">
              <button class="toolbar-btn" @click="handleImageUpload" title="插入图片">
                <i class="el-icon-picture"></i>
              </button>
              <button class="toolbar-btn" @click="insertLink" title="插入链接">
                <i class="el-icon-paperclip"></i>
              </button>
            </div>
          </div>
          
          <!-- 编辑/预览标签放在右边 -->
          <div class="edit-tabs">
            <span class="edit-tab active">编辑</span>
            <span class="edit-tab">预览</span>
          </div>
        </div>
        
        <div class="edit-content">
          <!-- 标题输入 -->
          <div class="title-section">
            <el-input
              v-model="article.title"
              placeholder="请输入文章标题..."
              class="title-input"
              maxlength="64"
              show-word-limit
            />
          </div>

          <!-- 作者输入 -->
          <div class="author-section">
            <el-input
              v-model="article.author"
              placeholder="请输入作者（可选）"
              class="author-input"
              maxlength="20"
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
                  <p class="upload-hint">建议尺寸：900x500px</p>
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

          <!-- 摘要输入 -->
          <div class="summary-section">
            <el-input
              v-model="article.summary"
              type="textarea"
              :rows="3"
              placeholder="请输入文章摘要..."
              maxlength="200"
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

    <!-- 图片调整工具栏 -->
    <div class="image-toolbar" v-if="showImageToolbar" @click.stop>
      <div class="image-toolbar-content">
        <div class="image-toolbar-header">
          <span>图片调整</span>
          <i class="el-icon-close" @click="hideImageToolbar"></i>
        </div>
        <div class="image-toolbar-body">
          <div class="image-size-options">
            <div class="size-option" @click="setImageSize('small')" :class="{ active: selectedImageSize === 'small' }">
              <div class="size-preview small"></div>
              <span>小图</span>
            </div>
            <div class="size-option" @click="setImageSize('medium')" :class="{ active: selectedImageSize === 'medium' }">
              <div class="size-preview medium"></div>
              <span>中图</span>
            </div>
            <div class="size-option" @click="setImageSize('large')" :class="{ active: selectedImageSize === 'large' }">
              <div class="size-preview large"></div>
              <span>大图</span>
            </div>
            <div class="size-option" @click="setImageSize('full')" :class="{ active: selectedImageSize === 'full' }">
              <div class="size-preview full"></div>
              <span>全宽</span>
            </div>
          </div>
          <div class="image-actions">
            <el-button size="small" @click="deleteSelectedImage">删除图片</el-button>
            <el-button size="small" @click="hideImageToolbar">完成</el-button>
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
import { apiClient } from '@/services/api'
import { quillEditor } from 'vue-quill-editor'
import 'quill/dist/quill.core.css'
import 'quill/dist/quill.snow.css'
import 'quill/dist/quill.bubble.css'



export default {
  name: 'ArticleEditor',
  components: {
    quillEditor
  },
  data() {
    return {
      article: {
        title: '',
        author: '',
        content: '',
        summary: '',
        coverImage: '',
        category: '其他',
        tags: [],
        featured: false,
        status: 'draft'
      },
      publishForm: {
        category: '其他',
        tags: [],
        featured: false
      },
      publishDialogVisible: false,
      tagInputVisible: false,
      tagInputValue: '',
      saving: false,
      publishing: false,
      isEdit: false,
      articleId: null,
      showImageToolbar: false,
      selectedImage: null,
      selectedImageSize: 'medium',
      editorOptions: {
        theme: 'snow',
        placeholder: '从这里开始写正文...',
        modules: {
          toolbar: false
        }
      }
    }
  },
  computed: {
    hasContent() {
      return !!(this.article.title && this.article.title.trim()) || 
             !!(this.article.content && this.article.content.trim()) || 
             !!(this.article.summary && this.article.summary.trim())
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
    console.log('🚀 ArticleEditor 组件已挂载')
    console.log('🔍 路由参数:', this.$route.params)
    
    // 配置 Quill 编辑器
    this.$nextTick(() => {
      console.log('🔄 开始配置 Quill 编辑器')
      if (this.$refs.editor) {
        console.log('✅ 编辑器引用存在')
        const editor = this.$refs.editor.quill
        console.log('✅ Quill 实例已创建')
        
        // 增强的粘贴处理
        editor.root.addEventListener('paste', (event) => {
          this.handleEnhancedPaste(event, editor)
        })
        
        // 初始化工具栏状态
        this.updateToolbarState()
        
        // 初始化图片点击事件
        this.initImageClickEvents()
        
        // 检查是否是编辑模式，在编辑器初始化后加载文章
        if (this.$route.params.id) {
          console.log('📝 检测到编辑模式，文章ID:', this.$route.params.id)
          this.isEdit = true
          this.articleId = this.$route.params.id
          console.log('🔄 开始加载文章...')
          this.loadArticle()
        } else {
          console.log('📝 新建文章模式')
        }
      } else {
        console.error('❌ 编辑器引用不存在')
      }
    })
    
    // 定期自动保存
    this.autoSaveInterval = setInterval(() => {
      if (this.hasContent && !this.saving) {
        this.autoSave()
      }
    }, 30000) // 每30秒自动保存
  },
  beforeDestroy() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval)
    }
  },
  methods: {
    async loadArticle() {
      try {
        console.log('🔄 开始加载文章，ID:', this.articleId)
        const response = await apiClient.get(`/articles/${this.articleId}`)
        console.log('📡 API响应:', response.data)
        
        // 检查响应结构
        let article
        if (response.data.status === 'success' && response.data.data && response.data.data.article) {
          // 标准格式: {status: 'success', data: {article: {...}}}
          article = response.data.data.article
        } else if (response.data.article) {
          // 直接格式: {article: {...}, userLiked: false}
          article = response.data.article
        } else {
          throw new Error('无法解析文章数据')
        }
        
        console.log('📄 文章数据:', article)
        
          this.article = {
            title: article.title || '',
          author: article.author || '',
            content: article.content || '',
            summary: article.summary || '',
            coverImage: article.coverImage || '',
            category: article.category || '其他',
            tags: article.tags || [],
            featured: article.featured || false,
          status: article.status || 'published' // 保持原有状态，默认为已发布
          }
        
        console.log('✅ 文章数据已加载到组件:', this.article)
          
          // 初始化发布表单
          this.publishForm = {
            category: this.article.category,
            tags: [...this.article.tags],
          featured: this.article.featured
        }
        
        // 将内容设置到编辑器中
        console.log('🖊️ 准备设置编辑器内容...')
        this.setEditorContent()
        
        // 如果第一次设置失败，延迟后尝试备用方法
        setTimeout(() => {
          if (!this.$refs.editor.quill.getText().trim()) {
            console.log('🔄 第一次设置可能失败，尝试备用方法...')
            this.setEditorContentDirect()
          }
        }, 1000)
      } catch (error) {
        console.error('❌ 加载文章失败:', error)
        this.$message.error('加载文章失败')
        this.handleBack()
      }
    },

    // 设置编辑器内容的方法
    setEditorContent() {
      console.log('🖊️ setEditorContent 被调用')
      console.log('📄 当前文章内容:', this.article.content)
      console.log('🔍 编辑器引用状态:', {
        editor: !!this.$refs.editor,
        quill: !!(this.$refs.editor && this.$refs.editor.quill)
      })
      
      this.$nextTick(() => {
        if (this.$refs.editor && this.$refs.editor.quill) {
          console.log('🖊️ 编辑器已准备就绪，开始设置内容')
          if (this.article.content) {
            try {
              console.log('📝 使用 setContents 设置内容...')
              // 使用 Quill 的 setContents 方法设置内容
              this.$refs.editor.quill.setContents(this.$refs.editor.quill.clipboard.convert(this.article.content))
              console.log('✅ 编辑器内容设置成功')
              
              // 为所有图片添加默认尺寸类（如果没有的话）
              this.$nextTick(() => {
                const images = this.$refs.editor.quill.root.querySelectorAll('img')
                images.forEach(img => {
                  if (!img.classList.contains('image-small') && 
                      !img.classList.contains('image-medium') && 
                      !img.classList.contains('image-large') && 
                      !img.classList.contains('image-full')) {
                    img.classList.add('image-medium')
                  }
                })
              })
            } catch (error) {
              console.error('❌ 设置编辑器内容失败:', error)
              // 如果 setContents 失败，尝试使用 setText
              console.log('📝 尝试使用 setText 设置内容...')
              this.$refs.editor.quill.setText(this.article.content)
            }
          } else {
            console.warn('⚠️ 文章内容为空')
          }
        } else {
          console.warn('⚠️ 编辑器引用不存在，等待编辑器初始化...')
          // 如果编辑器还没初始化，延迟重试
          setTimeout(() => {
            console.log('🔄 重试设置编辑器内容...')
            this.setEditorContent()
          }, 500)
        }
      })
    },

    // 备用方法：直接设置 HTML 内容
    setEditorContentDirect() {
      console.log('🖊️ 使用直接方法设置编辑器内容')
      this.$nextTick(() => {
        if (this.$refs.editor && this.$refs.editor.quill) {
          if (this.article.content) {
            try {
              // 直接设置 HTML 内容
              this.$refs.editor.quill.root.innerHTML = this.article.content
              console.log('✅ 直接设置内容成功')
            } catch (error) {
              console.error('❌ 直接设置内容失败:', error)
            }
          }
        }
      })
    },

    // 显示图片调整工具栏
    openImageToolbar(imageElement) {
      this.selectedImage = imageElement
      this.showImageToolbar = true
      
      // 获取当前图片的尺寸类
      const currentSize = this.getImageSizeClass(imageElement)
      this.selectedImageSize = currentSize
      
      // 定位工具栏
      this.positionImageToolbar(imageElement)
    },

    // 隐藏图片调整工具栏
    hideImageToolbar() {
      this.showImageToolbar = false
      this.selectedImage = null
    },

    // 设置图片尺寸
    setImageSize(size) {
      if (!this.selectedImage) return
      
      console.log('🖼️ 设置图片尺寸:', size)
      this.selectedImageSize = size
      
      // 保存当前光标位置
      const editor = this.$refs.editor.quill
      const range = editor.getSelection()
      
      // 移除所有尺寸类
      this.selectedImage.classList.remove('image-small', 'image-medium', 'image-large', 'image-full')
      
      // 添加新的尺寸类
      this.selectedImage.classList.add(`image-${size}`)
      
      console.log('✅ 图片尺寸类已设置:', this.selectedImage.className)
      
      // 不更新 article.content，避免触发编辑器重新渲染
      // 只在需要保存时才更新内容
      
      // 恢复光标位置
      if (range) {
        this.$nextTick(() => {
          try {
            editor.setSelection(range.index, range.length)
            console.log('✅ 光标位置已恢复')
          } catch (error) {
            console.log('❌ 恢复光标位置失败:', error)
          }
        })
      }
    },

    // 删除选中的图片
    deleteSelectedImage() {
      if (!this.selectedImage) return
      
      // 保存当前光标位置
      const editor = this.$refs.editor.quill
      const range = editor.getSelection()
      
      this.selectedImage.remove()
      this.hideImageToolbar()
      
      // 不更新 article.content，避免触发编辑器重新渲染
      // 只在需要保存时才更新内容
      
      // 恢复光标位置
      if (range) {
        this.$nextTick(() => {
          try {
            editor.setSelection(range.index, range.length)
          } catch (error) {
            console.log('恢复光标位置失败:', error)
          }
        })
      }
    },

    // 获取图片的尺寸类
    getImageSizeClass(imageElement) {
      if (imageElement.classList.contains('image-small')) return 'small'
      if (imageElement.classList.contains('image-medium')) return 'medium'
      if (imageElement.classList.contains('image-large')) return 'large'
      if (imageElement.classList.contains('image-full')) return 'full'
      return 'medium' // 默认中等尺寸
    },



    // 定位图片工具栏
    positionImageToolbar(imageElement) {
      this.$nextTick(() => {
        const toolbar = document.querySelector('.image-toolbar')
        if (!toolbar || !imageElement) return
        
        const imageRect = imageElement.getBoundingClientRect()
        const toolbarRect = toolbar.getBoundingClientRect()
        
        // 计算工具栏位置
        let left = imageRect.left + (imageRect.width / 2) - (toolbarRect.width / 2)
        let top = imageRect.bottom + 10
        
        // 确保工具栏不超出视窗
        if (left < 10) left = 10
        if (left + toolbarRect.width > window.innerWidth - 10) {
          left = window.innerWidth - toolbarRect.width - 10
        }
        if (top + toolbarRect.height > window.innerHeight - 10) {
          top = imageRect.top - toolbarRect.height - 10
        }
        
        toolbar.style.left = `${left}px`
        toolbar.style.top = `${top}px`
      })
    },

    // 更新编辑器内容
    updateEditorContent() {
      if (this.$refs.editor && this.$refs.editor.quill) {
        // 获取当前内容并同步到 article.content
        const content = this.$refs.editor.quill.root.innerHTML
        this.article.content = content
        
        // 触发编辑器内容变化事件，但不重新设置内容
        this.$emit('change', content)
      }
    },

    // 初始化图片点击事件
    initImageClickEvents() {
      this.$nextTick(() => {
        const editor = this.$refs.editor
        if (!editor) return
        
        // 监听图片点击事件
        editor.$el.addEventListener('click', (event) => {
          if (event.target.tagName === 'IMG') {
            event.preventDefault()
            event.stopPropagation()
            this.openImageToolbar(event.target)
          }
        })
        
        // 点击其他地方隐藏工具栏
        document.addEventListener('click', (event) => {
          if (!event.target.closest('.image-toolbar') && !event.target.closest('.ql-editor img')) {
            this.hideImageToolbar()
          }
        })
      })
    },

    onEditorChange() {
      // 编辑器内容变化
      this.updateToolbarState()
      
      // 同步内容到 article.content
      if (this.$refs.editor && this.$refs.editor.quill) {
        const content = this.$refs.editor.quill.root.innerHTML
        this.article.content = content
      }
    },

    // 更新工具栏状态
    updateToolbarState() {
      const editor = this.$refs.editor.quill
      if (!editor) return

      const format = editor.getFormat()
      
      // 更新按钮激活状态
      this.$nextTick(() => {
        const buttons = document.querySelectorAll('.toolbar-btn')
        buttons.forEach(btn => {
          const action = btn.getAttribute('data-action')
          const value = btn.getAttribute('data-value')
          
          if (action === 'bold' && format.bold) {
            btn.classList.add('active')
          } else if (action === 'italic' && format.italic) {
            btn.classList.add('active')
          } else if (action === 'underline' && format.underline) {
            btn.classList.add('active')
          } else if (action === 'strike' && format.strike) {
            btn.classList.add('active')
          } else if (action === 'align' && format.align === value) {
            btn.classList.add('active')
          } else if (action === 'list' && format.list === value) {
            btn.classList.add('active')
          } else if (action === 'blockquote' && format.blockquote) {
            btn.classList.add('active')
          } else if (action === 'code-block' && format['code-block']) {
            btn.classList.add('active')
          } else {
            btn.classList.remove('active')
          }
        })
      })
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
                if (range) {
                  editor.insertEmbed(range.index, 'image', imageUrl)
                  editor.setSelection(range.index + 1)
                  
                  // 为新插入的图片添加默认尺寸类
                  this.$nextTick(() => {
                    const images = editor.root.querySelectorAll('img')
                    const lastImage = images[images.length - 1]
                    if (lastImage) {
                      lastImage.classList.add('image-medium')
                    }
                  })
                }
                this.$message.success(`第 ${imageCount} 张图片插入成功`)
              }
            }
          }
        }
      } catch (error) {
        console.error('❌ 处理图片粘贴失败:', error)
        this.$message.error('图片粘贴处理失败')
      }
    },

    // 上传粘贴的图片
    async uploadPastedImage(file) {
      try {
        const formData = new FormData()
        formData.append('image', file)
        
        const response = await apiClient.post('/upload/image', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
        
        if (response.data.status === 'success') {
          return response.data.data.url
        } else {
          throw new Error(response.data.message || '上传失败')
        }
      } catch (error) {
        console.error('❌ 上传图片失败:', error)
        this.$message.error('图片上传失败')
        return null
      }
    },

    // 处理混合内容粘贴（文本+图片）
    async handleMixedContentPaste(event) {
      try {
        console.log('🔄 处理混合内容粘贴')
        const items = event.clipboardData.items
        let textContent = ''
        let imageFiles = []
        
        // 分离文本和图片
        for (let i = 0; i < items.length; i++) {
          const item = items[i]
          if (item.type === 'text/plain') {
            const text = item.getAsString()
            textContent += text
          } else if (item.type.startsWith('image/')) {
            const file = item.getAsFile()
            if (file) {
              imageFiles.push(file)
            }
          }
        }
        
        // 先插入文本
        if (textContent.trim()) {
          const editor = this.$refs.editor.quill
          const range = editor.getSelection()
          if (range) {
            editor.insertText(range.index, textContent)
          }
        }
        
        // 再上传并插入图片
        for (const file of imageFiles) {
          const imageUrl = await this.uploadPastedImage(file)
          if (imageUrl) {
            const editor = this.$refs.editor.quill
            const range = editor.getSelection()
            if (range) {
              editor.insertEmbed(range.index, 'image', imageUrl)
              editor.setSelection(range.index + 1)
              
              // 为新插入的图片添加默认尺寸类
              this.$nextTick(() => {
                const images = editor.root.querySelectorAll('img')
                const lastImage = images[images.length - 1]
                if (lastImage) {
                  lastImage.classList.add('image-medium')
                }
              })
            }
          }
        }
        
        this.$message.success('混合内容粘贴完成')
      } catch (error) {
        console.error('❌ 处理混合内容粘贴失败:', error)
        this.$message.error('混合内容粘贴失败')
      }
    },

    // 处理 Word 文本（只处理文本，忽略图片）
    handleWordTextOnly(event) {
      try {
        console.log('📄 处理 Word 文本')
        const text = event.clipboardData.getData('text/plain')
        if (text.trim()) {
          const editor = this.$refs.editor.quill
          const range = editor.getSelection()
          if (range) {
            editor.insertText(range.index, text)
          }
          this.$message.info('已插入文本内容，图片请单独上传')
        }
      } catch (error) {
        console.error('❌ 处理 Word 文本失败:', error)
        this.$message.error('文本处理失败')
      }
    },

    // 增强的粘贴处理
    handleEnhancedPaste(event, editor) {
      console.log('🔍 增强粘贴处理')
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
        const file = new File([blob], `pasted-image-${Date.now()}`, { type: blob.type })
        
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
            const file = new File([blob], `pasted-image-${Date.now()}-${i}`, { type: blob.type })
            
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

    async saveDraft() {
      console.log('🚀 saveDraft方法被调用')
      
      if (!this.hasContent) {
        this.$message.warning('请输入标题和内容')
        return
      }

      // 如果文章当前是已发布状态，提醒用户
      if (this.article.status === 'published') {
        try {
          await this.$confirm(
            '当前文章是已发布状态，保存草稿会将文章状态改为草稿，文章将不再在列表中显示。确定要保存为草稿吗？',
            '确认保存草稿',
            {
              confirmButtonText: '保存草稿',
              cancelButtonText: '取消',
              type: 'warning'
            }
          )
        } catch {
          // 用户取消
          return
        }
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
        // 自动保存时保持原有状态，不改变文章状态
        const articleData = {
          ...this.article
        }

        if (this.isEdit) {
          await apiClient.put(`/articles/${this.articleId}`, articleData)
          console.log('✅ 自动保存成功，保持状态:', this.article.status)
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

      this.publishDialogVisible = true
    },

    async publishArticle() {
      try {
        this.publishing = true
        
        // 显示发布中的提示
        this.$message.info('正在发布文章，请稍候...')
        
        // 检查内容是否完整
        if (!this.hasContent) {
          this.$message.warning('请输入标题和内容')
          return
        }

        // 检查登录状态
        const token = localStorage.getItem('token')
        const user = localStorage.getItem('user')
        
        console.log('🔐 认证状态检查:', {
          hasToken: !!token,
          hasUser: !!user,
          token: token ? token.substring(0, 20) + '...' : null,
          user: user ? JSON.parse(user).username : null
        })
        
        if (!token || !user) {
          this.$message.warning('请先登录后再发布文章')
          return
        }

        // 直接发布文章，不先保存草稿
        const articleData = {
          ...this.article,
          ...this.publishForm,
          status: 'published',
          publishedAt: new Date()
        }

        console.log('📝 开始发布文章:', articleData)
        console.log('📊 文章数据详情:', {
          title: articleData.title,
          contentLength: articleData.content ? articleData.content.length : 0,
          summary: articleData.summary,
          category: articleData.category,
          tags: articleData.tags,
          status: articleData.status,
          hasContent: this.hasContent
        })
        
        let response
        if (this.isEdit) {
          console.log('📝 更新现有文章:', this.articleId)
          response = await apiClient.put(`/articles/${this.articleId}`, articleData)
        } else {
          console.log('📝 创建新文章')
          response = await apiClient.post('/articles', articleData)
          if (response.status === 'success') {
            this.isEdit = true
            this.articleId = response.data.id
            // 更新路由但不触发导航
            history.replaceState(null, '', `/articles/edit/${this.articleId}`)
          }
        }
        
        if (response.status === 'success') {
          // 显示成功提示并延迟跳转
          this.$message({
            message: '🎉 文章发布成功！正在跳转到文章页面...',
            type: 'success',
            duration: 3000,
            showClose: true
          })
          
          this.publishDialogVisible = false
          
          // 延迟跳转，让用户看到成功提示
          setTimeout(() => {
            this.$router.push(`/articles/${this.articleId}`)
          }, 1500)
        } else {
          // API返回失败状态
          this.$message.error(response.message || '发布失败，请重试')
        }
      } catch (error) {
        console.error('发布文章失败:', error)
        console.error('❌ 错误详情:', {
          status: error.response && error.response.status,
          statusText: error.response && error.response.statusText,
          data: error.response && error.response.data,
          message: error.message,
          config: error.config ? {
            url: error.config.url,
            method: error.config.method,
            headers: error.config.headers
          } : null
        })
        
        // 根据错误类型显示不同的消息
        if (error.response && error.response.status === 413) {
          this.$message.error('文章内容过大，请删减部分内容后重试')
        } else if (error.response && error.response.status === 401) {
          this.$message.error('登录状态异常，请重新登录')
        } else if (error.response && error.response.status === 403) {
          this.$message.error('权限不足，无法发布文章')
        } else if (error.response && error.response.status === 422) {
          this.$message.error('文章格式有误，请检查内容')
        } else if (error.response && error.response.data && error.response.data.message) {
          this.$message.error(error.response.data.message)
        } else {
          this.$message.error('发布文章失败，请检查网络连接后重试')
        }
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
      if (this.hasContent && this.isEdit) {
        this.$confirm('确定要离开吗？未保存的更改将会丢失，但不会影响原文章。', '提示', {
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

    // 创建新文章
    createNewArticle() {
      this.$confirm('确定要创建新文章吗？当前未保存的内容将会丢失。', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.article = {
          title: '',
          author: '',
          content: '',
          summary: '',
          coverImage: '',
          category: '其他',
          tags: [],
          featured: false,
          status: 'draft'
        }
        this.isEdit = false
        this.articleId = null
        this.$router.push('/articles/edit')
      })
    },

    // 显示历史版本
    showHistory() {
      this.$message.info('历史版本功能开发中...')
    },

    // 格式化文本
    formatText(format, value) {
      const editor = this.$refs.editor.quill
      if (!editor) return

      switch (format) {
        case 'bold':
          editor.format('bold', !editor.getFormat().bold)
          break
        case 'italic':
          editor.format('italic', !editor.getFormat().italic)
          break
        case 'underline':
          editor.format('underline', !editor.getFormat().underline)
          break
        case 'strike':
          editor.format('strike', !editor.getFormat().strike)
          break
        case 'color':
          const color = prompt('请输入颜色值（如：#ff0000）')
          if (color) editor.format('color', color)
          break
        case 'background':
          const bgColor = prompt('请输入背景色值（如：#ffff00）')
          if (bgColor) editor.format('background', bgColor)
          break
        case 'align':
          editor.format('align', value)
          break
        case 'list':
          editor.format('list', value)
          break
        case 'indent':
          const currentIndent = editor.getFormat().indent || 0
          editor.format('indent', Math.max(0, currentIndent + value))
          break
        case 'blockquote':
          editor.format('blockquote', !editor.getFormat().blockquote)
          break
        case 'code-block':
          editor.format('code-block', !editor.getFormat()['code-block'])
          break
        case 'clean':
          editor.removeFormat()
          break
      }
      
      // 更新工具栏状态
      this.$nextTick(() => {
        this.updateToolbarState()
      })
    },

    // 插入链接
    insertLink() {
      const url = prompt('请输入链接地址：')
      if (url) {
        const editor = this.$refs.editor.quill
        const range = editor.getSelection()
        if (range) {
          editor.insertEmbed(range.index, 'link', url)
        }
      }
    },

    // 插入视频
    insertVideo() {
      const url = prompt('请输入视频地址：')
      if (url) {
        const editor = this.$refs.editor.quill
        const range = editor.getSelection()
        if (range) {
          editor.insertEmbed(range.index, 'video', url)
        }
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
.wechat-editor {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #fafafa;
}

/* 顶部导航栏 */
.editor-header {
  background: white;
  border-bottom: 1px solid #e4e7ed;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.header-left {
  display: flex;
  align-items: center;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
}

.logo i {
  color: #e03426;
  font-size: 20px;
}

.header-center {
  flex: 1;
  display: flex;
  justify-content: center;
}

.nav-tabs {
  display: flex;
  gap: 0;
  background: #f5f5f5;
  border-radius: 6px;
  padding: 4px;
}

.nav-item {
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  color: #666;
  transition: all 0.3s ease;
}



.header-right {
  display: flex;
  gap: 12px;
}

/* 主要内容区域 */
.editor-main {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* 左侧预览区 */
.preview-panel {
  width: 320px;
  background: white;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.05);
}

.preview-header {
  padding: 20px;
  border-bottom: 1px solid #e4e7ed;
}

.account-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.account-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #e03426;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
}

.account-name {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
}

.preview-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.article-preview {
  background: #f8f9fa;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e4e7ed;
}

.preview-cover {
  width: 100%;
  height: 160px;
  overflow: hidden;
}

.preview-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-title {
  padding: 16px;
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  line-height: 1.4;
  border-bottom: 1px solid #e4e7ed;
}

.preview-summary {
  padding: 12px 16px;
  font-size: 14px;
  color: #666;
  line-height: 1.5;
  border-bottom: 1px solid #e4e7ed;
}

.preview-meta {
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #999;
}

.preview-placeholder {
  text-align: center;
  padding: 60px 20px;
  color: #999;
}

.preview-placeholder i {
  font-size: 48px;
  margin-bottom: 16px;
  color: #ddd;
}

.preview-hint {
  font-size: 12px;
  margin-top: 8px;
}

.preview-actions {
  padding: 20px;
  border-top: 1px solid #e4e7ed;
  display: flex;
  gap: 12px;
}

/* 右侧编辑区 */
.edit-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: white;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.05);
}

.edit-header {
  padding: 16px 20px;
  border-bottom: 1px solid #e4e7ed;
  background: #f8f9fa;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.edit-tabs {
  display: flex;
  gap: 0;
  flex-shrink: 0;
}

.edit-toolbar {
  display: flex;
  align-items: center;
  gap: 20px;
  flex: 1;
}

.edit-tab {
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  color: #666;
  transition: all 0.3s ease;
  font-weight: 500;
}

.edit-tab.active {
  background: white;
  color: #e03426;
  box-shadow: 0 2px 8px rgba(224, 52, 38, 0.15);
}

.edit-tab:hover:not(.active) {
  color: #e03426;
  background: rgba(224, 52, 38, 0.05);
}

.edit-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  background: #fafafa;
}

/* 标题输入 */
.title-section {
  margin-bottom: 20px;
}

.title-input >>> .el-input__inner {
  border: none;
  font-size: 24px;
  font-weight: 600;
  line-height: 1.2;
  color: #2c3e50;
  padding: 12px 0;
  background: transparent;
  border-bottom: 2px solid #e03426;
}

.title-input >>> .el-input__inner:focus {
  border-bottom-color: #e03426;
  box-shadow: none;
}

.title-input >>> .el-input__inner::placeholder {
  color: #c0c4cc;
  font-weight: 400;
}

/* 作者输入 */
.author-section {
  margin-bottom: 20px;
}

.author-input >>> .el-input__inner {
  border: none;
  font-size: 14px;
  color: #666;
  padding: 8px 0;
  background: transparent;
  border-bottom: 1px solid #e4e7ed;
}

.author-input >>> .el-input__inner:focus {
  border-bottom-color: #e03426;
  box-shadow: none;
}

/* 封面图片 */
.cover-section {
  margin-bottom: 20px;
}

.cover-upload {
  border: 2px dashed #d3dce6;
  border-radius: 8px;
  padding: 30px;
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
  margin: 6px 0;
  color: #606266;
}

.upload-hint {
  font-size: 12px;
  color: #909399;
}

.cover-preview {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e4e7ed;
}

.cover-preview img {
  width: 100%;
  height: 180px;
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
  margin-bottom: 20px;
}

.summary-input >>> .el-textarea__inner {
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  font-size: 14px;
  line-height: 1.6;
  resize: none;
  padding: 12px;
}

.summary-input >>> .el-textarea__inner:focus {
  border-color: #e03426;
  box-shadow: 0 0 0 2px rgba(224, 52, 38, 0.1);
}

/* 富文本编辑器 */
.content-section {
  margin-bottom: 20px;
}

.toolbar-group {
  display: flex;
  gap: 4px;
  align-items: center;
}

.toolbar-btn {
  width: 40px;
  height: 40px;
  border: 1px solid #e4e7ed;
  background: white;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 16px;
  color: #666;
  transition: all 0.2s ease;
}

.toolbar-btn:hover {
  background: #f5f5f5;
  border-color: #e03426;
  color: #e03426;
}

.toolbar-btn.active {
  background: #e03426;
  color: white;
  border-color: #e03426;
}

.toolbar-btn i {
  font-size: 16px;
}

.toolbar-btn strong,
.toolbar-btn em,
.toolbar-btn u {
  font-size: 16px;
  font-weight: bold;
}

.color-icon {
  background: linear-gradient(45deg, #ff0000, #00ff00, #0000ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.bg-icon {
  background: #ffff00;
  color: #333;
  padding: 2px 4px;
  border-radius: 2px;
}

.content-editor {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e4e7ed;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.content-editor >>> .ql-container {
  border: none;
  font-size: 16px;
  line-height: 1.8;
  min-height: 300px;
}

.content-editor >>> .ql-editor {
  min-height: 300px;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

.content-editor >>> .ql-editor.ql-blank::before {
  color: #c0c4cc;
  font-style: normal;
}

.content-editor >>> .ql-editor:focus {
  border-color: #e03426;
  box-shadow: 0 0 0 2px rgba(224, 52, 38, 0.1);
}

/* 图片调整样式 */
.content-editor >>> .ql-editor img {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;
}

.content-editor >>> .ql-editor img:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* 图片尺寸类 */
.content-editor >>> .ql-editor img.image-small {
  max-width: 200px;
  width: 200px;
}

.content-editor >>> .ql-editor img.image-medium {
  max-width: 400px;
  width: 400px;
}

.content-editor >>> .ql-editor img.image-large {
  max-width: 600px;
  width: 600px;
}

.content-editor >>> .ql-editor img.image-full {
  max-width: 100% !important;
  width: 100% !important;
  height: auto !important;
  display: block !important;
  margin: 0 auto !important;
}

/* 图片工具栏样式 */
.image-toolbar {
  position: fixed;
  z-index: 9999;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border: 1px solid #e4e7ed;
  min-width: 280px;
}

.image-toolbar-content {
  padding: 16px;
}

.image-toolbar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e4e7ed;
}

.image-toolbar-header span {
  font-weight: 600;
  color: #2c3e50;
}

.image-toolbar-header i {
  cursor: pointer;
  color: #999;
  font-size: 16px;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.image-toolbar-header i:hover {
  color: #e03426;
  background: #f5f5f5;
}

.image-toolbar-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.image-size-options {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.size-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
}

.size-option:hover {
  background: #f5f5f5;
}

.size-option.active {
  background: rgba(224, 52, 38, 0.1);
  border-color: #e03426;
}

.size-option span {
  font-size: 12px;
  color: #666;
  text-align: center;
}

.size-option.active span {
  color: #e03426;
  font-weight: 500;
}

.size-preview {
  width: 40px;
  height: 30px;
  border: 2px solid #e4e7ed;
  border-radius: 4px;
  background: #f8f9fa;
}

.size-option.active .size-preview {
  border-color: #e03426;
}

.size-preview.small {
  width: 20px;
}

.size-preview.medium {
  width: 30px;
}

.size-preview.large {
  width: 35px;
}

.size-preview.full {
  width: 40px;
}

.image-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.content-editor >>> .ql-editor .ql-video {
  max-width: 100%;
  border-radius: 4px;
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
@media (max-width: 1200px) {
  .preview-panel {
    width: 280px;
  }
}

@media (max-width: 768px) {
  .wechat-editor {
    height: auto;
  }
  
  .editor-main {
    flex-direction: column;
  }
  
  .preview-panel {
    width: 100%;
    height: 300px;
  }
  
  .edit-content {
    padding: 15px;
  }
  
  .edit-header {
    flex-direction: column;
    gap: 16px;
    padding: 12px 15px;
  }
  
  .edit-toolbar {
    justify-content: center;
    gap: 12px;
  }
  
  .toolbar-btn {
    width: 36px;
    height: 36px;
    font-size: 14px;
  }
  
  .edit-tabs {
    justify-content: center;
  }
  
  .title-input >>> .el-input__inner {
    font-size: 20px;
  }
  
  .content-editor >>> .ql-editor {
    min-height: 250px;
    padding: 15px;
  }
  
  .cover-upload {
    padding: 20px;
  }
  
  .nav-tabs {
    display: none;
  }
}
</style> 