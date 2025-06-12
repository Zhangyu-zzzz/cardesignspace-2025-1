#!/bin/bash

# ===========================================
# 🚀 Car Design Space - 腾讯云一键部署脚本
# 域名: www.cardesignspace.com
# ===========================================

set -e  # 遇到错误立即退出

echo "🚀 开始在腾讯云服务器上部署 Car Design Space..."
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
PROJECT_DIR="/root/cardesignspace-2025"
DB_NAME="cardesignspace"
DB_USER="cardesign_user"

# 检查是否是root用户
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}❌ 请使用root用户运行此脚本${NC}"
  exit 1
fi

echo -e "${BLUE}📍 项目目录: $PROJECT_DIR${NC}"
echo -e "${BLUE}🌐 域名: $DOMAIN${NC}"
echo ""

# 1. 更新系统
echo -e "${YELLOW}📦 更新系统包...${NC}"
apt update && apt upgrade -y
echo -e "${GREEN}✅ 系统更新完成${NC}"

# 2. 安装Node.js 18
echo -e "${YELLOW}📦 安装Node.js 18...${NC}"
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs
echo -e "${GREEN}✅ Node.js安装完成: $(node --version)${NC}"

# 3. 安装PM2
echo -e "${YELLOW}📦 安装PM2...${NC}"
npm install -g pm2
echo -e "${GREEN}✅ PM2安装完成${NC}"

# 4. 安装Nginx
echo -e "${YELLOW}📦 安装Nginx...${NC}"
apt install nginx -y
systemctl enable nginx
systemctl start nginx
echo -e "${GREEN}✅ Nginx安装完成${NC}"

# 5. 安装MySQL
echo -e "${YELLOW}📦 安装MySQL...${NC}"
apt install mysql-server -y
systemctl enable mysql
systemctl start mysql
echo -e "${GREEN}✅ MySQL安装完成${NC}"

# 6. 安装其他工具
echo -e "${YELLOW}📦 安装其他必需工具...${NC}"
apt install git curl wget unzip certbot python3-certbot-nginx -y
echo -e "${GREEN}✅ 工具安装完成${NC}"

# 7. 克隆项目（如果不存在）
if [ ! -d "$PROJECT_DIR" ]; then
  echo -e "${YELLOW}📥 克隆项目...${NC}"
  cd /root
  git clone https://github.com/Zhangyu-zzzz/cardesignspace-2025.git
  echo -e "${GREEN}✅ 项目克隆完成${NC}"
else
  echo -e "${YELLOW}📥 更新项目代码...${NC}"
  cd $PROJECT_DIR
  git pull origin main
  echo -e "${GREEN}✅ 项目更新完成${NC}"
fi

# 8. 配置环境变量
echo -e "${YELLOW}🔧 配置环境变量...${NC}"
cd $PROJECT_DIR

# 生成随机密码
DB_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 64)

cat > backend/.env << EOF
# ===========================================
# 🚀 Car Design Space - 生产环境配置
# ===========================================

NODE_ENV=production
APP_NAME="Car Design Space"
APP_VERSION=1.0.0

# 服务器配置
BACKEND_HOST=0.0.0.0
BACKEND_PORT=3000
VUE_APP_API_URL=https://www.cardesignspace.com/api
VUE_APP_API_BASE_URL=https://www.cardesignspace.com

# JWT配置
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD

# 腾讯云COS配置（请手动填写）
# TENCENT_SECRET_ID=你的腾讯云SecretID
# TENCENT_SECRET_KEY=你的腾讯云SecretKey
# COS_BUCKET=你的COS存储桶名称
# COS_REGION=ap-shanghai
# COS_DOMAIN=https://你的COS存储桶域名

# CORS配置
CORS_ORIGIN=https://www.cardesignspace.com,https://cardesignspace.com

# 日志配置
LOG_LEVEL=info
LOG_MAX_SIZE=20m
LOG_MAX_FILES=14d
EOF

