-- =====================================================
-- 搜索功能数据库表迁移
-- 创建时间: 2025-12-10
-- 说明: 创建搜索历史记录表和搜索统计表
-- =====================================================

-- 1. 创建搜索历史表
CREATE TABLE IF NOT EXISTS `search_history` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `user_id` INT NULL COMMENT '用户ID（如果已登录）',
  `session_id` VARCHAR(255) NULL COMMENT '会话ID（未登录用户识别）',
  `query` VARCHAR(500) NOT NULL COMMENT '搜索关键词',
  `translated_query` VARCHAR(500) NULL COMMENT '翻译后的查询',
  `brand_id` INT NULL COMMENT '识别到的品牌ID',
  `results_count` INT DEFAULT 0 COMMENT '返回结果数量',
  `search_type` ENUM('smart', 'normal', 'tag') DEFAULT 'smart' COMMENT '搜索类型',
  `ip_address` VARCHAR(45) NULL COMMENT 'IP地址',
  `user_agent` VARCHAR(500) NULL COMMENT '用户代理',
  `referrer` VARCHAR(500) NULL COMMENT '来源页面',
  `device_type` VARCHAR(50) NULL COMMENT '设备类型（mobile/desktop/tablet）',
  `search_duration_ms` INT NULL COMMENT '搜索耗时（毫秒）',
  `is_successful` BOOLEAN DEFAULT TRUE COMMENT '搜索是否成功',
  `error_message` TEXT NULL COMMENT '错误信息（如果失败）',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '搜索时间',
  PRIMARY KEY (`id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_session_id` (`session_id`),
  INDEX `idx_query` (`query`(191)),
  INDEX `idx_brand_id` (`brand_id`),
  INDEX `idx_search_type` (`search_type`),
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_ip_address` (`ip_address`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='搜索历史记录表';

-- 2. 创建搜索统计表
CREATE TABLE IF NOT EXISTS `search_stats` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `query` VARCHAR(255) NOT NULL COMMENT '搜索关键词',
  `count` INT NOT NULL DEFAULT 1 COMMENT '搜索次数',
  `last_searched_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '最后搜索时间',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_query` (`query`),
  KEY `idx_count` (`count`),
  KEY `idx_last_searched_at` (`last_searched_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='搜索统计表';

-- 3. 插入一些初始测试数据（可选）
INSERT IGNORE INTO `search_stats` (`query`, `count`, `last_searched_at`) VALUES
('BMW概念车', 12, NOW()),
('奔驰SUV', 9, NOW()),
('红色跑车', 5, NOW()),
('蓝色轿车', 3, NOW()),
('测试搜索_1765275438', 1, NOW()),
('竞速', 1, NOW());

-- =====================================================
-- 数据分析视图（可选，用于复杂查询）
-- =====================================================

-- 热门搜索词视图（最近30天）
CREATE OR REPLACE VIEW `v_popular_searches_30d` AS
SELECT 
  query,
  COUNT(*) as search_count,
  COUNT(DISTINCT user_id) as unique_users,
  MAX(created_at) as last_searched,
  AVG(results_count) as avg_results,
  SUM(CASE WHEN is_successful = 1 THEN 1 ELSE 0 END) as successful_searches
FROM search_history
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY query
ORDER BY search_count DESC
LIMIT 100;

-- 用户搜索行为分析视图
CREATE OR REPLACE VIEW `v_user_search_stats` AS
SELECT 
  user_id,
  COUNT(*) as total_searches,
  COUNT(DISTINCT query) as unique_queries,
  COUNT(DISTINCT DATE(created_at)) as active_days,
  AVG(results_count) as avg_results_per_search,
  MAX(created_at) as last_search_time
FROM search_history
WHERE user_id IS NOT NULL
GROUP BY user_id;

-- 搜索失败分析视图
CREATE OR REPLACE VIEW `v_failed_searches` AS
SELECT 
  query,
  COUNT(*) as fail_count,
  error_message,
  MAX(created_at) as last_failed
FROM search_history
WHERE is_successful = 0
GROUP BY query, error_message
ORDER BY fail_count DESC;

-- =====================================================
-- 数据清理存储过程（可选）
-- =====================================================

DELIMITER //

DROP PROCEDURE IF EXISTS `sp_cleanup_old_search_history`//

CREATE PROCEDURE `sp_cleanup_old_search_history`(IN days_to_keep INT)
BEGIN
  DECLARE deleted_rows INT;
  
  -- 删除指定天数之前的搜索记录
  DELETE FROM search_history 
  WHERE created_at < DATE_SUB(NOW(), INTERVAL days_to_keep DAY);
  
  SET deleted_rows = ROW_COUNT();
  
  SELECT CONCAT('已删除 ', deleted_rows, ' 条搜索记录') AS result;
END //

DELIMITER ;

-- =====================================================
-- 验证安装
-- =====================================================

-- 检查表是否创建成功
SELECT 
  TABLE_NAME, 
  TABLE_ROWS, 
  CREATE_TIME,
  TABLE_COMMENT
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('search_history', 'search_stats');

-- 检查初始数据
SELECT 
  query, 
  count, 
  last_searched_at 
FROM search_stats 
ORDER BY count DESC 
LIMIT 10;

