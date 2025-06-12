#!/bin/bash

echo "🔍 全面诊断应用运行状态"
echo "======================="

# 检查端口占用
echo "1. 🌐 检查端口占用情况:"
echo "后端端口3000:"
sudo netstat -tlnp | grep :3000 || echo "端口3000未被占用"
echo "前端端口8080:"
sudo netstat -tlnp | grep :8080 || echo "端口8080未被占用"
echo "Nginx端口80:"
sudo netstat -tlnp | grep :80 || echo "端口80未被占用"
echo "Nginx端口443:"
sudo netstat -tlnp | grep :443 || echo "端口443未被占用"
echo ""

# 检查进程
echo "2. 📋 检查相关进程:"
echo "Node.js进程:"
ps aux | grep node | grep -v grep || echo "无Node.js进程"
echo ""
echo "PM2进程:"
ps aux | grep PM2 | grep -v grep || echo "无PM2进程"
echo ""

# 检查服务状态
echo "3. 🔧 检查系统服务:"
echo "Nginx状态:"
sudo systemctl status nginx --no-pager -l || echo "Nginx服务未安装或不可用"
echo ""
echo "检查是否有cardesignspace相关服务:"
sudo systemctl list-units --type=service | grep cardesign || echo "无cardesignspace系统服务"
echo ""

# 检查Docker容器
echo "4. 🐳 检查Docker容器:"
if command -v docker >/dev/null 2>&1; then
    docker ps -a | grep cardesign || echo "无cardesignspace相关容器"
else
    echo "Docker未安装"
fi
echo ""

# 检查环境文件
echo "5. 📄 检查环境配置文件:"
if [ -f ".env" ]; then
    echo "✅ 找到根目录 .env 文件"
    echo "JWT_SECRET配置:"
    grep "^JWT_SECRET=" .env || echo "未找到JWT_SECRET配置"
else
    echo "❌ 根目录无 .env 文件"
fi

if [ -f "backend/.env" ]; then
    echo "✅ 找到backend/.env 文件"
    echo "JWT_SECRET配置:"
    grep "^JWT_SECRET=" backend/.env || echo "未找到JWT_SECRET配置"
else
    echo "❌ backend目录无 .env 文件"
fi
echo ""

# 检查应用目录结构
echo "6. 📁 检查应用目录结构:"
echo "当前目录: $(pwd)"
echo "目录内容:"
ls -la
echo ""
if [ -d "backend" ]; then
    echo "backend目录内容:"
    ls -la backend/ | head -10
else
    echo "❌ 未找到backend目录"
fi
echo ""

# 测试API连接
echo "7. 🔗 测试API连接:"
echo "测试健康检查端点:"
curl -s http://localhost:3000/health || echo "❌ 无法连接到后端API"
curl -s http://localhost:3000/api/health || echo "❌ 无法连接到API端点"
echo ""

# 检查日志文件
echo "8. 📝 检查日志文件:"
echo "PM2日志目录:"
ls -la ~/.pm2/logs/ 2>/dev/null || echo "无PM2日志目录"
echo ""
echo "应用日志目录:"
ls -la logs/ 2>/dev/null || echo "无应用日志目录"
ls -la backend/logs/ 2>/dev/null || echo "无backend日志目录"
echo ""

echo "🚀 建议的修复步骤:"
echo "=================="
echo "1. 如果PM2无进程，运行: cd backend && pm2 start ecosystem.config.js"
echo "2. 如果无环境文件，复制: cp env.example .env"
echo "3. 如果端口被占用，检查: sudo lsof -i :3000"
echo "4. 如果nginx未运行，启动: sudo systemctl start nginx"
echo "5. 查看详细错误日志: pm2 logs --lines 50" 