echo -e "${GREEN}✅ 环境变量配置完成${NC}"
echo -e "${BLUE}📝 数据库密码: $DB_PASSWORD${NC}"
echo -e "${BLUE}🔐 JWT密钥: $JWT_SECRET${NC}"

# 9. 配置数据库
echo -e "${YELLOW}🗄️ 配置MySQL数据库...${NC}"

# 创建数据库和用户
mysql -u root << EOF
CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
EOF

echo -e "${GREEN}✅ 数据库配置完成${NC}"

# 10. 安装项目依赖
echo -e "${YELLOW}📦 安装项目依赖...${NC}"

# 后端依赖
cd $PROJECT_DIR/backend
npm install --production
mkdir -p logs

# 前端依赖和构建
cd $PROJECT_DIR/frontend
npm install

# 创建前端生产环境配置
cat > .env.production << EOF
NODE_ENV=production
VUE_APP_API_BASE_URL=https://www.cardesignspace.com
VUE_APP_API_URL=https://www.cardesignspace.com/api
VUE_APP_TITLE=汽车设计空间 - Car Design Space
EOF

# 构建前端
npm run build

echo -e "${GREEN}✅ 项目依赖安装完成${NC}"

# 11. 配置PM2
echo -e "${YELLOW}🔧 配置PM2...${NC}"
cd $PROJECT_DIR/backend

cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'cardesignspace-backend',
    script: 'src/app.js',
    cwd: '$PROJECT_DIR/backend',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 2,
    exec_mode: 'cluster',
    max_memory_restart: '1G',
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    restart_delay: 4000,
    min_uptime: '10s',
    max_restarts: 5
  }]
}
EOF

echo -e "${GREEN}✅ PM2配置完成${NC}"

# 12. 配置Nginx
echo -e "${YELLOW}🌐 配置Nginx...${NC}"

