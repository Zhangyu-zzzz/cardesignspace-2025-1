-- 为models表添加viewCount字段以记录车型详情页面访问次数
-- 执行时间: 2025-01-XX
-- 作用: 记录每个车型详情页面被用户访问的次数

-- 添加viewCount字段
ALTER TABLE models 
ADD COLUMN viewCount INT DEFAULT 0 COMMENT '车型详情页面访问次数' 
AFTER styleTags;

-- 为viewCount添加索引以优化排序和查询性能
CREATE INDEX idx_models_view_count ON models(viewCount);

-- 初始化已有车型的访问次数为0
UPDATE models SET viewCount = 0 WHERE viewCount IS NULL;

-- 输出确认信息
SELECT '✅ viewCount字段添加成功' as status;

