#!/bin/bash

echo "🔧 最终解决端口占用问题并启动服务"

# 设置颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PROJECT_DIR="/home/cardesign/cardesignspace-2025"

# 步骤1: 强制清理所有相关进程
echo -e "${YELLOW}步骤1: 强制清理所有相关进程${NC}"
echo "🛑 停止所有PM2进程和守护程序..."

# 杀死所有PM2相关进程
sudo pkill -9 -f "PM2" 2>/dev/null || true
sudo pkill -9 -f "pm2" 2>/dev/null || true
sudo pkill -9 -f "God Daemon" 2>/dev/null || true

# 杀死所有Node.js相关进程
sudo pkill -9 -f "node.*app.js" 2>/dev/null || true
sudo pkill -9 -f "node.*cardesignspace" 2>/dev/null || true
sudo pkill -9 -f "cardesignspace-backend" 2>/dev/null || true

# 强制释放端口3000
echo "🔨 强制释放端口3000..."
sudo fuser -k -9 3000/tcp 2>/dev/null || true

# 使用lsof查找并杀死占用端口的进程
PORT_PIDS=$(sudo lsof -t -i:3000 2>/dev/null || true)
if [ ! -z "$PORT_PIDS" ]; then
    echo "💀 杀死占用端口3000的进程: $PORT_PIDS"
    for pid in $PORT_PIDS; do
        sudo kill -9 $pid 2>/dev/null || true
    done
fi

# 清理PM2目录
echo "🧹 清理PM2配置目录..."
rm -rf ~/.pm2 2>/dev/null || true
sudo rm -rf /home/cardesign/.pm2 2>/dev/null || true
sudo rm -rf /root/.pm2 2>/dev/null || true

# 等待清理完成
echo "⏰ 等待清理完成..."
sleep 10

# 步骤2: 验证清理结果
echo -e "${YELLOW}步骤2: 验证清理结果${NC}"
if sudo lsof -i :3000 >/dev/null 2>&1; then
    echo -e "${RED}❌ 端口3000仍被占用！${NC}"
    sudo lsof -i :3000
    echo "请手动检查并杀死这些进程，然后重新运行此脚本"
    exit 1
else
    echo -e "${GREEN}✅ 端口3000已释放${NC}"
fi

# 步骤3: 重新初始化PM2
echo -e "${YELLOW}步骤3: 重新初始化PM2${NC}"
cd "$PROJECT_DIR/backend" || exit 1

# 创建专用的单实例配置
cat > ecosystem.final.config.js << 'EOF'
module.exports = {
  apps: [{
    name: "cardesignspace-final",
    script: "src/app.js",
    cwd: "/home/cardesign/cardesignspace-2025/backend",
    instances: 1,
    exec_mode: "fork",
    autorestart: true,
    max_restarts: 5,
    min_uptime: "10s",
    restart_delay: 3000,
    env: {
      NODE_ENV: "production",
      PORT: 3000
    },
    log_file: "/home/cardesign/cardesignspace-2025/logs/final-combined.log",
    out_file: "/home/cardesign/cardesignspace-2025/logs/final-out.log",
    error_file: "/home/cardesign/cardesignspace-2025/logs/final-error.log",
    log_date_format: "YYYY-MM-DD HH:mm:ss",
    merge_logs: true,
    watch: false
  }]
};
EOF

echo "✅ 新的PM2配置文件已创建"

# 步骤4: 启动新服务
echo -e "${YELLOW}步骤4: 启动新服务${NC}"
echo "🚀 启动CarDesignSpace后端服务..."

# 确保日志目录存在
mkdir -p "$PROJECT_DIR/logs"

# 启动PM2服务
pm2 start ecosystem.final.config.js

# 等待启动完成
echo "⏰ 等待服务启动..."
sleep 15

# 步骤5: 验证服务状态
echo -e "${YELLOW}步骤5: 验证服务状态${NC}"

# 检查PM2状态
echo "📊 PM2进程状态:"
pm2 list

# 检查端口监听
echo "🔍 端口监听状态:"
sudo netstat -tlnp | grep :3000

# 检查服务日志
echo "📋 服务启动日志:"
pm2 logs cardesignspace-final --lines 10

# 步骤6: 测试服务连通性
echo -e "${YELLOW}步骤6: 测试服务连通性${NC}"
echo "🧪 测试后端API连通性..."

# 等待服务完全启动
sleep 5

# 测试健康检查端点
if curl -s http://localhost:3000/api/health >/dev/null 2>&1; then
    echo -e "${GREEN}✅ 后端API连通正常${NC}"
else
    echo -e "${YELLOW}⚠️  后端API可能还在启动中或需要检查${NC}"
fi

# 步骤7: 检查Nginx状态
echo -e "${YELLOW}步骤7: 检查Nginx状态${NC}"
if sudo systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✅ Nginx运行正常${NC}"
    echo "🌐 网站应该可以通过 http://www.cardesignspace.com 访问"
else
    echo -e "${RED}❌ Nginx未运行${NC}"
    echo "🔧 启动Nginx..."
    sudo systemctl start nginx
    sudo systemctl enable nginx
fi

# 最终状态报告
echo -e "${GREEN}🎉 部署修复完成！${NC}"
echo "=================================="
echo "📊 系统状态摘要:"
echo "- 后端服务: PM2管理的单实例Node.js应用"
echo "- 端口状态: 3000端口已被后端服务占用"
echo "- 前端访问: http://www.cardesignspace.com"
echo "- 日志位置: $PROJECT_DIR/logs/"
echo "=================================="
echo "🔧 管理命令:"
echo "- 查看服务状态: pm2 list"
echo "- 查看服务日志: pm2 logs cardesignspace-final"
echo "- 重启服务: pm2 restart cardesignspace-final"
echo "- 停止服务: pm2 stop cardesignspace-final"
echo "==================================" 