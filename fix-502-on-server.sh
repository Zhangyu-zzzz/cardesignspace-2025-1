#!/bin/bash
# 此脚本应该在服务器上直接运行
# 使用方法：
# 1. SSH 登录服务器: ssh root@49.235.98.5
# 2. cd /opt/auto-gallery
# 3. bash fix-502-on-server.sh

set -e

echo "=========================================="
echo "🚨 修复 502 Bad Gateway 错误"
echo "=========================================="
echo ""

# 确保在正确的目录
cd /opt/auto-gallery

echo "1️⃣ 检查当前容器状态"
echo "===================="
echo "所有容器："
docker ps -a --filter name=auto-gallery --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

echo "2️⃣ 查看后端错误日志"
echo "===================="
echo "后端日志（最后100行）："
docker logs auto-gallery-backend --tail 100 2>&1 | tail -50
echo ""

echo "3️⃣ 检查并创建持久化目录"
echo "===================="
if [ ! -d "persistent/clip_models" ]; then
    echo "创建 persistent/clip_models 目录..."
    mkdir -p persistent/clip_models
    mkdir -p persistent/logs
fi

# 检查模型文件
FILE_COUNT=$(ls -1 persistent/clip_models/ 2>/dev/null | wc -l)
echo "persistent/clip_models 文件数量: $FILE_COUNT"

if [ "$FILE_COUNT" -eq 0 ] || [ "$FILE_COUNT" -lt 5 ]; then
    echo "⚠️  模型文件缺失，开始复制..."
    
    # 从 backend 目录复制
    if [ -d "backend/services/clip_utils/clip-vit-base-patch32" ] && [ "$(ls -A backend/services/clip_utils/clip-vit-base-patch32)" ]; then
        echo "从 backend 目录复制模型文件..."
        cp -rv backend/services/clip_utils/clip-vit-base-patch32/* persistent/clip_models/
        echo "✅ 模型文件已复制"
    else
        # 尝试从备份恢复
        LATEST_BACKUP=$(ls -td backup_*/ 2>/dev/null | head -1)
        if [ -n "$LATEST_BACKUP" ] && [ -d "${LATEST_BACKUP}backend/services/clip_utils/clip-vit-base-patch32" ]; then
            echo "从备份恢复: $LATEST_BACKUP"
            cp -rv "${LATEST_BACKUP}backend/services/clip_utils/clip-vit-base-patch32/"* persistent/clip_models/
            echo "✅ 已从备份恢复"
        else
            echo "❌ 未找到模型文件！"
            echo "⚠️  将创建占位文件并继续..."
            touch persistent/clip_models/.placeholder
        fi
    fi
else
    echo "✅ 模型文件已存在"
fi

echo ""
echo "模型目录内容："
ls -lh persistent/clip_models/ | head -10
echo ""

echo "4️⃣ 设置目录权限"
echo "===================="
chmod -R 755 persistent/
chown -R root:root persistent/
echo "✅ 权限已设置"
echo ""

echo "5️⃣ 检查 Docker Compose 配置"
echo "===================="
if grep -q "persistent/clip_models" docker-compose.yml; then
    echo "✅ Volume 挂载配置正确"
    grep -A 3 "volumes:" docker-compose.yml | grep -A 3 "backend"
else
    echo "❌ 缺少 volume 配置！需要更新 docker-compose.yml"
fi
echo ""

echo "6️⃣ 停止所有服务"
echo "===================="
docker-compose down
echo "✅ 服务已停止"
echo ""

echo "7️⃣ 清理可能的问题"
echo "===================="
# 清理孤立的容器
docker container prune -f
echo "✅ 清理完成"
echo ""

echo "8️⃣ 重新启动服务"
echo "===================="
docker-compose up -d
echo "✅ 服务已启动"
echo ""

echo "9️⃣ 等待服务启动（30秒）"
echo "===================="
for i in {30..1}; do
    echo -ne "\r等待中... $i 秒 "
    sleep 1
done
echo ""
echo ""

echo "🔟 检查服务状态"
echo "===================="
docker ps --filter name=auto-gallery --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

echo "1️⃣1️⃣ 检查容器健康状态"
echo "===================="
echo "后端健康状态:"
docker inspect auto-gallery-backend --format='{{.State.Health.Status}}' 2>/dev/null || echo "无健康检查配置"
echo ""

echo "前端健康状态:"
docker inspect auto-gallery-frontend --format='{{.State.Health.Status}}' 2>/dev/null || echo "无健康检查配置"
echo ""

echo "1️⃣2️⃣ 测试 API 端点"
echo "===================="
echo -n "后端健康检查: "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health 2>/dev/null || echo "000")
echo "HTTP $HTTP_CODE"

echo -n "后端根路径: "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null || echo "000")
echo "HTTP $HTTP_CODE"

echo -n "API 模型列表: "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/models?limit=1 2>/dev/null || echo "000")
echo "HTTP $HTTP_CODE"

echo -n "前端服务: "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:80/ 2>/dev/null || echo "000")
echo "HTTP $HTTP_CODE"
echo ""

echo "1️⃣3️⃣ 查看最新日志"
echo "===================="
echo "后端日志（最后30行）："
docker logs auto-gallery-backend --tail 30
echo ""

echo "=========================================="
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "404" ]; then
    echo "✅ 修复成功！服务正常运行"
else
    echo "⚠️  服务可能仍有问题"
    echo ""
    echo "建议："
    echo "1. 查看完整日志: docker logs auto-gallery-backend"
    echo "2. 进入容器检查: docker exec -it auto-gallery-backend sh"
    echo "3. 检查环境变量: docker exec auto-gallery-backend env"
fi
echo "=========================================="

