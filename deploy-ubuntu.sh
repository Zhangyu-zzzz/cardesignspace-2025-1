#!/bin/bash

# Ubuntu 腾讯云部署脚本
# 使用方法：chmod +x deploy-ubuntu.sh && ./deploy-ubuntu.sh

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}CarDesignSpace Ubuntu 部署脚本${NC}"
echo -e "${BLUE}========================================${NC}"

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}请使用 root 用户运行此脚本${NC}"
    exit 1
fi

# 更新系统
echo -e "${YELLOW}[1/9] 更新系统包...${NC}"
apt update && apt upgrade -y

# 安装基础工具
echo -e "${YELLOW}[2/9] 安装基础工具...${NC}"
apt install -y curl wget git build-essential

# 安装Node.js 16.x (使用NodeSource仓库)
echo -e "${YELLOW}[3/9] 安装Node.js...${NC}"
curl -fsSL https://deb.nodesource.com/setup_16.x | bash -
apt install -y nodejs

# 验证Node.js安装
echo -e "${GREEN}Node.js 版本: $(node --version)${NC}"
echo -e "${GREEN}NPM 版本: $(npm --version)${NC}"

# 安装Vue CLI和PM2
echo -e "${YELLOW}[4/9] 安装Vue CLI和PM2...${NC}"
npm install -g @vue/cli pm2

# 安装MySQL客户端
echo -e "${YELLOW}[5/9] 安装MySQL客户端...${NC}"
apt install -y mysql-client

# 安装Nginx
echo -e "${YELLOW}[6/9] 安装Nginx...${NC}"
apt install -y nginx

# 创建项目目录（如果不存在）
echo -e "${YELLOW}[7/9] 检查项目目录...${NC}"
if [ ! -d "/root/cardesignspace" ]; then
    echo -e "${YELLOW}项目目录不存在，请先克隆项目${NC}"
    echo -e "${GREEN}请运行: git clone https://github.com/Zhangyu-zzzz/cardesignspace-2025-1.git cardesignspace${NC}"
    exit 1
fi

cd /root/cardesignspace

# 安装后端依赖
echo -e "${YELLOW}[8/9] 安装后端依赖...${NC}"
cd backend
rm -rf node_modules package-lock.json
npm install --production

# 安装前端依赖并构建
echo -e "${YELLOW}[9/9] 安装前端依赖并构建...${NC}"
cd ../frontend
rm -rf node_modules package-lock.json dist
npm install
npm run build

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Ubuntu部署脚本执行完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${YELLOW}接下来请：${NC}"
echo -e "${YELLOW}1. 配置环境变量文件${NC}"
echo -e "${YELLOW}2. 初始化数据库${NC}"
echo -e "${YELLOW}3. 启动后端服务：cd /root/cardesignspace/backend && pm2 start ecosystem.config.js${NC}"
echo -e "${YELLOW}4. 配置并启动Nginx${NC}"
echo -e "${YELLOW}5. 配置防火墙：ufw allow 80 && ufw allow 443 && ufw allow 3000${NC}" 