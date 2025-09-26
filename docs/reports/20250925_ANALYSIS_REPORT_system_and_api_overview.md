## 系统与 API 总览（2025-01-15 更新）

本文档面向开发与运维，汇总项目当前架构、关键模块、API 契约、数据流转与部署要点。来源：基于仓库源码自动提取与归纳（backend、frontend、dcd_crawler、nginx 与 docs）。

**更新说明：**
- 补充了完整的 API 端点清单（80+ 个端点）
- 新增了灵感图片模块 API 文档
- 完善了论坛社交功能的详细 API 说明
- 添加了 API 统计和现状分析
- 增加了更多典型请求示例

### 一、总体架构

- 后端：Node.js + Express + Sequelize + MySQL；JWT 鉴权；Multer 文件上传；Tencent COS 对象存储；Winston 日志；BullMQ + ioredis（可选队列，特性开关）。
- 前端：Vue 2 + Element UI + Vue Router + Vuex；Axios 拦截器自动附带 Bearer Token；生产环境通过 Nginx 反向代理到后端。
- 爬虫与数据层：`dcd_crawler`（Python，Selenium/Requests/BS4/Pandas 等），提供懂车帝等数据抓取与数据库脚本，含统一文档与标准。
- 反向代理：`nginx.conf` 提供前端静态文件与 `/api` 代理、缓存与安全头；前端与后端同域部署。
- 部署：前后端均提供 Dockerfile，后端健康检查 `/api/health`，前端 Nginx 健康检查根路径。

### 二、环境变量与敏感信息（只列出键名）

- 数据库：`DB_HOST`、`DB_PORT`、`DB_NAME`、`DB_USER`、`DB_PASSWORD`
- JWT：`JWT_SECRET`、`JWT_EXPIRES_IN`
- COS：`TENCENT_SECRET_ID`、`TENCENT_SECRET_KEY`、`COS_BUCKET`、`COS_REGION`、`COS_DOMAIN`
- CORS：`CORS_ORIGIN`
- 队列与 Redis：`QUEUE_ENABLED`、`REDIS_URL`
- 摄取特性开关：`INGEST_ENABLED`
- 其他：`NODE_ENV`、`PORT`、自定义外部服务（如 NAS、第三方内部服务）

风险提示：仓库存在实际敏感值样例（如 `.env_forai`），建议立刻轮转相关密钥、账号密码与 Bucket 权限，并统一使用安全的密钥管理方案。

### 三、后端服务

- 入口：`backend/src/app.js`
  - 中间件：CORS（白名单 + 调试期放宽）、JSON/URL-Encoded、请求日志（morgan → winston）。
  - 静态：`/uploads` 目录直出（开发用途）。
  - 健康检查：`GET /api/health`。
  - 路由挂载：
    - `/api/brands` → `brandRoutes`
    - `/api/models` → `modelRoutes`
    - `/api/series` → `seriesRoutes`
    - `/api/upload` → `upload`
    - `/api/auth` → `auth`
    - `/api/forum` → `forumRoutes`
    - `/api/search` → `searchRoutes`
    - `/api/notifications` → `notificationRoutes`
    - `/api/images` → `imageRoutes`
    - `/api/tags` → `tagRoutes`
    - `/api/curation` → `curationRoutes`
    - `/api/ingest` → `ingestRoutes`（需 `INGEST_ENABLED=true` 才启用）
  - 队列 Worker：`bootIngestWorkers()` 在队列开启时注册 `image_ingest`、`image_tasks` 两类 Worker（示例处理）。

- 数据库连接：`backend/src/config/mysql.js`
  - Sequelize 连接 MySQL，连接池、日志等级、认证与健康日志。
  - `initMySQL.js` 定义模型关联关系与（开发态）同步与示例种子数据。

- 日志：`backend/src/config/logger.js`
  - winston→`logs/combined.log` 与 `logs/error.log`，生产缺省等级 `info`，非生产同时输出 Console。

- 队列：`backend/src/services/queueService.js`
  - 通过 `QUEUE_ENABLED` 控制启用；使用 `REDIS_URL` 建立连接；`getQueue/createWorker` 封装。

- COS：`backend/src/config/cos.js`
  - `uploadToCOS`/`deleteFromCOS`；`generateUploadPath` 按品牌/车型生成 `CARS/{Brand}/{Model}/...`；`BucketDomain` 用于构造公开 URL。

