<template>
  <el-dialog
    :visible.sync="visible"
    :title="isLogin ? '用户登录' : '用户注册'"
    width="400px"
    @close="resetForm"
  >
    <!-- 登录表单 -->
    <el-form
      v-if="isLogin"
      :model="loginForm"
      :rules="loginRules"
      ref="loginFormRef"
      label-width="80px"
    >
      <el-form-item label="用户名" prop="username">
        <el-input
          v-model="loginForm.username"
          placeholder="请输入用户名或邮箱"
          prefix-icon="el-icon-user"
        />
      </el-form-item>
      <el-form-item label="密码" prop="password">
        <el-input
          v-model="loginForm.password"
          type="password"
          placeholder="请输入密码"
          prefix-icon="el-icon-lock"
          show-password
        />
      </el-form-item>
    </el-form>

    <!-- 注册表单 -->
    <el-form
      v-else
      :model="registerForm"
      :rules="registerRules"
      ref="registerFormRef"
      label-width="80px"
    >
      <el-form-item label="用户名" prop="username">
        <el-input
          v-model="registerForm.username"
          placeholder="请输入用户名"
          prefix-icon="el-icon-user"
          maxlength="50"
          show-word-limit
        />
      </el-form-item>
      <el-form-item label="邮箱" prop="email">
        <el-input
          v-model="registerForm.email"
          placeholder="请输入邮箱地址"
          prefix-icon="el-icon-message"
        />
      </el-form-item>
      <el-form-item label="密码" prop="password">
        <el-input
          v-model="registerForm.password"
          type="password"
          placeholder="请输入密码（至少6位）"
          prefix-icon="el-icon-lock"
          show-password
        />
      </el-form-item>
      <el-form-item label="确认密码" prop="confirmPassword">
        <el-input
          v-model="registerForm.confirmPassword"
          type="password"
          placeholder="请确认密码"
          prefix-icon="el-icon-lock"
          show-password
        />
      </el-form-item>
    </el-form>

    <!-- 按钮区域 -->
    <div slot="footer" class="dialog-footer">
      <div class="auth-switch">
        <span v-if="isLogin">
          还没有账号？
          <el-button type="text" @click="switchMode">立即注册</el-button>
        </span>
        <span v-else>
          已有账号？
          <el-button type="text" @click="switchMode">立即登录</el-button>
        </span>
      </div>
      <div class="auth-buttons">
        <el-button @click="closeDialog">取消</el-button>
        <el-button
          type="primary"
          @click="handleSubmit"
          :loading="loading"
        >
          {{ isLogin ? '登录' : '注册' }}
        </el-button>
      </div>
    </div>
  </el-dialog>
</template>

<script>
import axios from 'axios'

export default {
  name: 'AuthDialog',
  props: {
    show: {
      type: Boolean,
      default: false
    },
    mode: {
      type: String,
      default: 'login' // 'login' or 'register'
    }
  },
  data() {
    // 确认密码验证器
    const validateConfirmPassword = (rule, value, callback) => {
      if (value !== this.registerForm.password) {
        callback(new Error('两次输入的密码不一致'))
      } else {
        callback()
      }
    }

    return {
      visible: false,
      isLogin: true,
      loading: false,
      loginForm: {
        username: '',
        password: ''
      },
      registerForm: {
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
      },
      loginRules: {
        username: [
          { required: true, message: '请输入用户名或邮箱', trigger: 'blur' }
        ],
        password: [
          { required: true, message: '请输入密码', trigger: 'blur' }
        ]
      },
      registerRules: {
        username: [
          { required: true, message: '请输入用户名', trigger: 'blur' },
          { min: 3, max: 50, message: '用户名长度在 3 到 50 个字符', trigger: 'blur' }
        ],
        email: [
          { required: true, message: '请输入邮箱地址', trigger: 'blur' },
          { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }
        ],
        password: [
          { required: true, message: '请输入密码', trigger: 'blur' },
          { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
        ],
        confirmPassword: [
          { required: true, message: '请确认密码', trigger: 'blur' },
          { validator: validateConfirmPassword, trigger: 'blur' }
        ]
      }
    }
  },
  watch: {
    show(newVal) {
      this.visible = newVal
    },
    visible(newVal) {
      this.$emit('update:show', newVal)
    },
    mode(newVal) {
      this.isLogin = newVal === 'login'
    }
  },
  mounted() {
    this.visible = this.show
    this.isLogin = this.mode === 'login'
  },
  methods: {
    switchMode() {
      this.isLogin = !this.isLogin
      this.resetForm()
    },
    
    closeDialog() {
      this.visible = false
      this.resetForm()
    },
    
    resetForm() {
      this.loginForm = {
        username: '',
        password: ''
      }
      this.registerForm = {
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
      }
      
      // 清除表单验证状态
      this.$nextTick(() => {
        if (this.$refs.loginFormRef) {
          this.$refs.loginFormRef.clearValidate()
        }
        if (this.$refs.registerFormRef) {
          this.$refs.registerFormRef.clearValidate()
        }
      })
    },
    
    async handleSubmit() {
      if (this.isLogin) {
        await this.handleLogin()
      } else {
        await this.handleRegister()
      }
    },
    
    async handleLogin() {
      try {
        const valid = await this.$refs.loginFormRef.validate()
        if (!valid) return
        
        this.loading = true
        
        const response = await axios.post('/api/auth/login', this.loginForm)
        
        if (response.data.status === 'success') {
          // 保存token和用户信息
          localStorage.setItem('token', response.data.data.token)
          localStorage.setItem('user', JSON.stringify(response.data.data.user))
          
          this.$message.success('登录成功！')
          this.$emit('login-success', response.data.data)
          this.closeDialog()
        } else {
          this.$message.error(response.data.message || '登录失败')
        }
      } catch (error) {
        console.error('登录失败:', error)
        const message = (error.response && error.response.data && error.response.data.message) || '登录失败，请稍后重试'
        this.$message.error(message)
      } finally {
        this.loading = false
      }
    },
    
    async handleRegister() {
      try {
        const valid = await this.$refs.registerFormRef.validate()
        if (!valid) return
        
        this.loading = true
        
        const response = await axios.post('/api/auth/register', {
          username: this.registerForm.username,
          email: this.registerForm.email,
          password: this.registerForm.password
        })
        
        if (response.data.status === 'success') {
          // 保存token和用户信息
          localStorage.setItem('token', response.data.data.token)
          localStorage.setItem('user', JSON.stringify(response.data.data.user))
          
          this.$message.success('注册成功！欢迎加入！')
          this.$emit('login-success', response.data.data)
          this.closeDialog()
        } else {
          this.$message.error(response.data.message || '注册失败')
        }
      } catch (error) {
        console.error('注册失败:', error)
        const message = (error.response && error.response.data && error.response.data.message) || '注册失败，请稍后重试'
        this.$message.error(message)
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.auth-switch {
  color: #666;
  font-size: 14px;
}

.auth-buttons {
  display: flex;
  gap: 10px;
}

.form-tip {
  color: #999;
  font-size: 12px;
  margin-left: 10px;
}

/* 自定义输入框样式 */
.el-input {
  margin-bottom: 5px;
}

/* 响应式设计 */
@media (max-width: 480px) {
  .el-dialog {
    width: 90%;
    margin: 0 auto;
  }
  
  .dialog-footer {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
  }
  
  .auth-switch {
    text-align: center;
  }
  
  .auth-buttons {
    justify-content: center;
  }
}
</style> 