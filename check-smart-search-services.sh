#!/bin/bash

# ========================================
# 智能搜索服务状态检查脚本
# ========================================

echo "=================================================="
echo "🔍 智能搜索功能服务状态检查"
echo "=================================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查计数
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

check_item() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        echo -e "${RED}✗${NC} $2"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
}

# ========================================
# 1. 检查Git代码版本
# ========================================
echo -e "${BLUE}📦 1. 检查代码版本${NC}"
echo "----------------------------"

cd /opt/auto-gallery 2>/dev/null || cd ~/auto-gallery 2>/dev/null || cd ~/Desktop/unsplash-crawler/test/auto-gallery 2>/dev/null

if [ $? -eq 0 ]; then
    CURRENT_COMMIT=$(git log --oneline -1 2>/dev/null)
    if [ $? -eq 0 ]; then
        check_item 0 "Git仓库正常"
        echo "   当前提交: $CURRENT_COMMIT"
    else
        check_item 1 "无法读取Git信息"
    fi
else
    check_item 1 "无法找到项目目录"
    echo -e "${RED}请修改脚本中的项目路径${NC}"
fi

echo ""

# ========================================
# 2. 检查Node.js后端服务
# ========================================
echo -e "${BLUE}🚀 2. 检查Node.js后端服务${NC}"
echo "----------------------------"

# 检查进程
if pgrep -f "node.*backend" > /dev/null; then
    check_item 0 "Node.js后端进程运行中"
else
    check_item 1 "Node.js后端进程未运行"
fi

# 检查PM2
if command -v pm2 &> /dev/null; then
    PM2_STATUS=$(pm2 jlist 2>/dev/null | grep -c "online")
    if [ $PM2_STATUS -gt 0 ]; then
        check_item 0 "PM2管理的服务在线"
        pm2 list 2>/dev/null | grep -E "name|backend"
    else
        check_item 1 "PM2服务未运行"
    fi
fi

# 检查后端端口
if netstat -tuln 2>/dev/null | grep -q ":3000" || lsof -i :3000 2>/dev/null | grep -q LISTEN; then
    check_item 0 "后端端口3000正在监听"
else
    check_item 1 "后端端口3000未监听"
fi

echo ""

# ========================================
# 3. 检查CLIP向量化服务（关键！）
# ========================================
echo -e "${BLUE}🤖 3. 检查CLIP向量化服务${NC}"
echo "----------------------------"

# 检查进程
if pgrep -f "python.*clip_vectorize" > /dev/null; then
    check_item 0 "CLIP服务进程运行中"
else
    check_item 1 "CLIP服务进程未运行"
fi

# 检查systemd服务
if systemctl is-active --quiet clip-vectorize 2>/dev/null; then
    check_item 0 "CLIP systemd服务活跃"
else
    check_item 1 "CLIP systemd服务未运行（可能是手动启动）"
fi

# 检查端口
if netstat -tuln 2>/dev/null | grep -q ":5001" || lsof -i :5001 2>/dev/null | grep -q LISTEN; then
    check_item 0 "CLIP服务端口5001正在监听"
else
    check_item 1 "CLIP服务端口5001未监听"
fi

# 测试CLIP健康状态
echo -n "   测试CLIP健康检查: "
CLIP_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5001/health 2>/dev/null)
if [ "$CLIP_HEALTH" = "200" ]; then
    echo -e "${GREEN}OK (HTTP 200)${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo -e "${RED}失败 (HTTP $CLIP_HEALTH)${NC}"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

# 测试CLIP向量化
echo -n "   测试CLIP向量化: "
CLIP_ENCODE=$(curl -s -X POST http://localhost:5001/encode-text \
    -H "Content-Type: application/json" \
    -d '{"text":"测试"}' 2>/dev/null | grep -c "vector")
if [ $CLIP_ENCODE -gt 0 ]; then
    echo -e "${GREEN}OK${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo -e "${RED}失败${NC}"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

echo ""

# ========================================
# 4. 检查Qdrant向量数据库
# ========================================
echo -e "${BLUE}🗄️  4. 检查Qdrant向量数据库${NC}"
echo "----------------------------"

# 检查进程
if pgrep -f qdrant > /dev/null || docker ps 2>/dev/null | grep -q qdrant; then
    check_item 0 "Qdrant进程/容器运行中"
else
    check_item 1 "Qdrant进程/容器未运行"
fi

# 测试Qdrant连接
echo -n "   测试Qdrant连接: "
QDRANT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://49.235.98.5:6333/collections 2>/dev/null)
if [ "$QDRANT_STATUS" = "200" ]; then
    echo -e "${GREEN}OK (HTTP 200)${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo -e "${RED}失败 (HTTP $QDRANT_STATUS)${NC}"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

