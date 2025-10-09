#!/bin/bash

# 显示彩色输出
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 获取脚本所在目录的绝对路径
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# 切换到项目根目录（脚本目录的上级目录的上级目录的上级目录）
cd "$SCRIPT_DIR/../../.."

echo -e "${BLUE}====================================${NC}"
echo -e "${GREEN}开始启动汽车官方图片网站${NC}"
echo -e "${BLUE}====================================${NC}"

# 检查数据库是否运行
echo -e "${YELLOW}[提示] 请确保您的MySQL数据库已经启动${NC}"
echo -e "${YELLOW}[提示] 请确保在backend目录下已创建.env文件并配置好数据库连接信息${NC}"
echo

# 创建logs目录
mkdir -p backend/logs

# 后端启动
echo -e "${GREEN}[1/3] 开始安装后端依赖...${NC}"
if [ -d "backend" ]; then
  cd backend
  npm install

  echo -e "${GREEN}[2/3] 启动后端服务...${NC}"
  # 在后台运行后端服务
  nohup npm run dev > ./logs/backend.log 2>&1 &
  BACKEND_PID=$!
  echo -e "${GREEN}后端服务已启动，PID: ${BACKEND_PID}${NC}"
  echo -e "${YELLOW}后端日志位于: $(pwd)/logs/backend.log${NC}"
  cd ..
else
  echo -e "${YELLOW}[错误] backend目录不存在，请检查项目结构${NC}"
  exit 1
fi

# 前端启动
echo -e "${GREEN}[3/3] 开始安装前端依赖并启动...${NC}"
if [ -d "frontend" ]; then
  cd frontend
  npm install

  echo -e "${GREEN}正在启动前端服务...${NC}"
  npm run serve

  # 如果前端退出，杀掉后端进程
  kill $BACKEND_PID
else
  echo -e "${YELLOW}[错误] frontend目录不存在，请检查项目结构${NC}"
  # 如果前端不存在，也要杀掉后端进程
  kill $BACKEND_PID
  exit 1
fi

echo -e "${GREEN}所有服务已停止${NC}" 