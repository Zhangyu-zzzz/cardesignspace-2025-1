#!/bin/bash

echo "🚨 生产环境紧急修复脚本"
echo "=========================="

# 1. 备份当前配置
echo "📦 备份当前配置..."
cp backend/src/app.js backend/src/app.js.backup.$(date +%Y%m%d_%H%M%S)

# 2. 临时禁用生产环境防爬虫
echo "🔧 临时禁用生产环境防爬虫..."
sed -i '' 's/process.env.NODE_ENV === "production"/false/g' backend/src/app.js

# 3. 重启后端服务
echo "🔄 重启后端服务..."
pkill -f "node.*app.js" || true
cd backend && npm start &

# 4. 等待服务启动
echo "⏳ 等待服务启动..."
sleep 5

# 5. 测试API
echo "🧪 测试API连接..."
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health

echo ""
echo "✅ 紧急修复完成！"
echo ""
echo "⚠️  重要提醒："
echo "1. 防爬虫系统已临时禁用"
echo "2. 请尽快部署完整的修复版本"
echo "3. 监控系统确保没有恶意攻击"
echo ""
echo "🔄 部署完整修复："
echo "git pull origin main"
echo "npm install"
echo "pm2 restart auto-gallery-backend"
