#!/bin/bash

# 汽车图库网站 Docker 部署脚本
# 作者: CarDesignSpace Team
# 日期: $(date +%Y-%m-%d)

set -e  # 遇到错误立即退出

echo "🚀 开始部署汽车设计空间..."

# 设置变量
PROJECT_DIR="/root/auto-gallery"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

# 检查是否是root用户
if [ "$EUID" -ne 0 ]; then
  echo "❌ 请使用root用户运行此脚本"
  exit 1
fi

# 停止现有服务
echo "🔴 停止现有服务..."
pm2 stop cardesignspace-backend 2>/dev/null || true
pm2 delete cardesignspace-backend 2>/dev/null || true

# 切换到项目目录
cd $PROJECT_DIR || exit 1

# 更新代码（如果是git仓库）
if [ -d ".git" ]; then
  echo "📦 更新代码..."
  git pull origin main
fi

# 安装后端依赖
echo "📦 安装后端依赖..."
cd $BACKEND_DIR
npm install --production

# 创建logs目录
mkdir -p logs

# 构建前端
echo "🏗️ 构建前端..."
cd $FRONTEND_DIR

# 创建生产环境配置
cat > .env.production << EOF
NODE_ENV=production
VUE_APP_API_BASE_URL=https://www.cardesignspace.com
VUE_APP_TITLE=汽车设计空间
EOF

npm install
npm run build

# 备份旧的dist目录
if [ -d "/var/www/cardesignspace" ]; then
  echo "💾 备份旧版本..."
  mv /var/www/cardesignspace /var/www/cardesignspace.backup.$(date +%Y%m%d_%H%M%S)
fi

