#!/bin/bash

# ===========================================
# 🔧 Car Design Space - 部署问题修复脚本
# ===========================================

echo "🔧 开始修复部署问题..."
echo ""

# 定义颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. 修复Nginx安装问题
echo -e "${YELLOW}🔧 修复Nginx安装问题...${NC}"

# 完全卸载nginx
sudo apt remove --purge nginx nginx-common nginx-core -y
sudo apt autoremove -y
sudo apt autoclean

# 清理残留文件
sudo rm -rf /etc/nginx
sudo rm -rf /var/log/nginx
sudo rm -rf /var/cache/nginx

# 重新安装nginx
echo "重新安装Nginx..."
sudo apt update
sudo apt install nginx -y

# 检查nginx状态
if sudo nginx -t; then
    echo -e "${GREEN}✅ Nginx安装成功${NC}"
    sudo systemctl enable nginx
    sudo systemctl start nginx
else
    echo -e "${RED}❌ Nginx安装仍有问题${NC}"
    # 创建基本的nginx配置
    sudo mkdir -p /etc/nginx/sites-available
    sudo mkdir -p /etc/nginx/sites-enabled
    
    # 创建基本nginx.conf
    sudo tee /etc/nginx/nginx.conf > /dev/null << 'EOF'
user www-data;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
    worker_connections 768;
}

http {
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    ssl_protocols TLSv1 TLSv1.1 TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    gzip on;

    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
EOF

    # 创建日志目录
    sudo mkdir -p /var/log/nginx
    sudo chown www-data:www-data /var/log/nginx
    
    sudo nginx -t && sudo systemctl restart nginx
fi

# 2. 修复Git网络问题
echo -e "${YELLOW}🌐 修复Git网络问题...${NC}"

# 配置Git使用更稳定的协议
git config --global http.version HTTP/1.1
git config --global http.postBuffer 1048576000
git config --global http.lowSpeedLimit 0
git config --global http.lowSpeedTime 999999

# 3. 手动克隆项目（使用多种方法）
echo -e "${YELLOW}📥 手动克隆项目...${NC}"

cd /home/cardesign

# 清理之前的尝试
rm -rf cardesignspace-2025

# 方法1：尝试HTTPS克隆
echo "尝试HTTPS克隆..."
if git clone https://github.com/Zhangyu-zzzz/cardesignspace-2025.git; then
    echo -e "${GREEN}✅ HTTPS克隆成功${NC}"
elif git clone --depth 1 https://github.com/Zhangyu-zzzz/cardesignspace-2025.git; then
    echo -e "${GREEN}✅ 浅克隆成功${NC}"
else
    echo -e "${YELLOW}HTTPS克隆失败，尝试其他方法...${NC}"
    
    # 方法2：使用curl下载
    echo "使用curl下载项目..."
    curl -L https://github.com/Zhangyu-zzzz/cardesignspace-2025/archive/refs/heads/main.zip -o cardesignspace.zip
    
    if [ -f "cardesignspace.zip" ]; then
        sudo apt install unzip -y
        unzip cardesignspace.zip
        mv cardesignspace-2025-main cardesignspace-2025
        rm cardesignspace.zip
        echo -e "${GREEN}✅ ZIP下载成功${NC}"
    else
        echo -e "${RED}❌ 项目下载失败${NC}"
        echo "请手动下载项目或检查网络连接"
        exit 1
    fi
fi

# 4. 进入项目目录
if [ -d "cardesignspace-2025" ]; then
    cd cardesignspace-2025
    echo -e "${GREEN}✅ 进入项目目录成功${NC}"
else
    echo -e "${RED}❌ 项目目录不存在${NC}"
    exit 1
fi

# 5. 重新收集配置信息
echo -e "${YELLOW}📝 重新收集配置信息...${NC}"
read -p "域名 (例: www.cardesignspace.com): " DOMAIN
read -p "数据库密码: " -s DB_PASSWORD
echo ""
read -p "腾讯云 Secret ID: " TENCENT_SECRET_ID
read -p "腾讯云 Secret Key: " -s TENCENT_SECRET_KEY
echo ""
read -p "COS存储桶名称: " COS_BUCKET
read -p "COS域名: " COS_DOMAIN
echo ""

# 验证输入
if [ -z "$DOMAIN" ] || [ -z "$DB_PASSWORD" ] || [ -z "$TENCENT_SECRET_ID" ] || [ -z "$TENCENT_SECRET_KEY" ] || [ -z "$COS_BUCKET" ] || [ -z "$COS_DOMAIN" ]; then
    echo -e "${RED}❌ 所有字段都是必填的${NC}"
    exit 1
fi

# 6. 创建环境配置
echo -e "${YELLOW}⚙️ 创建环境配置...${NC}"
cat > .env << EOF
NODE_ENV=production
APP_NAME="Car Design Space"
APP_VERSION=1.0.0

BACKEND_HOST=0.0.0.0
BACKEND_PORT=3000
VUE_APP_API_URL=https://$DOMAIN/api
VUE_APP_API_BASE_URL=https://$DOMAIN

JWT_SECRET=cardesignspace-super-secret-$(date +%s)-production
JWT_EXPIRES_IN=7d

DB_HOST=localhost
DB_PORT=3306
DB_NAME=cardesignspace
DB_USER=cardesign_user
DB_PASSWORD=$DB_PASSWORD

TENCENT_SECRET_ID=$TENCENT_SECRET_ID
TENCENT_SECRET_KEY=$TENCENT_SECRET_KEY
COS_BUCKET=$COS_BUCKET
COS_REGION=ap-shanghai
COS_DOMAIN=$COS_DOMAIN

CORS_ORIGIN=https://$DOMAIN,https://$(echo $DOMAIN | sed 's/www\.//')

LOG_LEVEL=info
LOG_MAX_SIZE=20m
LOG_MAX_FILES=14d
EOF

# 7. 安装项目依赖
echo -e "${YELLOW}📦 安装项目依赖...${NC}"

# 安装后端依赖
echo "安装后端依赖..."
cd backend
npm install --production
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 后端依赖安装成功${NC}"
else
    echo -e "${RED}❌ 后端依赖安装失败${NC}"
    # 尝试清理缓存重新安装
    npm cache clean --force
    npm install --production
fi

# 安装前端依赖并构建
echo "安装前端依赖并构建..."
cd ../frontend
npm install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 前端依赖安装成功${NC}"
    npm run build
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ 前端构建成功${NC}"
    else
        echo -e "${RED}❌ 前端构建失败${NC}"
    fi
else
    echo -e "${RED}❌ 前端依赖安装失败${NC}"
    npm cache clean --force
    npm install
    npm run build
fi

cd ..

# 8. 配置数据库
echo -e "${YELLOW}🗄️ 配置MySQL数据库...${NC}"
sudo mysql -e "CREATE DATABASE IF NOT EXISTS cardesignspace CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null || {
    echo "初始化MySQL安全设置..."
    sudo mysql_secure_installation
    sudo mysql -e "CREATE DATABASE IF NOT EXISTS cardesignspace CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
}

