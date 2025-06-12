#!/bin/bash

echo "🚀 快速修复服务器问题"
echo "===================="

# 1. 检查并创建.env文件
if [ ! -f ".env" ]; then
    echo "创建.env文件..."
    cp env.example .env
    echo "⚠️  请编辑.env文件，填入正确的数据库配置！"
    echo "vim .env"
fi

# 2. 重启数据库服务
echo "重启MySQL服务..."
sudo systemctl restart mysql
sleep 3

# 3. 检查数据库是否存在，不存在则创建
echo "检查数据库..."
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS cardesignspace;"
mysql -u root -p -e "SHOW DATABASES;" | grep cardesignspace

# 4. 重新安装后端依赖
echo "重新安装后端依赖..."
cd backend
npm install

# 5. 运行数据库初始化
echo "初始化数据库..."
npm run db:init 2>/dev/null || echo "数据库初始化脚本不存在，跳过"

# 6. 重启PM2服务
echo "重启后端服务..."
pm2 restart all
sleep 5

# 7. 检查服务状态
echo "检查服务状态..."
pm2 status

# 8. 测试API
echo "测试API接口..."
sleep 3
curl -s http://localhost:3000/api/brands | head -50

echo ""
echo "✅ 修复完成！"
echo "如果还有问题，请检查："
echo "1. .env文件中的数据库配置"
echo "2. MySQL服务是否正常运行"
echo "3. PM2日志: pm2 logs" 