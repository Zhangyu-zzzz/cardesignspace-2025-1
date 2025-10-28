<template>
  <div class="floating-feedback">
    <!-- 悬浮按钮 -->
    <div 
      class="feedback-trigger" 
      :class="{ 'active': isOpen }"
      @click="toggleFeedback"
      v-if="!isOpen"
    >
      <i class="el-icon-chat-dot-round"></i>
      <span class="feedback-text">意见反馈</span>
    </div>

    <!-- 留言面板 -->
    <div class="feedback-panel" v-if="isOpen">
      <div class="panel-header">
        <h3>💬 网站体验反馈</h3>
        <button class="close-btn" @click="closeFeedback">
          <i class="el-icon-close"></i>
        </button>
      </div>
      
      <div class="panel-content">
        <el-form :model="feedbackForm" :rules="rules" ref="feedbackForm" label-width="90px">
          <!-- 联系方式 -->
          <el-form-item label="联系方式" prop="contact">
            <el-input
              v-model="feedbackForm.contact"
              placeholder="邮箱或QQ（可选，便于我们回复）"
              maxlength="50"
              show-word-limit
            ></el-input>
          </el-form-item>

          <!-- 详细反馈 -->
          <el-form-item label="详细反馈" prop="content">
            <el-input
              type="textarea"
              v-model="feedbackForm.content"
              placeholder="请详细描述您的建议或遇到的问题..."
              :rows="5"
              maxlength="500"
              show-word-limit
            ></el-input>
          </el-form-item>

          <!-- 满意度评分 -->
          <el-form-item label="满意度" prop="rating">
            <el-rate
              v-model="feedbackForm.rating"
              :max="5"
              :colors="['#99A9BF', '#F7BA2A', '#FF9900']"
              show-text
              :texts="['很差', '较差', '一般', '满意', '非常满意']"
            ></el-rate>
          </el-form-item>

          <!-- 提交按钮 -->
          <el-form-item style="margin-top: 30px;">
            <div style="text-align: center;">
              <el-button 
                type="primary" 
                @click="submitFeedback" 
                :loading="submitting"
                style="width: 200px; font-size: 16px; padding: 12px 0;"
              >
                {{ submitting ? '提交中...' : '提交反馈' }}
              </el-button>
            </div>
          </el-form-item>
        </el-form>
      </div>
    </div>

    <!-- 成功提示 -->
    <el-dialog
      title="反馈提交成功"
      :visible.sync="showSuccessDialog"
      width="400px"
      center
    >
      <div style="text-align: center; padding: 20px;">
        <i class="el-icon-success" style="font-size: 48px; color: #67C23A; margin-bottom: 16px;"></i>
        <p>感谢您的宝贵建议！我们会认真考虑您的反馈。</p>
        <p style="color: #909399; font-size: 14px; margin-top: 8px;">
          如有联系方式，我们会在3个工作日内回复。
        </p>
      </div>
      <span slot="footer" class="dialog-footer">
        <el-button type="primary" @click="showSuccessDialog = false">确定</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { submitFeedback } from '@/api/feedback'

