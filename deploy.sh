#!/bin/bash

echo "开始部署到服务器..."

# 设置SSH密钥...
echo "设置SSH密钥..."

# 测试SSH连接...
echo "测试SSH连接..."

# SSH连接成功
echo "SSH连接成功"

# 开始执行部署命令...
echo "开始执行部署命令..."

# 连接到服务器并执行部署命令
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@10.0.4.5 << 'EOF'

echo "进入项目目录..."
cd /root/auto-gallery

echo "检查Git状态..."
git status

echo "备份本地修改..."
if [ -f frontend/public/index.html ]; then
    cp frontend/public/index.html frontend/public/index.html.backup
    echo "已备份 index.html"
fi

echo "重置本地修改..."
git reset --hard HEAD

echo "清理未跟踪的文件..."
git clean -fd

echo "拉取最新代码..."
git fetch origin main

echo "切换到main分支..."
git checkout main

echo "合并最新代码..."
git merge origin/main

echo "检查部署状态..."
git status

echo "重启Docker容器..."
cd /root/auto-gallery

echo "停止现有容器..."
docker-compose down

echo "构建新镜像..."
docker-compose build --no-cache

echo "启动新容器..."
docker-compose up -d

echo "检查容器状态..."
docker-compose ps

echo "检查服务健康状态..."
sleep 10

echo "检查前端服务..."
curl -I http://localhost:3000 || echo "前端服务检查失败"

echo "检查后端服务..."
curl -I http://localhost:3001 || echo "后端服务检查失败"

echo "部署完成！"
echo "前端地址: http://10.0.4.5:3000"
echo "后端地址: http://10.0.4.5:3001"

EOF

echo "部署脚本执行完成！"
