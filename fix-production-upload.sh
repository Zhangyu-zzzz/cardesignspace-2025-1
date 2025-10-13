#!/bin/bash

echo "🔧 修复生产环境上传功能问题"
echo "=================================="

# 1. 创建生产环境配置文件
echo "📝 创建生产环境配置文件..."

# 创建后端生产环境配置
cat > backend/.env.production << 'EOF'
# 生产环境配置
NODE_ENV=production
PORT=3000

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=cardesignspace
DB_USER=cardesignspace_user
DB_PASSWORD=your_production_db_password

# JWT配置
JWT_SECRET=your_super_strong_production_jwt_secret_key_here
JWT_EXPIRES_IN=7d

# 腾讯云COS配置
TENCENT_SECRET_ID=your_tencent_secret_id
TENCENT_SECRET_KEY=your_tencent_secret_key
COS_BUCKET=your_cos_bucket_name
COS_REGION=ap-shanghai
COS_DOMAIN=https://your_cos_bucket_name.cos.ap-shanghai.myqcloud.com

# 日志配置
LOG_LEVEL=info
LOG_MAX_SIZE=20m
LOG_MAX_FILES=14d

# 上传配置
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760
EOF

# 创建前端生产环境配置
cat > frontend/.env.production << 'EOF'
# 生产环境配置
NODE_ENV=production

# API配置 - 使用相对路径通过nginx代理
VUE_APP_API_BASE_URL=
VUE_APP_API_URL=/api

# 应用配置
VUE_APP_TITLE=CarDesignSpace
VUE_APP_DESCRIPTION=汽车设计空间
EOF

echo "✅ 生产环境配置文件已创建"

# 2. 修复前端API配置问题
echo "🔧 修复前端API配置..."

# 修复ImageUpload.vue中的API配置
sed -i.bak 's|baseURL: process.env.VUE_APP_API_BASE_URL ? `${process.env.VUE_APP_API_BASE_URL}/api` : (process.env.NODE_ENV === '\''production'\'' ? '\''/api'\'' : '\''http://localhost:3000/api'\''),|baseURL: process.env.NODE_ENV === '\''production'\'' ? '\''/api'\'' : (process.env.VUE_APP_API_BASE_URL ? `${process.env.VUE_APP_API_BASE_URL}/api` : '\''http://localhost:3000/api'\''),|g' frontend/src/views/ImageUpload.vue

# 修复ArticleEditor.vue中的API配置
sed -i.bak 's|return `${process.env.VUE_APP_API_BASE_URL || '\''http://localhost:3000'\''}/api/upload/cover`|return process.env.NODE_ENV === '\''production'\'' ? '\''/api/upload/cover'\'' : `${process.env.VUE_APP_API_BASE_URL || '\''http://localhost:3000'\''}/api/upload/cover`|g' frontend/src/views/ArticleEditor.vue

