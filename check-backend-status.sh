#!/bin/bash

echo "=== 后端服务诊断 ==="
echo ""

# 检查 PM2 进程
echo "1. 检查 PM2 进程状态..."
if command -v pm2 &> /dev/null; then
    pm2 list
    echo ""
    
    # 检查后端服务是否在运行
    if pm2 list | grep -q "cardesignspace-backend"; then
        echo "✅ 后端服务在 PM2 中运行"
        pm2 info cardesignspace-backend
        echo ""
        echo "查看最近日志："
        pm2 logs cardesignspace-backend --lines 20 --nostream
    else
        echo "❌ 后端服务未在 PM2 中运行"
    fi
else
    echo "⚠️  PM2 未安装或不在 PATH 中"
fi

echo ""
echo "2. 检查端口 3000 是否被占用..."
if lsof -i :3000 &> /dev/null || netstat -tuln | grep -q ":3000"; then
    echo "✅ 端口 3000 已被占用"
    echo "占用端口的进程："
    lsof -i :3000 2>/dev/null || netstat -tuln | grep ":3000"
else
    echo "❌ 端口 3000 未被占用（后端服务可能未运行）"
fi

echo ""
echo "3. 测试后端 API 连接..."
if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/health 2>/dev/null | grep -q "200\|200\|404"; then
    echo "✅ 后端 API 可访问"
    curl -s http://127.0.0.1:3000/api/health
else
    echo "❌ 后端 API 不可访问（502 错误的原因）"
fi

echo ""
echo "4. 检查 Nginx 配置..."
if [ -f /etc/nginx/sites-enabled/cardesignspace ] || [ -f /etc/nginx/conf.d/cardesignspace.conf ]; then
    echo "✅ Nginx 配置文件存在"
    echo "检查 API 代理配置："
    grep -A 5 "location /api" /etc/nginx/sites-enabled/cardesignspace 2>/dev/null || \
    grep -A 5 "location /api" /etc/nginx/conf.d/cardesignspace.conf 2>/dev/null || \
    grep -A 5 "location /api" /etc/nginx/nginx.conf 2>/dev/null
else
    echo "⚠️  未找到 Nginx 配置文件"
fi

echo ""
echo "=== 诊断完成 ==="



