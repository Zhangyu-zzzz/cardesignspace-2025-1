# TK01 架构与索引上线（并行工单）

## 范围
- 新增表：image_assets / image_analysis / tags / image_tags / image_curation / image_stats（或聚合视图）
- 扩展表：images 新增 uploaderId/source_type/source_url/status/file_hash/width/height/part/angle/scene
- 建索引与约束；不改动现有API行为

## 交付物
- SQL DDL 脚本（可回滚）
- 影子库演练记录（执行时间、行数、索引构建耗时）
- 上线SOP与回滚脚本

## DDL 要点（建议，DBA可细化）
- images: add columns + indexes (modelId, createdAt), (brandId), (part,angle,scene), (status), (uploadDate); unique(file_hash)
- image_assets: PK(id), unique(image_id,variant), idx(image_id)
- image_analysis: idx(image_id), extractor_version, updated_at; JSON path 索引按需
- tags: unique(name), idx(category), idx(popularity)
- image_tags: PK(image_id,tag_id), idx(tag_id,image_id), cols: source,confidence,weight,added_by,created_at
- image_curation: idx(is_curated), idx(curation_score desc), idx(valid_until)
- image_stats: idx(image_id,time_bucket)

## 任务清单
- [ ] 编写 DDL 与回滚脚本
- [ ] 影子库演练（含大表索引构建耗时评估）
- [ ] 上线窗口申请与SOP
- [ ] 执行与验证（表/索引存在、权限与配额）

## 验收标准
- 表/索引/约束创建成功；现有服务无感
- 关键查询 explain 命中索引；慢查询无新增

## 指标
- DDL 执行耗时、锁等待、慢查询数

## 风险/回滚
- 风险：锁等待与业务阻塞；回滚：drop 新表与列、回退索引

## 依赖/排期
- 依赖：无（并行）
- 预计：2 人日（含演练）
