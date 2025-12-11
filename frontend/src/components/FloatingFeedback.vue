<template>
  <div class="floating-feedback">
    <!-- 悬浮按钮 -->
    <div 
      class="feedback-button" 
      @click="showDialog = true"
      :class="{ 'pulse': !showDialog }"
    >
      <i class="el-icon-edit-outline"></i>
      <span class="button-text">意见反馈</span>
    </div>

    <!-- 反馈对话框 -->
    <el-dialog
      title="网站优化意见"
      :visible.sync="showDialog"
      width="500px"
      :close-on-click-modal="true"
      :close-on-press-escape="true"
      :modal="true"
      :modal-append-to-body="true"
      :append-to-body="true"
      :lock-scroll="true"
      class="feedback-dialog"
    >
      <div class="feedback-form">
        <p class="form-description">
          我们非常重视您的意见，请告诉我们您对网站的建议和想法：
        </p>
        
        <el-form :model="form" :rules="rules" ref="feedbackForm" label-width="0">
          <el-form-item prop="content">
            <el-input
              type="textarea"
              :rows="6"
              v-model="form.content"
              placeholder="请输入您的优化意见（至少5个字符）"
              maxlength="2000"
              show-word-limit
              :disabled="submitting"
            ></el-input>
          </el-form-item>
        </el-form>

        <div class="form-footer">
          <el-button @click="showDialog = false" :disabled="submitting">取消</el-button>
          <el-button 
            type="primary" 
            @click="submitFeedback" 
            :loading="submitting"
          >
            提交
          </el-button>
        </div>
      </div>
    </el-dialog>

    <!-- 成功提示 -->
    <el-dialog
      title="提交成功"
      :visible.sync="showSuccessDialog"
      width="400px"
      :close-on-click-modal="true"
      :modal="true"
      :modal-append-to-body="true"
      :append-to-body="true"
    >
      <div class="success-content">
        <i class="el-icon-success success-icon"></i>
        <p class="success-message">{{ successMessage }}</p>
        <el-button type="primary" @click="handleSuccessClose">确定</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { submitWebComment } from '@/api/webComments'
import { mapState } from 'vuex'

export default {
  name: 'FloatingFeedback',
  data() {
    return {
      showDialog: false,
      showSuccessDialog: false,
      submitting: false,
      successMessage: '',
      form: {
        content: ''
      },
      rules: {
        content: [
          { required: true, message: '请输入优化意见', trigger: 'blur' },
          { min: 5, message: '意见内容至少需要5个字符', trigger: 'blur' },
          { max: 2000, message: '意见内容不能超过2000个字符', trigger: 'blur' }
        ]
      }
    }
  },
  computed: {
    ...mapState(['user', 'isAuthenticated'])
  },
  methods: {
    async submitFeedback() {
      try {
        // 验证表单
        await this.$refs.feedbackForm.validate()
        
        if (!this.form.content || this.form.content.trim().length < 5) {
          this.$message.warning('请输入至少5个字符的意见内容')
          return
        }

        this.submitting = true

        // 准备提交数据
        const submitData = {
          content: this.form.content.trim(),
          userId: this.isAuthenticated && this.user ? this.user.id : null,
          userAgent: navigator.userAgent,
          pageUrl: window.location.href,
          timestamp: new Date().toISOString()
        }

        // 提交到后端
        const response = await submitWebComment(submitData)

        // apiClient 的响应拦截器已经返回了 response.data，所以这里直接使用 response
        if (response && response.status === 'success') {
          this.successMessage = response.message || '意见提交成功，非常感谢您的建议！'
          this.showDialog = false
          this.showSuccessDialog = true
          
          // 触发事件通知父组件
          this.$emit('feedback-submitted', {
            id: response.data.id,
            submittedAt: response.data.submittedAt
          })
          
          // 重置表单
          this.form.content = ''
          this.$refs.feedbackForm.clearValidate()
        } else {
          this.$message.error(response?.message || '提交失败，请稍后重试')
        }
      } catch (error) {
        console.error('提交反馈失败:', error)
        if (error.response && error.response.data && error.response.data.message) {
          this.$message.error(error.response.data.message)
        } else {
          this.$message.error('提交失败，请稍后重试')
        }
      } finally {
        this.submitting = false
      }
    },
    handleSuccessClose() {
      this.showSuccessDialog = false
      // 如果当前不在首页，则跳转到首页
      if (this.$route.path !== '/') {
        this.$router.push('/')
      }
    }
  }
}
</script>

<style scoped>
.floating-feedback {
  position: fixed;
  bottom: 30px;
  right: 30px;
  z-index: 1000;
}

.feedback-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  cursor: pointer;
  transition: all 0.3s ease;
  color: white;
  font-size: 24px;
  position: relative;
  overflow: visible;
}

.feedback-button:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
}

.feedback-button.pulse {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }
  50% {
    box-shadow: 0 4px 20px rgba(102, 126, 234, 0.8);
  }
  100% {
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }
}

.feedback-button .button-text {
  position: absolute;
  right: 70px;
  white-space: nowrap;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 14px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}

.feedback-button:hover .button-text {
  opacity: 1;
}

.feedback-dialog ::v-deep .el-dialog__header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  margin: 0;
}

.feedback-dialog ::v-deep .el-dialog__title {
  color: white;
  font-size: 18px;
  font-weight: 600;
}

.feedback-dialog ::v-deep .el-dialog__headerbtn .el-dialog__close {
  color: white;
  font-size: 20px;
}

.feedback-dialog ::v-deep .el-dialog__body {
  padding: 30px;
  position: relative;
  z-index: 1;
}

/* 确保 Dialog 可以正常交互 */
.feedback-dialog ::v-deep .el-dialog__wrapper {
  z-index: 2000 !important;
}

.feedback-dialog ::v-deep .el-dialog {
  z-index: 2001 !important;
  position: relative;
}

.feedback-dialog ::v-deep .v-modal {
  z-index: 1999 !important;
  background-color: rgba(0, 0, 0, 0.5) !important;
}

/* 确保表单元素可以正常交互 */
.feedback-dialog ::v-deep .el-textarea__inner {
  pointer-events: auto !important;
  cursor: text !important;
}

.feedback-dialog ::v-deep .el-input__inner {
  pointer-events: auto !important;
  cursor: text !important;
}

.feedback-dialog ::v-deep .el-button {
  pointer-events: auto !important;
  cursor: pointer !important;
}

.feedback-form {
  width: 100%;
  position: relative;
  z-index: 1;
}

.form-description {
  color: #666;
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 20px;
}

.form-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}

.success-content {
  text-align: center;
  padding: 20px 0;
}

.success-icon {
  font-size: 64px;
  color: #67c23a;
  margin-bottom: 20px;
}

.success-message {
  font-size: 16px;
  color: #333;
  margin-bottom: 30px;
  line-height: 1.6;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .floating-feedback {
    bottom: 20px;
    right: 20px;
  }

  .feedback-button {
    width: 50px;
    height: 50px;
    font-size: 20px;
  }

  .feedback-button .button-text {
    display: none;
  }

  .feedback-dialog ::v-deep .el-dialog {
    width: 90% !important;
    margin: 0 auto;
  }
}
</style>
