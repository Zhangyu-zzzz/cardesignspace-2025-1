# 🎨 "画个车" 部署检查清单

> 在本地测试并部署到生产环境前，请完成以下步骤

---

## ✅ 本地环境配置

### 步骤 1: 数据库初始化
```bash
cd /Users/zobot/Desktop/unsplash-crawler/test/auto-gallery

# 创建 vehicles 和 vehicle_votes 表
mysql -u root -p auto_gallery < backend/migrations/create_vehicles_tables.sql
```

**验证：**
```sql
-- 检查表是否创建成功
USE auto_gallery;
SHOW TABLES LIKE 'vehicle%';
DESCRIBE vehicles;
DESCRIBE vehicle_votes;
```

---

### 步骤 2: 确认 COS 配置

编辑 `backend/.env`，确保包含：
```env
TENCENT_SECRET_ID=AKIDxxxxxxxxxxxxx
TENCENT_SECRET_KEY=xxxxxxxxxxxxxxx
COS_BUCKET=your-bucket-name
COS_REGION=ap-shanghai
COS_DOMAIN=https://your-bucket.cos.ap-shanghai.myqcloud.com
```

**测试 COS 连接：**
```bash
cd backend
node -e "const {cosConfig} = require('./src/config/cos'); console.log('COS配置:', cosConfig);"
```

---

### 步骤 3: 重启服务

```bash
# 后端（已经在运行，PID: 66347）
cd backend
pkill -f "node.*npm run dev"
npm run dev

# 前端（应该已经在运行 localhost:8080）
cd frontend
npm run serve
```

---

### 步骤 4: 本地测试

访问：`http://localhost:8080/draw-car`

**测试项目：**
- [ ] 页面正常加载
- [ ] 可以绘画
- [ ] 可以撤销
- [ ] 可以清空
- [ ] 提交后弹出命名框
- [ ] 输入名称并确认
- [ ] **检查控制台**：应该看到 "开始上传载具图片到COS"
- [ ] **检查控制台**：应该看到 "载具图片上传成功"
- [ ] 自动跳转到车库
- [ ] 车库中显示新载具
- [ ] 载具没有白色背景（✨ 透明！）
- [ ] 载具之间有碰撞效果
- [ ] 点击载具可以投票
- [ ] 排行榜正常显示

**检查数据库：**
```sql
-- 查看最新的载具
SELECT id, name, imageUrl, cosKey, createdAt 
FROM vehicles 
ORDER BY createdAt DESC 
LIMIT 5;
```

**应该看到：**
- `imageUrl` 不为空，格式类似：`https://xxx.cos.ap-shanghai.myqcloud.com/draw-car/vehicles/vehicle-xxx.png`
- `cosKey` = `draw-car/vehicles/vehicle-xxx.png`

---

## 🚀 生产环境部署

### 前提条件检查
- [ ] 本地测试全部通过
- [ ] COS 存储桶已创建
- [ ] COS CORS 已配置
- [ ] 生产环境 `.env` 已准备

---

### 方式一：自动部署（推荐）

```bash
./deploy-draw-car-cos.sh
```

脚本会自动：
1. 上传数据库迁移脚本
2. 执行数据库初始化
3. 上传前端和后端代码
4. 重新构建前端
5. 重启后端服务
6. 验证部署结果

---

### 方式二：手动部署

#### 1. SSH 连接服务器
```bash
ssh root@49.235.98.5
```

#### 2. 执行数据库迁移
```bash
cd /opt/auto-gallery
mysql -u root -p auto_gallery < backend/migrations/create_vehicles_tables.sql
```

#### 3. 上传代码
**在本地执行：**
```bash
# 上传后端
scp backend/src/models/mysql/Vehicle.js root@49.235.98.5:/opt/auto-gallery/backend/src/models/mysql/
scp backend/src/controllers/vehicleController.js root@49.235.98.5:/opt/auto-gallery/backend/src/controllers/

# 上传前端
scp frontend/src/views/DrawCar.vue root@49.235.98.5:/opt/auto-gallery/frontend/src/views/
scp frontend/src/api/drawCar.js root@49.235.98.5:/opt/auto-gallery/frontend/src/api/
```

#### 4. 重新构建前端
```bash
# SSH 到服务器
cd /opt/auto-gallery/frontend
npm run build
```

#### 5. 重启后端
```bash
pm2 restart auto-gallery-backend
pm2 logs auto-gallery-backend --lines 50
```

---

### 生产环境测试

访问：`https://www.cardesignspace.com/draw-car`

**测试项目（同本地）：**
- [ ] 所有功能正常
- [ ] COS 图片可访问
- [ ] 数据库正确保存
- [ ] 没有500错误

**检查 COS 存储桶：**
1. 登录腾讯云控制台
2. 进入 COS 服务
3. 找到存储桶
4. 导航到 `draw-car/vehicles/` 目录
5. 应该看到新上传的图片文件

---

## 🐛 故障排除

### 问题 1: 500 Internal Server Error

**症状：**
- 前端提示 "保存载具失败"
- 控制台显示 500 错误

