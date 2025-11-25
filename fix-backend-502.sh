#!/bin/bash

echo "=== 修复后端 502 错误 ==="
echo ""

# 获取可能的项目路径
POSSIBLE_PATHS=(
    "/opt/auto-gallery"
    "/root/cardesignspace-2025"
    "$(pwd)"
)

BACKEND_PATH=""

# 查找后端目录
for path in "${POSSIBLE_PATHS[@]}"; do
    if [ -d "$path/backend" ] && [ -f "$path/backend/src/app.js" ]; then
        BACKEND_PATH="$path/backend"
        echo "✅ 找到后端目录: $BACKEND_PATH"
        break
    fi
done

if [ -z "$BACKEND_PATH" ]; then
    echo "❌ 未找到后端目录，请手动指定路径"
    exit 1
fi

cd "$BACKEND_PATH"

# 1. 检查 PM2 进程
echo ""
echo "1. 检查并重启 PM2 进程..."
if command -v pm2 &> /dev/null; then
    # 停止现有进程
    pm2 stop cardesignspace-backend 2>/dev/null
    pm2 delete cardesignspace-backend 2>/dev/null
    
    # 等待进程完全停止
    sleep 2
    
    # 检查端口是否释放
    if lsof -i :3000 &> /dev/null; then
        echo "⚠️  端口 3000 仍被占用，尝试强制释放..."
        lsof -ti :3000 | xargs kill -9 2>/dev/null
        sleep 1
    fi
    
    # 启动服务
    echo "启动后端服务..."
    pm2 start ecosystem.config.js
    
    # 等待服务启动
    sleep 3
    
    # 检查状态
    if pm2 list | grep -q "cardesignspace-backend.*online"; then
        echo "✅ 后端服务已启动"
        pm2 logs cardesignspace-backend --lines 10 --nostream
    else
        echo "❌ 后端服务启动失败，查看错误日志："
        pm2 logs cardesignspace-backend --lines 20 --nostream
        exit 1
    fi
else
    echo "⚠️  PM2 未安装，尝试使用 npm start..."
    # 检查是否有 node_modules
    if [ ! -d "node_modules" ]; then
        echo "安装依赖..."
        npm install
    fi
    
    # 启动服务（后台运行）
    nohup npm start > logs/backend.log 2>&1 &
    sleep 3
    
    # 检查是否启动成功
    if curl -s http://127.0.0.1:3000/api/health > /dev/null 2>&1; then
        echo "✅ 后端服务已启动"
    else
        echo "❌ 后端服务启动失败，查看日志："
        tail -20 logs/backend.log
        exit 1
    fi
fi

# 2. 测试 API
echo ""
echo "2. 测试后端 API..."
sleep 2
if curl -s http://127.0.0.1:3000/api/health > /dev/null 2>&1; then
    echo "✅ 后端 API 响应正常"
    curl -s http://127.0.0.1:3000/api/health | head -5
else
    echo "❌ 后端 API 无响应"
    echo "查看最新日志："
    if command -v pm2 &> /dev/null; then
        pm2 logs cardesignspace-backend --lines 30 --nostream
    else
        tail -30 logs/backend.log
    fi
    exit 1
fi

# 3. 重新加载 Nginx
echo ""
echo "3. 重新加载 Nginx..."
if command -v nginx &> /dev/null; then
    if nginx -t 2>/dev/null; then
        systemctl reload nginx 2>/dev/null || service nginx reload 2>/dev/null || nginx -s reload 2>/dev/null
        echo "✅ Nginx 已重新加载"
    else
        echo "⚠️  Nginx 配置有误，请检查"
        nginx -t
    fi
else
    echo "⚠️  Nginx 未找到"
fi

echo ""
echo "=== 修复完成 ==="
echo "请访问网站检查是否恢复正常"



