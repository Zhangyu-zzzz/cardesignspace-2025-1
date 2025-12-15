#!/bin/bash

# 搜索功能快速测试脚本

echo "🧪 开始测试搜索统计功能..."
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试后端是否运行
echo "1️⃣  检查后端服务..."
if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 后端服务运行正常 (http://localhost:3000)${NC}"
else
    echo -e "${YELLOW}⚠️  后端健康检查失败，尝试直接测试API...${NC}"
fi

# 测试前端是否运行
echo ""
echo "2️⃣  检查前端服务..."
if curl -s http://localhost:8080 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 前端服务运行正常 (http://localhost:8080)${NC}"
else
    echo -e "${RED}❌ 前端服务未运行${NC}"
fi

# 测试热门搜索API
echo ""
echo "3️⃣  测试热门搜索API..."
RESPONSE=$(curl -s 'http://localhost:3000/api/search-stats/popular?limit=3')
if echo "$RESPONSE" | grep -q "success"; then
    echo -e "${GREEN}✅ 热门搜索API正常工作${NC}"
    echo ""
    echo "📊 热门搜索数据:"
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null | grep -A 1 '"query"' | head -6
else
    echo -e "${RED}❌ 热门搜索API失败${NC}"
    echo "$RESPONSE"
fi

# 测试记录搜索API
echo ""
echo "4️⃣  测试记录搜索API..."
TEST_QUERY="测试搜索_$(date +%s)"
RECORD_RESPONSE=$(curl -s -X POST 'http://localhost:3000/api/search-stats/record' \
  -H 'Content-Type: application/json' \
  -d "{\"query\":\"$TEST_QUERY\",\"resultsCount\":10,\"searchType\":\"smart\",\"isSuccessful\":true}")

if echo "$RECORD_RESPONSE" | grep -q "success"; then
    echo -e "${GREEN}✅ 记录搜索API正常工作${NC}"
    echo "   已记录测试搜索: $TEST_QUERY"
else
    echo -e "${RED}❌ 记录搜索API失败${NC}"
    echo "$RECORD_RESPONSE"
fi

# 验证数据库表
echo ""
echo "5️⃣  验证数据库表..."
if command -v mysql &> /dev/null; then
    TABLE_COUNT=$(mysql -h 49.235.98.5 -P 3306 -u Jason -pJason123456! cardesignspace \
      -e "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'cardesignspace' AND TABLE_NAME IN ('search_history', 'search_stats');" \
      -N 2>/dev/null)
    
    if [ "$TABLE_COUNT" = "2" ]; then
        echo -e "${GREEN}✅ 数据库表创建正常${NC}"
    else
        echo -e "${YELLOW}⚠️  数据库表可能不完整 (找到 $TABLE_COUNT 个表)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  未安装mysql客户端，跳过数据库检查${NC}"
fi

# 查看搜索统计
echo ""
echo "6️⃣  当前搜索统计概览..."
STATS=$(curl -s 'http://localhost:3000/api/search-stats/popular?limit=5')
COUNT=$(echo "$STATS" | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data.get('data', [])))" 2>/dev/null)

if [ ! -z "$COUNT" ]; then
    echo -e "${GREEN}✅ 当前有 $COUNT 个热门搜索词${NC}"
else
    echo -e "${YELLOW}⚠️  无法获取统计数据${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎉 测试完成！"
echo ""
echo "📱 访问智能搜索页面查看效果:"
echo "   ${GREEN}http://localhost:8080/smart-search${NC}"
echo ""
echo "📖 查看完整文档:"
echo "   - SEARCH_FEATURE_GUIDE.md - 功能使用指南"
echo "   - DEPLOYMENT_SUCCESS.md - 部署成功报告"
echo ""



