#!/bin/bash

# 修复PM2环境变量配置脚本
# 用于确保PM2进程能正确加载.env文件中的环境变量

echo "🔧 修复PM2环境变量配置..."
echo "=================================="

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$BACKEND_DIR")"

echo "项目根目录: $PROJECT_ROOT"
echo "Backend目录: $BACKEND_DIR"

# 检查.env文件
if [ -f "$BACKEND_DIR/.env" ]; then
    echo "✅ 找到backend/.env文件"
    ENV_FILE="$BACKEND_DIR/.env"
elif [ -f "$PROJECT_ROOT/.env" ]; then
    echo "✅ 找到项目根目录.env文件"
    ENV_FILE="$PROJECT_ROOT/.env"
else
    echo "❌ 未找到.env文件"
    exit 1
fi

# 检查COS配置
echo ""
echo "检查COS配置..."
if grep -q "COS_BUCKET=" "$ENV_FILE"; then
    COS_BUCKET=$(grep "COS_BUCKET=" "$ENV_FILE" | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    echo "✅ COS_BUCKET: $COS_BUCKET"
else
    echo "❌ 未找到COS_BUCKET配置"
fi

if grep -q "TENCENT_SECRET_ID=" "$ENV_FILE"; then
    SECRET_ID=$(grep "TENCENT_SECRET_ID=" "$ENV_FILE" | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    SECRET_ID_DISPLAY="${SECRET_ID:0:4}...${SECRET_ID: -4}"
    echo "✅ TENCENT_SECRET_ID: $SECRET_ID_DISPLAY"
else
    echo "❌ 未找到TENCENT_SECRET_ID配置"
fi

# 重启PM2服务以加载新的环境变量
echo ""
echo "🔄 重启PM2服务..."
cd "$BACKEND_DIR"

# 停止现有服务
pm2 stop cardesignspace-backend 2>/dev/null || true

# 删除现有服务
pm2 delete cardesignspace-backend 2>/dev/null || true

# 重新启动服务（会自动加载.env文件）
pm2 start ecosystem.config.js

# 保存PM2配置
pm2 save

echo ""
echo "✅ PM2服务已重启"
echo ""
echo "检查服务状态..."
sleep 2
pm2 status

echo ""
echo "📋 验证环境变量..."
echo "运行以下命令检查环境变量是否正确加载："
echo "  pm2 env 0 | grep COS"
echo ""
echo "或者运行诊断脚本："
echo "  cd $BACKEND_DIR && node scripts/check-cos-config.js"