# 检查集合数据
echo -n "   检查image_vectors集合: "
QDRANT_POINTS=$(curl -s http://49.235.98.5:6333/collections/image_vectors 2>/dev/null | grep -o '"points_count":[0-9]*' | cut -d: -f2)
if [ -n "$QDRANT_POINTS" ] && [ "$QDRANT_POINTS" -gt 0 ]; then
    echo -e "${GREEN}OK (${QDRANT_POINTS}条向量数据)${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo -e "${RED}失败 (无数据或集合不存在)${NC}"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

echo ""

# ========================================
# 5. 检查环境配置
# ========================================
echo -e "${BLUE}⚙️  5. 检查环境配置${NC}"
echo "----------------------------"

if [ -f "backend/.env" ]; then
    check_item 0 "找到.env配置文件"
    
    # 检查关键配置项
    if grep -q "CLIP_SERVICE_URL" backend/.env; then
        check_item 0 "CLIP_SERVICE_URL已配置"
    else
        check_item 1 "CLIP_SERVICE_URL未配置"
    fi
    
    if grep -q "QDRANT_HOST" backend/.env; then
        check_item 0 "QDRANT_HOST已配置"
    else
        check_item 1 "QDRANT_HOST未配置"
    fi
else
    check_item 1 "未找到.env配置文件"
fi

echo ""

# ========================================
# 6. 检查前端构建
# ========================================
echo -e "${BLUE}🎨 6. 检查前端构建${NC}"
echo "----------------------------"

if [ -d "frontend/dist" ]; then
    check_item 0 "前端dist目录存在"
    
    DIST_SIZE=$(du -sh frontend/dist 2>/dev/null | cut -f1)
    echo "   构建大小: $DIST_SIZE"
    
    if [ -f "frontend/dist/index.html" ]; then
        check_item 0 "index.html存在"
    else
        check_item 1 "index.html不存在，需要重新构建"
    fi
else
    check_item 1 "前端dist目录不存在，需要运行npm run build"
fi

echo ""

# ========================================
# 7. 测试智能搜索API
# ========================================
echo -e "${BLUE}🔍 7. 测试智能搜索API${NC}"
echo "----------------------------"

echo -n "   测试向量搜索API: "
SEARCH_RESULT=$(curl -s -X POST http://localhost:3000/api/smart-search \
    -H "Content-Type: application/json" \
    -d '{"query":"红色汽车","searchMode":"vector","limit":5}' 2>/dev/null)

if echo "$SEARCH_RESULT" | grep -q '"images"'; then
    check_item 0 "向量搜索API响应正常"
    
    # 检查返回的图片数量
    IMAGE_COUNT=$(echo "$SEARCH_RESULT" | grep -o '"images":\[' | wc -l)
    if [ $IMAGE_COUNT -gt 0 ]; then
        echo "   返回结果包含图片数据"
    fi
else
    check_item 1 "向量搜索API响应异常"
    echo "   响应: $SEARCH_RESULT"
fi

echo ""

# ========================================
# 8. 检查Nginx
# ========================================
echo -e "${BLUE}🌐 8. 检查Nginx${NC}"
echo "----------------------------"

if systemctl is-active --quiet nginx 2>/dev/null; then
    check_item 0 "Nginx服务运行中"
else
    check_item 1 "Nginx服务未运行"
fi

if nginx -t 2>&1 | grep -q "successful"; then
    check_item 0 "Nginx配置文件语法正确"
else
    check_item 1 "Nginx配置文件存在错误"
fi

echo ""

# ========================================
# 9. 系统资源检查
# ========================================
echo -e "${BLUE}💻 9. 系统资源检查${NC}"
echo "----------------------------"

# 内存
TOTAL_MEM=$(free -h 2>/dev/null | awk '/^Mem:/{print $2}')
USED_MEM=$(free -h 2>/dev/null | awk '/^Mem:/{print $3}')
echo "   内存使用: $USED_MEM / $TOTAL_MEM"

# 磁盘
DISK_USAGE=$(df -h . 2>/dev/null | awk 'NR==2{print $5}' | sed 's/%//')
echo "   磁盘使用: ${DISK_USAGE}%"
if [ $DISK_USAGE -lt 90 ]; then
    check_item 0 "磁盘空间充足"
else
    check_item 1 "磁盘空间不足"
fi

# CPU负载
LOAD_AVG=$(uptime | awk -F'load average:' '{print $2}')
echo "   负载平均:$LOAD_AVG"

echo ""

# ========================================
# 总结
# ========================================
echo "=================================================="
echo -e "${BLUE}📊 检查总结${NC}"
echo "=================================================="
echo "   总检查项: $TOTAL_CHECKS"
echo -e "   ${GREEN}通过: $PASSED_CHECKS${NC}"
echo -e "   ${RED}失败: $FAILED_CHECKS${NC}"

if [ $FAILED_CHECKS -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 所有检查通过！智能搜索功能应该正常工作。${NC}"
    exit 0
else
    echo ""
    echo -e "${YELLOW}⚠️  发现 $FAILED_CHECKS 个问题，请根据上述信息进行修复。${NC}"
    echo ""
    echo "快速修复建议："
    echo "1. 如果CLIP服务未运行："
    echo "   sudo systemctl start clip-vectorize"
    echo ""
    echo "2. 如果Node.js后端未运行："
    echo "   cd backend && pm2 restart backend"
    echo ""
    echo "3. 如果Qdrant未运行："
    echo "   sudo systemctl start qdrant  # 或 docker start qdrant"
    echo ""
    echo "4. 如果前端未构建："
    echo "   cd frontend && npm run build"
    echo ""
    echo "5. 查看详细部署指南："
    echo "   cat SMART_SEARCH_DEPLOYMENT_CHECKLIST.md"
    echo ""
    exit 1
fi