- 图像资产：`backend/src/services/assetService.js`
  - 使用 `sharp` 生成变体：`thumb/small/medium/large/webp`，按 `variants/{variant}/...` 路径写回 COS；持久化到 `ImageAsset`（幂等 upsert）；`chooseBestUrl` 按优先级返回最优访问 URL（优先 webp）。

- 图像分析：`backend/src/services/analysisService.js`
  - 使用 `sharp.stats()` 提取占位主色与基本质量分，upsert 到 `ImageAnalysis`。

### 四、鉴权与中间件

- 鉴权中间件：
  - `middleware/auth.js` 暴露 `authenticateToken`/`optionalAuth`（在部分路由使用）。
  - `middleware/authMiddleware.js` 暴露 `authMiddleware` 与 `adminMiddleware`（在品牌/车系/车型维护路由使用）。
  - `middleware/oidcAuth.js` 提供摄取端 `dualAuthenticate`（`/api/ingest/*`），面向内部服务/爬虫集成。

- JWT：`authController` 使用 `JWT_SECRET`、`JWT_EXPIRES_IN` 生成 Token。前端将 Token 持久化于 `localStorage`，Axios 拦截器自动附加。

### 五、API 概览（路由与典型接口）

#### 🔐 认证相关 `/api/auth`
- `POST /register` - 用户注册（校验重名、bcrypt 加密，送 100 积分）
- `POST /login` - 用户登录（用户名或邮箱 + 密码）
- `POST /logout` - 用户登出（无状态，前端清 Token）
- `GET /me` - 获取当前用户信息（需鉴权）
- `PUT /profile` - 更新个人资料（需鉴权）
- `POST /upload-avatar` - 上传头像（Multer 内存 + COS，需鉴权）
- `GET /user-stats` - 获取用户统计信息（需鉴权）
- `GET /recent-activity` - 获取最近活动（需鉴权）
- `GET /points-history` - 获取积分历史（需鉴权）
- `GET /achievements` - 获取用户成就（需鉴权）
- `GET /user-rank` - 获取用户排名（需鉴权）

#### 🚗 汽车数据相关
**品牌管理 `/api/brands`**
- `GET /` - 获取所有品牌
- `GET /:id` - 获取品牌详情
- `GET /:id/series` - 获取品牌下的车系
- `POST /` - 创建品牌（管理员权限）
- `PUT /:id` - 更新品牌（管理员权限）
- `DELETE /:id` - 删除品牌（管理员权限）

**车系管理 `/api/series`**
- `GET /` - 获取所有车系
- `GET /:id` - 获取车系详情
- `GET /:id/models` - 获取车系下的车型
- `POST /` - 创建车系（管理员权限）
- `PUT /:id` - 更新车系（管理员权限）
- `DELETE /:id` - 删除车系（管理员权限）

**车型管理 `/api/models`**
- `GET /` - 获取所有车型（支持品牌筛选、年代筛选、latest/分页等）
- `GET /:id` - 获取车型详情
- `GET /:id/images` - 获取车型图片
- `POST /` - 创建车型（管理员权限）
- `PUT /:id` - 更新车型（管理员权限）
- `DELETE /:id` - 删除车型（管理员权限）

#### 🖼️ 图片资源相关 `/api/images`
- `GET /` - 获取图片列表（支持分页、sort=default|latest|curated）
- `GET /:id` - 获取图片详情（包含级联品牌/车系/车型信息）
- `GET /:id/hd-url` - 获取高清图片URL（需登录，会员可取高清；记录下载）
- `POST /:id/favorite` - 收藏图片（需鉴权）
- `DELETE /:id/favorite` - 取消收藏图片（需鉴权）
- `GET /popular` - 获取热门图片（热度排序）
- `GET /car/:carId` - 获取车型的图片
- `GET /:id/tags` - 获取图片标签
- `POST /:id/tags` - 为图片添加标签（需鉴权）
- `DELETE /:id/tags/:tagId` - 移除图片标签（需鉴权）

#### 🏷️ 标签管理 `/api/tags`
- `GET /` - 获取标签列表（按热度/名称排序，支持 q、category 筛选）
- `POST /` - 创建标签（需鉴权）
- `PUT /:id` - 更新标签（需鉴权）
- `DELETE /:id` - 删除标签（需鉴权，删除为软禁用）

