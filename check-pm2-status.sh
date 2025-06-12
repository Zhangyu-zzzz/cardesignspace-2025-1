#!/bin/bash

echo "🔍 检查PM2状态和进程..."
echo "========================"

# 检查PM2是否安装
if ! command -v pm2 >/dev/null 2>&1; then
    echo "❌ PM2未安装"
    echo "安装PM2: npm install -g pm2"
    exit 1
fi

echo "✅ PM2已安装"
echo ""

# 检查所有PM2进程
echo "📋 当前PM2进程列表:"
pm2 list

echo ""
echo "📊 PM2进程JSON信息:"
pm2 jlist

echo ""
echo "🔧 可能的解决方案:"
echo "=================="

# 检查当前目录是否有PM2配置文件
if [ -f "backend/ecosystem.config.js" ]; then
    echo "发现ecosystem.config.js配置文件"
    echo "配置文件内容:"
    cat backend/ecosystem.config.js
    echo ""
    echo "🚀 启动PM2进程:"
    echo "cd backend && pm2 start ecosystem.config.js --env production"
elif [ -f "ecosystem.config.js" ]; then
    echo "发现ecosystem.config.js配置文件"
    echo "配置文件内容:"
    cat ecosystem.config.js
    echo ""
    echo "🚀 启动PM2进程:"
    echo "pm2 start ecosystem.config.js --env production"
else
    echo "❌ 未找到ecosystem.config.js文件"
    echo ""
    echo "🚀 手动启动后端服务:"
    echo "方案1: 直接启动"
    echo "cd backend && pm2 start src/app.js --name cardesignspace-backend"
    echo ""
    echo "方案2: 使用package.json脚本"
    echo "cd backend && pm2 start npm --name cardesignspace-backend -- start"
fi

echo ""
echo "🔄 如果进程已存在但名称不同:"
echo "=============================="
echo "1. 查看所有进程: pm2 list"
echo "2. 重启进程: pm2 restart [进程名或ID]"
echo "3. 查看环境变量: pm2 env [进程名或ID] | grep JWT_SECRET"
echo "4. 删除所有进程: pm2 delete all"
echo "5. 重新启动: 使用上面的启动命令"

echo ""
echo "🐛 调试提示:"
echo "============"
echo "如果服务正在运行但PM2没有管理，可能是:"
echo "1. 使用了systemd服务"
echo "2. 使用了docker容器"
echo "3. 直接用node命令启动"
echo ""
echo "检查其他运行方式:"
echo "ps aux | grep node"
echo "systemctl status cardesignspace*"
echo "docker ps | grep cardesign" 