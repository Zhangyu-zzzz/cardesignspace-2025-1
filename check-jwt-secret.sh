#!/bin/bash

# JWT密钥检查和修复脚本
# 解决本地和线上JWT_SECRET不一致导致的token验证失败问题

echo "🔍 正在检查JWT_SECRET配置..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查本地环境文件
echo -e "${BLUE}📝 检查本地环境配置...${NC}"

LOCAL_JWT_SECRET=""
if [ -f ".env" ]; then
    LOCAL_JWT_SECRET=$(grep "^JWT_SECRET=" .env | cut -d'=' -f2)
    echo "本地 .env JWT_SECRET: $LOCAL_JWT_SECRET"
elif [ -f "backend/.env" ]; then
    LOCAL_JWT_SECRET=$(grep "^JWT_SECRET=" backend/.env | cut -d'=' -f2)
    echo "后端 .env JWT_SECRET: $LOCAL_JWT_SECRET"
else
    echo -e "${YELLOW}⚠️ 未找到本地环境文件${NC}"
fi

# 检查线上环境
echo -e "${BLUE}🌐 检查线上环境配置...${NC}"

# 检查PM2进程环境变量
ONLINE_JWT_SECRET=""
if command -v pm2 >/dev/null 2>&1; then
    pm2 jlist | grep -q "cardesignspace-backend" && {
        echo "发现PM2进程，检查环境变量..."
        # 这里需要手动检查
        echo -e "${YELLOW}请手动检查PM2进程的JWT_SECRET:${NC}"
        echo "运行: pm2 env cardesignspace-backend | grep JWT_SECRET"
    }
fi

# 提供解决方案
echo ""
echo -e "${GREEN}🔧 解决方案:${NC}"
echo ""

# 方案1: 统一JWT_SECRET
cat << 'EOF'
方案1: 统一JWT_SECRET（推荐）
=====================================

1. 获取线上JWT_SECRET:
   pm2 env cardesignspace-backend | grep JWT_SECRET

2. 将线上的JWT_SECRET复制到本地 .env 文件:
   JWT_SECRET=你的线上JWT_SECRET值

3. 重启本地开发服务器

或者

方案2: 重新生成所有token
===========================

1. 修改线上JWT_SECRET为一个固定值
2. 重启线上服务
3. 重新登录获取新token

EOF

# 创建修复脚本
echo -e "${BLUE}📋 创建一键修复脚本...${NC}"

cat > fix-jwt-secret.sh << 'SCRIPT_EOF'
#!/bin/bash

echo "🔧 修复JWT_SECRET不一致问题"

# 读取用户输入的JWT_SECRET
read -p "请输入要使用的JWT_SECRET（留空使用默认值）: " JWT_SECRET

if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET="cardesignspace-super-secret-$(date +%s)-unified"
    echo "使用默认JWT_SECRET: $JWT_SECRET"
fi

# 更新本地环境文件
if [ -f ".env" ]; then
    sed -i.bak "s/^JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
    echo "✅ 更新了根目录 .env"
fi

if [ -f "backend/.env" ]; then
    sed -i.bak "s/^JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" backend/.env
    echo "✅ 更新了 backend/.env"
fi

# 更新线上环境（如果是在服务器上运行）
if command -v pm2 >/dev/null 2>&1; then
    if pm2 jlist | grep -q "cardesignspace-backend"; then
        echo "🔄 重启PM2进程以应用新的JWT_SECRET..."
        pm2 restart cardesignspace-backend
        echo "✅ PM2进程已重启"
    fi
fi

echo ""
echo "✅ JWT_SECRET修复完成！"
echo "请重新登录以获取新的有效token"

SCRIPT_EOF

chmod +x fix-jwt-secret.sh

echo ""
echo -e "${GREEN}✅ 检查完成！${NC}"
echo ""
echo -e "${BLUE}🚀 使用方法:${NC}"
echo "1. 运行 ./fix-jwt-secret.sh 来一键修复"
echo "2. 或者手动按照上述方案进行修复"
echo ""
echo -e "${YELLOW}⚠️ 重要提示:${NC}"
echo "- 修改JWT_SECRET后，所有现有token都会失效"
echo "- 用户需要重新登录"
echo "- 建议在维护时间进行此操作" 