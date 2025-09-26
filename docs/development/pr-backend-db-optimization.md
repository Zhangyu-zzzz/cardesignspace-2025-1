# feat(backend): 路由与数据模型统一 + TK01 架构上线 + 标签初始化与精选回灌

## 概要
- 统一并去重图片/标签/精选路由与控制器，职责边界清晰
- 上线 TK01 架构与索引（不破坏现有 API）：image_assets / image_analysis / tags / image_tags / image_curation / image_stats 及 images 扩展字段
- 提供脚本：基础标签初始化（TK04）与精选回灌（TK06）

## 主要改动
- 路由
  - `/api/images`: 合并图片打标签接口（`GET/POST/DELETE /:id/tags`）
  - `/api/tags`: 标签查询与 CRUD（公开查询 + 鉴权维护）
  - `/api/curation`: 精选列表（公开），精选设置/取消接口保留在同一资源空间
- 控制器
  - `tagController`: 仅保留标签查询与 CRUD
  - `imageTagController`: 专职图片与标签关联的新增/删除与查询
  - `curationController`: 去重统一实现
- 模型
  - `ImageTag`: 复合主键（imageId, tagId），与 DDL 对齐
  - `ImageCuration`: 以 `image_id` 为主键，字段映射下划线风格，关闭 timestamps 匹配表结构
  - `Tag`: `parentId` 字段映射为 `parent_id`
- 迁移 & 工具
  - TK01：`npm run db:tk01:migrate`（整块执行，支持 multipleStatements）
  - TK04：`npm run db:tk04:init-tags`
  - TK06：`npm run db:tk06:backfill-curation`
- 仓库治理
  - `.gitignore` 忽略 `backend/backups/` 与临时脚本目录

## 验证
- 启动：`PORT=3001 node src/app.js`
- 健康检查：`GET /api/health` → 200
- 图片列表：`GET /api/images?page=1&limit=10` → 200
- 标签：`GET /api/tags?limit=5` → 返回基础标签数据
- 精选：`GET /api/curation?page=1&limit=10` → 200（无数据返回空分页）
- 图片打标签（需鉴权）：
  - `POST /api/images/:id/tags` body: `{ "tags": ["外观","正面" ] }`
  - `DELETE /api/images/:id/tags/:tagId`

## 上线步骤（影子/测试库）
1) 执行 TK01：`npm run db:tk01:migrate`
2) 初始化基础标签：`npm run db:tk04:init-tags`
3) 精选回灌（可选）：`npm run db:tk06:backfill-curation`
4) 启动服务并冒烟

## 回滚
- 数据：使用回滚脚本（如需），或按表/索引清单回退
- 代码：Revert 此 PR

## 风险与注意
- DDL 首次上线需确认外键与索引均创建成功
- CORS 生产需收紧允许来源
- 精选回灌为增量/幂等，执行前确认策略与分数下限
