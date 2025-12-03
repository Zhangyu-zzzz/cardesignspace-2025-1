#!/bin/bash
# 服务器端部署后自动执行脚本
# 此脚本应在服务器上的部署流程中自动调用

set -e  # 遇到错误立即退出

DEPLOY_PATH="/opt/auto-gallery"
LOG_FILE="${DEPLOY_PATH}/deploy.log"

# 记录日志函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=========================================="
log "开始执行部署后配置"
log "=========================================="

cd "$DEPLOY_PATH" || exit 1

# 1. 创建持久化目录
log "创建持久化目录..."
mkdir -p persistent/clip_models
mkdir -p persistent/logs
chmod -R 755 persistent/

# 2. 检查并复制模型文件
log "检查 CLIP 模型文件..."
if [ ! "$(ls -A persistent/clip_models 2>/dev/null)" ]; then
    log "持久化目录为空，尝试复制模型文件..."
    
    # 尝试从当前位置复制
    if [ -d "backend/services/clip_utils/clip-vit-base-patch32" ] && [ "$(ls -A backend/services/clip_utils/clip-vit-base-patch32 2>/dev/null)" ]; then
        log "从 backend 目录复制模型文件..."
        cp -rn backend/services/clip_utils/clip-vit-base-patch32/* persistent/clip_models/ 2>/dev/null || true
        log "✓ 模型文件已复制"
    else
        # 尝试从最近的备份恢复
        LATEST_BACKUP=$(find . -maxdepth 1 -type d -name "backup_*" | sort -r | head -1)
        if [ -n "$LATEST_BACKUP" ] && [ -d "${LATEST_BACKUP}/backend/services/clip_utils/clip-vit-base-patch32" ]; then
            log "从备份恢复模型文件: $LATEST_BACKUP"
            cp -rn "${LATEST_BACKUP}/backend/services/clip_utils/clip-vit-base-patch32/"* persistent/clip_models/ 2>/dev/null || true
            log "✓ 已从备份恢复"
        else
            log "⚠️  未找到模型文件，创建占位符"
            touch persistent/clip_models/.needs_model_files
            log "⚠️  警告：需要手动上传 CLIP 模型文件到 persistent/clip_models/"
        fi
    fi
else
    log "✓ 模型文件已存在"
    MODEL_COUNT=$(ls -1 persistent/clip_models/ 2>/dev/null | wc -l)
    log "  文件数量: $MODEL_COUNT"
fi

# 3. 设置权限
log "设置目录权限..."
chown -R root:root persistent/ 2>/dev/null || true

# 4. 检查容器状态
log "等待容器启动..."
sleep 5

log "检查容器状态..."
docker ps --filter name=auto-gallery --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | tee -a "$LOG_FILE"

# 5. 检查后端日志
log "检查后端日志..."
if docker ps | grep -q auto-gallery-backend; then
    log "后端容器运行中，查看启动日志："
    docker logs auto-gallery-backend --tail 20 2>&1 | tee -a "$LOG_FILE"
    
    # 检查是否有错误
    if docker logs auto-gallery-backend --tail 50 2>&1 | grep -qi "error\|fail\|exception"; then
        log "⚠️  检测到后端可能有错误，建议查看完整日志"
    fi
else
    log "❌ 后端容器未运行"
fi

# 6. 测试服务
log "测试服务连接..."
sleep 3

# 测试前端
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:80 2>/dev/null || echo "000")
log "前端服务状态: $FRONTEND_STATUS"

# 测试后端健康检查
BACKEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health 2>/dev/null || echo "000")
log "后端健康检查状态: $BACKEND_HEALTH"

# 测试后端根路径
BACKEND_ROOT=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null || echo "000")
log "后端根路径状态: $BACKEND_ROOT"

# 7. 部署总结
log "=========================================="
log "部署后配置完成"
log "=========================================="

if [ "$FRONTEND_STATUS" = "200" ] && [ "$BACKEND_HEALTH" = "200" -o "$BACKEND_ROOT" = "200" -o "$BACKEND_ROOT" = "404" ]; then
    log "✅ 服务部署成功"
    exit 0
elif [ "$FRONTEND_STATUS" = "200" ] && [ "$BACKEND_HEALTH" != "200" ]; then
    log "⚠️  前端正常，后端可能有问题"
    log "建议检查："
    log "  1. docker logs auto-gallery-backend"
    log "  2. ls -lh persistent/clip_models/"
    log "  3. docker exec auto-gallery-backend env"
    exit 1
else
    log "❌ 服务部署可能失败"
    exit 1
fi

