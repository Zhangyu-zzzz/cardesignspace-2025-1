#!/bin/bash

echo "🚀 启动图片标签管理系统..."

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "❌ 请在项目根目录运行此脚本"
    exit 1
fi

# 检查数据库迁移
echo "📊 检查数据库迁移..."
if [ -f "backend/scripts/add-tags-to-images.js" ]; then
    cd backend
    echo "正在运行数据库迁移..."
    node scripts/add-tags-to-images.js
    cd ..
else
    echo "❌ 数据库迁移脚本不存在"
    exit 1
fi

# 启动后端服务
echo "🔧 启动后端服务..."
cd backend
if [ ! -d "node_modules" ]; then
    echo "安装后端依赖..."
    npm install
fi

# 在后台启动后端
echo "启动后端服务器..."
npm start &
BACKEND_PID=$!
cd ..

# 等待后端启动
echo "等待后端服务启动..."
sleep 5

# 启动前端服务
echo "🎨 启动前端服务..."
cd frontend
if [ ! -d "node_modules" ]; then
    echo "安装前端依赖..."
    npm install
fi

echo "启动前端开发服务器..."
npm run serve &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ 图片标签管理系统启动完成！"
echo ""
echo "📱 前端地址: http://localhost:8080"
echo "🔧 后端地址: http://localhost:3000"
echo "🏷️  图片标签管理: http://localhost:8080/image-tagging"
echo ""
echo "💡 使用说明:"
echo "1. 在浏览器中访问 http://localhost:8080"
echo "2. 登录您的账户"
echo "3. 点击右上角用户头像，选择'图片标签管理'"
echo "4. 开始为图片添加标签和分类"
echo ""
echo "🛑 停止服务: 按 Ctrl+C"

# 等待用户中断
trap "echo ''; echo '🛑 正在停止服务...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT

# 保持脚本运行
wait