cat > /etc/nginx/sites-available/cardesignspace << EOF
server {
    listen 80;
    server_name www.cardesignspace.com cardesignspace.com;
    
    # 网站根目录
    root $PROJECT_DIR/frontend/dist;
    index index.html;
    
    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    
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
    
    # 前端路由
    location / {
        try_files \$uri \$uri/ /index.html;
        
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
rm -f /etc/nginx/sites-enabled/default

# 测试Nginx配置
nginx -t

if [ $? -eq 0 ]; then
  systemctl restart nginx
  echo -e "${GREEN}✅ Nginx配置完成${NC}"
else
  echo -e "${RED}❌ Nginx配置有误${NC}"
  exit 1
fi

# 13. 启动应用
echo -e "${YELLOW}🚀 启动应用...${NC}"
cd $PROJECT_DIR/backend

# 停止现有服务
pm2 stop cardesignspace-backend 2>/dev/null || true
pm2 delete cardesignspace-backend 2>/dev/null || true

# 启动新服务
pm2 start ecosystem.config.js
pm2 startup
pm2 save

echo -e "${GREEN}✅ 应用启动完成${NC}"

# 14. 等待服务启动
echo -e "${YELLOW}⏳ 等待服务启动...${NC}"
sleep 10

# 检查服务状态
pm2 status

# 15. 获取SSL证书
echo -e "${YELLOW}🔒 配置SSL证书...${NC}"

# 检查域名是否正确解析
if host www.cardesignspace.com > /dev/null 2>&1; then
  echo -e "${GREEN}✅ 域名解析正常${NC}"
  
  # 获取SSL证书
  certbot --nginx -d www.cardesignspace.com -d cardesignspace.com --agree-tos --no-eff-email --email admin@cardesignspace.com
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ SSL证书配置完成${NC}"
    
    # 设置自动续期
    (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
    echo -e "${GREEN}✅ SSL证书自动续期配置完成${NC}"
  else
    echo -e "${YELLOW}⚠️ SSL证书配置失败，请手动运行: certbot --nginx -d www.cardesignspace.com -d cardesignspace.com${NC}"
  fi
else
  echo -e "${YELLOW}⚠️ 域名未正确解析到此服务器，请配置DNS后手动获取SSL证书${NC}"
  echo -e "${BLUE}手动获取证书命令: certbot --nginx -d www.cardesignspace.com -d cardesignspace.com${NC}"
fi

# 16. 创建管理脚本
echo -e "${YELLOW}📝 创建管理脚本...${NC}"

# 备份脚本
cat > /root/backup-cardesignspace.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/root/backups"
mkdir -p $BACKUP_DIR

# 备份数据库
mysqldump -u cardesign_user -p$DB_PASSWORD cardesignspace > $BACKUP_DIR/db_backup_$DATE.sql

# 备份上传文件
tar -czf $BACKUP_DIR/uploads_backup_$DATE.tar.gz /root/cardesignspace-2025/backend/uploads/ 2>/dev/null || true

# 清理30天前的备份
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "备份完成: $DATE"
EOF

chmod +x /root/backup-cardesignspace.sh

# 更新脚本
cat > /root/update-cardesignspace.sh << 'EOF'
#!/bin/bash
echo "🚀 开始更新 Car Design Space..."

cd /root/cardesignspace-2025
git pull origin main

cd backend
npm install --production

cd ../frontend
npm install
npm run build

pm2 restart cardesignspace-backend

echo "✅ 更新完成！"
EOF

chmod +x /root/update-cardesignspace.sh

# 设置定时备份
(crontab -l 2>/dev/null; echo "0 2 * * * /root/backup-cardesignspace.sh >> /root/backup.log 2>&1") | crontab -

echo -e "${GREEN}✅ 管理脚本创建完成${NC}"

# 17. 最终检查
echo -e "${YELLOW}🔍 执行最终检查...${NC}"

# 检查服务状态
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
  echo -e "${GREEN}✅ 后端API运行正常${NC}"
else
  echo -e "${YELLOW}⚠️ 后端API可能需要时间启动${NC}"
fi

# 检查Nginx
if systemctl is-active --quiet nginx; then
  echo -e "${GREEN}✅ Nginx运行正常${NC}"
else
  echo -e "${RED}❌ Nginx未正常运行${NC}"
fi

# 检查MySQL
if systemctl is-active --quiet mysql; then
  echo -e "${GREEN}✅ MySQL运行正常${NC}"
else
  echo -e "${RED}❌ MySQL未正常运行${NC}"
fi

echo ""
echo -e "${GREEN}🎉 部署完成！${NC}"
echo ""
echo -e "${BLUE}📊 服务信息：${NC}"
echo "  🌐 网站地址: http://www.cardesignspace.com (SSL配置成功后自动跳转HTTPS)"
echo "  🔧 后端API: http://localhost:3000"
echo "  📁 项目目录: $PROJECT_DIR"
echo ""
echo -e "${BLUE}🛠️ 管理命令：${NC}"
echo "  📋 查看日志: pm2 logs cardesignspace-backend"
echo "  🔄 重启服务: pm2 restart cardesignspace-backend"
echo "  ⏹️  停止服务: pm2 stop cardesignspace-backend"
echo "  🔄 重启Nginx: systemctl restart nginx"
echo "  📊 查看状态: pm2 status"
echo "  💾 备份数据: /root/backup-cardesignspace.sh"
echo "  🔄 更新项目: /root/update-cardesignspace.sh"
echo ""
echo -e "${YELLOW}📝 重要信息：${NC}"
echo "数据库名称: $DB_NAME"
echo "数据库用户: $DB_USER"
echo "数据库密码: $DB_PASSWORD"
echo ""
echo -e "${YELLOW}⚠️ 下一步需要手动完成：${NC}"
echo "1. 配置DNS解析，将域名指向此服务器IP"
echo "2. 编辑 $PROJECT_DIR/backend/.env 文件，配置腾讯云COS相关参数"
echo "3. 如果SSL证书获取失败，请手动运行: certbot --nginx -d www.cardesignspace.com -d cardesignspace.com"
echo "4. 在腾讯云控制台配置安全组，开放80、443端口"
echo ""
echo -e "${GREEN}✨ 祝您使用愉快！${NC}" 