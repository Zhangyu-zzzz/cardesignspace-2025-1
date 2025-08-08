# 精选回灌（Curation Backfill）说明

## 1. 背景与目的

项目从旧的单字段 `images.isFeatured` 迁移到新的精选体系表 `image_curation`。为让历史“精选”信号在新排序与运营体系中生效，需要对老数据进行一次性或分批的“精选回灌”（Backfill）：

- 将历史 `isFeatured=1` 的图片写入 `image_curation`
- 赋予默认 `curation_score`、记录 `curator/reason/valid_until`
- 使“精选优先 + 新热混排”的排序可用，支持后续运营分值/有效期管理

相关设计参考：
- 《后端优化方案》：`docs/backend-optimization.md`
- 工单《TK06 迁移与老图回灌》：`docs/tickets/TK06-migration-and-backfill.md`

## 2. 数据模型与字段映射

- 旧：`images.isFeatured`（布尔/整型）
- 新：`image_curation`（每图一行，核心字段）
  - `image_id`
  - `is_curated`（是否精选）
  - `curation_score`（精选分，影响排序权重）
  - `curator`（操作人/来源，如 migration/system）
  - `reason`（原因说明）
  - `valid_until`（有效期；过期后不再加权）
  - `updated_at`（用于排序与变更记录）

## 3. 实施方式（脚本与执行）

- 回灌脚本位置：`backend/scripts/tk06-backfill-curation.js`
- NPM 命令：`backend/package.json` 中提供 `db:tk06:backfill-curation`

执行步骤（需配置数据库环境变量：`DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME`）：

```bash
cd backend
npm run db:tk06:backfill-curation
```

脚本核心 SQL（从 `images.isFeatured` 迁移到 `image_curation`，并保持幂等与分数最大化）：

```sql
INSERT INTO image_curation (image_id, is_curated, curation_score, curator, reason, valid_until, created_at, updated_at)
SELECT id AS image_id, 1 AS is_curated, 50 AS curation_score, 'migration' AS curator,
       'migrated from images.isFeatured' AS reason, NULL AS valid_until, NOW(), NOW()
FROM images
WHERE isFeatured = 1
ON DUPLICATE KEY UPDATE
  is_curated = VALUES(is_curated),
  curation_score = GREATEST(image_curation.curation_score, VALUES(curation_score)),
  updated_at = VALUES(updated_at);
```

## 4. 排序与接口影响（读路径）

读路径将“精选”纳入排序权重，体现为“精选优先 + 新热混排”。主要体现在图片查询接口的排序中，对 `ImageCuration.isCurated / curationScore` 进行优先级排序，然后再按时间/其他维度排序。例如：

- 控制器：`backend/src/controllers/imageController.js`、`imagesQueryController.js`、`modelController.js`
- 排序要点：
  - `['Curation', 'isCurated', 'DESC']`
  - `['Curation', 'curationScore', 'DESC']`
  - 后续按 `createdAt`/`uploadDate` 等时间维度

接口层新增精选管理：
- `POST /api/images/:id/curation`（设置/更新 is_curated/curation_score/reason/valid_until）
- `DELETE /api/images/:id/curation`（取消精选）
- `GET /api/curation?order=score_desc&expire=active`（查看精选列表）

## 5. 风险与回滚

- 风险：
  - 回灌写入量较大引发 IO 峰值或锁竞争
  - 新排序改变流量分配导致页面分发波动
- 应对：
  - 低峰期执行，必要时分片与限速
  - 先灰度开启新排序，保留旧排序开关
  - 回灌前备份/快照，必要时按 `image_id` 粒度回滚

## 6. 验收与监控

- 验收：
  - 历史 `isFeatured=1` 的图片在 `image_curation` 中存在记录
  - 列表页“精选优先”生效；过期项不再加权
- 监控：
  - 回灌任务成功率、失败率与耗时分布
  - 列表接口延迟（P95/P99）与错误率

## 7. 相关文档

- `docs/backend-optimization.md`
- `docs/tickets/TK06-migration-and-backfill.md`
- `docs/tickets/TK05-curation-and-ranking.md`


