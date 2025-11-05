# 🎨 "画个车" 功能 - 快速开始

> 一个创意互动的绘画游戏，让用户创作自己的载具，并在动态车库中展示！

---

## ⚡ 5分钟快速开始

### 1. 数据库初始化
```bash
mysql -u root -p auto_gallery < backend/migrations/create_vehicles_tables.sql
```

### 2. 确认 COS 配置
编辑 `backend/.env`：
```env
TENCENT_SECRET_ID=your_secret_id
TENCENT_SECRET_KEY=your_secret_key
COS_BUCKET=your-bucket-name
COS_REGION=ap-shanghai
COS_DOMAIN=https://your-bucket.cos.ap-shanghai.myqcloud.com
```

### 3. 启动服务
```bash
# 后端
cd backend && npm run dev

# 前端（新终端）
cd frontend && npm run serve
```

### 4. 访问
打开浏览器：`http://localhost:8080/draw-car`

---

## 🎮 功能特性

### 🎨 绘画系统
- ✅ 8种颜色选择
- ✅ 可调笔刷大小（2-20px）
- ✅ 撤销/清空功能
- ✅ 透明背景（无白边）
- ✅ 实时预览

### 🏁 2D车库
- ✅ 动态物理引擎
- ✅ 真实碰撞效果
- ✅ 发光视觉反馈
- ✅ 点击交互
- ✅ 径向脉冲效果

### 📊 社交功能
- ✅ 点赞/拉踩投票
- ✅ 多维度排行榜
- ✅ 实时更新
- ✅ 匿名支持

---

## 📁 核心文件

```
frontend/src/views/DrawCar.vue      # 主组件（1300行）
frontend/src/api/drawCar.js         # API接口

backend/src/models/mysql/Vehicle.js         # 载具模型
backend/src/controllers/vehicleController.js # 业务逻辑
backend/src/routes/vehicle.js               # 路由配置
```

---

## 🔧 数据库表结构

### vehicles（载具表）
- **id** - 主键
- **name** - 载具名称
- **imageUrl** - COS图片URL（⭐ 新架构）
- **cosKey** - COS存储路径
- **drawingData** - 笔画数据（JSON）
- **userId** - 创建者ID
- **likes/dislikes/score** - 投票数据
- **status** - 状态

### vehicle_votes（投票表）
- **id** - 主键
- **vehicleId** - 载具ID
- **userIdentifier** - 用户标识
- **type** - like/dislike

---

## 🚀 部署到生产环境

```bash
# 使用自动部署脚本
./deploy-draw-car-cos.sh

# 或手动执行
ssh root@your-server
cd /opt/auto-gallery
mysql -u root -p auto_gallery < backend/migrations/create_vehicles_tables.sql
pm2 restart auto-gallery-backend
```

---

## 📊 API接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/draw-car/vehicles` | 获取载具列表 |
| POST | `/api/draw-car/vehicles` | 创建载具 |
| POST | `/api/draw-car/vehicles/:id/vote` | 投票 |
| GET | `/api/draw-car/vehicles/rank` | 排行榜 |

---

## 🎯 核心技术

### 前端
- **Vue 2** + **Canvas API**
- 笔画级数据记录
- 自定义物理引擎
- 像素级碰撞检测

### 后端
- **Express** + **Sequelize**
- **腾讯云 COS** 存储
- RESTful API
- 投票防刷机制

---

## 📚 详细文档

- 📖 [完整功能指南](./DRAW_CAR_COMPLETE_GUIDE.md) - 详细说明（推荐阅读）
- 🔄 [COS迁移方案](./DRAW_CAR_COS_MIGRATION.md) - 架构升级
- 🎨 [UI优化报告](./DRAW_CAR_UI_FIX_REPORT.md) - 界面优化

---

## ❓ 常见问题

### Q: 提交时出现500错误？
A: 执行数据库迁移脚本：
```bash
mysql -u root -p auto_gallery < backend/migrations/create_vehicles_tables.sql
```

### Q: 图片无法显示？
A: 检查 COS 配置和 CORS 设置

### Q: 碰撞效果不准确？
A: 清除浏览器缓存并刷新

---

## 🎉 功能演示

1. **开始画车** → 2. **自由创作** → 3. **提交命名** → 4. **进入车库** → 5. **互动投票**

---

## 💡 技术亮点

| 特性 | 实现 | 效果 |
|------|------|------|
| 不变形绘画 | 笔画数据 | ⭐⭐⭐⭐⭐ |
| 透明背景 | clearRect | ⭐⭐⭐⭐⭐ |
| COS存储 | 对象存储 | ⭐⭐⭐⭐⭐ |
| 物理碰撞 | 动量守恒 | ⭐⭐⭐⭐ |
| 精确检测 | 像素扫描 | ⭐⭐⭐⭐ |

---

**开始创作你的载具吧！** 🚗✨

> 问题反馈：请查阅 [DRAW_CAR_COMPLETE_GUIDE.md](./DRAW_CAR_COMPLETE_GUIDE.md)