**排查：**
```bash
# 检查后端日志
pm2 logs auto-gallery-backend --lines 50

# 检查数据库连接
mysql -u root -p auto_gallery -e "SELECT 1;"

# 检查表是否存在
mysql -u root -p auto_gallery -e "SHOW TABLES LIKE 'vehicle%';"
```

**解决方案：**
如果表不存在，执行数据库迁移：
```bash
mysql -u root -p auto_gallery < backend/migrations/create_vehicles_tables.sql
```

---

### 问题 2: COS 上传失败

**症状：**
- 控制台显示 "上传载具图片到COS失败"

**排查：**
```bash
# 检查 COS 配置
cat backend/.env | grep COS

# 测试 COS 连接
node -e "const {cos, cosConfig} = require('./backend/src/config/cos'); console.log(cosConfig);"
```

**解决方案：**
1. 确认 `TENCENT_SECRET_ID` 和 `TENCENT_SECRET_KEY` 正确
2. 确认存储桶名称和区域正确
3. 检查存储桶权限设置

---

### 问题 3: 图片无法显示

**症状：**
- 车库中看不到载具
- 图片加载失败

**排查：**
```sql
-- 检查 imageUrl
SELECT id, name, imageUrl FROM vehicles ORDER BY createdAt DESC LIMIT 5;
```

**解决方案：**
1. 如果 `imageUrl` 为空，说明 COS 上传失败
2. 如果 `imageUrl` 有值但无法访问，检查 CORS 配置：

```json
// COS 控制台 → 存储桶 → 安全管理 → 跨域访问CORS设置
{
  "AllowedOrigins": [
    "http://localhost:8080",
    "https://www.cardesignspace.com"
  ],
  "AllowedMethods": ["GET", "HEAD"],
  "AllowedHeaders": ["*"],
  "ExposeHeaders": [],
  "MaxAgeSeconds": 3600
}
```

---

### 问题 4: 旧数据迁移

如果数据库中已有旧载具数据（使用 base64 存储），需要迁移到 COS：

```bash
# 执行迁移脚本
node backend/scripts/migrate-vehicles-to-cos.js
```

脚本会：
1. 扫描所有 `imageUrl` 为空的载具
2. 将 `imageData`（base64）转换为图片
3. 上传到 COS
4. 更新数据库

---

## 📊 部署后验证

### 数据统计
```sql
-- 总载具数
SELECT COUNT(*) as total FROM vehicles;

-- 使用 COS 的载具数
SELECT COUNT(*) as using_cos FROM vehicles WHERE imageUrl IS NOT NULL;

-- 使用 base64 的载具数（旧数据）
SELECT COUNT(*) as using_base64 FROM vehicles WHERE imageUrl IS NULL;

-- 今日新增
SELECT COUNT(*) as today FROM vehicles 
WHERE DATE(createdAt) = CURDATE();
```

### 存储统计
```sql
-- 平均图片URL长度
SELECT AVG(LENGTH(imageUrl)) as avg_url_length FROM vehicles WHERE imageUrl IS NOT NULL;

-- 平均 cosKey 长度
SELECT AVG(LENGTH(cosKey)) as avg_key_length FROM vehicles WHERE cosKey IS NOT NULL;
```

### 性能对比
```sql
-- 查询速度测试（应该很快）
SELECT id, name, imageUrl, likes, dislikes 
FROM vehicles 
ORDER BY score DESC 
LIMIT 20;
```

---

## 🎉 完成检查表

### 本地环境
- [ ] 数据库表已创建
- [ ] COS 配置正确
- [ ] 后端服务运行正常
- [ ] 前端可以访问
- [ ] 创建载具成功
- [ ] COS 上传成功
- [ ] 车库显示正常
- [ ] 碰撞效果正常
- [ ] 投票功能正常

### 生产环境
- [ ] 代码已部署
- [ ] 数据库已更新
- [ ] 服务已重启
- [ ] 功能全部正常
- [ ] 无错误日志
- [ ] COS 存储正常
- [ ] 性能表现良好

---

## 📚 相关文档

- [完整功能指南](./DRAW_CAR_COMPLETE_GUIDE.md) - 详细说明
- [快速开始](./README_DRAWCAR.md) - 5分钟上手
- [COS迁移方案](./DRAW_CAR_COS_MIGRATION.md) - 架构升级
- [UI优化报告](./DRAW_CAR_UI_FIX_REPORT.md) - 界面优化

---

## 💡 提示

### 清除浏览器缓存
部署后建议清除浏览器缓存：
- **Chrome/Edge:** Ctrl + Shift + Delete（Win）/ Cmd + Shift + Delete（Mac）
- **Firefox:** Ctrl + Shift + Delete（Win）/ Cmd + Shift + Delete（Mac）
- **Safari:** Cmd + Option + E

### 监控建议
```bash
# 实时查看后端日志
pm2 logs auto-gallery-backend --lines 100

# 查看进程状态
pm2 status

# 重启服务（如果需要）
pm2 restart auto-gallery-backend
```

---

**祝部署顺利！** 🚀✨









