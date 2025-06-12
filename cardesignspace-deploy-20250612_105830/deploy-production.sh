#!/bin/bash

# ===========================================
# 🚀 Car Design Space - 生产环境部署脚本
# 域名: www.cardesignspace.com
# ===========================================

set -e  # 遇到错误立即退出

echo "🚀 开始部署 Car Design Space 到生产环境..."
echo "目标域名: www.cardesignspace.com"
echo ""

# 定义颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目配置
PROJECT_NAME="cardesignspace"
DOMAIN="www.cardesignspace.com"
PROJECT_DIR="/root/auto-gallery"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
NGINX_DIR="/var/www/cardesignspace"

# 检查是否是root用户
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}❌ 请使用root用户运行此脚本${NC}"
  exit 1
fi

echo -e "${BLUE}📍 项目目录: $PROJECT_DIR${NC}"
echo -e "${BLUE}🌐 域名: $DOMAIN${NC}"
echo ""

# 停止现有服务
echo -e "${YELLOW}🔴 停止现有服务...${NC}"
pm2 stop cardesignspace-backend 2>/dev/null || true
pm2 delete cardesignspace-backend 2>/dev/null || true

# 切换到项目目录
cd $PROJECT_DIR || {
  echo -e "${RED}❌ 项目目录不存在: $PROJECT_DIR${NC}"
  exit 1
}

# 更新代码（如果是git仓库）
if [ -d ".git" ]; then
  echo -e "${YELLOW}📦 更新代码...${NC}"
  git stash 2>/dev/null || true
  git pull origin main
  echo -e "${GREEN}✅ 代码更新完成${NC}"
fi

# 安装后端依赖
echo -e "${YELLOW}📦 安装后端依赖...${NC}"
cd $BACKEND_DIR
npm install --production
echo -e "${GREEN}✅ 后端依赖安装完成${NC}"

# 创建logs目录
mkdir -p logs

# 构建前端
echo -e "${YELLOW}🏗️ 构建前端...${NC}"
cd $FRONTEND_DIR

# 创建生产环境配置
cat > .env.production << EOF
NODE_ENV=production
VUE_APP_API_BASE_URL=https://www.cardesignspace.com
VUE_APP_API_URL=https://www.cardesignspace.com/api
VUE_APP_TITLE=汽车设计空间 - Car Design Space
VUE_APP_DESCRIPTION=专业的汽车设计图片分享平台
EOF

echo -e "${BLUE}📝 生产环境配置已创建${NC}"

# 安装前端依赖并构建
npm install
npm run build

echo -e "${GREEN}✅ 前端构建完成${NC}"

# 备份旧的网站文件
if [ -d "$NGINX_DIR" ]; then
  echo -e "${YELLOW}💾 备份旧版本...${NC}"
  BACKUP_DIR="/var/www/cardesignspace.backup.$(date +%Y%m%d_%H%M%S)"
  mv $NGINX_DIR $BACKUP_DIR
  echo -e "${BLUE}📦 备份保存至: $BACKUP_DIR${NC}"
fi

