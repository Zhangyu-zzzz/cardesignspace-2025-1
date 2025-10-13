# 生产环境配置指南

## 🔧 环境变量配置

### 后端环境变量 (backend/.env.production)
请根据您的实际环境修改以下配置：

```bash
# 数据库配置
DB_HOST=localhost                    # 数据库主机地址
DB_PORT=3306                        # 数据库端口
DB_NAME=cardesignspace              # 数据库名称
DB_USER=cardesignspace_user         # 数据库用户名
DB_PASSWORD=your_production_db_password  # 数据库密码

# JWT配置
JWT_SECRET=your_super_strong_production_jwt_secret_key_here  # JWT密钥

# 腾讯云COS配置
TENCENT_SECRET_ID=your_tencent_secret_id      # 腾讯云SecretId
TENCENT_SECRET_KEY=your_tencent_secret_key    # 腾讯云SecretKey
COS_BUCKET=your_cos_bucket_name               # COS存储桶名称
COS_REGION=ap-shanghai                        # COS地域
COS_DOMAIN=https://your_cos_bucket_name.cos.ap-shanghai.myqcloud.com  # COS域名
```

### 前端环境变量 (frontend/.env.production)
```bash
NODE_ENV=production
VUE_APP_API_BASE_URL=              # 生产环境使用相对路径
VUE_APP_API_URL=/api               # API路径
```

## 🚀 部署步骤

1. **配置环境变量**
   ```bash
   # 编辑后端环境变量
   nano backend/.env.production
   
   # 编辑前端环境变量
   nano frontend/.env.production
   ```

2. **运行部署脚本**
   ```bash
   chmod +x deploy-production.sh
   ./deploy-production.sh
   ```

3. **验证部署**
   ```bash
   # 检查服务状态
   pm2 status
   
   # 检查网站
   curl -I https://www.cardesignspace.com
   
   # 检查API
   curl -I https://www.cardesignspace.com/api/health
   ```

## 🔍 故障排除

### 上传功能不工作
1. 检查后端服务是否运行: `pm2 status`
2. 检查API是否可访问: `curl https://www.cardesignspace.com/api/health`
3. 检查nginx配置: `sudo nginx -t`
4. 查看错误日志: `pm2 logs cardesignspace-backend`

### 数据库连接问题
1. 检查数据库服务: `sudo systemctl status mysql`
2. 检查数据库连接: `mysql -u cardesignspace_user -p cardesignspace`
3. 检查环境变量: `cat backend/.env.production`

### COS上传问题
1. 检查COS配置: `cat backend/.env.production | grep COS`
2. 测试COS连接: 查看后端日志
3. 检查网络连接: `ping cos.ap-shanghai.myqcloud.com`

## 📞 技术支持

如果遇到问题，请检查：
1. 服务器日志: `pm2 logs cardesignspace-backend`
2. nginx日志: `sudo tail -f /var/log/nginx/cardesignspace_error.log`
3. 系统资源: `htop` 或 `top`
