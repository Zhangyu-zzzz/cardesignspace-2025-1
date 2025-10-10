#!/bin/bash

# 开发环境启动脚本
# 用于启动本地 Docker 开发环境

set -e

echo "🚀 启动 CardesignSpace 开发环境..."

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker 未运行，请先启动 Docker"
    exit 1
fi

# 检查 .env.dev 文件是否存在
if [ ! -f ".env.dev" ]; then
    echo "❌ .env.dev 文件不存在，请先创建开发环境配置文件"
    exit 1
fi

# 停止可能存在的旧容器
echo "🛑 停止现有容器..."
docker-compose -f docker-compose.dev.yml down --remove-orphans

# 清理未使用的镜像和容器
echo "🧹 清理 Docker 资源..."
docker system prune -f

# 构建并启动服务
echo "🔨 构建并启动开发环境..."
docker-compose -f docker-compose.dev.yml up --build -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 10

# 检查服务状态
echo "📊 检查服务状态..."
docker-compose -f docker-compose.dev.yml ps

# 显示服务访问信息
echo ""
echo "✅ 开发环境启动完成！"
echo ""
echo "📱 服务访问地址："
echo "   - 前端: http://localhost:8080"
echo "   - 后端: http://localhost:3000"
echo "   - 数据库: localhost:3306"
echo "   - MinIO: http://localhost:9000 (admin: minioadmin/minioadmin)"
echo "   - Redis: localhost:6379"
echo ""
echo "🔧 管理命令："
echo "   - 查看日志: docker-compose -f docker-compose.dev.yml logs -f"
echo "   - 停止服务: docker-compose -f docker-compose.dev.yml down"
echo "   - 重启服务: docker-compose -f docker-compose.dev.yml restart"
echo "   - 进入容器: docker exec -it cardesignspace-backend-dev bash"
echo ""
echo "📝 开发提示："
echo "   - 代码修改会自动热重载"
echo "   - 数据库数据持久化在 Docker volume 中"
echo "   - 日志文件在 ./backend/logs/ 目录"
