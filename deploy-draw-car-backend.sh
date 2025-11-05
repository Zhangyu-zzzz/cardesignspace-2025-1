#!/bin/bash

echo "================================================"
echo "  部署画车功能后端文件到生产服务器"
echo "================================================"

SERVER="root@43.135.163.88"
REMOTE_PATH="/root/cardesignspace-2025"
LOCAL_BACKEND="./backend"

echo ""
echo "步骤 1: 上传缺失的路由文件..."
scp "${LOCAL_BACKEND}/src/routes/vehicle.js" \
    "${SERVER}:${REMOTE_PATH}/backend/src/routes/vehicle.js"

if [ $? -eq 0 ]; then
    echo "✓ vehicle.js 路由文件上传成功"
else
    echo "✗ vehicle.js 路由文件上传失败"
    exit 1
fi

echo ""
echo "步骤 2: 上传缺失的控制器文件..."
scp "${LOCAL_BACKEND}/src/controllers/vehicleController.js" \
    "${SERVER}:${REMOTE_PATH}/backend/src/controllers/vehicleController.js"

if [ $? -eq 0 ]; then
    echo "✓ vehicleController.js 控制器文件上传成功"
else
    echo "✗ vehicleController.js 控制器文件上传失败"
    exit 1
fi

echo ""
echo "步骤 3: 上传更新后的 app.js（包含路由注册）..."
scp "${LOCAL_BACKEND}/src/app.js" \
    "${SERVER}:${REMOTE_PATH}/backend/src/app.js"

if [ $? -eq 0 ]; then
    echo "✓ app.js 文件上传成功"
else
    echo "✗ app.js 文件上传失败"
    exit 1
fi

echo ""
echo "步骤 4: 上传数据库模型文件..."
scp "${LOCAL_BACKEND}/src/models/mysql/Vehicle.js" \
    "${SERVER}:${REMOTE_PATH}/backend/src/models/mysql/Vehicle.js"

if [ $? -eq 0 ]; then
    echo "✓ Vehicle.js 模型文件上传成功"
else
    echo "✗ Vehicle.js 模型文件上传失败"
    exit 1
fi

scp "${LOCAL_BACKEND}/src/models/mysql/VehicleVote.js" \
    "${SERVER}:${REMOTE_PATH}/backend/src/models/mysql/VehicleVote.js"

if [ $? -eq 0 ]; then
    echo "✓ VehicleVote.js 模型文件上传成功"
else
    echo "✗ VehicleVote.js 模型文件上传失败"
    exit 1
fi

echo ""
echo "步骤 4.5: 上传模型索引文件（包含模型关联）..."
scp "${LOCAL_BACKEND}/src/models/mysql/index.js" \
    "${SERVER}:${REMOTE_PATH}/backend/src/models/mysql/index.js"

if [ $? -eq 0 ]; then
    echo "✓ index.js 模型索引文件上传成功"
else
    echo "✗ index.js 模型索引文件上传失败"
    exit 1
fi

echo ""
echo "步骤 5: 重启后端服务..."
ssh "${SERVER}" << 'ENDSSH'
cd /root/cardesignspace-2025/backend

echo "重启 PM2 进程..."
pm2 restart cardesignspace-backend || pm2 start npm --name "cardesignspace-backend" -- start

echo "等待服务启动..."
sleep 5

echo "检查 PM2 状态..."
pm2 status | grep cardesignspace-backend

echo "查看最新日志..."
pm2 logs cardesignspace-backend --lines 20 --nostream
ENDSSH

echo ""
echo "步骤 6: 验证 API 端点..."
sleep 3

ssh "${SERVER}" << 'ENDSSH'
echo ""
echo "=== 测试画车 API 端点 ==="

# 测试 GET 请求
echo "1. 测试获取载具列表..."
curl -s http://localhost:3000/api/draw-car/vehicles | jq -r '.status // .message' || echo "请求失败"

# 测试 POST 请求（创建测试载具）
echo ""
echo "2. 测试创建载具..."
curl -s -X POST http://localhost:3000/api/draw-car/vehicles \
  -H "Content-Type: application/json" \
  -d '{"name":"部署测试","imageData":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="}' \
  | jq -r '.status // .message' || echo "请求失败"

echo ""
echo "3. 检查路由注册..."
grep -n "draw-car" /root/cardesignspace-2025/backend/src/app.js || echo "路由注册未找到"

echo ""
echo "4. 检查错误日志..."
if [ -d "/root/cardesignspace-2025/backend/logs" ]; then
    latest_error_log=$(ls -t /root/cardesignspace-2025/backend/logs/err-*.log 2>/dev/null | head -1)
    if [ -n "$latest_error_log" ]; then
        echo "最新错误日志 (最后10行):"
        tail -10 "$latest_error_log"
    else
        echo "未找到错误日志"
    fi
else
    echo "logs 目录不存在"
fi
ENDSSH

echo ""
echo "================================================"
echo "  部署完成！"
echo "================================================"
echo ""
echo "如果一切正常，你应该看到："
echo "  - ✓ 所有文件上传成功"
echo "  - ✓ PM2 进程正在运行"
echo "  - API 测试返回 'success' 状态"
echo ""
echo "访问前端测试："
echo "  http://43.135.163.88/draw-car"
echo ""

