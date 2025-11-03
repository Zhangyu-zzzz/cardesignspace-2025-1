#!/bin/bash

echo "🔧 部署权限修复..."
echo "=================================="

# 服务器信息
SERVER_IP="49.235.98.5"
SERVER_USER="root"
SERVER_PATH="/opt/auto-gallery"

echo "📤 上传修复后的路由文件到服务器..."
scp backend/src/routes/upload.js ${SERVER_USER}@${SERVER_IP}:${SERVER_PATH}/backend/src/routes/upload.js

if [ $? -eq 0 ]; then
    echo "✅ 路由文件上传成功"
else
    echo "❌ 路由文件上传失败"
    exit 1
fi

echo "🔄 在服务器上重启服务..."

# 在服务器上执行修复
ssh ${SERVER_USER}@${SERVER_IP} << EOF
cd ${SERVER_PATH}

echo "🔄 重启后端服务..."
pm2 restart cardesignspace-backend

echo "⏳ 等待服务启动..."
sleep 5

echo "🔍 检查服务状态..."
pm2 status cardesignspace-backend

echo "✅ 权限修复完成"
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 权限修复部署完成！"
    echo "=================================="
    echo "📋 修复内容："
    echo "   - 车型创建API现在允许所有认证用户访问"
    echo "   - 不再需要admin或editor角色"
    echo ""
    echo "🌐 请重新测试上传功能："
    echo "   https://www.cardesignspace.com/upload"
else
    echo "❌ 权限修复部署失败"
    exit 1
fi

