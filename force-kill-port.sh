#!/bin/bash

echo "🚨 强制清理端口3000占用 - 系统级别"

# 1. 强制停止PM2守护进程（所有用户）
echo "🛑 强制停止PM2守护进程..."
sudo pkill -9 -f "PM2" 2>/dev/null || true
sudo pkill -9 -f "pm2" 2>/dev/null || true

# 2. 查找并杀死所有占用端口3000的进程
echo "🔍 查找端口3000占用进程..."
PORT_PIDS=$(sudo lsof -t -i:3000 2>/dev/null || true)
if [ ! -z "$PORT_PIDS" ]; then
    echo "💀 发现占用端口3000的进程: $PORT_PIDS"
    for pid in $PORT_PIDS; do
        echo "杀死进程 $pid..."
        sudo kill -9 $pid 2>/dev/null || true
    done
else
    echo "✅ 没有发现占用端口3000的进程"
fi

# 3. 使用fuser强制释放端口
echo "🔨 使用fuser强制释放端口3000..."
sudo fuser -k -9 3000/tcp 2>/dev/null || echo "fuser: 没有进程占用端口3000"

# 4. 杀死所有Node.js进程（危险操作，但必要）
echo "⚠️  清理所有相关Node.js进程..."
sudo pkill -9 -f "node.*app.js" 2>/dev/null || true
sudo pkill -9 -f "node.*cardesignspace" 2>/dev/null || true
sudo pkill -9 -f "cardesignspace-backend" 2>/dev/null || true

# 5. 清理PM2相关文件
echo "🧹 清理PM2相关文件..."
rm -rf ~/.pm2 2>/dev/null || true
sudo rm -rf /home/cardesign/.pm2 2>/dev/null || true

# 6. 等待系统清理
echo "⏰ 等待系统清理完成..."
sleep 10

# 7. 最终检查
echo "🔍 最终检查端口状态:"
sudo lsof -i :3000 2>/dev/null || echo "✅ 端口3000已完全释放"
sudo netstat -tlnp | grep :3000 || echo "✅ 确认端口3000无进程监听"

echo "✅ 端口清理完成！现在可以安全启动服务了。" 