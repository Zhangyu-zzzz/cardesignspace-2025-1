# 搜索功能数据库表安装指南

## 📋 数据库配置信息

```
数据库主机: 49.235.98.5
端口: 3306
数据库名: cardesignspace
用户名: Jason
密码: Jason123456!
```

## 🔧 安装步骤

### 方式1：使用MySQL客户端（推荐）

```bash
# 1. 登录MySQL
mysql -h 49.235.98.5 -P 3306 -u Jason -p cardesignspace
# 输入密码: Jason123456!

# 2. 执行SQL文件
SOURCE backend/src/sql/create_search_history.sql;

# 3. 验证表是否创建成功
SHOW TABLES LIKE 'search%';
DESC search_history;
DESC search_stats;
```

### 方式2：直接执行SQL文件

```bash
mysql -h 49.235.98.5 -P 3306 -u Jason -p cardesignspace < backend/src/sql/create_search_history.sql
```

### 方式3：使用HeidiSQL/Navicat等图形工具

1. 连接到数据库
2. 选择 `cardesignspace` 数据库
3. 打开 `backend/src/sql/create_search_history.sql` 文件
4. 执行SQL脚本

## 📊 创建的表和视图

### 1. search_history（搜索历史表）
记录每一次用户搜索的详细信息
- 用户ID、会话ID
- 搜索关键词、翻译结果
- 搜索结果数量、耗时
- IP地址、设备类型、User-Agent
- 成功/失败状态

### 2. search_stats（搜索统计表）
汇总每个搜索词的统计信息
- 搜索关键词
- 搜索次数
- 最后搜索时间

### 3. v_popular_searches_30d（视图）
最近30天的热门搜索统计

### 4. v_user_search_stats（视图）
用户搜索行为分析

### 5. v_failed_searches（视图）
搜索失败分析

## 🔍 数据查询示例

```sql
-- 查看最近100条搜索记录
SELECT * FROM search_history ORDER BY created_at DESC LIMIT 100;

-- 查看热门搜索（最近7天）
SELECT 
  query, 
  COUNT(*) as count,
  MAX(created_at) as last_search
FROM search_history 
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY query 
ORDER BY count DESC 
LIMIT 20;

-- 查看搜索失败的关键词
SELECT query, error_message, COUNT(*) as fail_count
FROM search_history 
WHERE is_successful = 0
GROUP BY query, error_message
ORDER BY fail_count DESC;

-- 按小时统计搜索量
SELECT 
  DATE_FORMAT(created_at, '%Y-%m-%d %H:00') as hour,
  COUNT(*) as search_count
FROM search_history
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
GROUP BY hour
ORDER BY hour;
```

## 🧹 数据清理

```sql
-- 清理90天前的搜索统计
CALL sp_cleanup_old_search_history(90);

-- 或者使用API
DELETE /api/search-stats/clean?days=90
DELETE /api/search-stats/clean-history?days=180
```

## 📡 API接口

### 公开接口
- `POST /api/search-stats/record` - 记录搜索
- `GET /api/search-stats/popular` - 获取热门搜索

### 管理接口（需认证）
- `GET /api/search-stats/all` - 所有搜索统计
- `GET /api/search-stats/history` - 搜索历史记录
- `GET /api/search-stats/analytics` - 搜索分析数据
- `DELETE /api/search-stats/clean` - 清理旧统计
- `DELETE /api/search-stats/clean-history` - 清理旧历史

## ✅ 验证安装

执行以下SQL确认安装成功：

```sql
-- 检查表是否存在
SELECT 
  TABLE_NAME, 
  TABLE_ROWS, 
  CREATE_TIME 
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'cardesignspace' 
  AND TABLE_NAME IN ('search_history', 'search_stats');

-- 检查视图是否创建
SELECT 
  TABLE_NAME 
FROM information_schema.VIEWS 
WHERE TABLE_SCHEMA = 'cardesignspace' 
  AND TABLE_NAME LIKE 'v_%search%';

-- 插入测试数据
INSERT INTO search_history (query, search_type, results_count) 
VALUES ('红色跑车', 'smart', 10);

-- 查询测试数据
SELECT * FROM search_history WHERE query = '红色跑车';
```

## 🚀 后续优化建议

1. **定期清理**: 设置cron任务定期清理旧数据
2. **数据分区**: 如果数据量很大，考虑按月分区
3. **索引优化**: 根据实际查询情况调整索引
4. **数据归档**: 将旧数据归档到历史表

## 📞 问题排查

如果遇到问题：

1. 检查数据库连接权限
2. 确认用户有CREATE/ALTER权限
3. 查看MySQL错误日志
4. 确认字符集为utf8mb4

```sql
-- 检查字符集
SHOW VARIABLES LIKE 'character_set%';

-- 检查用户权限
SHOW GRANTS FOR 'Jason'@'%';
```



