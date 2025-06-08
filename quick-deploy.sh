#!/bin/bash

# ===========================================
# 🚀 Car Design Space - 一键部署脚本
# ===========================================

echo "🚀 欢迎使用 Car Design Space 一键部署脚本"
echo "此脚本将帮助你快速部署项目到服务器"
echo ""

# 定义颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查是否为root用户
if [ "$EUID" -eq 0 ]; then
    echo -e "${RED}请不要使用root用户运行此脚本${NC}"
    echo "建议创建普通用户后再运行"
    exit 1
fi

# 获取用户输入
echo -e "${YELLOW}📝 请输入以下配置信息：${NC}"
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

echo -e "${GREEN}✅ 配置信息收集完成${NC}"
echo ""

# 检查系统环境
echo -e "${YELLOW}🔍 检查系统环境...${NC}"

# 检查操作系统
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
    echo "操作系统: $OS"
else
    echo -e "${RED}❌ 无法识别操作系统${NC}"
    exit 1
fi

# 更新系统
echo -e "${YELLOW}📦 更新系统包...${NC}"
if [[ "$OS" == *"Ubuntu"* ]] || [[ "$OS" == *"Debian"* ]]; then
    sudo apt update && sudo apt upgrade -y
    INSTALL_CMD="sudo apt install -y"
elif [[ "$OS" == *"CentOS"* ]] || [[ "$OS" == *"Red Hat"* ]]; then
    sudo yum update -y
    INSTALL_CMD="sudo yum install -y"
else
    echo -e "${RED}❌ 不支持的操作系统${NC}"
    exit 1
fi

# 安装必需软件
echo -e "${YELLOW}🔧 安装必需软件...${NC}"

# 安装Node.js
if ! command -v node &> /dev/null; then
    echo "安装 Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    $INSTALL_CMD nodejs
fi

# 安装其他软件
echo "安装其他必需软件..."
$INSTALL_CMD nginx mysql-server git certbot python3-certbot-nginx

# 安装PM2
if ! command -v pm2 &> /dev/null; then
    echo "安装 PM2..."
    sudo npm install -g pm2
fi

echo -e "${GREEN}✅ 软件安装完成${NC}"

# 克隆项目
echo -e "${YELLOW}📥 克隆项目...${NC}"
if [ ! -d "cardesignspace-2025" ]; then
    git clone https://github.com/Zhangyu-zzzz/cardesignspace-2025.git
fi
cd cardesignspace-2025

# 创建环境配置
echo -e "${YELLOW}⚙️ 创建环境配置...${NC}"
cat > .env << EOF
# ===========================================
# 🚀 Car Design Space - 生产环境配置
# ===========================================

NODE_ENV=production
APP_NAME="Car Design Space"
APP_VERSION=1.0.0

# 服务器配置
BACKEND_HOST=0.0.0.0
BACKEND_PORT=3000
VUE_APP_API_URL=https://$DOMAIN/api
VUE_APP_API_BASE_URL=https://$DOMAIN

# JWT配置
JWT_SECRET=cardesignspace-super-secret-$(date +%s)-production
JWT_EXPIRES_IN=7d

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=cardesignspace
DB_USER=cardesign_user
DB_PASSWORD=$DB_PASSWORD

# 腾讯云COS配置
TENCENT_SECRET_ID=$TENCENT_SECRET_ID
TENCENT_SECRET_KEY=$TENCENT_SECRET_KEY
COS_BUCKET=$COS_BUCKET
COS_REGION=ap-shanghai
COS_DOMAIN=$COS_DOMAIN

# CORS配置
CORS_ORIGIN=https://$DOMAIN,https://$(echo $DOMAIN | sed 's/www\.//')

# 日志配置
LOG_LEVEL=info
LOG_MAX_SIZE=20m
LOG_MAX_FILES=14d
EOF

# 安装依赖
echo -e "${YELLOW}📦 安装项目依赖...${NC}"
cd backend
npm install --production
cd ../frontend
npm install
npm run build
cd ..

# 配置数据库
echo -e "${YELLOW}🗄️ 配置MySQL数据库...${NC}"
sudo mysql -e "CREATE DATABASE IF NOT EXISTS cardesignspace CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sudo mysql -e "CREATE USER IF NOT EXISTS 'cardesign_user'@'localhost' IDENTIFIED BY '$DB_PASSWORD';"
sudo mysql -e "GRANT ALL PRIVILEGES ON cardesignspace.* TO 'cardesign_user'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"

# 配置Nginx
echo -e "${YELLOW}🌐 配置Nginx...${NC}"
sudo tee /etc/nginx/sites-available/cardesignspace > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN $(echo $DOMAIN | sed 's/www\.//');
    
    root $(pwd)/frontend/dist;
    index index.html;
    
    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # 前端路由
    location / {
        try_files \$uri \$uri/ /index.html;
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
    }
    
    # 静态资源缓存
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff|woff2|ttf|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
EOF

# 启用Nginx配置
sudo ln -sf /etc/nginx/sites-available/cardesignspace /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx
sudo systemctl enable nginx

# 启动应用
echo -e "${YELLOW}🚀 启动应用...${NC}"
cd backend
pm2 start ecosystem.config.js --env production
pm2 startup
pm2 save

# 配置SSL证书
echo -e "${YELLOW}🔒 配置SSL证书...${NC}"
echo "正在获取免费SSL证书..."
sudo certbot --nginx -d $DOMAIN -d $(echo $DOMAIN | sed 's/www\.//') --non-interactive --agree-tos --email admin@$DOMAIN

# 设置自动续期
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -

# 创建管理脚本
echo -e "${YELLOW}📋 创建管理脚本...${NC}"
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
        sudo systemctl status nginx --no-pager
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

# 完成部署
echo ""
echo -e "${GREEN}🎉 部署完成！${NC}"
echo ""
echo -e "${BLUE}📊 部署信息:${NC}"
echo "域名: https://$DOMAIN"
echo "后端API: https://$DOMAIN/api"
echo "项目目录: $(pwd)"
echo ""
echo -e "${BLUE}🔧 管理命令:${NC}"
echo "./manage.sh start    - 启动服务"
echo "./manage.sh stop     - 停止服务"
echo "./manage.sh restart  - 重启服务"
echo "./manage.sh status   - 查看状态"
echo "./manage.sh logs     - 查看日志"
echo "./manage.sh update   - 更新应用"
echo ""
echo -e "${BLUE}📝 检查部署:${NC}"
echo "1. 访问 https://$DOMAIN 查看网站"
echo "2. 运行 ./manage.sh status 检查服务状态"
echo "3. 运行 ./manage.sh logs 查看日志"
echo ""
echo -e "${GREEN}✅ Car Design Space 已成功部署到生产环境！${NC}" 