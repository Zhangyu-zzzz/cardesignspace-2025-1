#!/bin/bash

echo "🚀 部署服务器修复..."
echo "=================================="

# 1. 上传修复后的配置到服务器
echo "📤 上传配置到服务器..."
scp backend/.env.production root@49.235.98.5:/opt/auto-gallery/backend/.env.production

# 2. 在服务器上重启服务
echo "🔄 重启服务器服务..."
ssh root@49.235.98.5 << 'REMOTE_SCRIPT'
cd /opt/auto-gallery

# 使用生产环境配置
cp backend/.env.production backend/.env

# 重启后端服务
pm2 restart cardesignspace-backend

# 检查服务状态
pm2 status

# 检查日志
pm2 logs cardesignspace-backend --lines 10
REMOTE_SCRIPT

echo "✅ 服务器修复完成"
echo "🌐 请访问 https://www.cardesignspace.com/upload 测试上传功能"
