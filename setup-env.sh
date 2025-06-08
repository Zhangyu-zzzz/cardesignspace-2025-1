#!/bin/bash

# ===========================================
# 🚀 Car Design Space - 环境配置统一管理脚本
# ===========================================

echo "🔧 正在统一环境配置..."

# 定义颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查是否存在env.example
if [ ! -f "env.example" ]; then
    echo -e "${RED}❌ 未找到 env.example 文件${NC}"
    exit 1
fi

echo -e "${YELLOW}📁 清理重复的环境配置文件...${NC}"

# 备份现有配置
echo "📦 备份现有配置到 env-backup/ 目录..."
mkdir -p env-backup
cp -f .env env-backup/.env.root 2>/dev/null || true
cp -f backend/.env env-backup/.env.backend 2>/dev/null || true
cp -f backend/.env.backup env-backup/.env.backend.backup 2>/dev/null || true
cp -f backend/.env.clean env-backup/.env.backend.clean 2>/dev/null || true
cp -f backend/.env.temp env-backup/.env.backend.temp 2>/dev/null || true
cp -f frontend/.env env-backup/.env.frontend 2>/dev/null || true
cp -f frontend/.env.local env-backup/.env.frontend.local 2>/dev/null || true

# 删除重复的配置文件
echo "🗑️  删除重复的配置文件..."
rm -f backend/.env.backup
rm -f backend/.env.clean
rm -f backend/.env.temp
rm -f frontend/.env.local

# 根据参数创建对应环境的.env文件
ENV=${1:-development}

echo -e "${GREEN}🌍 创建 ${ENV} 环境配置...${NC}"

if [ "$ENV" = "production" ]; then
    # 生产环境配置
    cat > .env << EOF
# ===========================================
# 🚀 Car Design Space - 生产环境配置
# ===========================================

NODE_ENV=production
APP_NAME="Car Design Space"
APP_VERSION=1.0.0

# 服务器配置
BACKEND_HOST=0.0.0.0
BACKEND_PORT=3000
VUE_APP_API_URL=https://api.yoursite.com/api
VUE_APP_API_BASE_URL=https://api.yoursite.com

# JWT配置
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=cardesignspace
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# 腾讯云COS配置
TENCENT_SECRET_ID=your_tencent_secret_id
TENCENT_SECRET_KEY=your_tencent_secret_key
COS_BUCKET=your-cos-bucket-name
COS_REGION=ap-shanghai
COS_DOMAIN=https://your-cos-bucket-name.cos.ap-shanghai.myqcloud.com

# CORS配置
CORS_ORIGIN=https://www.yoursite.com,https://yoursite.com

# 日志配置
LOG_LEVEL=info
LOG_MAX_SIZE=20m
LOG_MAX_FILES=14d
EOF

else
    # 开发环境配置
    cat > .env << EOF
# ===========================================
# 🚀 Car Design Space - 开发环境配置
# ===========================================

NODE_ENV=development
APP_NAME="Car Design Space"
APP_VERSION=1.0.0

# 服务器配置
BACKEND_HOST=0.0.0.0
BACKEND_PORT=3000
VUE_APP_API_URL=http://localhost:3000/api
VUE_APP_API_BASE_URL=http://localhost:3000

# JWT配置
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=cardesignspace
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# 腾讯云COS配置
TENCENT_SECRET_ID=your_tencent_secret_id
TENCENT_SECRET_KEY=your_tencent_secret_key
COS_BUCKET=your-cos-bucket-name
COS_REGION=ap-shanghai
COS_DOMAIN=https://your-cos-bucket-name.cos.ap-shanghai.myqcloud.com

# CORS配置
CORS_ORIGIN=http://localhost:8080,http://localhost:3000

# 日志配置
LOG_LEVEL=debug
LOG_MAX_SIZE=20m
LOG_MAX_FILES=14d
EOF

fi

# 创建前端配置
echo "🎨 创建前端环境配置..."
if [ "$ENV" = "production" ]; then
    cat > frontend/.env << EOF
VUE_APP_API_URL=https://api.yoursite.com/api
VUE_APP_API_BASE_URL=https://api.yoursite.com
NODE_ENV=production
EOF
else
    cat > frontend/.env << EOF
VUE_APP_API_URL=http://localhost:3000/api
VUE_APP_API_BASE_URL=http://localhost:3000
NODE_ENV=development
EOF
fi

# 更新后端配置文件引用
echo "🔄 更新后端配置文件..."

# 确保后端配置使用根目录的.env
cat > backend/.env << EOF
# 此文件指向根目录的.env配置
# 实际配置请修改根目录的 .env 文件

# 如果需要后端特定配置，可以在此添加
# 但建议所有配置统一在根目录的 .env 中管理
EOF

echo -e "${GREEN}✅ 环境配置统一完成！${NC}"
echo ""
echo "📁 配置文件结构："
echo "   ├── .env (主配置文件 - ${ENV}环境)"
echo "   ├── env.example (配置模板)"
echo "   ├── frontend/.env (前端配置)"
echo "   ├── backend/.env (后端配置指向)"
echo "   └── env-backup/ (原配置备份)"
echo ""
echo -e "${YELLOW}📝 使用说明：${NC}"
echo "   • 开发环境: ./setup-env.sh development"
echo "   • 生产环境: ./setup-env.sh production"
echo "   • 所有配置统一在根目录的 .env 文件中管理"
echo "   • 原配置文件已备份到 env-backup/ 目录"
echo ""
echo -e "${GREEN}🎉 现在你只需要维护一个主要的 .env 文件即可！${NC}"

# 统一为开发环境配置（推荐）
./setup-env.sh development

# 或者统一为生产环境配置
./setup-env.sh production 