# 修复Forum.vue中的API配置
sed -i.bak 's|const baseURL = process.env.NODE_ENV === '\''production'\'' ? '\'''\'' : (process.env.VUE_APP_API_BASE_URL || '\''http://localhost:3000'\'');|const baseURL = process.env.NODE_ENV === '\''production'\'' ? '\'''\'' : (process.env.VUE_APP_API_BASE_URL || '\''http://localhost:3000'\'');|g' frontend/src/views/Forum.vue

# 修复Profile.vue中的API配置
sed -i.bak 's|const baseURL = process.env.NODE_ENV === '\''production'\'' ? '\'''\'' : (process.env.VUE_APP_API_BASE_URL || '\''http://localhost:3000'\'');|const baseURL = process.env.NODE_ENV === '\''production'\'' ? '\'''\'' : (process.env.VUE_APP_API_BASE_URL || '\''http://localhost:3000'\'');|g' frontend/src/views/Profile.vue

echo "✅ 前端API配置已修复"

# 3. 更新nginx配置
echo "🔧 更新nginx配置..."

# 创建优化的nginx配置
cat > nginx.production.conf << 'EOF'
# HTTP重定向到HTTPS
server {
    listen 80;
    server_name www.cardesignspace.com cardesignspace.com;
    
    # 重定向所有HTTP请求到HTTPS
    return 301 https://$server_name$request_uri;
}

# HTTPS配置
server {
    listen 443 ssl http2;
    server_name www.cardesignspace.com cardesignspace.com;
    
    # SSL证书配置
    ssl_certificate /etc/ssl/certs/cardesignspace/fullchain.pem;
    ssl_certificate_key /etc/ssl/private/cardesignspace/privkey.key;
    
    # SSL配置优化
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-CHACHA20-POLY1305:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-SHA384:ECDHE-RSA-AES128-SHA256;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;

    # 前端静态文件
    location / {
        # 应用一般频率限制
        limit_req zone=general burst=50 nodelay;
        limit_conn conn_limit_per_ip 20;
        
        root /root/cardesignspace-2025/frontend/dist;
        try_files $uri $uri/ /index.html;
        index index.html;
        
        # 静态资源缓存
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # 后端API代理
    location /api {
        # 应用频率限制
        limit_req zone=api burst=20 nodelay;
        limit_conn conn_limit_per_ip 10;
        
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # 文件上传大小限制
        client_max_body_size 50M;
    }

    # 安全头部
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # 防爬虫配置
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=general:10m rate=30r/s;
    limit_conn_zone $binary_remote_addr zone=conn_limit_per_ip:10m;
    
    # 阻止恶意User-Agent
    if ($http_user_agent ~* (bot|crawler|spider|scraper|scanner|probe|wget|curl|python|java|perl|ruby|php|asp|jsp)) {
        return 403;
    }
    
    # 阻止常见恶意路径
    location ~* ^/(wp-admin|wp-login|wp-signup|admin|administrator|phpmyadmin|mysql|database|db|config|setup|install|test|debug|api-docs|swagger) {
        return 403;
    }
    
    # 阻止恶意文件类型
    location ~* \.(php|asp|aspx|jsp|cgi|pl|py|sh|exe|bat|cmd|com|pif|scr|vbs|js)$ {
        return 403;
    }

    # 日志
    access_log /var/log/nginx/cardesignspace_access.log;
    error_log /var/log/nginx/cardesignspace_error.log;
}
EOF

echo "✅ nginx配置已更新"

# 4. 创建部署脚本
echo "📦 创建部署脚本..."

cat > deploy-production.sh << 'EOF'
#!/bin/bash

echo "🚀 开始部署到生产环境..."
echo "=================================="

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误: 请在项目根目录运行此脚本"
    exit 1
fi

# 1. 构建前端
echo "📦 构建前端应用..."
cd frontend

# 使用生产环境配置
cp .env.production .env

# 安装依赖
npm install

# 构建生产版本
npm run build

if [ ! -d "dist" ]; then
    echo "❌ 前端构建失败"
    exit 1
fi

echo "✅ 前端构建完成"

# 2. 准备后端
echo "🔧 准备后端服务..."
cd ../backend

# 使用生产环境配置
cp .env.production .env

# 安装依赖
npm install

echo "✅ 后端准备完成"

# 3. 重启服务
echo "🔄 重启服务..."

# 停止现有服务
pm2 stop cardesignspace-backend 2>/dev/null || true
pm2 delete cardesignspace-backend 2>/dev/null || true

# 启动后端服务
pm2 start ecosystem.config.js

# 保存PM2配置
pm2 save

echo "✅ 服务重启完成"

# 4. 更新nginx配置
echo "🌐 更新nginx配置..."
sudo cp ../nginx.production.conf /etc/nginx/sites-available/cardesignspace
sudo ln -sf /etc/nginx/sites-available/cardesignspace /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

echo "✅ nginx配置已更新"

# 5. 检查服务状态
echo "🔍 检查服务状态..."
sleep 5

# 检查后端服务
if curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
    echo "✅ 后端服务运行正常"
else
    echo "❌ 后端服务检查失败"
    pm2 logs cardesignspace-backend --lines 10
fi

# 检查nginx
if sudo systemctl is-active --quiet nginx; then
    echo "✅ nginx服务运行正常"
else
    echo "❌ nginx服务检查失败"
fi

echo ""
echo "🎉 部署完成！"
echo "=================================="
echo "🌐 网站地址: https://www.cardesignspace.com"
echo "📱 上传页面: https://www.cardesignspace.com/upload"
echo "🔧 后端API: https://www.cardesignspace.com/api"
echo ""
echo "📋 后续步骤:"
echo "1. 检查网站功能是否正常"
echo "2. 测试上传功能"
echo "3. 检查日志文件: pm2 logs cardesignspace-backend"
echo "4. 检查nginx日志: sudo tail -f /var/log/nginx/cardesignspace_error.log"
EOF

chmod +x deploy-production.sh

echo "✅ 部署脚本已创建"

# 5. 创建环境变量配置指南
echo "📋 创建环境变量配置指南..."

cat > PRODUCTION_SETUP.md << 'EOF'
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
EOF

echo "✅ 配置指南已创建"

echo ""
echo "🎉 修复完成！"
echo "=================================="
echo "📋 下一步操作:"
echo "1. 编辑 backend/.env.production 配置数据库和COS信息"
echo "2. 运行 ./deploy-production.sh 部署到生产环境"
echo "3. 检查 PRODUCTION_SETUP.md 了解详细配置说明"
echo ""
echo "🔧 主要修复内容:"
echo "✅ 统一了API配置，解决生产环境路径问题"
echo "✅ 创建了生产环境配置文件"
echo "✅ 更新了nginx配置"
echo "✅ 提供了完整的部署脚本"
echo "✅ 创建了详细的配置指南"
