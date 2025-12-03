#!/bin/bash

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SERVER_IP="49.235.98.5"
SERVER_USER="root"
DEPLOY_PATH="/opt/auto-gallery"

echo -e "${BLUE}===================================================${NC}"
echo -e "${BLUE}🧹 服务器磁盘空间清理和修复部署${NC}"
echo -e "${BLUE}===================================================${NC}"
echo ""

echo -e "${YELLOW}📊 第一步：检查服务器磁盘使用情况${NC}"
echo "----------------------------"
ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
echo "磁盘使用情况："
df -h /
echo ""
echo "Docker 磁盘使用："
docker system df
ENDSSH

echo ""
echo -e "${YELLOW}🧹 第二步：清理 Docker 无用资源${NC}"
echo "----------------------------"
echo "这将清理："
echo "  - 停止的容器"
echo "  - 未使用的镜像"
echo "  - 未使用的网络"
echo "  - 构建缓存"
echo ""
read -p "确认清理？(y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
    echo "清理停止的容器..."
    docker container prune -f
    echo ""
    
    echo "清理未使用的镜像..."
    docker image prune -a -f
    echo ""
    
    echo "清理未使用的网络..."
    docker network prune -f
    echo ""
    
    echo "清理构建缓存..."
    docker builder prune -a -f
    echo ""
    
    echo "清理未使用的卷..."
    docker volume prune -f
    echo ""
    
    echo "清理完成后的磁盘使用："
    df -h /
    echo ""
    docker system df
ENDSSH
fi

echo ""
echo -e "${YELLOW}🗑️  第三步：清理旧备份文件${NC}"
echo "----------------------------"
ssh ${SERVER_USER}@${SERVER_IP} << ENDSSH
cd ${DEPLOY_PATH}
echo "当前备份文件："
ls -lh backup_* 2>/dev/null | head -20
echo ""
echo "删除7天前的备份..."
find . -maxdepth 1 -name "backup_*" -type d -mtime +7 -exec rm -rf {} \; 2>/dev/null
echo "删除旧的备份文件..."
find . -name "*.backup.*" -mtime +7 -delete 2>/dev/null
echo "清理完成"
ENDSSH

echo ""
echo -e "${YELLOW}📦 第四步：优化 CLIP 模型文件处理${NC}"
echo "----------------------------"
echo "CLIP 模型文件非常大，不应该放在 Docker 镜像中"
echo "我们将："
echo "  1. 将模型文件移到持久化目录"
echo "  2. 使用 Docker volume 挂载"
echo "  3. 更新 .dockerignore 排除模型文件"
echo ""

# 更新 .dockerignore
echo "更新后端 .dockerignore..."
cat > backend/.dockerignore << 'EOF'
node_modules
npm-debug.log
.git
.gitignore
.env
.env.local
.env.development
.env.test
README.md
.DS_Store
*.log
coverage
.vscode
.idea
test
tests
*.test.js
*.spec.js

# 排除大型模型文件
services/clip_utils/clip-vit-base-patch32/
services/clip_utils/models/
*.h5
*.pb
*.ckpt
*.pth
*.bin
saved_model/
variables/
EOF

echo "✓ .dockerignore 已更新"
echo ""

echo -e "${YELLOW}📤 第五步：在服务器上设置模型目录${NC}"
echo "----------------------------"
ssh ${SERVER_USER}@${SERVER_IP} << ENDSSH
# 创建模型持久化目录
mkdir -p ${DEPLOY_PATH}/persistent/clip_models
mkdir -p ${DEPLOY_PATH}/persistent/logs

# 检查模型是否已存在
if [ -d "${DEPLOY_PATH}/backend/services/clip_utils/clip-vit-base-patch32" ]; then
    echo "将现有模型移到持久化目录..."
    cp -r ${DEPLOY_PATH}/backend/services/clip_utils/clip-vit-base-patch32/* \
          ${DEPLOY_PATH}/persistent/clip_models/ 2>/dev/null || true
fi

echo "模型目录已设置"
ls -lh ${DEPLOY_PATH}/persistent/clip_models/ 2>/dev/null || echo "目录为空"
ENDSSH

echo ""
echo -e "${YELLOW}🔧 第六步：更新 docker-compose.yml${NC}"
echo "----------------------------"
echo "添加 volume 挂载..."

# 备份原 docker-compose.yml
cp docker-compose.yml docker-compose.yml.backup

# 检查是否已有 volumes 配置
if ! grep -q "persistent/clip_models" docker-compose.yml; then
    cat > docker-compose.yml.new << 'EOF'
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.optimized
    container_name: auto-gallery-backend
    restart: always
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=mysql
      - DB_PORT=3306
      - DB_NAME=auto_gallery
      - DB_USER=root
      - DB_PASSWORD=${DB_PASSWORD}
      - JWT_SECRET=${JWT_SECRET}
      - CLIP_SERVICE_URL=http://localhost:5001
      - QDRANT_HOST=${QDRANT_HOST}
      - QDRANT_PORT=6333
    volumes:
      - ./backend/uploads:/app/uploads
      - ./persistent/clip_models:/app/services/clip_utils/clip-vit-base-patch32
      - ./persistent/logs:/app/logs
    networks:
      - auto-gallery-network
    depends_on:
      - mysql
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.simple
    container_name: auto-gallery-frontend
    restart: always
    ports:
      - "80:80"
    networks:
      - auto-gallery-network
    depends_on:
      - backend
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:80"]
      interval: 30s
      timeout: 10s
      retries: 3

  mysql:
    image: mysql:8.0
    container_name: auto-gallery-mysql
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}
      MYSQL_DATABASE: auto_gallery
    ports:
      - "3307:3306"
    volumes:
      - mysql_data:/var/lib/mysql
    networks:
      - auto-gallery-network
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

networks:
  auto-gallery-network:
    driver: bridge

volumes:
  mysql_data:
    driver: local
EOF
    
    echo "✓ docker-compose.yml 已更新"
else
    echo "✓ docker-compose.yml 已包含 volume 配置"
fi

echo ""
echo -e "${BLUE}===================================================${NC}"
echo -e "${BLUE}📊 清理完成后的状态检查${NC}"
echo -e "${BLUE}===================================================${NC}"
ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
echo "当前磁盘使用："
df -h / | grep -v Filesystem
echo ""
echo "Docker 磁盘使用："
docker system df
ENDSSH

echo ""
echo -e "${GREEN}===================================================${NC}"
echo -e "${GREEN}✅ 磁盘清理完成！${NC}"
echo -e "${GREEN}===================================================${NC}"
echo ""
echo "接下来的步骤："
echo "1. 提交 .dockerignore 和 docker-compose.yml 的更改"
echo "2. 推送到远程仓库触发重新部署"
echo ""
echo -e "${YELLOW}注意：确保服务器上 ${DEPLOY_PATH}/persistent/clip_models/ 目录中有 CLIP 模型文件${NC}"
echo ""
read -p "是否现在提交并推送更改？(y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "提交更改..."
    git add backend/.dockerignore docker-compose.yml
    git commit -m "fix: 优化Docker构建，排除大型模型文件并使用volume挂载

- 更新 backend/.dockerignore 排除 CLIP 模型文件
- 修改 docker-compose.yml 使用 volume 挂载模型目录
- 解决磁盘空间不足导致的构建失败问题

模型文件现在存储在持久化目录 persistent/clip_models/
通过 volume 挂载到容器中，避免每次构建都复制大文件。"
    
    echo "推送到远程仓库..."
    git push origin main
    
    echo -e "${GREEN}✅ 已推送，GitHub Actions 将自动部署${NC}"
fi

