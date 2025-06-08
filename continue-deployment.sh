#!/bin/bash

echo "🚀 继续部署过程..."

# 设置变量
DOMAIN="www.cardesignspace.com"
PROJECT_DIR="/home/cardesign/cardesignspace-2025"
MYSQL_ROOT_PASSWORD="cardesign2025"
MYSQL_DATABASE="cardesignspace"
MYSQL_USER="cardesign"
MYSQL_PASSWORD="cardesign123"

echo "🔧 使用域名: $DOMAIN"

# 确保在正确目录
cd $PROJECT_DIR || {
    echo "❌ 无法进入项目目录"
    exit 1
}

echo "📦 安装项目依赖..."
cd backend
npm install
cd ../frontend
npm install
cd ..

echo "🗄️ 配置数据库..."
# 检查MySQL是否安装
if ! command -v mysql &> /dev/null; then
    echo "📥 安装MySQL..."
    sudo apt update
    # 设置MySQL密码（避免交互）
    echo "mysql-server mysql-server/root_password password $MYSQL_ROOT_PASSWORD" | sudo debconf-set-selections
    echo "mysql-server mysql-server/root_password_again password $MYSQL_ROOT_PASSWORD" | sudo debconf-set-selections
    sudo apt install -y mysql-server
    
    # 启动MySQL
    sudo systemctl start mysql
    sudo systemctl enable mysql
fi

# 创建数据库和用户
mysql -u root -p$MYSQL_ROOT_PASSWORD -e "
CREATE DATABASE IF NOT EXISTS $MYSQL_DATABASE CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$MYSQL_USER'@'localhost' IDENTIFIED BY '$MYSQL_PASSWORD';
GRANT ALL PRIVILEGES ON $MYSQL_DATABASE.* TO '$MYSQL_USER'@'localhost';
FLUSH PRIVILEGES;
" 2>/dev/null || {
    echo "⚠️ 数据库配置可能需要手动处理"
}

echo "⚙️ 创建环境配置..."
# 后端环境配置
cat > backend/.env << EOF
# 服务器配置
PORT=3000
NODE_ENV=production

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=$MYSQL_DATABASE
DB_USER=$MYSQL_USER
DB_PASSWORD=$MYSQL_PASSWORD

# JWT配置
JWT_SECRET=your-very-secure-jwt-secret-key-change-this-in-production-$(date +%s)
JWT_EXPIRES_IN=7d

# 文件上传配置
UPLOAD_PATH=uploads
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=jpg,jpeg,png,gif,webp

# 跨域配置
CORS_ORIGIN=http://$DOMAIN,https://$DOMAIN

# 日志配置
LOG_LEVEL=info
LOG_FILE=logs/app.log

# Redis配置（可选）
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# 邮件配置（可选）
SMTP_HOST=smtp.qq.com
SMTP_PORT=587
SMTP_USER=your-email@qq.com
SMTP_PASS=your-email-password
SMTP_FROM=Car Design Space <your-email@qq.com>

# 腾讯云存储配置（可选）
TENCENT_SECRET_ID=your-secret-id
TENCENT_SECRET_KEY=your-secret-key
TENCENT_BUCKET=your-bucket-name
TENCENT_REGION=ap-beijing
EOF

# 前端环境配置
cat > frontend/.env.production << EOF
# API配置
VUE_APP_API_BASE_URL=http://$DOMAIN:3000/api
VUE_APP_UPLOAD_URL=http://$DOMAIN:3000/api/upload

# 应用配置
VUE_APP_TITLE=Car Design Space
VUE_APP_DESCRIPTION=专业汽车设计交流平台

# 功能开关
VUE_APP_ENABLE_UPLOAD=true
VUE_APP_ENABLE_FORUM=true
VUE_APP_ENABLE_USER_SYSTEM=true
EOF

echo "🏗️ 构建前端项目..."
cd frontend
npm run build
cd ..

echo "⚙️ 配置PM2..."
# 创建PM2配置文件
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'cardesignspace-backend',
      script: './backend/src/app.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true
    }
  ]
};
EOF

# 创建日志目录
mkdir -p logs

# 安装PM2（如果未安装）
if ! command -v pm2 &> /dev/null; then
    echo "📥 安装PM2..."
    sudo npm install -g pm2
fi

echo "🌐 配置Nginx..."
# 创建Nginx站点配置
sudo tee /etc/nginx/sites-available/cardesignspace << EOF
server {
    listen 80;
    server_name $DOMAIN;
    
    # 前端静态文件
    location / {
        root $PROJECT_DIR/frontend/dist;
        index index.html;
        try_files \$uri \$uri/ /index.html;
        
        # 静态资源缓存
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control public;
            add_header Vary Accept-Encoding;
        }
    }
    
    # API代理
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # 文件上传
    location /uploads/ {
        root $PROJECT_DIR/backend;
        expires 1y;
        add_header Cache-Control public;
    }
    
    # 安全头
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
}
EOF

# 启用站点
sudo ln -sf /etc/nginx/sites-available/cardesignspace /etc/nginx/sites-enabled/

# 禁用默认站点
sudo rm -f /etc/nginx/sites-enabled/default

# 测试Nginx配置
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx配置测试通过"
    sudo systemctl reload nginx
else
    echo "❌ Nginx配置错误"
    exit 1
fi

echo "🚀 启动应用..."
# 停止可能存在的进程
pm2 delete cardesignspace-backend 2>/dev/null || true

# 启动后端
pm2 start ecosystem.config.js

# 保存PM2配置
pm2 save
pm2 startup | tail -1 | sudo bash

echo "🎉 部署完成！"
echo ""
echo "📋 部署信息："
echo "   网站地址: http://$DOMAIN"
echo "   API地址: http://$DOMAIN:3000/api"
echo "   项目目录: $PROJECT_DIR"
echo ""
echo "🔧 管理命令："
echo "   查看应用状态: pm2 status"
echo "   查看日志: pm2 logs"
echo "   重启应用: pm2 restart cardesignspace-backend"
echo "   停止应用: pm2 stop cardesignspace-backend"
echo ""
echo "⚠️ 注意事项："
echo "   1. 请确保域名DNS已指向此服务器"
echo "   2. 如需HTTPS，请运行SSL配置脚本"
echo "   3. 定期备份数据库和文件"
echo ""

# 检查服务状态
echo "📊 检查服务状态..."
echo "Nginx状态:"
sudo systemctl status nginx --no-pager -l
echo ""
echo "MySQL状态:"
sudo systemctl status mysql --no-pager -l
echo ""
echo "PM2状态:"
pm2 status 