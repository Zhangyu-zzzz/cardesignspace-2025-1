#!/bin/bash

echo "🚀 单进程模式启动服务"

PROJECT_DIR="/home/cardesign/cardesignspace-2025"
BACKEND_DIR="$PROJECT_DIR/backend"

# 1. 确保在正确目录
cd "$BACKEND_DIR" || {
    echo "❌ 无法进入后端目录: $BACKEND_DIR"
    exit 1
}

# 2. 验证环境变量文件
if [ ! -f ".env" ]; then
    echo "❌ 缺少.env文件"
    exit 1
fi

echo "✅ 环境配置文件存在"

# 3. 验证入口文件
if [ ! -f "src/app.js" ]; then
    echo "❌ 缺少入口文件: src/app.js"
    exit 1
fi

echo "✅ 入口文件存在"

# 4. 检查端口状态
echo "🔍 检查端口3000状态..."
if sudo lsof -i :3000 >/dev/null 2>&1; then
    echo "❌ 端口3000仍被占用，请先运行 ./force-kill-port.sh"
    sudo lsof -i :3000
    exit 1
fi

echo "✅ 端口3000可用"

# 5. 创建新的PM2配置文件（单进程模式）
cat > ecosystem.single.config.js << 'EOFCONFIG'
module.exports = {
  apps: [{
    name: "cardesignspace-backend-single",
    script: "src/app.js",
    cwd: "/home/cardesign/cardesignspace-2025/backend",
    instances: 1,  // 强制单实例
    exec_mode: "fork",  // 使用fork模式而非cluster
    env: {
      NODE_ENV: "production",
      PORT: 3000
    },
    log_file: "/home/cardesign/cardesignspace-2025/logs/backend-combined.log",
    out_file: "/home/cardesign/cardesignspace-2025/logs/backend-out.log",
    error_file: "/home/cardesign/cardesignspace-2025/logs/backend-error.log",
    log_date_format: "YYYY-MM-DD HH:mm:ss",
    merge_logs: true,
    max_restarts: 3,  // 限制重启次数
    min_uptime: "10s",  // 最小运行时间
    restart_delay: 5000,  // 重启延迟5秒
    watch: false,
    ignore_watch: ["node_modules", "logs"]
  }]
};
EOFCONFIG

echo "✅ 单进程PM2配置已创建"

# 6. 启动服务
echo "🚀 启动单进程服务..."
pm2 start ecosystem.single.config.js

# 7. 等待启动
echo "⏰ 等待服务启动..."
sleep 8

# 8. 检查服务状态
echo "📊 检查服务状态..."
pm2 list

# 9. 检查端口监听
echo "🔍 检查端口监听:"
sudo netstat -tlnp | grep :3000

# 10. 显示最新日志
echo "📋 最新启动日志:"
pm2 logs cardesignspace-backend-single --lines 5

echo "✅ 服务启动完成！"
echo "🌐 访问地址: http://www.cardesignspace.com" 