# 部署前端到nginx目录
echo -e "${YELLOW}📂 部署前端文件...${NC}"
mkdir -p $NGINX_DIR
cp -r dist/* $NGINX_DIR/
chown -R www-data:www-data $NGINX_DIR
chmod -R 755 $NGINX_DIR

echo -e "${GREEN}✅ 前端文件部署完成${NC}"

# 检查后端环境变量
echo -e "${YELLOW}🔧 检查后端配置...${NC}"
cd $BACKEND_DIR

if [ ! -f ".env" ]; then
  echo -e "${RED}❌ .env文件不存在，请创建环境变量配置文件${NC}"
  echo "请参考 env.example 创建 .env 文件"
  exit 1
fi

# 检查PM2配置文件
if [ ! -f "ecosystem.config.js" ]; then
  echo -e "${YELLOW}📝 创建PM2配置文件...${NC}"
  cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'cardesignspace-backend',
    script: './src/app.js',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
}
EOF
fi

# 启动后端服务
echo -e "${YELLOW}🚀 启动后端服务...${NC}"
pm2 start ecosystem.config.js

# 保存PM2配置
pm2 save
pm2 startup

echo -e "${GREEN}✅ 后端服务启动完成${NC}"

# 配置Nginx
echo -e "${YELLOW}🌐 配置Nginx...${NC}"

# 创建Nginx配置文件
cat > /etc/nginx/sites-available/cardesignspace << EOF
server {
    listen 80;
    server_name www.cardesignspace.com cardesignspace.com;
    
    # 重定向到HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name www.cardesignspace.com cardesignspace.com;
    
    # SSL证书配置
    ssl_certificate /etc/letsencrypt/live/www.cardesignspace.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/www.cardesignspace.com/privkey.pem;
    
    # SSL安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # 网站根目录
    root $NGINX_DIR;
    index index.html;
    
    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;
    
    # 前端路由 - Vue Router History模式
    location / {
        try_files \$uri \$uri/ /index.html;
        
        # 缓存HTML文件
        location ~* \.html\$ {
            expires -1;
            add_header Cache-Control "no-cache, no-store, must-revalidate";
        }
    }
    
    # API代理
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # API超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # 静态资源缓存
    location ~* \.(jpg|jpeg|png|gif|ico|svg|webp)\$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
    
    location ~* \.(css|js|woff|woff2|ttf|eot)\$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
    
    # 禁止访问敏感文件
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    location ~ \.(env|log|config)\$ {
        deny all;
        access_log off;
        log_not_found off;
    }
}
EOF

# 启用站点
ln -sf /etc/nginx/sites-available/cardesignspace /etc/nginx/sites-enabled/

# 删除默认站点（如果存在）
rm -f /etc/nginx/sites-enabled/default

echo -e "${GREEN}✅ Nginx配置完成${NC}"

# 测试Nginx配置
echo -e "${YELLOW}🔧 测试Nginx配置...${NC}"
nginx -t

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Nginx配置正确${NC}"
  systemctl reload nginx
  echo -e "${GREEN}✅ Nginx已重载${NC}"
else
  echo -e "${RED}❌ Nginx配置有误，请检查配置文件${NC}"
  exit 1
fi

# 等待服务启动
echo -e "${YELLOW}⏳ 等待服务启动...${NC}"
sleep 5

# 检查服务状态
echo -e "${YELLOW}🔍 检查服务状态...${NC}"
pm2 status

# 测试API连接
echo -e "${YELLOW}🧪 测试API连接...${NC}"
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
  echo -e "${GREEN}✅ 后端API运行正常${NC}"
else
  echo -e "${YELLOW}⚠️ 后端API可能需要时间启动，请稍后检查${NC}"
  echo "查看日志: pm2 logs cardesignspace-backend"
fi

# 检查SSL证书
echo -e "${YELLOW}🔒 检查SSL证书...${NC}"
if [ -f "/etc/letsencrypt/live/www.cardesignspace.com/fullchain.pem" ]; then
  echo -e "${GREEN}✅ SSL证书已存在${NC}"
else
  echo -e "${YELLOW}⚠️ SSL证书不存在，请运行以下命令获取证书:${NC}"
  echo "certbot --nginx -d www.cardesignspace.com -d cardesignspace.com"
fi

echo ""
echo -e "${GREEN}🎉 部署完成！${NC}"
echo ""
echo -e "${BLUE}📊 服务信息：${NC}"
echo "  🌐 网站地址: https://www.cardesignspace.com"
echo "  🔧 后端API: http://localhost:3000"
echo "  📁 网站目录: $NGINX_DIR"
echo "  📁 项目目录: $PROJECT_DIR"
echo ""
echo -e "${BLUE}🛠️ 管理命令：${NC}"
echo "  📋 查看日志: pm2 logs cardesignspace-backend"
echo "  🔄 重启后端: pm2 restart cardesignspace-backend"
echo "  ⏹️  停止后端: pm2 stop cardesignspace-backend"
echo "  🔄 重启Nginx: systemctl restart nginx"
echo "  📊 查看状态: pm2 status"
echo ""
echo -e "${YELLOW}📝 后续步骤：${NC}"
echo "1. 如果SSL证书不存在，请运行: certbot --nginx -d www.cardesignspace.com -d cardesignspace.com"
echo "2. 检查防火墙设置，确保80和443端口开放"
echo "3. 配置数据库连接和腾讯云COS设置"
echo "4. 测试网站功能是否正常"
echo ""
echo -e "${GREEN}✨ 祝您使用愉快！${NC}" 