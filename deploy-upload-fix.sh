#!/bin/bash

echo "🚀 部署上传功能修复到服务器..."
echo "=================================="

# 服务器信息
SERVER_IP="49.235.98.5"
SERVER_USER="root"
SERVER_PATH="/opt/auto-gallery"

# 检查本地配置
if [ ! -f "backend/.env.production" ]; then
    echo "❌ 错误: 找不到 backend/.env.production 文件"
    exit 1
fi

echo "📤 上传修复后的配置到服务器..."

# 上传配置文件
scp backend/.env.production ${SERVER_USER}@${SERVER_IP}:${SERVER_PATH}/backend/.env.production

if [ $? -eq 0 ]; then
    echo "✅ 配置文件上传成功"
else
    echo "❌ 配置文件上传失败"
    exit 1
fi

echo "🔄 在服务器上应用修复..."

# 在服务器上执行修复
ssh ${SERVER_USER}@${SERVER_IP} << EOF
cd ${SERVER_PATH}

echo "📝 应用生产环境配置..."
cp backend/.env.production backend/.env

echo "🔄 重启后端服务..."
pm2 restart cardesignspace-backend

echo "⏳ 等待服务启动..."
sleep 5

echo "🔍 检查服务状态..."
pm2 status cardesignspace-backend

echo "📋 查看最近日志..."
pm2 logs cardesignspace-backend --lines 20

echo "✅ 服务器修复完成"
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 上传功能修复完成！"
    echo "=================================="
    echo "🌐 请访问以下链接测试上传功能："
    echo "   https://www.cardesignspace.com/upload"
    echo ""
    echo "🔧 如果仍有问题，请检查："
    echo "   1. 服务器日志: ssh root@49.235.98.5 'pm2 logs cardesignspace-backend'"
    echo "   2. 服务状态: ssh root@49.235.98.5 'pm2 status'"
    echo "   3. 数据库连接: ssh root@49.235.98.5 'cd /opt/auto-gallery && node -e \"require(\\\"dotenv\\\").config(); console.log(\\\"DB_HOST:\\\", process.env.DB_HOST)\"'"
else
    echo "❌ 服务器修复失败，请检查网络连接和服务器状态"
    exit 1
fi


