#!/bin/bash

# ========================================
# 智能搜索404问题诊断和修复脚本
# ========================================

set -e  # 遇到错误立即退出

SERVER_IP="49.235.98.5"
SERVER_USER="root"
PROJECT_PATH="/opt/auto-gallery"

echo "=================================================="
echo "🔍 智能搜索404问题诊断和修复"
echo "=================================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ========================================
# 第一步：检查本地文件是否存在
# ========================================
echo -e "${BLUE}📦 第一步：检查本地关键文件${NC}"
echo "----------------------------"

LOCAL_FILES=(
    "backend/src/routes/smartSearchRoutes.js"
    "backend/src/controllers/smartSearchController.js"
    "backend/src/config/qdrant.js"
    "frontend/src/views/SmartSearch.vue"
)

for file in "${LOCAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file 存在"
    else
        echo -e "${RED}✗${NC} $file 不存在"
        echo -e "${RED}错误：本地文件缺失，请确保代码完整！${NC}"
        exit 1
    fi
done

echo ""

# ========================================
# 第二步：连接服务器检查远程文件
# ========================================
echo -e "${BLUE}🔍 第二步：检查服务器文件${NC}"
echo "----------------------------"

echo "正在连接服务器 $SERVER_IP..."

# 检查远程文件是否存在
for file in "${LOCAL_FILES[@]}"; do
    echo -n "检查远程 $file: "
    if ssh -o ConnectTimeout=10 $SERVER_USER@$SERVER_IP "test -f $PROJECT_PATH/$file" 2>/dev/null; then
        echo -e "${GREEN}存在${NC}"
    else
        echo -e "${RED}缺失${NC}"
        echo -e "${YELLOW}⚠️  文件缺失，需要部署！${NC}"
    fi
done

echo ""

# ========================================
# 第三步：检查服务器后端进程
# ========================================
echo -e "${BLUE}🚀 第三步：检查后端服务状态${NC}"
echo "----------------------------"

echo "检查Node.js进程..."
ssh $SERVER_USER@$SERVER_IP "ps aux | grep 'node.*backend' | grep -v grep" || echo -e "${YELLOW}后端进程未运行${NC}"

echo ""
echo "检查PM2状态..."
ssh $SERVER_USER@$SERVER_IP "pm2 list 2>/dev/null || echo 'PM2未安装或未运行'"

echo ""

# ========================================
# 第四步：询问是否部署修复
# ========================================
echo -e "${YELLOW}=================================================="
echo "🔧 是否要部署修复到服务器？"
echo "==================================================${NC}"
echo ""
echo "将执行以下操作："
echo "  1. 备份服务器当前代码"
echo "  2. 上传缺失的文件"
echo "  3. 安装/更新依赖"
echo "  4. 重启后端服务"
echo ""
read -p "确认部署？(y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "取消部署"
    exit 0
fi

echo ""

# ========================================
# 第五步：备份和部署
# ========================================
echo -e "${BLUE}📤 第五步：部署文件到服务器${NC}"
echo "----------------------------"

# 备份
BACKUP_DIR="$PROJECT_PATH/backup_$(date +%Y%m%d_%H%M%S)"
echo "创建备份目录: $BACKUP_DIR"
ssh $SERVER_USER@$SERVER_IP "mkdir -p $BACKUP_DIR"

# 备份关键文件（如果存在）
echo "备份现有文件..."
for file in "${LOCAL_FILES[@]}"; do
    ssh $SERVER_USER@$SERVER_IP "if [ -f $PROJECT_PATH/$file ]; then cp $PROJECT_PATH/$file $BACKUP_DIR/; fi" 2>/dev/null || true
done

# 上传文件
echo ""
echo "上传文件到服务器..."

# 创建目录结构
ssh $SERVER_USER@$SERVER_IP "mkdir -p $PROJECT_PATH/backend/src/routes"
ssh $SERVER_USER@$SERVER_IP "mkdir -p $PROJECT_PATH/backend/src/controllers"
ssh $SERVER_USER@$SERVER_IP "mkdir -p $PROJECT_PATH/backend/src/config"
ssh $SERVER_USER@$SERVER_IP "mkdir -p $PROJECT_PATH/frontend/src/views"

# 上传后端文件
echo -e "${GREEN}→${NC} 上传后端路由..."
scp backend/src/routes/smartSearchRoutes.js $SERVER_USER@$SERVER_IP:$PROJECT_PATH/backend/src/routes/

echo -e "${GREEN}→${NC} 上传后端控制器..."
scp backend/src/controllers/smartSearchController.js $SERVER_USER@$SERVER_IP:$PROJECT_PATH/backend/src/controllers/

echo -e "${GREEN}→${NC} 上传Qdrant配置..."
scp backend/src/config/qdrant.js $SERVER_USER@$SERVER_IP:$PROJECT_PATH/backend/src/config/

echo -e "${GREEN}→${NC} 上传前端组件..."
scp frontend/src/views/SmartSearch.vue $SERVER_USER@$SERVER_IP:$PROJECT_PATH/frontend/src/views/

echo ""

