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
echo -e "${BLUE}🔍 诊断后端服务问题${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo -e "${YELLOW}1. 检查后端容器日志${NC}"
echo "----------------------------"
ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
echo "后端容器日志（最后50行）："
docker logs auto-gallery-backend --tail 50
echo ""
ENDSSH

echo ""
echo -e "${YELLOW}2. 检查持久化目录${NC}"
echo "----------------------------"
ssh ${SERVER_USER}@${SERVER_IP} << ENDSSH
cd ${DEPLOY_PATH}
echo "检查 persistent 目录："
ls -la persistent/ 2>/dev/null || echo "❌ persistent 目录不存在"
echo ""
echo "检查 clip_models 目录："
ls -lh persistent/clip_models/ 2>/dev/null || echo "❌ clip_models 目录不存在"
echo ""
ENDSSH

echo ""
echo -e "${YELLOW}3. 创建必要的目录并重启${NC}"
echo "----------------------------"
ssh ${SERVER_USER}@${SERVER_IP} << ENDSSH
cd ${DEPLOY_PATH}

# 创建持久化目录
echo "创建持久化目录..."
mkdir -p persistent/clip_models
mkdir -p persistent/logs

# 检查旧位置是否有模型文件
if [ -d "backend/services/clip_utils/clip-vit-base-patch32" ] && [ "\$(ls -A backend/services/clip_utils/clip-vit-base-patch32 2>/dev/null)" ]; then
    echo "发现现有模型文件，复制到持久化目录..."
    cp -rn backend/services/clip_utils/clip-vit-base-patch32/* persistent/clip_models/ 2>/dev/null || true
    echo "✓ 模型文件已复制"
else
    echo "⚠️  未找到模型文件，将从备份恢复..."
    # 尝试从最近的备份恢复
    LATEST_BACKUP=\$(ls -td backup_*/ 2>/dev/null | head -1)
    if [ -n "\$LATEST_BACKUP" ] && [ -d "\${LATEST_BACKUP}backend/services/clip_utils/clip-vit-base-patch32" ]; then
        echo "从备份 \$LATEST_BACKUP 恢复模型文件..."
        cp -rn "\${LATEST_BACKUP}backend/services/clip_utils/clip-vit-base-patch32/"* persistent/clip_models/ 2>/dev/null || true
        echo "✓ 已从备份恢复"
    else
        echo "⚠️  未找到备份的模型文件"
        echo "创建空的模型目录标记文件..."
        touch persistent/clip_models/.placeholder
    fi
fi

echo ""
echo "持久化目录内容："
ls -lh persistent/clip_models/ | head -10

echo ""
echo "设置目录权限..."
chmod -R 755 persistent/
chown -R root:root persistent/

ENDSSH

echo ""
echo -e "${YELLOW}4. 检查 docker-compose.yml 配置${NC}"
echo "----------------------------"
ssh ${SERVER_USER}@${SERVER_IP} << ENDSSH
cd ${DEPLOY_PATH}
echo "检查 volume 配置："
grep -A 5 "volumes:" docker-compose.yml | grep -A 5 "backend" || echo "⚠️  未找到 backend volumes 配置"
ENDSSH

echo ""
echo -e "${YELLOW}5. 重启后端容器${NC}"
echo "----------------------------"
ssh ${SERVER_USER}@${SERVER_IP} << ENDSSH
cd ${DEPLOY_PATH}
echo "重启后端容器..."
docker-compose restart backend

echo ""
echo "等待10秒让服务启动..."
sleep 10

echo ""
echo "容器状态："
docker ps --filter name=auto-gallery

echo ""
echo "检查后端健康状态："
docker inspect auto-gallery-backend --format='{{.State.Health.Status}}' 2>/dev/null || echo "无健康检查信息"

echo ""
echo "后端日志（最后30行）："
docker logs auto-gallery-backend --tail 30

ENDSSH

echo ""
echo -e "${YELLOW}6. 测试后端服务${NC}"
echo "----------------------------"
ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
echo "测试健康检查端点..."
curl -s -o /dev/null -w "HTTP状态码: %{http_code}\n" http://localhost:3000/api/health

echo ""
echo "测试根端点..."
curl -s -o /dev/null -w "HTTP状态码: %{http_code}\n" http://localhost:3000/

echo ""
echo "测试智能搜索（如果服务正常）..."
RESPONSE=$(curl -s -w "\nHTTP状态码: %{http_code}" -X POST http://localhost:3000/api/smart-search \
  -H "Content-Type: application/json" \
  -d '{"query":"测试","limit":1}' 2>&1)
echo "$RESPONSE"
ENDSSH

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ 诊断和修复完成${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "如果后端仍然失败，可能的原因："
echo "1. CLIP 模型文件缺失或损坏"
echo "2. 数据库连接问题"
echo "3. 环境变量配置错误"
echo "4. 端口冲突"
echo ""
echo "查看完整日志："
echo "  ssh ${SERVER_USER}@${SERVER_IP} 'docker logs auto-gallery-backend'"




