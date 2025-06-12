#!/bin/bash

# 腾讯云部署脚本
# 使用方法：chmod +x deploy-tencent-cloud.sh && ./deploy-tencent-cloud.sh

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}CarDesignSpace 腾讯云部署脚本${NC}"
echo -e "${BLUE}========================================${NC}"

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}请使用 root 用户运行此脚本${NC}"
    exit 1
fi

# 更新系统
echo -e "${YELLOW}[1/8] 更新系统包...${NC}"
yum update -y

# 安装Node.js 16.x
echo -e "${YELLOW}[2/8] 安装Node.js...${NC}"
curl -fsSL https://rpm.nodesource.com/setup_16.x | bash -
yum install -y nodejs

# 安装PM2
echo -e "${YELLOW}[3/8] 安装PM2进程管理器...${NC}"
npm install -g pm2

# 安装MySQL客户端（如果需要）
echo -e "${YELLOW}[4/8] 安装MySQL客户端...${NC}"
yum install -y mysql

# 创建项目目录
echo -e "${YELLOW}[5/8] 创建项目目录...${NC}"
mkdir -p /root/cardesignspace
cd /root/cardesignspace

# 从GitHub拉取项目（需要先设置）
echo -e "${YELLOW}[6/8] 请手动上传项目文件到服务器或使用git clone${NC}"
echo -e "${GREEN}git clone https://github.com/Zhangyu-zzzz/cardesignspace-2025-1.git .${NC}"

# 安装依赖
echo -e "${YELLOW}[7/8] 安装项目依赖...${NC}"
cd backend
npm install --production
cd ../frontend
npm install

# 构建前端
echo -e "${YELLOW}[8/8] 构建前端项目...${NC}"
npm run build

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}部署脚本执行完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${YELLOW}接下来请：${NC}"
echo -e "${YELLOW}1. 配置数据库连接信息${NC}"
echo -e "${YELLOW}2. 复制环境配置文件并填写实际配置${NC}"
echo -e "${YELLOW}3. 启动服务：pm2 start ecosystem.config.js${NC}"
echo -e "${YELLOW}4. 配置Nginx反向代理${NC}" 