# ========================================
# 第六步：检查.env配置
# ========================================
echo -e "${BLUE}⚙️  第六步：检查环境配置${NC}"
echo "----------------------------"

echo "检查.env文件..."
ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'
cd /opt/auto-gallery/backend

if [ ! -f .env ]; then
    echo "⚠️  .env文件不存在，从env.example复制"
    cp ../.env.example .env 2>/dev/null || cp .env.example .env 2>/dev/null || echo "警告：找不到env.example"
fi

# 检查关键配置项
echo ""
echo "检查CLIP和Qdrant配置..."

if grep -q "CLIP_SERVICE_URL" .env; then
    echo "✓ CLIP_SERVICE_URL已配置"
else
    echo "⚠️  添加CLIP_SERVICE_URL配置"
    echo "" >> .env
    echo "# CLIP向量化服务" >> .env
    echo "CLIP_SERVICE_URL=http://localhost:5001" >> .env
fi

if grep -q "QDRANT_HOST" .env; then
    echo "✓ QDRANT配置已存在"
else
    echo "⚠️  添加Qdrant配置"
    echo "" >> .env
    echo "# Qdrant向量数据库" >> .env
    echo "QDRANT_HOST=49.235.98.5" >> .env
    echo "QDRANT_PORT=6333" >> .env
    echo "QDRANT_COLLECTION=image_vectors" >> .env
fi

echo ""
echo "当前CLIP和Qdrant配置："
grep -E "^(CLIP|QDRANT)" .env || echo "无相关配置"
ENDSSH

echo ""

# ========================================
# 第七步：重启后端服务
# ========================================
echo -e "${BLUE}🔄 第七步：重启后端服务${NC}"
echo "----------------------------"

echo "重启后端..."
ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'
cd /opt/auto-gallery/backend

# 尝试使用PM2重启
if command -v pm2 &> /dev/null; then
    echo "使用PM2重启..."
    pm2 restart backend 2>/dev/null || pm2 start npm --name backend -- start
    echo ""
    echo "PM2状态："
    pm2 list
else
    echo "PM2未安装，尝试直接重启..."
    # 停止现有进程
    pkill -f "node.*backend" || true
    sleep 2
    # 启动新进程
    nohup npm start > backend.log 2>&1 &
    echo "后端已在后台启动"
fi
ENDSSH

echo ""

# ========================================
# 第八步：等待服务启动并测试
# ========================================
echo -e "${BLUE}🧪 第八步：测试API${NC}"
echo "----------------------------"

echo "等待服务启动（10秒）..."
sleep 10

echo ""
echo "测试智能搜索API..."
ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'
# 测试健康检查
echo "1. 测试健康检查..."
curl -s http://localhost:3000/api/health | head -20

echo ""
echo ""
echo "2. 测试智能搜索端点（GET方式）..."
curl -s "http://localhost:3000/api/smart-search?q=red%20car&page=1&limit=5" | head -50

echo ""
echo ""
echo "3. 检查后端日志最后20行..."
if command -v pm2 &> /dev/null; then
    pm2 logs backend --lines 20 --nostream
else
    tail -20 backend.log 2>/dev/null || echo "日志文件不存在"
fi
ENDSSH

echo ""

# ========================================
# 第九步：测试CLIP和Qdrant服务
# ========================================
echo -e "${BLUE}🤖 第九步：测试CLIP和Qdrant服务${NC}"
echo "----------------------------"

echo "测试CLIP服务..."
ssh $SERVER_USER@$SERVER_IP "curl -s http://localhost:5001/health 2>/dev/null || echo 'CLIP服务未运行或无法访问'"

echo ""
echo "测试Qdrant..."
ssh $SERVER_USER@$SERVER_IP "curl -s http://49.235.98.5:6333/collections 2>/dev/null | head -20 || echo 'Qdrant未运行或无法访问'"

echo ""

# ========================================
# 第十步：重新构建前端
# ========================================
echo -e "${BLUE}🎨 第十步：重新构建前端${NC}"
echo "----------------------------"

read -p "是否重新构建前端？(y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "构建前端..."
    ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'
cd /opt/auto-gallery/frontend

echo "安装依赖..."
npm install --production=false

echo ""
echo "构建生产版本..."
npm run build

echo ""
echo "构建完成，检查dist目录..."
ls -lh dist/ | head -10
ENDSSH

    echo ""
    echo "重载Nginx..."
    ssh $SERVER_USER@$SERVER_IP "sudo nginx -t && sudo systemctl reload nginx"
fi

echo ""

# ========================================
# 总结
# ========================================
echo "=================================================="
echo -e "${GREEN}✅ 部署完成！${NC}"
echo "=================================================="
echo ""
echo "接下来的步骤："
echo ""
echo "1. 打开浏览器清除缓存（Ctrl+Shift+Delete）"
echo "2. 访问：https://www.cardesignspace.com/smart-search"
echo "3. 如果仍然404，运行完整检查："
echo "   bash check-smart-search-services.sh"
echo ""
echo "如果需要查看服务器日志："
echo "   ssh $SERVER_USER@$SERVER_IP"
echo "   pm2 logs backend"
echo ""
echo "备份位置：$BACKUP_DIR"
echo ""



