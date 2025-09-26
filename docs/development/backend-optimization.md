# 后端优化方案（聚焦图片管理/分类/精选/推送）

本文档聚焦后端，不涉及前端改造。目标是将网站从“图片库”升级为“汽车领域的视觉发现平台（类 Pinterest）”，先完成图片管理、分类/标签、精选/推送与基础检索能力，不引入个性化推荐。

## 一、现状问题（基于仓库与数据库）
- images.category 覆盖率≈0.01%，前后端分类脱节，检索与导航无效。
- isFeatured 可写不可用：接口未按精选排序/优先展示。
- 缺少标签系统（tags + image_tags），语义组织能力弱，无法做专题/合集。
- 图片变体与处理流水缺失，无法控流量成本、缺少多端最优展示。
- 上传者缺失/审核流程缺位/来源不明确，内容治理与风控薄弱。
- 无结构化分析数据（主色、宽高比、质量分等），难以做排序与质量阈值。

## 二、总体架构与分层
- Images（核心对象层）：最小必要元数据与业务外键（品牌/车型/用户/来源）。
- ImageAssets（资产层）：一图多版本（thumb/medium/large/webp），统一管理URL与规格。
- ImageAnalysis（结构化特征层）：主色、亮度/对比度、清晰度、宽高比、构图类型、质量/美学分、extractor_version。
- Tags + ImageTags（语义层）：可扩展标签体系，支持AI/人工/系统来源、置信度/权重。
- ImageCuration（精选层）：is_curated、curation_score、curator、reason、valid_until。
- ImageStats（统计层，可离线聚合）：view/like/pin/share/trending_score（支持按日/周/月分桶）。

## 三、数据模型（概念/字段，供建表参考）
1) images（扩展保留）
- 业务：id, brandId, modelId, uploaderId, source_type(enum: manual,crawler,partner), source_url
- 文件：url(原图或大图), filename, fileType, fileSize, width, height, file_hash
- 流程：status(enum: pending,approved,rejected,archived), uploadDate, createdAt, updatedAt
- 类目（结构化维度，首期最小集）：part(enum: exterior,interior,details), angle(enum: front,side,rear,three_quarter), scene(enum: studio,road,urban,nature)

2) image_assets（新）
- image_id FK, variant(enum: thumb,small,medium,large,webp), url, width, height, size, createdAt

3) image_analysis（新）
- image_id FK
- dominant_colors JSON（如 [{hex:#112233, ratio:0.42}, ...]）
- brightness/contrast/sharpness FLOAT, aspect_ratio FLOAT
- composition_type ENUM（如 symmetric,golden_ratio,center,dynamic）
- technical_score/aesthetic_score/overall_score FLOAT
- extractor_version VARCHAR, updated_at DATETIME
-（相似检索向量建议外置向量库，仅存引用/哈希）

4) tags / image_tags（新）
- tags: id, name, category(optional), type(enum: manual,ai,system), parent_id, synonyms JSON, lang, popularity INT, status
- image_tags: image_id, tag_id, confidence FLOAT, weight FLOAT, added_by(userId/null), source(enum: ai,manual,system), created_at（PK: image_id, tag_id）

5) image_curation（新）
- image_id, is_curated BOOLEAN, curation_score FLOAT, curator VARCHAR/userId, reason TEXT, valid_until DATETIME, updated_at DATETIME

6) image_stats（新/或聚合表）
- image_id, view, like, pin, share, trending_score, time_bucket（daily/weekly/monthly）

## 四、接口与排序（REST 大纲）
1) 上传
- POST /api/upload/image：必填 modelId 与类目（至少 part），可带 tags[]；返回 image_id 与各资产URL。
- POST /api/upload/images：批量；同上。处理异步任务入队。

2) 标签
- GET /api/tags?category=&q=
- POST /api/images/:id/tags（追加标签，支持 source/weight/confidence）
- DELETE /api/images/:id/tags/:tagId

3) 精选
- POST /api/images/:id/curation（is_curated/score/reason/valid_until）
- DELETE /api/images/:id/curation
- GET /api/curation?is_curated=1&order=score_desc&expire=active

4) 图片查询（无个性化）
- GET /api/images?brandId=&modelId=&part=&angle=&scene=&tags[]=…&dateRange=&sort=default|latest|hot|quality|curated&page=&limit=
- GET /api/models/:id/images 同上精简版

