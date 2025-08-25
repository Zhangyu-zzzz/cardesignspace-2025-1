#!/bin/bash
set -e

echo "🚀 开始自动部署..."

# 获取当前时间作为版本标识
DEPLOY_TIME=$(date +"%Y%m%d_%H%M%S")
echo "部署时间: $DEPLOY_TIME"

# 备份当前版本
echo "📦 备份当前版本..."
if [ -d "/home/$USER/auto-gallery" ]; then
    if [ -d "/home/$USER/auto-gallery-backup" ]; then
        rm -rf /home/$USER/auto-gallery-backup
    fi
    cp -r /home/$USER/auto-gallery /home/$USER/auto-gallery-backup
    echo "✅ 备份完成: /home/$USER/auto-gallery-backup"
fi

# 停止现有服务
echo "🛑 停止现有服务..."
docker stop auto-gallery-backend auto-gallery-frontend 2>/dev/null || true
docker rm auto-gallery-backend auto-gallery-frontend 2>/dev/null || true
echo "✅ 现有服务已停止"

# 创建项目目录
echo "📁 创建项目目录..."
mkdir -p /home/$USER/auto-gallery
cd /home/$USER/auto-gallery

# 复制新文件
echo "📋 复制新文件..."
cp -r backend ./
cp -r frontend ./
cp nginx.conf ./
cp start.sh ./

# 设置权限
chmod +x start.sh

# 构建Docker镜像
echo "🔨 构建Docker镜像..."

echo "构建后端镜像..."
cd backend
docker build -t auto-gallery-backend:latest .
cd ..

echo "构建前端镜像..."
cd frontend
docker build -t auto-gallery-frontend:latest .
cd ..

# 启动服务
echo "🚀 启动服务..."
./start.sh

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 30

# 健康检查
echo "🏥 执行健康检查..."

# 检查后端服务
echo "检查后端服务..."
for i in {1..10}; do
    if curl -f http://localhost:3001/api/health >/dev/null 2>&1; then
        echo "✅ 后端服务健康检查通过"
        break
    else
        echo "⏳ 等待后端服务启动... ($i/10)"
        sleep 10
    fi
done

if ! curl -f http://localhost:3001/api/health >/dev/null 2>&1; then
    echo "❌ 后端服务健康检查失败"
    echo "查看后端日志:"
    docker logs auto-gallery-backend --tail 50
    exit 1
fi

# 检查前端服务
echo "检查前端服务..."
for i in {1..10}; do
    if curl -f http://localhost:8080 >/dev/null 2>&1; then
        echo "✅ 前端服务健康检查通过"
        break
    else
        echo "⏳ 等待前端服务启动... ($i/10)"
        sleep 10
    fi
done

if ! curl -f http://localhost:8080 >/dev/null 2>&1; then
    echo "❌ 前端服务健康检查失败"
    echo "查看前端日志:"
    docker logs auto-gallery-frontend --tail 50
    exit 1
fi

# 清理旧镜像
echo "🧹 清理旧镜像..."
docker image prune -f

echo "🎉 部署完成！"
echo "📊 服务状态:"
echo "   - 前端: http://$(hostname -I | awk '{print $1}'):8080"
echo "   - 后端: http://$(hostname -I | awk '{print $1}'):3001"
echo "   - 健康检查: http://$(hostname -I | awk '{print $1}'):3001/api/health"
echo "📅 部署时间: $DEPLOY_TIME"
