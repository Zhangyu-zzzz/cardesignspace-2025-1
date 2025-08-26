#!/bin/bash

echo "=== 服务器Git冲突修复脚本 ==="
echo "请在服务器上执行此脚本"

echo "1. 进入项目目录..."
cd /root/auto-gallery

echo "2. 检查当前Git状态..."
git status

echo "3. 备份本地修改..."
if [ -f frontend/public/index.html ]; then
    cp frontend/public/index.html frontend/public/index.html.backup.$(date +%Y%m%d_%H%M%S)
    echo "已备份 index.html"
fi

echo "4. 强制重置到远程main分支..."
git fetch origin
git reset --hard origin/main

echo "5. 清理工作目录..."
git clean -fd

echo "6. 验证Git状态..."
git status

echo "7. 检查最新提交..."
git log --oneline -5

echo "8. 重启Docker服务..."
docker-compose down
docker-compose up -d

echo "9. 检查容器状态..."
docker-compose ps

echo "10. 等待服务启动..."
sleep 15

echo "11. 检查服务状态..."
echo "前端服务状态:"
curl -s -o /dev/null -w "HTTP状态码: %{http_code}\n" http://localhost:3000 || echo "前端服务连接失败"

echo "后端服务状态:"
curl -s -o /dev/null -w "HTTP状态码: %{http_code}\n" http://localhost:3001 || echo "后端服务连接失败"

echo "=== 修复完成 ==="
echo "前端地址: http://10.0.4.5:3000"
echo "后端地址: http://10.0.4.5:3001"
