#!/bin/bash

echo "🚀 GitHub Actions 自动部署设置脚本"
echo "=================================="

# 检查是否在Git仓库中
if [ ! -d ".git" ]; then
    echo "❌ 错误：当前目录不是Git仓库"
    echo "请先初始化Git仓库：git init"
    exit 1
fi

# 检查远程仓库
REMOTE_URL=$(git remote get-url origin 2>/dev/null)
if [ -z "$REMOTE_URL" ]; then
    echo "❌ 错误：未找到远程仓库"
    echo "请先添加远程仓库：git remote add origin <your-github-repo-url>"
    exit 1
fi

echo "✅ 检测到远程仓库: $REMOTE_URL"

# 检查SSH密钥
if [ ! -f "$HOME/.ssh/id_rsa" ]; then
    echo "🔑 未找到SSH密钥，正在生成..."
    read -p "请输入你的邮箱地址: " EMAIL
    ssh-keygen -t rsa -b 4096 -C "$EMAIL" -f "$HOME/.ssh/id_rsa" -N ""
    echo "✅ SSH密钥已生成"
else
    echo "✅ 检测到现有SSH密钥"
fi

# 显示公钥
echo ""
echo "📋 请将以下公钥添加到你的GitHub账户："
echo "=================================="
cat "$HOME/.ssh/id_rsa.pub"
echo "=================================="
echo ""

# 获取服务器信息
echo "🖥️  请输入服务器信息："
read -p "服务器IP地址: " SERVER_HOST
read -p "服务器用户名: " SERVER_USER
read -p "SSH端口 (默认22): " SERVER_PORT
SERVER_PORT=${SERVER_PORT:-22}

# 测试SSH连接
echo "🔍 测试SSH连接..."
if ssh -p "$SERVER_PORT" -o ConnectTimeout=10 -o BatchMode=yes "$SERVER_USER@$SERVER_HOST" exit 2>/dev/null; then
    echo "✅ SSH连接成功"
else
    echo "⚠️  SSH连接失败，请手动配置SSH密钥"
    echo "执行以下命令："
    echo "ssh-copy-id -i ~/.ssh/id_rsa.pub $SERVER_USER@$SERVER_HOST"
fi

# 显示私钥内容
echo ""
echo "🔐 请将以下私钥内容添加到GitHub Secrets (SERVER_KEY)："
echo "=================================="
cat "$HOME/.ssh/id_rsa"
echo "=================================="
echo ""

# 生成GitHub Secrets配置
echo "📝 GitHub Secrets 配置信息："
echo "=================================="
echo "SERVER_HOST: $SERVER_HOST"
echo "SERVER_USER: $SERVER_USER"
echo "SERVER_PORT: $SERVER_PORT"
echo "SERVER_KEY: [上面显示的私钥内容]"
echo "=================================="
echo ""

# 检查必要的文件
echo "📁 检查项目文件..."
FILES=(
    ".github/workflows/deploy.yml"
    "scripts/github-deploy.sh"
    "backend/Dockerfile"
    "frontend/Dockerfile"
    "start.sh"
    "nginx.conf"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file (缺失)"
    fi
done

echo ""
echo "🎯 设置步骤总结："
echo "1. 将公钥添加到GitHub账户 (Settings > SSH and GPG keys)"
echo "2. 将私钥内容添加到GitHub Secrets (Settings > Secrets and variables > Actions)"
echo "3. 配置其他Secrets: SERVER_HOST, SERVER_USER, SERVER_PORT"
echo "4. 推送代码到GitHub触发自动部署"
echo ""
echo "📚 详细说明请查看: docs/GITHUB_ACTIONS_SETUP.md"