5) 任务（可选）
- POST /api/images/:id/reanalyze
- GET /api/tasks?imageId=&status=

排序规则（默认“精选优先 + 新热混排”）
- curated_boost（is_curated/curation_score）
- freshness_decay（时间衰减）
- popularity（view/like/pin/share 归一化与反作弊）
- quality_floor（technical/aesthetic/overall_score 阈值）

## 五、处理流水线（异步任务）
触发：上传成功 → 入队（队列/任务表）
步骤：
1) 资产生成（sharp）：thumb/small/medium/large/webp → 写 image_assets
2) 结构化分析：主色、宽高比、亮度/清晰度/质量分 → 写 image_analysis
3) 标签生成：系统规则/AI → 写 image_tags（带 source/confidence/version）
4) 审核与可见性：根据 status/阈值决定列表可见 → 刷新索引/缓存
保障：幂等 + 重试 + 失败告警 + 版本化（extractor_version）+ 审计日志

## 六、迁移与数据治理
- 建表与索引上线，不破坏现有接口；为老图分批回灌：
  1) 资产生成 → 2) 分析抽取 → 3) 类目与系统标签（部位/角度/场景最小集）
- 修复上传链路的 uploaderId 与 status；确权 `source_type/source_url`。
- 将历史 isFeatured 迁移为 image_curation 并接入排序。
- 标签治理：同义词合并、禁用低质标签、统计标签覆盖率。

## 七、性能与成本
- 索引：images(modelId, createdAt, part, angle, scene)、image_tags(tag_id, image_id)、image_assets(image_id, variant)、image_analysis(必要字段/JSON path)
- CDN：统一消费 image_assets，WebP/AVIF 优先，懒加载与占位图；热门预热
- 存储：控制变体粒度，按需生成；归档长期低频资源
- 安全：审核流/举报与处置；上传鉴黄与重复检测（pHash/aHash）

## 八、验收指标（KPI）
- 类目覆盖率 ≥ 80%；图片带标签 ≥ 50%（首期）
- 列表接口 P95 < 300ms；首屏图片可见 < 1.5s（CDN 命中率 > 90%）
- 首页/品牌/车型页 CTR、停留、下滑深度较基线 +10~20%
- 任务失败率 < 1%，重试成功率 > 95%

## 九、里程碑（仅后端）
- M1（2周）：建表与索引、上传链路补齐类目与uploader、生成变体、基础查询与“精选优先”排序、简单运营接口（标签/精选）。
- M2（2-4周）：上线主色/宽高比/质量分，老图回灌≥20%，标签治理接口与统计，列表支持类目与标签过滤。
- M3（4-8周）：AI 标签试点、热度分与反作弊基础、专题/合集数据接口、代表图策略（车型页覆盖多角度）。


## 十、DDL 建议（字段与索引要点，供 DBA 细化）
- images
  - 必要字段：brandId、modelId、uploaderId、source_type、source_url、status、file_hash、width、height、uploadDate
  - 类目字段：part、angle、scene（建议 ENUM 或小维表 + FK）
  - 索引建议：(modelId, createdAt)、(brandId)、(part, angle, scene)、(status)、(uploadDate)
  - 约束：file_hash 唯一（同一文件去重，可与 size/width/height 联合做近似判重）
- image_assets
  - 唯一约束：(image_id, variant)
  - 索引：image_id、(variant)
- image_analysis
  - 索引：image_id；必要的 JSON 路径索引（如 dominant_colors[0].hex），或拆字段便于筛选
  - 版本控制：extractor_version、updated_at
- tags / image_tags
  - tags：name 唯一；(category)、(popularity)
  - image_tags：主键 (image_id, tag_id)；索引 (tag_id, image_id)
  - 扩展：source、confidence、weight、added_by、created_at
- image_curation
  - 索引：is_curated、(curation_score DESC)、(valid_until)
- image_stats（或聚合表）
  - 粒度：daily/weekly/monthly；索引：(image_id, time_bucket)