#### 📤 上传与管理 `/api/upload`
- `GET /models` - 获取车型列表（用于上传页面下拉选择）
- `POST /single` - 单文件上传（需鉴权；COS 上传→生成变体→分析→积分+10→活动记录）
- `POST /multiple` - 多文件上传（需鉴权；同上，积分为张数×10）
- `POST /cover` - 文章封面上传（需鉴权）
- `POST /article-image` - 文章内容图片上传（需鉴权）
- `PUT /image/:id` - 更新图片信息（需鉴权）
- `DELETE /image/:id` - 删除图片（需鉴权；删除尝试 COS 删除、扣分与活动记录）
- `GET /images` - 获取图片管理列表（可选鉴权，用于显示用户信息）

**品牌管理辅助接口**
- `GET /brands` - 获取所有品牌
- `POST /brands` - 创建品牌（需鉴权）
- `PUT /brands/:id` - 更新品牌（需鉴权）
- `DELETE /brands/:id` - 删除品牌（需鉴权）
- `POST /brands/:id/logo` - 上传品牌Logo（Multer + COS）

**车型管理辅助接口**
- `GET /brands/:brandId/models` - 获取品牌下的车型
- `POST /models` - 创建车型（需鉴权）
- `PUT /models/:id` - 更新车型（需鉴权）
- `DELETE /models/:id` - 删除车型（需鉴权）

#### 🔍 搜索相关 `/api/search`
- `GET /hot` - 获取热门搜索词
- `GET /` - 通用搜索（按品牌/车系/车型/图片聚合，分页）

#### 💬 论坛社交 `/api/forum`
**帖子管理**
- `GET /posts` - 获取帖子列表（分页、筛选、话题 JSON_SEARCH、兼容旧响应格式）
- `GET /posts/:id` - 获取帖子详情（多级评论嵌套）
- `POST /posts` - 创建帖子（需鉴权；Multer 多图 + COS 上传）
- `PUT /posts/:id` - 更新帖子（需鉴权）
- `DELETE /posts/:id` - 删除帖子（需鉴权）

**互动功能**
- `POST /posts/:id/like` - 点赞/取消点赞帖子（需鉴权）
- `POST /posts/:id/favorite` - 收藏/取消收藏帖子（需鉴权）
- `POST /posts/:id/comments` - 添加评论（需鉴权）

**用户相关**
- `GET /favorites` - 获取用户收藏的帖子（需鉴权）
- `GET /user-uploads` - 获取用户上传的汽车图片（需鉴权）
- `GET /user-likes` - 获取用户获赞记录（需鉴权）
- `GET /user-stats/:userId` - 获取用户统计数据
- `GET /user-profile/:userId` - 获取用户公开资料

**榜单与统计**
- `GET /stats` - 获取论坛统计数据
- `GET /hot-topics` - 获取热门话题
- `GET /active-users` - 获取活跃用户
- `GET /topics` - 获取所有话题列表

#### 🔔 通知中心 `/api/notifications`
- `GET /` - 获取通知列表（分页，支持 isRead、type 筛选）
- `GET /unread-count` - 获取未读通知数量（需鉴权）
- `PUT /:id/read` - 标记单个通知为已读（需鉴权）
- `PUT /read-all` - 标记所有通知为已读（需鉴权）
- `DELETE /:id` - 删除通知（需鉴权）

#### ✨ 灵感相关 `/api/inspiration`
- `GET /images` - 获取灵感图片列表
- `GET /stats` - 获取图片统计信息
- `GET /tags/popular` - 获取热门标签
- `GET /images/:filename` - 获取单张图片详情
- `GET /files/:filename` - 获取图片文件
- `GET /search` - 搜索图片
- `POST /favorite` - 收藏/取消收藏图片（需鉴权）
- `GET /favorites` - 获取用户收藏的图片（需鉴权）
- `DELETE /favorites/:imageId` - 删除收藏的图片（需鉴权）

#### 🎯 精选内容 `/api/curation`
- `GET /` - 精选列表（基于 `ImageCuration`）

#### 🔄 摄取接口（内部集成）`/api/ingest`（需 `INGEST_ENABLED=true`）
- `POST /images` - 批量入队图片元数据（BullMQ `image_ingest`）
- `POST /image-tasks` - 提交图像处理任务（`image_tasks`，type 驱动）

