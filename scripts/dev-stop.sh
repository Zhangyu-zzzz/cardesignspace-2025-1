#!/bin/bash

# 开发环境停止脚本
# 用于停止本地 Docker 开发环境

set -e

echo "🛑 停止 CardesignSpace 开发环境..."

# 停止所有服务
docker-compose -f docker-compose.dev.yml down

# 可选：清理数据卷（谨慎使用）
if [ "$1" = "--clean" ]; then
    echo "🧹 清理数据卷..."
    docker-compose -f docker-compose.dev.yml down -v
    docker volume prune -f
    echo "✅ 数据卷已清理"
fi

echo "✅ 开发环境已停止"
