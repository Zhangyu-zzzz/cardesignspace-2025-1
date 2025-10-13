#!/bin/bash

echo "🚀 开始部署到生产环境..."
echo "=================================="

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误: 请在项目根目录运行此脚本"
    exit 1
fi

# 1. 构建前端
echo "📦 构建前端应用..."
cd frontend

# 使用生产环境配置
cp .env.production .env

# 安装依赖
npm install

# 构建生产版本
npm run build

if [ ! -d "dist" ]; then
    echo "❌ 前端构建失败"
    exit 1
fi

echo "✅ 前端构建完成"

# 2. 准备后端
echo "🔧 准备后端服务..."
cd ../backend

# 使用生产环境配置
cp .env.production .env

# 安装依赖
npm install

echo "✅ 后端准备完成"

# 3. 重启服务
echo "🔄 重启服务..."

# 停止现有服务
pm2 stop cardesignspace-backend 2>/dev/null || true
pm2 delete cardesignspace-backend 2>/dev/null || true

# 启动后端服务
pm2 start ecosystem.config.js

# 保存PM2配置
pm2 save

echo "✅ 服务重启完成"

# 4. 更新nginx配置
echo "🌐 更新nginx配置..."
sudo cp ../nginx.production.conf /etc/nginx/sites-available/cardesignspace
sudo ln -sf /etc/nginx/sites-available/cardesignspace /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

echo "✅ nginx配置已更新"

# 5. 检查服务状态
echo "🔍 检查服务状态..."
sleep 5

# 检查后端服务
if curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
    echo "✅ 后端服务运行正常"
else
    echo "❌ 后端服务检查失败"
    pm2 logs cardesignspace-backend --lines 10
fi

# 检查nginx
if sudo systemctl is-active --quiet nginx; then
    echo "✅ nginx服务运行正常"
else
    echo "❌ nginx服务检查失败"
fi

echo ""
echo "🎉 部署完成！"
echo "=================================="
echo "🌐 网站地址: https://www.cardesignspace.com"
echo "📱 上传页面: https://www.cardesignspace.com/upload"
echo "🔧 后端API: https://www.cardesignspace.com/api"
echo ""
echo "📋 后续步骤:"
echo "1. 检查网站功能是否正常"
echo "2. 测试上传功能"
echo "3. 检查日志文件: pm2 logs cardesignspace-backend"
echo "4. 检查nginx日志: sudo tail -f /var/log/nginx/cardesignspace_error.log"
