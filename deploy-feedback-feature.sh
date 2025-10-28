#!/bin/bash

echo "=========================================="
echo "部署反馈功能到生产服务器"
echo "=========================================="

# 服务器配置
SERVER_USER="root"
SERVER_IP="49.235.98.5"
BACKEND_DIR="/opt/auto-gallery/backend"
FRONTEND_DIR="/opt/auto-gallery/frontend"

echo ""
echo "📦 准备部署文件..."

# 1. 上传前端反馈组件
echo "上传前端反馈组件..."
scp -r frontend/src/components/FloatingFeedback.vue ${SERVER_USER}@${SERVER_IP}:${FRONTEND_DIR}/src/components/

# 2. 上传前端反馈API
echo "上传前端反馈API..."
scp -r frontend/src/api/feedback.js ${SERVER_USER}@${SERVER_IP}:${FRONTEND_DIR}/src/api/

# 3. 上传前端Home.vue（包含反馈组件集成）
echo "上传前端Home.vue..."
scp frontend/src/views/Home.vue ${SERVER_USER}@${SERVER_IP}:${FRONTEND_DIR}/src/views/

# 4. 上传后端反馈模型
echo "上传后端反馈模型..."
scp backend/src/models/mysql/Feedback.js ${SERVER_USER}@${SERVER_IP}:${BACKEND_DIR}/src/models/mysql/

# 5. 上传后端模型索引（包含Feedback关联）
echo "上传后端模型索引..."
scp backend/src/models/mysql/index.js ${SERVER_USER}@${SERVER_IP}:${BACKEND_DIR}/src/models/mysql/

# 6. 上传后端反馈控制器
echo "上传后端反馈控制器..."
scp backend/src/controllers/feedbackController.js ${SERVER_USER}@${SERVER_IP}:${BACKEND_DIR}/src/controllers/

# 7. 上传后端反馈路由
echo "上传后端反馈路由..."
scp backend/src/routes/feedback.js ${SERVER_USER}@${SERVER_IP}:${BACKEND_DIR}/src/routes/

# 8. 上传后端app.js（包含反馈路由集成）
echo "上传后端app.js..."
scp backend/src/app.js ${SERVER_USER}@${SERVER_IP}:${BACKEND_DIR}/src/

# 9. 上传数据库迁移脚本
echo "上传数据库迁移脚本..."
scp backend/migrations/create_feedbacks_table.sql ${SERVER_USER}@${SERVER_IP}:${BACKEND_DIR}/migrations/

echo ""
echo "🔧 在服务器上执行部署操作..."

ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
  echo "切换到后端目录..."
  cd /opt/auto-gallery/backend
  
  echo ""
  echo "📊 执行数据库迁移..."
  mysql -u Jason -p'Aa5201314!!' cardesignspace < migrations/create_feedbacks_table.sql
  
  if [ $? -eq 0 ]; then
    echo "✅ 数据库迁移成功！feedbacks表已创建"
  else
    echo "⚠️  数据库迁移失败，可能表已存在"
  fi
  
  echo ""
  echo "🔄 重启后端服务..."
  pm2 restart auto-gallery-backend
  
  echo ""
  echo "🎨 重新构建前端..."
  cd /opt/auto-gallery/frontend
  npm run build
  
  if [ $? -eq 0 ]; then
    echo "✅ 前端构建成功！"
  else
    echo "❌ 前端构建失败"
    exit 1
  fi
  
  echo ""
  echo "✅ 部署完成！"
ENDSSH

echo ""
echo "=========================================="
echo "✅ 反馈功能部署完成！"
echo "=========================================="
echo ""
echo "📋 功能说明："
echo "1. ✅ 去掉了反馈类型选择"
echo "2. ✅ 调整了顺序：联系方式 → 详细反馈 → 满意度"
echo "3. ✅ 数据保存在 cardesignspace 数据库的 feedbacks 表"
echo "4. ✅ 右下角悬浮按钮"
echo ""
echo "🔍 查看反馈数据："
echo "   mysql -u Jason -p cardesignspace -e 'SELECT * FROM feedbacks ORDER BY createdAt DESC LIMIT 10;'"
echo ""
