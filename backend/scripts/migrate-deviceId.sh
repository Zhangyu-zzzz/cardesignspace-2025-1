#!/bin/bash

# 数据库迁移脚本：添加deviceId字段到vehicle_votes表
# 使用方法: ./migrate-deviceId.sh

# 加载环境变量
if [ -f "../../.env" ]; then
    export $(cat ../../.env | grep -v '^#' | xargs)
fi

# 检查必要的环境变量
if [ -z "$DB_HOST" ] || [ -z "$DB_USER" ] || [ -z "$DB_NAME" ]; then
    echo "❌ 错误: 请先设置数据库环境变量 (DB_HOST, DB_USER, DB_NAME)"
    echo "   可以从 .env 文件读取，或手动设置环境变量"
    exit 1
fi

# 提示输入密码
if [ -z "$DB_PASSWORD" ]; then
    echo "请输入MySQL密码:"
    read -s DB_PASSWORD
    export DB_PASSWORD
fi

echo "🚀 开始执行数据库迁移..."
echo "   数据库: $DB_NAME"
echo "   主机: $DB_HOST"
echo "   用户: $DB_USER"
echo ""

# 执行迁移SQL
mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < ../migrations/add_deviceId_to_vehicle_votes.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 数据库迁移成功！"
    echo "   现在同一IP下的不同设备可以分别投票了"
else
    echo ""
    echo "❌ 数据库迁移失败，请检查错误信息"
    exit 1
fi

