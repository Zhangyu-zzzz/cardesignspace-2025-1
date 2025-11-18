#!/bin/bash

# 重启PM2服务并确保环境变量正确加载

echo "🔄 重启PM2服务以应用新的环境变量配置..."
echo "=================================="

cd /opt/auto-gallery/backend

# 检查.env文件
if [ ! -f ".env" ]; then
    echo "❌ 错误: 未找到.env文件"
    exit 1
fi

echo "✅ 找到.env文件"

# 检查COS配置
echo ""
echo "检查COS配置..."
if grep -q "COS_BUCKET=" .env; then
    COS_BUCKET=$(grep "COS_BUCKET=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    if [ "$COS_BUCKET" != "test-1250000000" ] && [ -n "$COS_BUCKET" ]; then
        echo "✅ COS_BUCKET: $COS_BUCKET"
    else
        echo "❌ COS_BUCKET配置无效: $COS_BUCKET"
        exit 1
    fi
else
    echo "❌ 未找到COS_BUCKET配置"
    exit 1
fi

# 停止现有服务
echo ""
echo "停止PM2服务..."
pm2 stop cardesignspace-backend 2>/dev/null || true

# 删除现有服务
echo "删除现有PM2进程..."
pm2 delete cardesignspace-backend 2>/dev/null || true

# 等待一下
sleep 2

# 重新启动服务
echo ""
echo "启动PM2服务..."
pm2 start ecosystem.config.js

# 保存PM2配置
pm2 save

# 等待服务启动
echo ""
echo "等待服务启动..."
sleep 5

# 检查服务状态
echo ""
echo "检查服务状态..."
pm2 status

# 验证环境变量
echo ""
echo "验证环境变量..."
echo "NODE_ENV:"
pm2 env 0 | grep NODE_ENV || echo "未找到NODE_ENV"

echo ""
echo "COS配置:"
pm2 env 0 | grep -E 'TENCENT|COS' || echo "未找到COS配置"

# 检查日志
echo ""
echo "查看最近的日志（最后10行）..."
pm2 logs cardesignspace-backend --lines 10 --nostream

echo ""
echo "✅ PM2服务已重启"
echo ""
echo "📋 下一步："
echo "1. 测试图片上传功能"
echo "2. 如果还有问题，查看详细日志: pm2 logs cardesignspace-backend"
echo "3. 运行COS诊断: node scripts/check-cos-config.js"

