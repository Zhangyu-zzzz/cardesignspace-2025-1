## 系统与 API 总览（2025-08-13）

本文档面向开发与运维，汇总项目当前架构、关键模块、API 契约、数据流转与部署要点。来源：基于仓库源码自动提取与归纳（backend、frontend、dcd_crawler、nginx 与 docs）。

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

- 认证 `/api/auth`
  - `POST /register` 注册（校验重名、bcrypt 加密，送 100 积分）
  - `POST /login` 登录（用户名或邮箱 + 密码）
  - `POST /logout` 登出（无状态，前端清 Token）
  - `GET /me` 获取当前用户信息（需鉴权）
  - `PUT /profile` 更新资料（需鉴权）
  - `POST /upload-avatar` 上传头像（Multer 内存 + COS，需鉴权）
  - `GET /user-stats`、`GET /recent-activity`、`GET /points-history`、`GET /achievements`、`GET /user-rank`（用户画像/积分/排名）

- 品牌 `/api/brands`
  - 公共：`GET /`、`GET /:id`、`GET /:id/series`
  - 管理：`POST /`、`PUT /:id`、`DELETE /:id`（`authMiddleware + adminMiddleware`）

- 车系 `/api/series`
  - 公共：`GET /`、`GET /:id`、`GET /:id/models`
  - 管理：`POST /`、`PUT /:id`、`DELETE /:id`（管理员）

- 车型 `/api/models`
  - 公共：`GET /`（支持品牌筛选、年代筛选、latest/分页等）、`GET /:id`、`GET /:id/images`
  - 管理：`POST /`、`PUT /:id`、`DELETE /:id`（管理员）

- 图片资源 `/api/images`
  - `GET /`（`imagesQueryController.listImages`，支持分页、sort=default|latest|curated）
  - `GET /:id`（详情 + 级联品牌/车系/车型）
  - `GET /:id/hd-url`（需登录，会员可取高清；记录下载）
  - `POST /:id/favorite`、`DELETE /:id/favorite`（收藏/取消收藏）
  - `GET /popular`（热度排序）

- 标签 `/api/tags`
  - `GET /`（按热度/名称排序，支持 q、category）
  - `POST /`、`PUT /:id`、`DELETE /:id`（鉴权；删除为软禁用）
  - 图片打标：也可通过 `/api/images/:id/tags`、`DELETE /api/images/:id/tags/:tagId` 操作（鉴权）

- 上传与管理 `/api/upload`
  - `GET /models`（上传页下拉）
  - `POST /single`（单图；鉴权；COS 上传→生成变体→分析→积分+10→活动记录）
  - `POST /multiple`（多图；同上，积分为张数×10）
  - `PUT /image/:id`、`DELETE /image/:id`（更新/删除图片；删除尝试 COS 删除、扣分与活动记录）
  - `GET /images`（管理列表，分页/搜索/筛选，含 Model/Brand/User 信息）
  - 品牌管理（辅助）：`GET/POST/PUT/DELETE /brands`，`POST /brands/:id/logo`（Multer + COS）
  - 车型管理（辅助）：`GET /brands/:brandId/models`、`POST/PUT/DELETE /models`

- 搜索 `/api/search`
  - `GET /hot` 热搜词
  - `GET /` 通用搜索（按品牌/车系/车型/图片聚合，分页）

- 论坛 `/api/forum`
  - `GET /posts`（分页、筛选、话题 JSON_SEARCH、兼容旧响应格式）
  - `GET /posts/:id`（多级评论嵌套）
  - `POST /posts`（鉴权；Multer 多图 + COS 上传）
  - 点赞/收藏：`POST /posts/:id/like`、`POST /posts/:id/favorite`、`GET /favorites`
  - 评论：`POST /posts/:id/comments`
  - 用户维度：`GET /user-uploads`、`GET /user-likes`、`GET /user-stats/:userId`、`GET /user-profile/:userId`
  - 榜单：`GET /stats`、`GET /hot-topics`、`GET /active-users`

- 通知中心 `/api/notifications`
  - `GET /`（分页）/`GET /unread-count`/`PUT /:id/read`/`PUT /read-all`/`DELETE /:id`
  - 服务端在点赞/评论等事件中调用 `notificationService` 生成通知。

- 精选 `/api/curation`
  - `GET /`：精选列表（基于 `ImageCuration`）。

- 摄取接口（内部集成）`/api/ingest`（需 `INGEST_ENABLED=true`）
  - `POST /images`：批量入队图片元数据（BullMQ `image_ingest`）
  - `POST /image-tasks`：提交图像处理任务（`image_tasks`，type 驱动）

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

### 十一、待办与缺口

- API 契约文档化：为各路由生成 OpenAPI/接口示例（含入参/出参/错误码）。
- 搜索性能：评估引入 MySQL 全文索引/Elastic/OpenSearch；热门搜索与纠错、拼音/别名支持。
- 队列生产化：Redis 配置、告警、DLQ、幂等、可观测性仪表盘。
- 资产治理：COS Key 规范、CDN 缓存策略、变体策略（质量/尺寸）、清理回收。
- 监控告警：PM2/进程守护、接口与队列指标、慢查询与索引优化。
- 数据一致性：老表/新表字段风格统一与迁移计划；ER 图与数据字典完善。

### 十二、附录：典型请求示例

上传单图（需登录，表单字段 `image`、`modelId`、可选 `title/description/category/isFeatured/path`）

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

响应（成功）：

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

搜索（聚合）：

```http
GET /api/search?q=宝马&type=all&page=1&limit=20
```

—— 完 ——