sudo mysql -e "CREATE USER IF NOT EXISTS 'cardesign_user'@'localhost' IDENTIFIED BY '$DB_PASSWORD';"
sudo mysql -e "GRANT ALL PRIVILEGES ON cardesignspace.* TO 'cardesign_user'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"

# 9. 配置Nginx
echo -e "${YELLOW}🌐 配置Nginx...${NC}"
sudo tee /etc/nginx/sites-available/cardesignspace > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN $(echo $DOMAIN | sed 's/www\.//');
    
    root $(pwd)/frontend/dist;
    index index.html;
    
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
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
    }
    
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff|woff2|ttf|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
EOF

# 启用站点
sudo ln -sf /etc/nginx/sites-available/cardesignspace /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# 测试并重启Nginx
if sudo nginx -t; then
    sudo systemctl restart nginx
    echo -e "${GREEN}✅ Nginx配置成功${NC}"
else
    echo -e "${RED}❌ Nginx配置失败${NC}"
    sudo nginx -t
fi

# 10. 启动应用
echo -e "${YELLOW}🚀 启动应用...${NC}"
cd backend
if [ -f "ecosystem.config.js" ]; then
    pm2 start ecosystem.config.js --env production
    pm2 startup
    pm2 save
    echo -e "${GREEN}✅ 应用启动成功${NC}"
else
    echo -e "${YELLOW}⚠️ 未找到PM2配置文件，使用默认配置启动${NC}"
    pm2 start src/app.js --name cardesignspace-backend --env production
    pm2 startup
    pm2 save
fi

# 11. 配置SSL证书（可选）
echo -e "${YELLOW}🔒 配置SSL证书...${NC}"
echo "是否现在配置SSL证书？(y/n)"
read -r SETUP_SSL

if [[ $SETUP_SSL =~ ^[Yy]$ ]]; then
    sudo certbot --nginx -d $DOMAIN -d $(echo $DOMAIN | sed 's/www\.//') --non-interactive --agree-tos --email admin@$DOMAIN
    
    # 设置自动续期
    echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
else
    echo "跳过SSL配置，稍后可手动配置"
fi

# 12. 创建管理脚本
echo -e "${YELLOW}📋 创建管理脚本...${NC}"
cd ..
cat > manage.sh << 'EOF'
#!/bin/bash

case "$1" in
    start)
        echo "启动服务..."
        pm2 start cardesignspace-backend
        sudo systemctl start nginx
        ;;
    stop)
        echo "停止服务..."
        pm2 stop cardesignspace-backend
        sudo systemctl stop nginx
        ;;
    restart)
        echo "重启服务..."
        pm2 restart cardesignspace-backend
        sudo systemctl restart nginx
        ;;
    status)
        echo "服务状态:"
        pm2 status
        sudo systemctl status nginx --no-pager -l
        ;;
    logs)
        echo "查看日志:"
        pm2 logs --lines 50
        ;;
    update)
        echo "更新应用..."
        git pull origin main
        cd backend && npm install --production
        cd ../frontend && npm install && npm run build
        pm2 restart cardesignspace-backend
        ;;
    *)
        echo "用法: $0 {start|stop|restart|status|logs|update}"
        exit 1
        ;;
esac
EOF

chmod +x manage.sh

# 完成修复
echo ""
echo -e "${GREEN}🎉 修复完成！${NC}"
echo ""
echo -e "${BLUE}📊 部署信息:${NC}"
echo "域名: http://$DOMAIN (HTTPS: https://$DOMAIN)"
echo "后端API: http://$DOMAIN/api"
echo "项目目录: $(pwd)"
echo ""
echo -e "${BLUE}🔧 检查服务状态:${NC}"
echo "1. 检查服务: ./manage.sh status"
echo "2. 查看日志: ./manage.sh logs"
echo "3. 访问网站: http://$DOMAIN"
echo ""

# 最后检查
echo -e "${YELLOW}🔍 最终检查...${NC}"
./manage.sh status

echo ""
echo -e "${GREEN}✅ 修复脚本执行完成！${NC}"
echo -e "${YELLOW}💡 如果还有问题，请检查：${NC}"
echo "1. ./manage.sh logs - 查看应用日志"
echo "2. sudo systemctl status nginx - 查看Nginx状态"
echo "3. sudo tail -f /var/log/nginx/error.log - 查看Nginx错误日志" 