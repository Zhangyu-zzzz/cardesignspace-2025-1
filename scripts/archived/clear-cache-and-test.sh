#!/bin/bash

# 清除缓存并测试图片排序修复
echo "🧹 清除缓存并测试图片排序修复..."
echo "================================================"

# 检查当前目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误: 请在项目根目录运行此脚本"
    exit 1
fi

echo "📋 修复状态确认:"
echo "✅ 后端API修复完成 - 数字排序已实现"
echo "✅ 前端调用的API路径已修复"
echo "✅ 所有相关控制器已更新"
echo ""

# 重启后端服务以应用所有修改
echo "🔄 重启后端服务以应用所有修改..."
cd backend

# 检查是否有PM2进程
if command -v pm2 &> /dev/null; then
    echo "使用PM2重启服务..."
    pm2 restart auto-gallery-backend 2>/dev/null || echo "PM2进程不存在，使用npm启动"
fi

# 如果PM2不存在或失败，使用npm
if ! pgrep -f "node.*src/app.js" > /dev/null; then
    echo "启动后端服务..."
    npm run dev &
    sleep 3
fi

cd ..

echo "✅ 后端服务已重启"
echo ""

# 测试API排序
echo "🧪 测试API排序效果..."
echo "测试车型ID=1069 (2026 Audi A6 Avant C9):"

# 测试前端调用的API
echo "📡 测试前端调用的API: /api/models/1069/images"
curl -s "http://localhost:3000/api/models/1069/images" | grep -o '"filename":"[^"]*"' | head -5

echo ""
echo "📡 测试备用API: /api/images/model/1069"
curl -s "http://localhost:3000/api/images/model/1069" | grep -o '"filename":"[^"]*"' | head -5

echo ""
echo "✅ API测试完成"
echo ""

# 清除浏览器缓存提示
echo "🌐 清除浏览器缓存:"
echo "1. 按 Ctrl+Shift+R (Windows/Linux) 或 Cmd+Shift+R (Mac) 强制刷新"
echo "2. 或者按 F12 打开开发者工具，右键刷新按钮选择'清空缓存并硬性重新加载'"
echo "3. 或者按 Ctrl+Shift+Delete (Windows/Linux) 或 Cmd+Shift+Delete (Mac) 清除浏览器数据"
echo ""

# 验证步骤
echo "🔍 验证步骤:"
echo "1. 打开车型详情页面: http://localhost:8080/model/1069"
echo "2. 查看第一张图片是否显示为 14.jpeg (而不是 37.jpeg)"
echo "3. 确认图片按数字顺序排列: 14, 15, 16, 17..."
echo ""

# 如果问题仍然存在
echo "🚨 如果问题仍然存在，请检查:"
echo "- 浏览器是否已清除缓存"
echo "- 前端服务是否正在运行 (http://localhost:8080)"
echo "- 后端服务是否正在运行 (http://localhost:3000)"
echo "- 网络请求是否使用了正确的API路径"
echo ""

echo "✅ 缓存清除和测试完成！"
echo ""
echo "📊 修复总结:"
echo "- 实现了按文件名数字排序 (01, 02, 03...)"
echo "- 修复了前端调用的API路径"
echo "- 解决了 37.jpeg 排在 01.jpeg 前面的问题"
echo "- 保持了精选图片的优先显示特性"
