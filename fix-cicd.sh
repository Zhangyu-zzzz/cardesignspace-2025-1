#!/bin/bash

echo "=== 修复CI/CD部署问题 ==="

# 连接到服务器并修复Git冲突
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@49.235.98.5 << 'EOF'

echo "进入项目目录..."
cd /opt/auto-gallery

echo "检查Git状态..."
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

echo "验证Git状态..."
git status

echo "检查最新提交..."
git log --oneline -3

echo "重启Docker服务..."
docker-compose down
docker-compose up -d

echo "检查容器状态..."
docker-compose ps

echo "等待服务启动..."
sleep 15

echo "检查服务状态..."
echo "前端服务:"
curl -s -o /dev/null -w "HTTP状态码: %{http_code}\n" http://localhost:8080 || echo "前端服务连接失败"

echo "后端服务:"
curl -s -o /dev/null -w "HTTP状态码: %{http_code}\n" http://localhost:3001 || echo "后端服务连接失败"

echo "检查域名访问..."
echo "域名访问测试:"
curl -s -o /dev/null -w "HTTP状态码: %{http_code}\n" https://www.cardesignspace.com || echo "域名访问失败"

echo "=== CI/CD修复完成 ==="
echo "域名地址: https://www.cardesignspace.com"
echo "测试页面: https://www.cardesignspace.com/test-links"
echo "图片菜单测试: https://www.cardesignspace.com/test-image-context-menu"

EOF

echo "CI/CD修复脚本执行完成！"
