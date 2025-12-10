#!/bin/bash

echo "=================================================="
echo "🔄 重启生产环境服务"
echo "=================================================="
echo ""

# 服务器配置
SERVER_HOST="49.235.98.5"
SERVER_USER="root"
BACKEND_DIR="/root/cardesignspace-2025/backend"

echo "📋 正在连接服务器: $SERVER_HOST"
echo ""

ssh $SERVER_USER@$SERVER_HOST << 'EOF'

set -e  # 遇到错误立即退出

echo "=================================================="
echo "1️⃣  停止现有服务"
echo "=================================================="

# 停止PM2进程
if command -v pm2 &> /dev/null; then
    echo "🛑 停止PM2进程..."
    pm2 delete all 2>/dev/null || echo "没有运行中的PM2进程"
    pm2 kill 2>/dev/null || true
fi

# 停止可能的后台Node进程
echo "🛑 停止后台Node进程..."
pkill -f "node.*src/app.js" || echo "没有找到后台Node进程"

sleep 2

echo ""
echo "=================================================="
echo "2️⃣  检查环境"
echo "=================================================="

cd /root/cardesignspace-2025/backend

# 检查.env文件
if [ ! -f ".env" ]; then
    echo "❌ 错误: 找不到.env文件！"
    echo "请先创建.env文件并配置数据库连接信息"
    exit 1
fi

echo "✅ .env文件存在"

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误: Node.js未安装！"
    exit 1
fi

NODE_VERSION=$(node -v)
echo "✅ Node.js版本: $NODE_VERSION"

# 检查npm
if ! command -v npm &> /dev/null; then
    echo "❌ 错误: npm未安装！"
    exit 1
fi

NPM_VERSION=$(npm -v)
echo "✅ npm版本: $NPM_VERSION"

echo ""
echo "=================================================="
echo "3️⃣  检查数据库连接"
echo "=================================================="

# 从.env读取数据库配置
DB_HOST=$(grep "^DB_HOST=" .env | cut -d '=' -f2 | tr -d ' "'"'"'')
DB_PORT=$(grep "^DB_PORT=" .env | cut -d '=' -f2 | tr -d ' "'"'"'')
DB_USER=$(grep "^DB_USER=" .env | cut -d '=' -f2 | tr -d ' "'"'"'')
DB_PASSWORD=$(grep "^DB_PASSWORD=" .env | cut -d '=' -f2 | tr -d ' "'"'"'')
DB_NAME=$(grep "^DB_NAME=" .env | cut -d '=' -f2 | tr -d ' "'"'"'')

echo "📊 尝试连接数据库..."
echo "   Host: ${DB_HOST:-localhost}"
echo "   Port: ${DB_PORT:-3306}"
echo "   User: $DB_USER"
echo "   Database: $DB_NAME"

if command -v mysql &> /dev/null; then
    if mysql -h"${DB_HOST:-localhost}" -P"${DB_PORT:-3306}" -u"$DB_USER" -p"$DB_PASSWORD" -e "USE $DB_NAME; SELECT 1;" 2>/dev/null; then
        echo "✅ 数据库连接成功"
    else
        echo "❌ 数据库连接失败！请检查数据库配置和服务状态"
        echo ""
        echo "💡 可能的原因:"
        echo "   1. MySQL服务未启动: systemctl start mysql"
        echo "   2. 数据库用户密码错误"
        echo "   3. 数据库不存在"
        exit 1
    fi
else
    echo "⚠️  MySQL客户端未安装，跳过数据库测试"
fi

echo ""
echo "=================================================="
echo "4️⃣  更新依赖"
echo "=================================================="

echo "📦 安装/更新npm依赖..."
npm install --production

echo ""
echo "=================================================="
echo "5️⃣  启动后端服务"
echo "=================================================="

# 确保logs目录存在
mkdir -p logs

# 使用PM2启动（如果可用）
if command -v pm2 &> /dev/null; then
    echo "🚀 使用PM2启动后端服务..."
    
    # 检查是否有ecosystem配置
    if [ -f "ecosystem.config.js" ]; then
        pm2 start ecosystem.config.js
    else
        # 使用简单的PM2启动
        pm2 start src/app.js --name "cardesignspace-backend" --log logs/backend.log --error logs/error.log
    fi
    
    # 保存PM2配置
    pm2 save
    
    # 设置PM2开机自启（如果还没设置）
    pm2 startup systemd -u root --hp /root 2>/dev/null || true
    
    echo ""
    echo "📊 PM2状态:"
    pm2 list
    
    echo ""
    echo "📝 查看实时日志: pm2 logs"
else
    echo "⚠️  PM2未安装，使用nohup后台启动..."
    
    # 使用nohup后台启动
    NODE_ENV=production nohup node src/app.js > logs/backend.log 2> logs/error.log &
    BACKEND_PID=$!
    
    echo "✅ 后端服务已启动，PID: $BACKEND_PID"
    
    # 保存PID
    echo $BACKEND_PID > backend.pid
fi

sleep 3

echo ""
echo "=================================================="
echo "6️⃣  验证服务启动"
echo "=================================================="

# 检查进程
if ps aux | grep -v grep | grep "node.*src/app.js" > /dev/null; then
    echo "✅ 后端进程正在运行"
else
    echo "❌ 后端进程未找到！检查日志:"
    tail -n 30 logs/backend.log
    tail -n 30 logs/error.log 2>/dev/null || true
    exit 1
fi

# 检查端口
sleep 2
if netstat -tlnp 2>/dev/null | grep ":3000" > /dev/null || ss -tlnp 2>/dev/null | grep ":3000" > /dev/null; then
    echo "✅ 端口3000正在监听"
else
    echo "❌ 端口3000未监听！"
    echo "检查日志:"
    tail -n 30 logs/backend.log
    exit 1
fi

# 测试健康检查
echo ""
echo "🔍 测试健康检查端点..."
sleep 2

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/health)

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ 健康检查通过 (HTTP $HTTP_CODE)"
else
    echo "❌ 健康检查失败 (HTTP $HTTP_CODE)"
    echo "检查日志:"
    tail -n 30 logs/backend.log
fi

echo ""
echo "=================================================="
echo "7️⃣  重启Nginx"
echo "=================================================="

echo "🔄 重启Nginx..."
systemctl restart nginx

if systemctl is-active --quiet nginx; then
    echo "✅ Nginx已重启"
else
    echo "❌ Nginx启动失败！"
    systemctl status nginx --no-pager
    exit 1
fi

echo ""
echo "=================================================="
echo "✅ 服务重启完成！"
echo "=================================================="
echo ""
echo "📊 服务状态:"
echo "   后端服务: ✅ 运行中"
echo "   Nginx: ✅ 运行中"
echo ""
echo "🔗 访问地址:"
echo "   https://www.cardesignspace.com"
echo ""
echo "💡 有用的命令:"
if command -v pm2 &> /dev/null; then
    echo "   查看日志: pm2 logs"
    echo "   查看状态: pm2 list"
    echo "   重启服务: pm2 restart all"
else
    echo "   查看日志: tail -f /root/cardesignspace-2025/backend/logs/backend.log"
    echo "   查看进程: ps aux | grep node"
fi
echo "   查看Nginx日志: tail -f /var/log/nginx/cardesignspace_error.log"
echo ""

EOF

echo ""
echo "✅ 完成！"

