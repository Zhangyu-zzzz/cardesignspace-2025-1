# 图片拖拽排序功能 - 生产环境部署指南

## ✅ 部署前检查清单

在代码提交到远程仓库后，生产环境需要完成以下步骤才能使用拖拽排序功能：

### 1. 代码部署 ✅

**前端代码：**
- [x] `sortablejs` 依赖已在 `package.json` 中（会自动安装）
- [x] `ModelDetail.vue` 已更新拖拽功能
- [x] `api.js` 已添加 `updateOrder` API方法

**后端代码：**
- [x] `Image` 模型已添加 `sortOrder` 字段
- [x] `imageController.js` 已添加 `updateImageOrder` 方法
- [x] `imageRoutes.js` 已添加路由

### 2. 数据库迁移 ⚠️ **重要**

**必须在生产环境执行数据库迁移！**

#### 方法1：使用自动化脚本（推荐）

```bash
# SSH连接到生产服务器
ssh user@your-server

# 进入项目目录
cd /path/to/auto-gallery/backend

# 确保.env文件包含正确的数据库配置
# DB_HOST=49.235.98.5
# DB_PORT=3306
# DB_NAME=cardesignspace
# DB_USER=Jason
# DB_PASSWORD=Jason123456!

# 执行迁移
npm run db:add-sortOrder
```

#### 方法2：手动执行SQL

如果无法使用脚本，可以手动执行：

```sql
-- 连接到生产数据库
USE cardesignspace;

-- 检查字段是否已存在
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'cardesignspace' 
  AND TABLE_NAME = 'images' 
  AND COLUMN_NAME = 'sortOrder';

-- 如果不存在，执行以下SQL
ALTER TABLE `images` 
ADD COLUMN `sortOrder` INT DEFAULT 0 
COMMENT '排序顺序，用于图片在页面中的显示顺序' 
AFTER `tags`;

-- 创建索引
CREATE INDEX `idx_images_sortOrder` 
ON `images` (`sortOrder`);
```

### 3. 部署流程

根据你的部署方式选择：

#### 方式A：使用部署脚本

```bash
# 在项目根目录执行
./deploy-production.sh
```

脚本会自动：
- 构建前端（包含新的sortablejs依赖）
- 安装后端依赖
- 重启服务

#### 方式B：手动部署

```bash
# 1. 构建前端
cd frontend
npm install  # 会自动安装sortablejs
npm run build

# 2. 部署后端
cd ../backend
npm install
pm2 restart cardesignspace-backend

# 3. 执行数据库迁移
npm run db:add-sortOrder
```

#### 方式C：Docker部署

```bash
# 重新构建镜像（会包含新代码和依赖）
docker-compose build
docker-compose up -d

# 执行数据库迁移（在容器内或直接连接数据库）
docker exec -it auto-gallery-backend npm run db:add-sortOrder
```

### 4. 验证部署

部署完成后，验证以下内容：

#### 前端验证
1. 打开任意车辆详情页面
2. 检查浏览器控制台是否有错误
3. 尝试拖拽图片，看是否能正常拖拽

#### 后端验证
```bash
# 检查API是否可用
curl -X POST https://www.cardesignspace.com/api/images/update-order \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"modelId": 1, "imageOrders": [{"id": 1, "sortOrder": 0}]}'
```

#### 数据库验证
```sql
-- 检查字段是否存在
DESCRIBE images;

-- 应该能看到 sortOrder 字段
```

### 5. 常见问题

#### 问题1：拖拽功能不工作
- **检查**：浏览器控制台是否有JavaScript错误
- **检查**：`sortablejs` 是否正确安装（检查 `node_modules/sortablejs`）
- **检查**：前端代码是否正确部署

#### 问题2：保存顺序失败
- **检查**：后端API是否正常（检查后端日志）
- **检查**：用户是否已登录（需要认证）
- **检查**：数据库字段是否存在

#### 问题3：图片顺序没有保存
- **检查**：数据库迁移是否执行成功
- **检查**：`sortOrder` 字段是否存在于 `images` 表
- **检查**：后端查询是否按 `sortOrder` 排序

### 6. 回滚方案

如果出现问题需要回滚：

```bash
# 1. 回滚代码（git revert）
git revert <commit-hash>

# 2. 重新部署
./deploy-production.sh

# 3. 数据库字段可以保留（不影响旧功能）
# 或者删除字段（如果需要）
ALTER TABLE `images` DROP COLUMN `sortOrder`;
DROP INDEX `idx_images_sortOrder` ON `images`;
```

## 📋 部署检查清单

在部署到生产环境前，请确认：

- [ ] 代码已提交到远程仓库（main/develop分支）
- [ ] 前端依赖 `sortablejs` 已在 `package.json` 中
- [ ] 后端代码包含新的API接口
- [ ] **生产环境数据库已执行迁移** ⚠️
- [ ] 前端已重新构建并部署
- [ ] 后端服务已重启
- [ ] 功能测试通过

## 🎯 快速部署命令

```bash
# 一键部署（假设使用部署脚本）
./deploy-production.sh

# 然后执行数据库迁移
cd backend
npm run db:add-sortOrder
```

## ⚠️ 重要提醒

**数据库迁移必须在生产环境执行！** 否则：
- 拖拽功能可以工作（前端）
- 但保存顺序会失败（后端数据库没有字段）
- 图片顺序不会持久化

建议在部署代码前先执行数据库迁移，避免用户使用功能时出错。








