#!/bin/bash

# =====================================================
# 搜索统计表部署脚本
# 用途: 在服务器端数据库创建搜索统计相关表
# =====================================================

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 数据库配置
DB_HOST="49.235.98.5"
DB_PORT="3306"
DB_USER="Jason"
DB_PASS="Jason123456!"
DB_NAME="cardesignspace"

# 迁移文件路径
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
MIGRATION_FILE="$PROJECT_ROOT/backend/migrations/create_search_tables.sql"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  搜索统计表部署脚本${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 检查迁移文件是否存在
if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}❌ 错误: 找不到迁移文件${NC}"
    echo -e "   期望位置: $MIGRATION_FILE"
    exit 1
fi

echo -e "${GREEN}✓${NC} 找到迁移文件: $MIGRATION_FILE"
echo ""

# 询问用户确认
echo -e "${YELLOW}⚠️  即将连接到数据库:${NC}"
echo -e "   主机: ${BLUE}$DB_HOST:$DB_PORT${NC}"
echo -e "   数据库: ${BLUE}$DB_NAME${NC}"
echo -e "   用户: ${BLUE}$DB_USER${NC}"
echo ""

read -p "确认执行迁移吗? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}取消部署${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}📦 开始执行数据库迁移...${NC}"
echo ""

# 执行迁移
if mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$MIGRATION_FILE"; then
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}✅ 迁移执行成功！${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    
    # 验证安装
    echo -e "${BLUE}🔍 验证表创建情况...${NC}"
    echo ""
    
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "
    SELECT 
      TABLE_NAME as '表名', 
      TABLE_ROWS as '行数', 
      TABLE_COMMENT as '说明'
    FROM information_schema.TABLES 
    WHERE TABLE_SCHEMA = '$DB_NAME'
      AND TABLE_NAME IN ('search_history', 'search_stats');
    "
    
    echo ""
    echo -e "${BLUE}📊 查看初始数据...${NC}"
    echo ""
    
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "
    SELECT 
      query as '搜索词', 
      count as '次数', 
      last_searched_at as '最后搜索时间'
    FROM search_stats 
    ORDER BY count DESC 
    LIMIT 10;
    "
    
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}🎉 部署完成！${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "${YELLOW}📝 后续步骤:${NC}"
    echo -e "   1. 访问智能搜索页面验证热门标签"
    echo -e "   2. 执行几次搜索测试数据记录"
    echo -e "   3. 查看 API 测试: ${BLUE}curl 'http://localhost:3000/api/search-stats/popular?limit=6'${NC}"
    echo ""
    
else
    echo ""
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}❌ 迁移执行失败！${NC}"
    echo -e "${RED}========================================${NC}"
    echo ""
    echo -e "${YELLOW}可能的原因:${NC}"
    echo -e "   1. 数据库连接失败（检查主机、端口、用户名、密码）"
    echo -e "   2. 权限不足（需要 CREATE、ALTER 权限）"
    echo -e "   3. 表已存在但结构不同"
    echo ""
    echo -e "${YELLOW}排查建议:${NC}"
    echo -e "   1. 测试连接: ${BLUE}mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p${NC}"
    echo -e "   2. 检查权限: ${BLUE}SHOW GRANTS FOR '$DB_USER'@'%';${NC}"
    echo -e "   3. 查看错误日志"
    echo ""
    exit 1
fi

