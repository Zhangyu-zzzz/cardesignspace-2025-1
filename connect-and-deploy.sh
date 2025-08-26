#!/bin/bash

echo "=== 自动SSH连接和部署脚本 ==="
echo "正在连接到服务器..."

# 尝试SSH连接并执行部署命令
ssh -o ConnectTimeout=30 -o StrictHostKeyChecking=no root@10.0.4.5 << 'REMOTE_COMMANDS'

echo "连接成功！开始部署..."

# 进入项目目录
cd /root/auto-gallery

echo "当前目录: $(pwd)"
echo "Git状态:"
git status

echo "备份本地修改..."
if [ -f frontend/public/index.html ]; then
    cp frontend/public/index.html frontend/public/index.html.backup.$(date +%Y%m%d_%H%M%S)
    echo "已备份 index.html"
fi

echo "强制重置到远程main分支..."
git fetch origin
git reset --hard origin/main

echo "清理工作目录..."
git clean -fd

echo "验证Git状态:"
git status

echo "检查最新提交:"
git log --oneline -3

echo "重启Docker服务..."
docker-compose down
echo "容器已停止"

docker-compose up -d
echo "容器已启动"

echo "等待服务启动..."
sleep 10

echo "检查容器状态:"
docker-compose ps

echo "检查服务状态..."
echo "前端服务:"
curl -s -o /dev/null -w "HTTP状态码: %{http_code}\n" http://localhost:3000 || echo "前端服务连接失败"

echo "后端服务:"
curl -s -o /dev/null -w "HTTP状态码: %{http_code}\n" http://localhost:3001 || echo "后端服务连接失败"

echo "=== 部署完成 ==="
echo "前端地址: http://10.0.4.5:3000"
echo "后端地址: http://10.0.4.5:3001"

REMOTE_COMMANDS

echo "脚本执行完成！"
