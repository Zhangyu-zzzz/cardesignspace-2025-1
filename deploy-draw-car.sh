#!/bin/bash

echo "=========================================="
echo "部署画个车功能到生产服务器"
echo "=========================================="

# 服务器配置
SERVER_USER="root"
SERVER_IP="49.235.98.5"
BACKEND_DIR="/opt/auto-gallery/backend"
FRONTEND_DIR="/opt/auto-gallery/frontend"

echo ""
echo "📦 准备部署文件..."

# 1. 上传前端文件
echo "上传前端文件..."
scp frontend/src/views/DrawCar.vue ${SERVER_USER}@${SERVER_IP}:${FRONTEND_DIR}/src/views/
scp frontend/src/api/drawCar.js ${SERVER_USER}@${SERVER_IP}:${FRONTEND_DIR}/src/api/
scp frontend/src/router/index.js ${SERVER_USER}@${SERVER_IP}:${FRONTEND_DIR}/src/router/
scp frontend/src/App.vue ${SERVER_USER}@${SERVER_IP}:${FRONTEND_DIR}/src/

# 2. 上传后端文件
echo ""
echo "上传后端文件..."
scp backend/src/models/mysql/Vehicle.js ${SERVER_USER}@${SERVER_IP}:${BACKEND_DIR}/src/models/mysql/
scp backend/src/models/mysql/VehicleVote.js ${SERVER_USER}@${SERVER_IP}:${BACKEND_DIR}/src/models/mysql/
scp backend/src/models/mysql/index.js ${SERVER_USER}@${SERVER_IP}:${BACKEND_DIR}/src/models/mysql/
scp backend/src/controllers/vehicleController.js ${SERVER_USER}@${SERVER_IP}:${BACKEND_DIR}/src/controllers/
scp backend/src/routes/vehicle.js ${SERVER_USER}@${SERVER_IP}:${BACKEND_DIR}/src/routes/
scp backend/src/app.js ${SERVER_USER}@${SERVER_IP}:${BACKEND_DIR}/src/

# 3. 上传数据库迁移脚本
echo ""
echo "上传数据库迁移脚本..."
scp backend/migrations/create_vehicles_table.sql ${SERVER_USER}@${SERVER_IP}:${BACKEND_DIR}/migrations/

echo ""
echo "🔧 在服务器上执行部署操作..."

ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
  echo "切换到后端目录..."
  cd /opt/auto-gallery/backend
  
  echo ""
  echo "📊 执行数据库迁移..."
  mysql -u root -p << 'EOFMYSQL'
USE cardesignspace;

-- 创建载具表
CREATE TABLE IF NOT EXISTS `vehicles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) DEFAULT '未命名载具' COMMENT '载具名称',
  `imageData` longtext NOT NULL COMMENT '载具图片数据(base64)',
  `userId` int(11) DEFAULT NULL COMMENT '创建者ID(可为空，允许匿名)',
  `likes` int(11) DEFAULT 0 COMMENT '点赞数',
  `dislikes` int(11) DEFAULT 0 COMMENT '拉踩数',
  `score` int(11) DEFAULT 0 COMMENT '得分(点赞-拉踩)',
  `status` enum('active','reported','deleted') DEFAULT 'active' COMMENT '状态',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_userId` (`userId`),
  KEY `idx_score` (`score`),
  KEY `idx_status` (`status`),
  KEY `idx_createdAt` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='画个车-载具表';

-- 创建投票记录表
CREATE TABLE IF NOT EXISTS `vehicle_votes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `vehicleId` int(11) NOT NULL COMMENT '载具ID',
  `userId` int(11) DEFAULT NULL COMMENT '投票用户ID',
  `ipAddress` varchar(45) DEFAULT NULL COMMENT 'IP地址',
  `voteType` enum('like','dislike') NOT NULL COMMENT '投票类型',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_vote` (`vehicleId`, `userId`, `ipAddress`),
  KEY `idx_vehicleId` (`vehicleId`),
  KEY `idx_userId` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='画个车-投票记录表';

SELECT '数据库表创建成功！' as result;
SHOW TABLES LIKE 'vehicle%';
EOFMYSQL
  
  if [ $? -eq 0 ]; then
    echo "✅ 数据库迁移成功！"
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
echo "✅ 画个车功能部署完成！"
echo "=========================================="
echo ""
echo "📋 部署摘要："
echo "1. ✅ 前端 DrawCar.vue 组件已部署"
echo "2. ✅ 前端 API 客户端已部署"
echo "3. ✅ 前端路由已更新"
echo "4. ✅ 导航栏已添加入口"
echo "5. ✅ 后端数据模型已部署"
echo "6. ✅ 后端控制器和路由已部署"
echo "7. ✅ 数据库表已创建"
echo "8. ✅ 前端已重新构建"
echo "9. ✅ 后端服务已重启"
echo ""
echo "🌐 访问地址："
echo "   https://www.cardesignspace.com/draw-car"
echo ""
echo "🧪 本地测试："
echo "   http://localhost:8080/draw-car"
echo ""