export default {
  name: 'FloatingFeedback',
  data() {
    return {
      isOpen: false,
      submitting: false,
      showSuccessDialog: false,
      feedbackForm: {
        type: 'other', // 默认为其他类型
        rating: 5,
        contact: '',
        content: ''
      },
      rules: {
        content: [
          { required: true, message: '请输入详细反馈内容', trigger: 'blur' },
          { min: 10, message: '反馈内容至少10个字符', trigger: 'blur' }
        ],
        contact: [
          { 
            validator: (rule, value, callback) => {
              // 如果为空，则通过验证（可选字段）
              if (!value || value.trim() === '') {
                callback();
                return;
              }
              // 如果有值，则验证格式
              const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
              const qqRegex = /^\d{5,11}$/;
              if (emailRegex.test(value) || qqRegex.test(value)) {
                callback();
              } else {
                callback(new Error('请输入有效的邮箱或QQ号'));
              }
            },
            trigger: 'blur'
          }
        ]
      }
    }
  },
  methods: {
    toggleFeedback() {
      this.isOpen = !this.isOpen
      if (this.isOpen) {
        // 重置表单
        this.resetForm()
      }
    },
    
    closeFeedback() {
      this.isOpen = false
      this.resetForm()
    },
    
    resetForm() {
      this.feedbackForm = {
        type: 'other', // 默认类型
        rating: 5,
        contact: '',
        content: ''
      }
      if (this.$refs.feedbackForm) {
        this.$refs.feedbackForm.clearValidate()
      }
    },
    
    async submitFeedback() {
      let feedbackData = null
      try {
        // 表单验证
        const valid = await this.$refs.feedbackForm.validate()
        if (!valid) return
        
        this.submitting = true
        
        // 获取用户信息
        const userInfo = this.$store.getters.user
        feedbackData = {
          ...this.feedbackForm,
          type: this.feedbackForm.type || 'other', // 确保 type 不为空
          userId: userInfo ? userInfo.id : null,
          userAgent: navigator.userAgent,
          pageUrl: window.location.href,
          timestamp: new Date().toISOString()
        }
        
        // 提交反馈
        console.log('准备提交的反馈数据:', feedbackData)
        const response = await submitFeedback(feedbackData)
        console.log('提交成功响应:', response)
        
        // 显示成功提示
        this.showSuccessDialog = true
        this.closeFeedback()
        
        // 发送统计事件
        this.$emit('feedback-submitted', feedbackData)
        
      } catch (error) {
        console.error('提交反馈失败:', error)
        console.error('错误详情:', error.response?.data)
        if (feedbackData) {
          console.error('发送的数据:', feedbackData)
        }
        const errorMsg = error.response?.data?.message || '提交失败，请稍后重试'
        this.$message.error(errorMsg)
      } finally {
        this.submitting = false
      }
    },
    
    handleKeydown(event) {
      // ESC键关闭面板
      if (event.key === 'Escape' && this.isOpen) {
        this.closeFeedback()
      }
    }
  },
  
  mounted() {
    // 添加键盘事件监听
    document.addEventListener('keydown', this.handleKeydown)
  },
  
  beforeDestroy() {
    // 移除键盘事件监听
    document.removeEventListener('keydown', this.handleKeydown)
  }
}
</script>

<style scoped>
.floating-feedback {
  position: fixed;
  bottom: 30px;
  right: 30px;
  z-index: 9999;
}

.feedback-trigger {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 12px 16px;
  border-radius: 25px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  user-select: none;
}

.feedback-trigger:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
}

.feedback-trigger.active {
  background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
}

.feedback-trigger i {
  font-size: 18px;
}

.feedback-panel {
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  width: 400px;
  max-height: 80vh;
  overflow: hidden;
  animation: slideInUp 0.3s ease-out;
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.panel-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 18px;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.close-btn:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.panel-content {
  padding: 20px;
  max-height: calc(80vh - 80px);
  overflow-y: auto;
}

.panel-content .el-form-item {
  margin-bottom: 20px;
}

.panel-content .el-form-item:last-child {
  margin-bottom: 0;
}

/* 满意度评分对齐 */
.panel-content >>> .el-rate {
  display: flex;
  align-items: center;
  height: 40px;
}

.panel-content >>> .el-rate__text {
  margin-left: 10px;
  line-height: 1;
  vertical-align: middle;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .floating-feedback {
    bottom: 20px;
    right: 20px;
  }
  
  .feedback-panel {
    width: calc(100vw - 40px);
    max-width: 400px;
  }
  
  .feedback-trigger .feedback-text {
    display: none;
  }
  
  .feedback-trigger {
    padding: 12px;
    border-radius: 50%;
  }
}

/* 滚动条样式 */
.panel-content::-webkit-scrollbar {
  width: 6px;
}

.panel-content::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.panel-content::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.panel-content::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
