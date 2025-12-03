#!/bin/bash

echo "🚀 设置自动化爬虫系统..."

# 1. 安装依赖
echo "📦 安装依赖..."
cd "$(dirname "$0")/.."
npm install cheerio

# 2. 创建数据库表
echo "🗄️  创建数据库表..."
node scripts/create-crawler-tables.js

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ 自动化爬虫系统设置完成！"
  echo ""
  echo "📝 下一步："
  echo "1. 启动服务: npm start"
  echo "2. 使用API创建监控页面（需要管理员权限）"
  echo "3. 查看文档: docs/features/auto-crawler-guide.md"
  echo ""
else
  echo "❌ 设置失败，请检查错误信息"
  exit 1
fi






