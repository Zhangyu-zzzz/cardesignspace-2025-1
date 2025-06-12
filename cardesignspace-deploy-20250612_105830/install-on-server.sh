#!/bin/bash

# ===========================================
# 🚀 服务器端安装脚本
# ===========================================

echo "🚀 开始在服务器上安装 Car Design Space..."

# 检查是否是root用户
if [ "$EUID" -ne 0 ]; then
  echo "❌ 请使用root用户运行此脚本"
  exit 1
fi

# 设置项目目录
PROJECT_DIR="/root/auto-gallery"

# 创建项目目录
mkdir -p $PROJECT_DIR

# 复制文件到项目目录
echo "📂 复制文件到项目目录..."
cp -r backend $PROJECT_DIR/
cp -r frontend $PROJECT_DIR/

# 设置权限
chown -R root:root $PROJECT_DIR
chmod +x $PROJECT_DIR/backend/src/app.js

echo "✅ 文件复制完成"
echo "📍 项目已安装到: $PROJECT_DIR"
echo ""
echo "🔧 接下来请："
echo "1. 配置 $PROJECT_DIR/backend/.env 文件"
echo "2. 运行部署脚本: ./deploy-production.sh"
