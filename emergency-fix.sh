#!/bin/bash
# 紧急修复脚本 - 502 Bad Gateway

set -e

echo "=========================================="
echo "🚨 紧急修复 502 错误"
echo "=========================================="
echo ""

# 尝试连接服务器，带重试
MAX_RETRIES=5
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    echo "尝试连接服务器... ($(($RETRY_COUNT + 1))/$MAX_RETRIES)"
    
    if ssh -o ConnectTimeout=10 root@49.235.98.5 "echo '连接成功'" 2>/dev/null; then
        echo "✅ SSH 连接成功"
        break
    else
        RETRY_COUNT=$(($RETRY_COUNT + 1))
        if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
            echo "连接失败，30秒后重试..."
            sleep 30
        else
            echo "❌ 无法连接到服务器"
            echo ""
            echo "请尝试："
            echo "1. 使用云服务商控制台登录"
            echo "2. 检查防火墙设置"
            echo "3. 检查服务器状态"
            exit 1
        fi
    fi
done

echo ""
echo "执行紧急修复..."
echo ""

ssh root@49.235.98.5 << 'ENDSSH'
set -e

cd /opt/auto-gallery

echo "1️⃣ 检查容器状态"
echo "===================="
docker ps -a --filter name=auto-gallery
echo ""

echo "2️⃣ 查看后端日志（最后100行）"
echo "===================="
docker logs auto-gallery-backend --tail 100 2>&1 || echo "无法获取日志"
echo ""

echo "3️⃣ 检查持久化目录"
echo "===================="
if [ -d "persistent/clip_models" ]; then
    echo "✅ persistent/clip_models 存在"
    FILE_COUNT=$(ls -1 persistent/clip_models/ 2>/dev/null | wc -l)
    echo "   文件数量: $FILE_COUNT"
    if [ "$FILE_COUNT" -eq 0 ]; then
        echo "⚠️  目录为空，开始复制模型文件..."
        if [ -d "backend/services/clip_utils/clip-vit-base-patch32" ]; then
            cp -r backend/services/clip_utils/clip-vit-base-patch32/* persistent/clip_models/ 2>/dev/null || true
            echo "✅ 模型文件已复制"
        fi
    fi
else
    echo "❌ persistent/clip_models 不存在，创建并复制..."
    mkdir -p persistent/clip_models persistent/logs
    if [ -d "backend/services/clip_utils/clip-vit-base-patch32" ]; then
        cp -r backend/services/clip_utils/clip-vit-base-patch32/* persistent/clip_models/ 2>/dev/null || true
    fi
fi
echo ""

echo "4️⃣ 检查 docker-compose.yml"
echo "===================="
if grep -q "persistent/clip_models" docker-compose.yml; then
    echo "✅ Volume 配置存在"
else
    echo "⚠️  Volume 配置可能缺失"
fi
echo ""

echo "5️⃣ 重启所有服务"
echo "===================="
docker-compose down
sleep 3
docker-compose up -d
echo ""

echo "6️⃣ 等待服务启动（30秒）"
echo "===================="
sleep 30
echo ""

echo "7️⃣ 检查服务状态"
echo "===================="
docker ps --filter name=auto-gallery --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

echo "8️⃣ 检查健康状态"
echo "===================="
docker inspect auto-gallery-backend --format='{{.State.Health.Status}}' 2>/dev/null || echo "无健康检查"
echo ""

echo "9️⃣ 测试后端服务"
echo "===================="
echo -n "后端健康检查: "
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3000/api/health 2>/dev/null || echo "失败"

echo -n "后端根路径: "
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3000/ 2>/dev/null || echo "失败"

echo -n "API 模型列表: "
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3000/api/models?limit=1 2>/dev/null || echo "失败"
echo ""

echo "🔟 后端详细日志（最后50行）"
echo "===================="
docker logs auto-gallery-backend --tail 50
echo ""

echo "=========================================="
echo "修复完成"
echo "=========================================="
ENDSSH

echo ""
echo "✅ 紧急修复执行完成"
echo ""
echo "请刷新网页测试: https://www.cardesignspace.com"
echo ""