#### 🏥 系统健康
- `GET /api/health` - 服务健康检查

### 六、数据模型（选摘）

- 关系：
  - `Brand 1—* Series 1—* Model 1—* Image`
  - `Image *—* Album`（透过 `AlbumImage`）
  - `Image *—* Tag`（透过 `ImageTag`）
  - `User *—* Image`（收藏 `UserFavorite`、下载 `UserDownload`）
  - 扩展：`ImageAsset`（变体资产）、`ImageCuration`（精选）、`ImageAnalysis`（分析）、`UserActivity`（活动）、`Post/Comment/PostLike/PostFavorite/Notification`（论坛与通知）

字段命名在旧表/新表间存在 `snake_case` 与 `camelCase` 并存（如 `model_id` vs `modelId`），控制器层已做兼容；新开发建议遵循统一风格并完善迁移脚本。

### 七、前端集成要点

- Axios 基础地址：
  - 生产：`/api`（经 Nginx 代理）
  - 开发：`VUE_APP_API_URL` 或 `http://localhost:3000/api`
- 登录态：`localStorage` 存 `token` 与 `user`；应用启动于 `main.js` 调用 `store.dispatch('checkAuth')` 做会话恢复。
- 路由：`/`, `/brands`, `/brand/:id`, `/series`, `/models`, `/model/:id`, `/search`, `/upload`, `/forum`, `/profile(含子路由)` 等；受保护路由通过 `meta.requiresAuth` 与全局守卫检查。

### 八、Nginx 与部署

- Nginx：
  - 根路径直出前端静态资源，`/api` 代理至 `127.0.0.1:3000`；`client_max_body_size 50M`；常规安全响应头；静态资源长缓存。
  - 建议：完善 HTTPS server 块、HSTS、OCSP Stapling、日志切割与限流策略。

- Docker：
  - 后端镜像：Node 18-alpine，`npm ci --only=production`，健康检查 `GET /api/health`。
  - 前端镜像：多阶段构建（Node→Nginx），健康检查根路径。

### 九、数据流与作业

- 用户上传：前端表单→后端 Multer（内存）→COS 原图→生成变体（thumb/small/medium/large/webp）保存 COS→`ImageAsset` 记录→异步图像分析入库→加积分→记录 `UserActivity`。
- 图片访问：优先使用 `webp` 或最佳URL（`chooseBestUrl`），后退 JPEG。
- 搜索：基于 MySQL 的聚合检索（品牌/车系/车型/图片），支持分页；建议后续引入全文索引或外部搜索引擎以增强性能与排序质量。
- 队列：在开启时，摄取接口将任务入队，Worker 记录与处理（当前示例任务可扩展为入库 Staging/幂等校验/图像处理）。
- 爬虫：`dcd_crawler/src/run_scheduler.py` 启动优化调度；数据库与架构文档位于 `dcd_crawler/docs` 与 `dcd_crawler/src/database/*`。

### 十、安全与合规建议（高优先级）

1) 立即轮转 `.env_forai` 暴露的敏感值（DB/COS/NAS 等），并核实公网可达资源的最小权限与白名单。
2) 收紧 CORS：生产环境严格白名单并禁止默认放行未知 Origin。
3) 统一鉴权：对管理操作统一要求 `adminMiddleware`；补充缺失接口的鉴权校验。
4) 速率限制：对登录/上传/摄取等接口增加更严格限流与 CAPTCHA（登录）。
5) 日志脱敏：对用户与鉴权相关日志进行脱敏，避免泄露 Token/邮箱等敏感字段。
6) 存储策略：COS Bucket 按最小公开原则；敏感资源使用签名 URL；清理策略与生命周期配置。

### 十一、API 统计与现状

**API 模块统计：**
- 总模块数：12 个主要 API 模块
- 总端点数：80+ 个 API 端点
- 认证要求：约 60% 的端点需要认证
- 管理员权限：约 15% 的端点需要管理员权限

**API 功能覆盖：**
- ✅ 用户认证与权限管理
- ✅ 汽车数据管理（品牌/车系/车型）
- ✅ 图片资源管理（上传/存储/变体生成）
- ✅ 标签系统（图片打标/标签管理）
- ✅ 搜索功能（通用搜索/热门搜索）
- ✅ 论坛社交（帖子/评论/点赞/收藏）
- ✅ 通知系统（实时通知/未读统计）
- ✅ 灵感图片（图片浏览/收藏）
- ✅ 精选内容（内容推荐）
- ✅ 系统健康检查

