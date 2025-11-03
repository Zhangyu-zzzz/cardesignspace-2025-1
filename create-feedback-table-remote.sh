#!/bin/bash

echo "=========================================="
echo "在远程服务器上创建 feedbacks 表"
echo "=========================================="

# 服务器配置
SERVER_USER="root"
SERVER_IP="49.235.98.5"
DB_USER="Jason"
DB_PASS="Aa5201314!!"
DB_NAME="cardesignspace"

echo ""
echo "📊 正在创建 feedbacks 表..."

# 上传 SQL 文件到服务器
echo "上传 SQL 文件..."
scp backend/migrations/create_feedbacks_table_simple.sql ${SERVER_USER}@${SERVER_IP}:/tmp/

# 在服务器上执行 SQL
echo ""
echo "执行 SQL 脚本..."
ssh ${SERVER_USER}@${SERVER_IP} << ENDSSH
  mysql -u ${DB_USER} -p'${DB_PASS}' ${DB_NAME} < /tmp/create_feedbacks_table_simple.sql
  
  if [ \$? -eq 0 ]; then
    echo ""
    echo "✅ feedbacks 表创建成功！"
    echo ""
    echo "查看表结构："
    mysql -u ${DB_USER} -p'${DB_PASS}' ${DB_NAME} -e "DESC feedbacks;"
  else
    echo ""
    echo "❌ 创建表失败"
    exit 1
  fi
  
  # 清理临时文件
  rm /tmp/create_feedbacks_table_simple.sql
ENDSSH

echo ""
echo "=========================================="
echo "✅ 完成！"
echo "=========================================="


