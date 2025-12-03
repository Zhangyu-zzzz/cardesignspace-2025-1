#!/bin/bash

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SERVER_IP="49.235.98.5"
SERVER_USER="root"
DEPLOY_PATH="/opt/auto-gallery"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🚀 准备服务器进行部署${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo -e "${YELLOW}步骤 1: 清理 Docker 资源${NC}"
echo "----------------------------"
ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
echo "清理停止的容器..."
docker container prune -f

echo "清理未使用的镜像..."
docker image prune -a -f

echo "清理构建缓存..."
docker builder prune -a -f

echo "清理网络..."
docker network prune -f

echo ""
echo "清理后磁盘状态："
df -h / | grep -v Filesystem
echo ""
docker system df
ENDSSH

echo ""
echo -e "${YELLOW}步骤 2: 设置持久化目录${NC}"
echo "----------------------------"
ssh ${SERVER_USER}@${SERVER_IP} << ENDSSH
cd ${DEPLOY_PATH}

# 创建持久化目录
mkdir -p persistent/clip_models
mkdir -p persistent/logs

# 如果模型文件还在旧位置，移动它们
if [ -d "backend/services/clip_utils/clip-vit-base-patch32" ]; then
    echo "发现现有模型文件，移动到持久化目录..."
    cp -rn backend/services/clip_utils/clip-vit-base-patch32/* persistent/clip_models/ 2>/dev/null || true
    echo "✓ 模型文件已移动"
else
    echo "⚠️  未找到现有模型文件"
fi

echo ""
echo "持久化目录内容："
ls -lh persistent/clip_models/ 2>/dev/null | head -10 || echo "目录为空"
ENDSSH

echo ""
echo -e "${YELLOW}步骤 3: 清理旧备份${NC}"
echo "----------------------------"
ssh ${SERVER_USER}@${SERVER_IP} << ENDSSH
cd ${DEPLOY_PATH}
echo "删除7天前的备份..."
find . -maxdepth 1 -name "backup_*" -type d -mtime +7 -exec rm -rf {} \; 2>/dev/null
find . -name "*.backup.*" -mtime +7 -delete 2>/dev/null
echo "✓ 旧备份已清理"
ENDSSH

echo ""
echo -e "${YELLOW}步骤 4: 检查环境配置${NC}"
echo "----------------------------"
ssh ${SERVER_USER}@${SERVER_IP} << ENDSSH
cd ${DEPLOY_PATH}
if [ -f ".env" ]; then
    echo "✓ .env 文件存在"
    echo "检查关键配置..."
    grep -E "CLIP_SERVICE_URL|QDRANT_HOST|QDRANT_PORT" .env || echo "⚠️  缺少 CLIP/Qdrant 配置"
else
    echo "⚠️  未找到 .env 文件"
fi
ENDSSH

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ 服务器准备完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "磁盘空间已清理，可以开始部署"
echo ""
echo -e "${YELLOW}注意事项：${NC}"
echo "1. CLIP 模型文件现在存储在: ${DEPLOY_PATH}/persistent/clip_models/"
echo "2. 日志文件将存储在: ${DEPLOY_PATH}/persistent/logs/"
echo "3. 这些目录通过 Docker volume 挂载到容器中"
echo "4. 如果模型文件缺失，需要手动上传或重新下载"
echo ""