**API 文档现状：**
- ❌ 缺少标准化的 API 文档（如 Swagger/OpenAPI）
- ✅ 有基础的开发文档和 API 概览
- ❌ 缺少详细的接口参数说明
- ❌ 缺少错误码和响应示例

### 十二、待办与缺口

- **API 契约文档化**：为各路由生成 OpenAPI/接口示例（含入参/出参/错误码）。
- **搜索性能**：评估引入 MySQL 全文索引/Elastic/OpenSearch；热门搜索与纠错、拼音/别名支持。
- **队列生产化**：Redis 配置、告警、DLQ、幂等、可观测性仪表盘。
- **资产治理**：COS Key 规范、CDN 缓存策略、变体策略（质量/尺寸）、清理回收。
- **监控告警**：PM2/进程守护、接口与队列指标、慢查询与索引优化。
- **数据一致性**：老表/新表字段风格统一与迁移计划；ER 图与数据字典完善。
- **API 版本管理**：考虑引入 API 版本控制（如 `/api/v1/`）。
- **API 测试**：建立完整的 API 测试套件和自动化测试。

### 十三、附录：典型请求示例

#### 1. 用户认证示例

**用户注册：**
```http
POST /api/auth/register HTTP/1.1
Content-Type: application/json

{
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123"
}
```

**用户登录：**
```http
POST /api/auth/login HTTP/1.1
Content-Type: application/json

{
  "username": "testuser",
  "password": "password123"
}
```

#### 2. 图片上传示例

**单图上传（需登录）：**
```http
POST /api/upload/single HTTP/1.1
Authorization: Bearer <token>
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary

------WebKitFormBoundary
Content-Disposition: form-data; name="modelId"

123
------WebKitFormBoundary
Content-Disposition: form-data; name="image"; filename="front.jpg"
Content-Type: image/jpeg

<binary>
------WebKitFormBoundary--
```

**响应（成功）：**
```json
{
  "status": "success",
  "message": "图片上传成功，获得10积分！",
  "data": {
    "id": 1001,
    "url": "https://<bucket-domain>/CARS/Brand/Model/xxx.jpg",
    "bestUrl": "https://<bucket-domain>/variants/webp/CARS/Brand/Model/xxx.webp",
    "assets": { "thumb": "...", "webp": "..." },
    "modelId": 123,
    "userId": 456
  }
}
```

#### 3. 搜索示例

**通用搜索：**
```http
GET /api/search?q=宝马&type=all&page=1&limit=20
```

**热门搜索：**
```http
GET /api/search/hot
```

#### 4. 论坛帖子示例

**创建帖子：**
```http
POST /api/forum/posts HTTP/1.1
Authorization: Bearer <token>
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary

------WebKitFormBoundary
Content-Disposition: form-data; name="content"

这是一篇关于新车的帖子
------WebKitFormBoundary
Content-Disposition: form-data; name="topics"

["新车发布", "汽车摄影"]
------WebKitFormBoundary
Content-Disposition: form-data; name="images"; filename="car1.jpg"
Content-Type: image/jpeg

<binary>
------WebKitFormBoundary--
```

#### 5. 图片收藏示例

**收藏图片：**
```http
POST /api/images/123/favorite HTTP/1.1
Authorization: Bearer <token>
```

**获取用户收藏：**
```http
GET /api/inspiration/favorites HTTP/1.1
Authorization: Bearer <token>
```

#### 6. 通知示例

**获取通知列表：**
```http
GET /api/notifications?page=1&limit=20&isRead=false HTTP/1.1
Authorization: Bearer <token>
```

**标记通知已读：**
```http
PUT /api/notifications/123/read HTTP/1.1
Authorization: Bearer <token>
```

#### 7. 错误响应示例

**认证失败：**
```json
{
  "success": false,
  "message": "认证失败",
  "error": "Token无效或已过期"
}
```

**参数错误：**
```json
{
  "success": false,
  "message": "请求参数错误",
  "error": "modelId 是必需的"
}
```

**权限不足：**
```json
{
  "success": false,
  "message": "没有权限执行此操作",
  "error": "需要管理员权限"
}
```

—— 完 ——


