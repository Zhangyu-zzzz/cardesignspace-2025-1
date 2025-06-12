#!/bin/bash

echo "🚀 启动后端服务"
echo "==============="

# 进入后端目录
cd ~/cardesignspace-2025/backend

# 检查.env文件
if [ ! -f "../.env" ]; then
    echo "❌ .env文件不存在，创建默认配置..."
    cp ../env.example ../.env
    echo "⚠️  请编辑 .env 文件配置数据库信息！"
fi

# 检查package.json
if [ ! -f "package.json" ]; then
    echo "❌ package.json不存在！"
    exit 1
fi

# 安装依赖
echo "📦 安装依赖..."
npm install

# 检查是否有ecosystem.config.js
if [ -f "ecosystem.config.js" ]; then
    echo "✅ 使用PM2配置文件启动..."
    pm2 start ecosystem.config.js
else
    echo "⚠️  没有找到ecosystem.config.js，使用默认方式启动..."
    # 直接启动
    pm2 start src/app.js --name "backend" --env production
fi

# 检查启动状态
sleep 3
pm2 status

# 测试服务
echo ""
echo "🔍 测试服务..."
curl -s http://localhost:3000/api/brands | head -50

echo ""
echo "✅ 启动完成！"
echo "如果有问题，查看日志: pm2 logs backend" 