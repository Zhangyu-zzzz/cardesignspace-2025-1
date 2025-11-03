# 画个车功能集成说明

## ✅ 已完成的工作

### 1. 前端集成
- ✅ 创建 `DrawCar.vue` 页面组件
- ✅ 集成原始项目的所有功能（绘画、车库、排行榜）
- ✅ 创建前端 API 客户端 `drawCar.js`
- ✅ 添加路由配置 `/draw-car`
- ✅ 在导航栏添加"画个车"入口（桌面端和移动端）

### 2. 后端集成
- ✅ 创建数据库模型 `Vehicle.js` 和 `VehicleVote.js`
- ✅ 创建控制器 `vehicleController.js`
- ✅ 创建路由 `vehicle.js`
- ✅ 集成到 `app.js`
- ✅ 创建数据库迁移脚本

### 3. 功能特性
- ✅ 自由绘画创作载具
- ✅ 载具命名功能
- ✅ 2D车库展示（载具动画）
- ✅ 点赞/拉踩投票系统
- ✅ 排行榜（按得分/热度/日期/随机）
- ✅ 举报功能
- ✅ 支持匿名创作
- ✅ 数据持久化到 MySQL

## 📋 需要执行的部署步骤

### 步骤 1：创建数据库表

SSH 登录到服务器：
```bash
ssh root@49.235.98.5
```

执行 SQL 创建表：
```bash
mysql -u root -p << 'EOF'
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

-- 验证创建
DESC vehicles;
DESC vehicle_votes;
EOF
```

### 步骤 2：本地测试

1. 启动后端服务：
```bash
cd backend
npm start
```

2. 启动前端服务：
```bash
cd frontend
npm run serve
```

3. 访问 http://localhost:8080/draw-car

4. 测试功能：
   - ✅ 点击导航栏"画个车"
   - ✅ 开始创作 → 绘画 → 提交
   - ✅ 为载具命名
   - ✅ 查看车库
   - ✅ 点击载具查看详情
   - ✅ 点赞/拉踩投票
   - ✅ 查看排行榜

### 步骤 3：部署到生产环境

创建部署脚本：
```bash
chmod +x deploy-draw-car.sh
./deploy-draw-car.sh
```

或手动部署：

1. 上传文件到服务器：
```bash
# 前端文件
scp frontend/src/views/DrawCar.vue root@49.235.98.5:/opt/auto-gallery/frontend/src/views/
scp frontend/src/api/drawCar.js root@49.235.98.5:/opt/auto-gallery/frontend/src/api/
scp frontend/src/router/index.js root@49.235.98.5:/opt/auto-gallery/frontend/src/router/
scp frontend/src/App.vue root@49.235.98.5:/opt/auto-gallery/frontend/src/

# 后端文件
scp backend/src/models/mysql/Vehicle.js root@49.235.98.5:/opt/auto-gallery/backend/src/models/mysql/
scp backend/src/models/mysql/VehicleVote.js root@49.235.98.5:/opt/auto-gallery/backend/src/models/mysql/
scp backend/src/models/mysql/index.js root@49.235.98.5:/opt/auto-gallery/backend/src/models/mysql/
scp backend/src/controllers/vehicleController.js root@49.235.98.5:/opt/auto-gallery/backend/src/controllers/
scp backend/src/routes/vehicle.js root@49.235.98.5:/opt/auto-gallery/backend/src/routes/
scp backend/src/app.js root@49.235.98.5:/opt/auto-gallery/backend/src/
```

2. 在服务器上重新构建前端：
```bash
ssh root@49.235.98.5
cd /opt/auto-gallery/frontend
npm run build
```

3. 重启后端服务：
```bash
cd /opt/auto-gallery/backend
pm2 restart auto-gallery-backend
```

## 🎮 功能说明

### 欢迎界面
- 开始创作：进入绘画界面
- 参观车库：查看所有玩家创建的载具
- 查看排行榜：按得分/热度/日期排序

### 绘画界面
- 8种颜色选择
- 可调节笔刷大小（2-20px）
- 撤销功能
- 清空画布
- 完成后可为载具命名

### 车库界面
- 2D平面展示所有载具
- 载具自动运动动画
- 点击载具查看详情
- 投票功能（点赞👍/拉踩👎）
- 举报不当内容🚩
- 可调节显示数量（10/20/30/50/全部）

### 排行榜
- 按得分排序：点赞-拉踩
- 按热度排序：点赞+拉踩总数
- 按日期排序：最新创建
- 随机排序：随机展示

## 🔧 技术特点

- **前端**: Vue 2 + Canvas API
- **后端**: Express + Sequelize
- **数据库**: MySQL (cardesignspace)
- **存储**: 载具图片以 base64 存储在数据库中
- **匿名支持**: 无需登录即可创作和投票
- **防重复投票**: 通过 userId + IP 地址限制

## 📊 数据库结构

### vehicles 表
- `id`: 主键
- `name`: 载具名称
- `imageData`: 图片数据（base64）
- `userId`: 创建者ID（可为空）
- `likes`: 点赞数
- `dislikes`: 拉踩数
- `score`: 得分（likes - dislikes）
- `status`: 状态（active/reported/deleted）
- `createdAt/updatedAt`: 时间戳

### vehicle_votes 表
- `id`: 主键
- `vehicleId`: 载具ID
- `userId`: 投票用户ID（可为空）
- `ipAddress`: IP地址
- `voteType`: 投票类型（like/dislike）
- `createdAt`: 创建时间

## 🎯 API 端点

- `GET /api/draw-car/vehicles` - 获取载具列表
- `POST /api/draw-car/vehicles` - 创建新载具
- `GET /api/draw-car/vehicles/:id` - 获取载具详情
- `POST /api/draw-car/vehicles/:id/vote` - 投票
- `POST /api/draw-car/vehicles/:id/report` - 举报
- `GET /api/draw-car/vehicles/rank` - 获取排行榜

## ✨ 亮点功能

1. **无需登录**: 支持匿名创作和投票
2. **实时动画**: Canvas 实现流畅的 2D 动画
3. **社交互动**: 点赞/拉踩/举报系统
4. **数据持久化**: 所有载具永久保存
5. **多端适配**: 响应式设计，支持移动端
6. **防刷票机制**: IP + 用户ID 双重验证

## 🐛 注意事项

1. **图片大小**: base64 存储可能导致数据库较大，建议后续优化为对象存储
2. **性能优化**: 载具数量过多时，建议添加分页和虚拟滚动
3. **内容审核**: 需要定期检查举报内容
4. **存储优化**: 考虑使用 COS 存储图片，数据库只存 URL

## 🚀 下一步优化建议

1. 图片存储优化：使用腾讯云 COS
2. 添加搜索功能
3. 用户个人车库
4. 载具分享到社交媒体
5. 添加更多绘画工具（橡皮擦、填充等）
6. 3D 展示（Three.js）
7. 载具对战小游戏


