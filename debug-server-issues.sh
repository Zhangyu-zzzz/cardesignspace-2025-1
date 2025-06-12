#!/bin/bash

echo "🔍 服务器问题诊断脚本"
echo "========================"

# 检查环境变量
echo "1. 检查环境变量配置:"
echo "NODE_ENV: $NODE_ENV"
echo "数据库配置检查..."

# 检查.env文件
if [ -f ".env" ]; then
    echo "✅ .env文件存在"
    echo "数据库配置:"
    grep -E "^(DB_|MYSQL_)" .env | sed 's/=.*/=***/'
else
    echo "❌ .env文件不存在！"
fi

echo ""
echo "2. 检查数据库连接:"
# 测试MySQL连接
mysql -h${DB_HOST:-localhost} -u${DB_USER:-root} -p${DB_PASSWORD} -e "SELECT 1;" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ MySQL连接正常"
else
    echo "❌ MySQL连接失败"
fi

echo ""
echo "3. 检查后端服务状态:"
pm2 status

echo ""
echo "4. 检查后端日志:"
echo "最近的错误日志:"
pm2 logs --lines 20 | grep -i error

echo ""
echo "5. 检查端口占用:"
netstat -tlnp | grep :3000

echo ""
echo "6. 测试API接口:"
echo "测试品牌接口:"
curl -s http://localhost:3000/api/brands | head -100

echo ""
echo "测试登录接口:"
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}' | head -100 