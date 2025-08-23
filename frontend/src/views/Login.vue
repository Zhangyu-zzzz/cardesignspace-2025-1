<template>
  <div class="login-container">
    <div class="login-card">
      <h2>用户登录</h2>
      <el-alert
        v-if="error"
        :title="error"
        type="error"
        show-icon
        :closable="false"
        style="margin-bottom: 20px;"
      ></el-alert>
      <el-form
        ref="loginForm"
        :model="loginForm"
        :rules="rules"
        label-position="top"
        @submit.native.prevent="handleLogin"
      >
        <el-form-item label="用户名/邮箱" prop="username">
          <el-input v-model="loginForm.username" placeholder="请输入用户名或邮箱"></el-input>
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="loginForm.password" type="password" placeholder="请输入密码"></el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" native-type="submit" :loading="loading" style="width: 100%;">登录</el-button>
        </el-form-item>
      </el-form>
      <div class="form-footer">
        <span>还没有账号？</span>
        <router-link to="/register">立即注册</router-link>
      </div>
    </div>
  </div>
</template>

<script>
import { authAPI } from '@/services/api';
import { mapActions } from 'vuex';

export default {
  name: 'Login',
  data() {
    return {
      loginForm: {
        username: '',
        password: ''
      },
      rules: {
        username: [
          { required: true, message: '请输入用户名或邮箱', trigger: 'blur' }
        ],
        password: [
          { required: true, message: '请输入密码', trigger: 'blur' },
          { min: 6, message: '密码长度不能少于6个字符', trigger: 'blur' }
        ]
      },
      loading: false,
      error: ''
    };
  },
  methods: {
    ...mapActions(['login']),
    async handleLogin() {
      try {
        // 表单验证
        await this.$refs.loginForm.validate();
        
        this.loading = true;
        this.error = '';
        
        console.log('开始登录请求，数据:', this.loginForm);
        
        // 调用登录API
        const response = await authAPI.login(this.loginForm);
        
        console.log('登录API响应:', response);
        
        if (response.status === 'success') {
          // 更新Vuex中的认证状态
          this.login({
            user: response.data.user,
            token: response.data.token
          });
          
          // 将token保存到localStorage
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('user', JSON.stringify(response.data.user));
          
          // 提示登录成功
          this.$message.success('登录成功！');
          
          // 登录成功后跳转到首页
          this.$router.push('/');
        } else {
          console.error('登录失败，响应:', response);
          this.error = response.message || '登录失败';
        }
      } catch (error) {
        console.error('登录错误详情:', error);
        if (error.response) {
          console.error('服务器响应错误:', {
            status: error.response.status,
            data: error.response.data,
            headers: error.response.headers
          });
          this.error = error.response.data.message || '登录失败，请检查用户名和密码';
        } else if (error.request) {
          console.error('未收到响应:', error.request);
          this.error = '登录请求未收到响应，请检查网络连接';
        } else {
          console.error('请求配置错误:', error.message);
          this.error = '登录时发生错误，请稍后再试';
        }
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  background: #f8f9fa;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif;
}

.login-card {
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

.login-btn {
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

.login-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(64, 158, 255, 0.4);
}

.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
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

@media (max-width: 480px) {
  .login-card {
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