# 部署前端到nginx目录
echo "📂 部署前端文件..."
mkdir -p /var/www/cardesignspace
cp -r dist/* /var/www/cardesignspace/
chown -R www-data:www-data /var/www/cardesignspace

# 启动后端服务
echo "🚀 启动后端服务..."
cd $BACKEND_DIR

# 确保环境变量文件存在
if [ ! -f ".env" ]; then
  echo "❌ .env文件不存在，请创建环境变量配置文件"
  exit 1
fi

# 启动PM2服务
pm2 start ecosystem.config.js

# 保存PM2配置
pm2 save
pm2 startup

# 测试Nginx配置
echo "🔧 检查Nginx配置..."
nginx -t

if [ $? -eq 0 ]; then
  echo "✅ Nginx配置正确，重载配置..."
  systemctl reload nginx
else
  echo "❌ Nginx配置有误，请检查配置文件"
  exit 1
fi

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 5

# 检查服务状态
echo "🔍 检查服务状态..."
pm2 status

# 测试API连接
echo "🧪 测试API连接..."
curl -f http://localhost:3000/api/health > /dev/null 2>&1

if [ $? -eq 0 ]; then
  echo "✅ 后端服务运行正常"
else
  echo "❌ 后端服务可能有问题，请检查日志"
  pm2 logs cardesignspace-backend --lines 20
fi

echo "🎉 部署完成！"
echo ""
echo "📊 服务状态："
echo "  - 后端服务: http://localhost:3000"
echo "  - 前端网站: https://www.cardesignspace.com"
echo ""
echo "🛠️ 管理命令："
echo "  - 查看日志: pm2 logs cardesignspace-backend"
echo "  - 重启服务: pm2 restart cardesignspace-backend"
echo "  - 停止服务: pm2 stop cardesignspace-backend"

echo "🚀 开始构建 CarDesignSpace 汽车图库网站..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目信息
PROJECT_NAME="cardesignspace"
VERSION="1.0.0"
BUILD_DATE=$(date +%Y%m%d_%H%M%S)

echo -e "${BLUE}项目名称:${NC} $PROJECT_NAME"
echo -e "${BLUE}版本:${NC} $VERSION"
echo -e "${BLUE}构建时间:${NC} $BUILD_DATE"

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker 未安装，请先安装 Docker${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose 未安装，请先安装 Docker Compose${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker 环境检查通过${NC}"

# 清理旧的构建文件
echo -e "${YELLOW}🧹 清理旧的构建文件...${NC}"
docker-compose down --remove-orphans 2>/dev/null || true
docker system prune -f

# 构建Docker镜像
echo -e "${YELLOW}🔨 构建 Docker 镜像...${NC}"
docker-compose build --no-cache

# 标记镜像
echo -e "${YELLOW}🏷️  标记镜像...${NC}"
docker tag auto-gallery_backend:latest ${PROJECT_NAME}-backend:${VERSION}
docker tag auto-gallery_frontend:latest ${PROJECT_NAME}-frontend:${VERSION}
docker tag auto-gallery_backend:latest ${PROJECT_NAME}-backend:latest
docker tag auto-gallery_frontend:latest ${PROJECT_NAME}-frontend:latest

# 保存镜像为tar文件
echo -e "${YELLOW}📦 打包镜像...${NC}"
mkdir -p ./docker-images

echo "保存后端镜像..."
docker save ${PROJECT_NAME}-backend:${VERSION} -o ./docker-images/${PROJECT_NAME}-backend-${VERSION}.tar

echo "保存前端镜像..."
docker save ${PROJECT_NAME}-frontend:${VERSION} -o ./docker-images/${PROJECT_NAME}-frontend-${VERSION}.tar

# 创建部署包
echo -e "${YELLOW}📦 创建部署包...${NC}"
DEPLOY_DIR="${PROJECT_NAME}-deploy-${BUILD_DATE}"
mkdir -p $DEPLOY_DIR

# 复制必要文件
cp docker-compose.yml $DEPLOY_DIR/
cp -r docker-images $DEPLOY_DIR/
cp README.md $DEPLOY_DIR/ 2>/dev/null || echo "README.md not found, skipping..."

# 创建服务器部署脚本
cat > $DEPLOY_DIR/server-deploy.sh << 'EOF'
#!/bin/bash

# 服务器部署脚本
echo "🚀 开始在服务器上部署 CarDesignSpace..."

# 加载Docker镜像
echo "📥 加载 Docker 镜像..."
docker load -i docker-images/cardesignspace-backend-1.0.0.tar
docker load -i docker-images/cardesignspace-frontend-1.0.0.tar

# 停止旧服务
echo "🛑 停止旧服务..."
docker-compose down 2>/dev/null || true

# 启动新服务
echo "🚀 启动新服务..."
docker-compose up -d

# 检查服务状态
echo "🔍 检查服务状态..."
sleep 10
docker-compose ps

echo "✅ 部署完成！"
echo "🌐 网站地址: http://your-server-ip"
echo "📊 查看日志: docker-compose logs -f"
EOF

chmod +x $DEPLOY_DIR/server-deploy.sh

# 创建nginx配置文件（用于域名配置）
cat > $DEPLOY_DIR/nginx-domain.conf << 'EOF'
# Nginx配置文件 - 用于域名 www.cardesignspace.com
# 请将此文件放置在服务器的 /etc/nginx/sites-available/ 目录下
# 并创建软链接到 /etc/nginx/sites-enabled/

server {
    listen 80;
    server_name www.cardesignspace.com cardesignspace.com;
    
    # 重定向到HTTPS（如果有SSL证书）
    # return 301 https://$server_name$request_uri;
    
    # 如果暂时不使用HTTPS，可以直接代理到Docker容器
    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# HTTPS配置（需要SSL证书）
# server {
#     listen 443 ssl http2;
#     server_name www.cardesignspace.com cardesignspace.com;
#     
#     ssl_certificate /path/to/your/certificate.crt;
#     ssl_certificate_key /path/to/your/private.key;
#     
#     location / {
#         proxy_pass http://localhost:80;
#         proxy_set_header Host $host;
#         proxy_set_header X-Real-IP $remote_addr;
#         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
#         proxy_set_header X-Forwarded-Proto $scheme;
#     }
# }
EOF

# 创建部署说明文档
cat > $DEPLOY_DIR/DEPLOYMENT_GUIDE.md << 'EOF'
# CarDesignSpace 汽车图库网站部署指南

## 📋 部署前准备

### 服务器要求
- Ubuntu 18.04+ 或 CentOS 7+
- 至少 2GB RAM
- 至少 20GB 磁盘空间
- Docker 和 Docker Compose 已安装

### 域名配置
- 确保域名 `www.cardesignspace.com` 已解析到服务器IP
- 如需HTTPS，请准备SSL证书

## 🚀 部署步骤

### 1. 上传部署包
```bash
# 将整个部署包上传到服务器
scp -r cardesignspace-deploy-* user@your-server:/opt/
```

### 2. 在服务器上执行部署
```bash
cd /opt/cardesignspace-deploy-*
chmod +x server-deploy.sh
sudo ./server-deploy.sh
```

### 3. 配置域名（可选）
```bash
# 复制nginx配置文件
sudo cp nginx-domain.conf /etc/nginx/sites-available/cardesignspace
sudo ln -s /etc/nginx/sites-available/cardesignspace /etc/nginx/sites-enabled/

# 测试nginx配置
sudo nginx -t

# 重启nginx
sudo systemctl restart nginx
```

## 🔧 管理命令

### 查看服务状态
```bash
docker-compose ps
```

### 查看日志
```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f frontend
docker-compose logs -f backend
```

### 重启服务
```bash
docker-compose restart
```

### 停止服务
```bash
docker-compose down
```

### 更新服务
```bash
# 拉取新镜像并重启
docker-compose pull
docker-compose up -d
```

## 🌐 访问网站

- 本地访问: http://server-ip
- 域名访问: http://www.cardesignspace.com

## 📊 监控和维护

### 磁盘空间监控
```bash
df -h
docker system df
```

### 清理无用镜像
```bash
docker system prune -a
```

### 数据库备份（如果使用本地数据库）
```bash
# 备份数据库
docker exec cardesignspace-backend mysqldump -h 49.235.98.5 -u cardesignspace -p cardesignspace > backup.sql
```

## 🆘 故障排除

### 服务无法启动
1. 检查端口是否被占用: `netstat -tlnp | grep :80`
2. 检查Docker服务: `sudo systemctl status docker`
3. 查看详细错误日志: `docker-compose logs`

### 数据库连接失败
1. 检查数据库服务器是否可达: `ping 49.235.98.5`
2. 检查数据库端口: `telnet 49.235.98.5 3306`
3. 验证数据库凭据

### 域名无法访问
1. 检查DNS解析: `nslookup www.cardesignspace.com`
2. 检查nginx配置: `sudo nginx -t`
3. 检查防火墙设置: `sudo ufw status`

## 📞 技术支持

如遇到问题，请联系技术团队或查看项目文档。
EOF

# 打包部署文件
echo -e "${YELLOW}📦 创建最终部署包...${NC}"
tar -czf ${PROJECT_NAME}-deploy-${BUILD_DATE}.tar.gz $DEPLOY_DIR

# 清理临时文件
rm -rf $DEPLOY_DIR
rm -rf docker-images

echo -e "${GREEN}✅ 构建完成！${NC}"
echo -e "${BLUE}部署包:${NC} ${PROJECT_NAME}-deploy-${BUILD_DATE}.tar.gz"
echo -e "${BLUE}文件大小:${NC} $(du -h ${PROJECT_NAME}-deploy-${BUILD_DATE}.tar.gz | cut -f1)"

echo ""
echo -e "${YELLOW}📋 下一步操作:${NC}"
echo "1. 将 ${PROJECT_NAME}-deploy-${BUILD_DATE}.tar.gz 上传到腾讯云服务器"
echo "2. 在服务器上解压: tar -xzf ${PROJECT_NAME}-deploy-${BUILD_DATE}.tar.gz"
echo "3. 进入目录并执行: ./server-deploy.sh"
echo "4. 配置域名解析到服务器IP"
echo "5. 访问 http://www.cardesignspace.com"

echo ""
echo -e "${GREEN}🎉 构建成功完成！${NC}" 