## 十一、API 契约细化（仅后端）
- GET /api/images
  - 请求：brandId?、modelId?、part?、angle?、scene?、tags[]?、dateRange?、sort=default|latest|hot|quality|curated、page、limit
  - 响应：items[].{id, bestUrl, brandId, modelId, part, angle, scene, tags[], curated:{is_curated,score}, analysis_summary:{dominant_colors,overall_score}, stats_summary}
- POST /api/upload/image（单图）/ /api/upload/images（多图）
  - 请求：modelId、part（必填，最小闭环）、angle/scene（可选）、tags[]（可选）、文件
  - 响应：image_id、assets{thumb,medium,large,webp}
- POST /api/images/:id/curation | DELETE /api/images/:id/curation
  - 请求：is_curated、curation_score、reason、valid_until
  - 响应：ok
- POST /api/images/:id/tags | DELETE /api/images/:id/tags/:tagId
  - 请求：tags[] 或 tagId、source、confidence、weight
  - 响应：ok
- GET /api/tags?category=&q=
  - 响应：tags[].{id,name,category,popularity}

## 十二、排序公式（无个性化场景）
- 基础公式（可配置权重）
  - score = w1*curation + w2*freshness + w3*popularity + w4*quality
  - curation = is_curated? (curation_score) : 0（过期(valid_until)不加权）
  - freshness = 时间衰减函数（如 e^{-t/τ}）
  - popularity = 归一化的 view/like/pin/share（防刷：去异常、时间窗）
  - quality = analysis.overall_score（或 technical/aesthetic 的组合）
- 过滤线：低于质量阈值（quality_floor）不进入默认流；品牌/车型页可放宽

## 十三、任务与失败重试策略
- 队列：上传→(A)生成变体→(B)分析特征→(C)标签生成→(D)可见性与索引
- 幂等：以 image_id + extractor_version 控制；重复任务安全退出
- 超时与重试：指数退避（如 1m/5m/15m/1h），最大重试 N 次；失败入死信队列，告警并提供一键重跑
- 旁路：允许手工触发 /reanalyze；版本升级可批量回灌（分片+速率限制）

## 十四、迁移计划（不影响现网）
1) 建表与索引上线，接口保持兼容（新增参数为可选）
2) 老图回灌分阶段：
   - 阶段1：补 ImageAssets（thumb/webp）
   - 阶段2：补 ImageAnalysis（主色/宽高比/质量分，小流量抽样验证准确性）
   - 阶段3：系统类目与基础标签（部位/角度/场景）
3) isFeatured 迁移：
   - 读取历史 isFeatured → 写入 image_curation（is_curated=true, score=默认值）
   - 前台查询改用排序权重，不再直接依赖 isFeatured 字段
4) 上线开关（feature flag）：按页面/接口灰度启用新排序与过滤

## 十五、监控与告警（后端维度）
- 任务：队列长度、平均处理时延、各阶段失败率、重试成功率、死信数
- 接口：QPS、P95/P99 延迟、错误率、超时率
- 存储：表大小增长、热点 key、慢查询（≥200ms）、索引命中率
- 质量：类目覆盖率、标签覆盖率、分析成功率、向量/色彩抽取错误率
- CDN/资源：命中率、回源比、平均首图字节时间（TTFB）
- 告警分级：致命（任务积压/不可用）、高（错误率激增）、中（性能退化）

## 十六、风险与回滚
- 风险
  - 老图回灌导致写放大与冷数据唤醒（磁盘/IO 峰值）
  - 新排序改变流量分配，引发运营侧 KPI 波动
  - AI/规则误判导致标签污染
- 应对
  - 分片限速、夜间/低峰批处理；配额与熔断
  - 排序灰度开关 + A/B 观测 + 可回滚旧策略
  - 标签治理后台（禁用/合并/回滚），AI 产出带版本与置信度
- 回滚
  - 数据层：保留历史快照（curation/analysis/tags 变更日志），支持按 image_id 回滚
  - 接口层：保留旧排序与查询路径的开关

## 十七、验收清单（后端）
- 表结构与索引：通过 DDL 审核；影子库演练
- 上传链路：类目必填生效；生成变体与分析成功率≥98%
- 查询与排序：默认流可用；品牌/车型页代表图策略生效
- 精选与标签：运营接口可用；标签写入与查询正确
- 监控：关键 Dashboard 与告警规则生效
- 文档：表结构说明、API 契约、任务时序、SOP 与回滚手册

