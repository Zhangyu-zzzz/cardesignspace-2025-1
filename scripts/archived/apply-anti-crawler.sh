#!/bin/bash

echo "🛡️  应用防爬虫配置..."

# 1. 安装依赖
echo "📦 安装防爬虫依赖..."
cd backend
npm install ioredis@^5.3.0

# 2. 重启后端服务
echo "🔄 重启后端服务..."
pm2 restart auto-gallery-backend

# 3. 重新加载Nginx配置
echo "🔄 重新加载Nginx配置..."
nginx -t && nginx -s reload

# 4. 设置监控脚本权限
echo "🔧 设置监控脚本权限..."
chmod +x backend/scripts/monitor-crawlers.js

echo ""
echo "✅ 防爬虫配置已应用！"
echo ""
echo "🛡️  已启用的防护措施："
echo ""
echo "📋 robots.txt 配置："
echo "  - 禁止访问 /api/ 路径"
echo "  - 禁止访问管理页面"
echo "  - 阻止常见恶意爬虫"
echo "  - 允许搜索引擎正常访问"
echo ""
echo "🔒 Nginx 防护："
echo "  - 请求频率限制 (API: 10r/s, 一般: 30r/s)"
echo "  - 连接数限制"
echo "  - 恶意User-Agent检测"
echo "  - 可疑路径阻止"
echo "  - 恶意文件类型阻止"
echo ""
echo "🛡️  后端防护："
echo "  - 多层频率限制"
echo "  - 恶意User-Agent检测"
echo "  - 可疑请求模式检测"
echo "  - IP黑名单机制"
echo "  - 详细请求日志"
echo ""
echo "📊 监控工具："
echo "  - 日志分析脚本: node backend/scripts/monitor-crawlers.js"
echo "  - 实时监控: node backend/scripts/monitor-crawlers.js --realtime"
echo ""
echo "💡 使用建议："
echo "  1. 定期运行监控脚本检查可疑活动"
echo "  2. 关注 Nginx 和 后端日志"
echo "  3. 根据实际情况调整频率限制参数"
echo "  4. 考虑使用 CDN 和 WAF 服务"
echo ""
echo "🚨 如果发现异常活动，请立即："
echo "  1. 检查监控报告"
echo "  2. 分析访问日志"
echo "  3. 必要时封禁恶意IP"
echo "  4. 联系安全团队"
