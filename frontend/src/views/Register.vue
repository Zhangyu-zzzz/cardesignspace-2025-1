<template>
  <div class="register-container">
    <div class="register-card">
      <h2>用户注册</h2>
      <el-alert
        v-if="error"
        :title="error"
        type="error"
        show-icon
        :closable="false"
        style="margin-bottom: 20px;"
      ></el-alert>
      <el-form
        ref="registerForm"
        :model="registerForm"
        :rules="rules"
        label-position="top"
        @submit.native.prevent="handleRegister"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model="registerForm.username" placeholder="请输入用户名"></el-input>
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="registerForm.email" placeholder="请输入邮箱"></el-input>
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="registerForm.password" type="password" placeholder="请输入密码"></el-input>
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input v-model="registerForm.confirmPassword" type="password" placeholder="请再次输入密码"></el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" native-type="submit" :loading="loading" style="width: 100%;">注册</el-button>
        </el-form-item>
      </el-form>
      <div class="form-footer">
        <span>已有账号？</span>
        <router-link to="/login">立即登录</router-link>
      </div>
    </div>
  </div>
</template>

<script>
import { authAPI } from '@/services/api';
import { mapActions } from 'vuex';

export default {
  name: 'Register',
  data() {
    // 密码一致性验证
    const validateConfirmPassword = (rule, value, callback) => {
      if (value !== this.registerForm.password) {
        callback(new Error('两次输入的密码不一致'));
      } else {
        callback();
      }
    };
    
    return {
      registerForm: {
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
      },
      rules: {
        username: [
          { required: true, message: '请输入用户名', trigger: 'blur' },
          { min: 3, max: 20, message: '用户名长度应为3-20个字符', trigger: 'blur' }
        ],
        email: [
          { required: true, message: '请输入邮箱', trigger: 'blur' },
          { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
        ],
        password: [
          { required: true, message: '请输入密码', trigger: 'blur' },
          { min: 6, message: '密码长度不能少于6个字符', trigger: 'blur' }
        ],
        confirmPassword: [
          { required: true, message: '请再次输入密码', trigger: 'blur' },
          { validator: validateConfirmPassword, trigger: 'blur' }
        ]
      },
      loading: false,
      error: ''
    };
  },
  methods: {
    ...mapActions(['login']),
    async handleRegister() {
      try {
        // 表单验证
        await this.$refs.registerForm.validate();
        
        this.loading = true;
        this.error = '';
        
        console.log('开始注册请求，数据:', {
          username: this.registerForm.username,
          email: this.registerForm.email,
          password: '******'  // 不记录实际密码
        });
        
        // 准备要发送的数据
        const userData = {
          username: this.registerForm.username,
          email: this.registerForm.email,
          password: this.registerForm.password
        };
        
        // 调用注册API
        const response = await authAPI.register(userData);
        
        console.log('注册API响应:', response);
        
        if (response.success) {
          // 注册成功，自动登录
          this.login({
            user: response.data.user,
            token: response.data.token
          });
          
          // 将token保存到localStorage
          localStorage.setItem('token', response.data.token);
          
          // 注册成功后直接跳转到个人主页
          this.$router.push('/profile');
          
          // 提示注册成功
          this.$message.success('注册成功');
        } else {
          console.error('注册失败，响应:', response);
          this.error = response.message || '注册失败';
        }
      } catch (error) {
        console.error('注册错误详情:', error);
        if (error.response) {
          console.error('服务器响应错误:', {
            status: error.response.status,
            data: error.response.data,
            headers: error.response.headers
          });
          this.error = error.response.data.message || '注册失败，请检查表单信息';
        } else if (error.request) {
          console.error('未收到响应:', error.request);
          this.error = '注册请求未收到响应，请检查网络连接';
        } else {
          console.error('请求配置错误:', error.message);
          this.error = '注册时发生错误，请稍后再试';
        }
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style scoped>
.register-container {
  min-height: 100vh;
  background: #f8f9fa;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif;
}

.register-card {
  background: white;
  padding: 40px;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid #e4e7ed;
  width: 100%;
  max-width: 400px;
}

h2 {
  text-align: center;
  color: #333;
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 30px;
}

.form-footer {
  margin-top: 20px;
  text-align: center;
  font-size: 14px;
  color: #606266;
}

.form-footer a {
  color: #e03426;
  text-decoration: none;
  margin-left: 5px;
}

.form-item {
  margin-bottom: 20px;
}

.form-item label {
  display: block;
  margin-bottom: 8px;
  color: #606266;
  font-weight: 500;
  font-size: 14px;
}

.form-item input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.3s ease;
  background: #fff;
}

.form-item input:focus {
  border-color: #e03426;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
  outline: none;
}

.register-btn {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #e03426, #67C23A);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

.register-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(64, 158, 255, 0.4);
}

.register-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.login-link {
  text-align: center;
  margin-top: 20px;
  color: #606266;
  font-size: 14px;
}

.login-link a {
  color: #e03426;
  text-decoration: none;
  font-weight: 500;
}

.login-link a:hover {
  color: #67C23A;
}

@media (max-width: 480px) {
  .register-card {
    padding: 30px 20px;
    margin: 20px;
    border-radius: 12px;
  }
  
  h2 {
    font-size: 20px;
    margin-bottom: 24px;
  }
}
</style> 