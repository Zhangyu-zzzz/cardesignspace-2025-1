#!/bin/bash

# 这个脚本应该在云服务器上运行
# 登录服务器后执行：bash diagnose-on-server.sh

echo "=================================================="
echo "🔍 云服务器502错误诊断工具"
echo "=================================================="
echo ""

echo "=================================================="
echo "1️⃣  检查后端服务运行状态"
echo "=================================================="

# 检查Node.js进程
BACKEND_PID=$(ps aux | grep "node.*src/app.js" | grep -v grep | awk '{print $2}')

if [ -z "$BACKEND_PID" ]; then
    echo "❌ 后端服务未运行！"
    echo ""
    echo "🔍 检查最近的后端日志:"
    if [ -f "/root/cardesignspace-2025/backend/logs/backend.log" ]; then
        echo "--- 最后50行后端日志 ---"
        tail -n 50 /root/cardesignspace-2025/backend/logs/backend.log
    else
        echo "⚠️  找不到后端日志文件"
    fi
    
    if [ -f "/root/cardesignspace-2025/backend/logs/error.log" ]; then
        echo ""
        echo "--- 最后50行错误日志 ---"
        tail -n 50 /root/cardesignspace-2025/backend/logs/error.log
    fi
else
    echo "✅ 后端服务正在运行"
    echo "   PID: $BACKEND_PID"
    echo "   进程详情:"
    ps aux | grep $BACKEND_PID | grep -v grep
fi

echo ""
echo "=================================================="
echo "2️⃣  检查端口监听状态"
echo "=================================================="

# 检查3000端口
PORT_3000=$(netstat -tlnp 2>/dev/null | grep ":3000" || ss -tlnp 2>/dev/null | grep ":3000")

if [ -z "$PORT_3000" ]; then
    echo "❌ 端口3000未被监听！"
else
    echo "✅ 端口3000正在监听"
    echo "   $PORT_3000"
fi

# 检查443端口
PORT_443=$(netstat -tlnp 2>/dev/null | grep ":443" || ss -tlnp 2>/dev/null | grep ":443")

if [ -z "$PORT_443" ]; then
    echo "❌ 端口443未被监听！Nginx可能没有运行"
else
    echo "✅ 端口443正在监听"
fi

echo ""
echo "=================================================="
echo "3️⃣  检查Nginx状态"
echo "=================================================="

if systemctl is-active --quiet nginx; then
    echo "✅ Nginx正在运行"
    echo "   配置文件测试:"
    nginx -t 2>&1
else
    echo "❌ Nginx未运行！"
    systemctl status nginx --no-pager | head -n 20
fi

echo ""
echo "=================================================="
echo "4️⃣  检查数据库连接"
echo "=================================================="

# 测试MySQL连接
if command -v mysql &> /dev/null; then
    # 尝试从.env读取数据库配置
    if [ -f "/root/cardesignspace-2025/backend/.env" ]; then
        DB_HOST=$(grep "^DB_HOST=" /root/cardesignspace-2025/backend/.env | cut -d '=' -f2 | tr -d ' "'"'"'')
        DB_PORT=$(grep "^DB_PORT=" /root/cardesignspace-2025/backend/.env | cut -d '=' -f2 | tr -d ' "'"'"'')
        DB_USER=$(grep "^DB_USER=" /root/cardesignspace-2025/backend/.env | cut -d '=' -f2 | tr -d ' "'"'"'')
        DB_PASSWORD=$(grep "^DB_PASSWORD=" /root/cardesignspace-2025/backend/.env | cut -d '=' -f2 | tr -d ' "'"'"'')
        DB_NAME=$(grep "^DB_NAME=" /root/cardesignspace-2025/backend/.env | cut -d '=' -f2 | tr -d ' "'"'"'')
        
        echo "📊 数据库配置:"
        echo "   Host: ${DB_HOST:-localhost}"
        echo "   Port: ${DB_PORT:-3306}"
        echo "   User: $DB_USER"
        echo "   Database: $DB_NAME"
        echo ""
        
        # 测试连接
        if mysql -h"${DB_HOST:-localhost}" -P"${DB_PORT:-3306}" -u"$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1;" 2>/dev/null; then
            echo "✅ 数据库连接正常"
        else
            echo "❌ 数据库连接失败！"
            echo "尝试检查MySQL服务状态..."
            systemctl status mysql --no-pager | head -n 10
        fi
    else
        echo "⚠️  找不到.env文件"
    fi
else
    echo "⚠️  MySQL客户端未安装，跳过数据库检查"
fi

echo ""
echo "=================================================="
echo "5️⃣  检查磁盘空间"
echo "=================================================="

df -h | head -n 2
echo ""
df -h | grep "/$"
df -h | grep "/root"

DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 90 ]; then
    echo ""
    echo "⚠️  警告: 磁盘使用率过高 ($DISK_USAGE%)！"
    echo "   可能需要清理空间"
fi

echo ""
echo "=================================================="
echo "6️⃣  检查内存使用"
echo "=================================================="

free -h

echo ""
echo "=================================================="
echo "7️⃣  检查最近的Nginx错误日志"
echo "=================================================="

if [ -f "/var/log/nginx/cardesignspace_error.log" ]; then
    echo "--- 最近的Nginx错误日志 (最后20行) ---"
    tail -n 20 /var/log/nginx/cardesignspace_error.log
elif [ -f "/var/log/nginx/error.log" ]; then
    echo "--- 最近的Nginx错误日志 (最后20行) ---"
    tail -n 20 /var/log/nginx/error.log
else
    echo "⚠️  找不到Nginx错误日志"
fi

echo ""
echo "=================================================="
echo "8️⃣  测试本地API连接"
echo "=================================================="

echo "测试健康检查端点:"
HTTP_RESULT=$(curl -s -o /dev/null -w "HTTP状态码: %{http_code}\n" http://127.0.0.1:3000/api/health 2>&1)
echo "$HTTP_RESULT"

if echo "$HTTP_RESULT" | grep -q "200"; then
    echo "✅ 后端API响应正常"
else
    echo "❌ 后端API无响应或错误"
fi

echo ""
echo "=================================================="
echo "📝 诊断总结"
echo "=================================================="

# 生成总结
ISSUES=()

if [ -z "$BACKEND_PID" ]; then
    ISSUES+=("后端服务未运行")
fi

if [ -z "$PORT_3000" ]; then
    ISSUES+=("端口3000未监听")
fi

if ! systemctl is-active --quiet nginx; then
    ISSUES+=("Nginx未运行")
fi

if [ ${#ISSUES[@]} -eq 0 ]; then
    echo "✅ 所有检查通过！如果仍有502错误，请检查防火墙和域名解析"
else
    echo "❌ 发现以下问题:"
    for issue in "${ISSUES[@]}"; do
        echo "   - $issue"
    done
    echo ""
    echo "💡 建议操作:"
    echo "   1. 如果后端未运行，执行: cd /root/cardesignspace-2025/backend && pm2 start ecosystem.config.js"
    echo "      或者: cd /root/cardesignspace-2025/backend && NODE_ENV=production node src/app.js"
    echo "   2. 如果Nginx未运行，执行: systemctl start nginx"
    echo "   3. 查看后端日志: tail -f /root/cardesignspace-2025/backend/logs/backend.log"
    echo "   4. 如果问题仍然存在，可以运行完整重启脚本"
fi

echo ""
echo "=================================================="




