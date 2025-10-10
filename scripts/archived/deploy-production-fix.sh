#!/bin/bash

echo "🚨 生产环境紧急修复部署脚本"
echo "=============================="

# 1. 备份当前配置
echo "📦 备份当前配置..."
cp backend/src/app.js backend/src/app.js.backup.$(date +%Y%m%d_%H%M%S)

# 2. 拉取最新代码
echo "📥 拉取最新代码..."
git pull origin main

# 3. 安装依赖
echo "📦 安装依赖..."
npm install

# 4. 重启后端服务
echo "🔄 重启后端服务..."
pm2 restart auto-gallery-backend

# 5. 等待服务启动
echo "⏳ 等待服务启动..."
sleep 10

# 6. 测试API
echo "🧪 测试API连接..."
curl -s -o /dev/null -w "%{http_code}" https://www.cardesignspace.com/api/health

echo ""
echo "✅ 紧急修复部署完成！"
echo ""
echo "🔍 检查项目："
echo "1. 访问 https://www.cardesignspace.com"
echo "2. 检查API是否正常工作"
echo "3. 确认没有403错误"
echo ""
echo "⚠️  重要提醒："
echo "- 防爬虫系统已临时完全禁用"
echo "- 网站应该可以正常访问"
echo "- 请监控系统确保安全"
echo ""
echo "🔄 后续恢复防爬虫："
echo "1. 测试网站功能正常后"
echo "2. 重新启用防爬虫保护"
echo "3. 监控系统安全状态"
