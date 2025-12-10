# 🚀 搜索统计功能部署指南

## 问题说明

服务器端热门搜索标签显示为假数据（count 为 0），原因是：
1. 服务器端数据库缺少 `search_stats` 和 `search_history` 表
2. 或者表中没有数据

## 解决方案

需要在**服务器端数据库**执行迁移脚本。

---

## 📋 部署步骤

### 方式1：SSH 登录服务器执行（推荐）

```bash
# 1. SSH 登录到服务器
ssh root@49.235.98.5

# 2. 进入项目目录
cd /opt/auto-gallery

# 3. 拉取最新代码
git pull

# 4. 执行迁移脚本
mysql -h 49.235.98.5 -u Jason -p'Jason123456!' cardesignspace < backend/migrations/create_search_tables.sql
```

### 方式2：本地远程执行

```bash
# 在本地项目目录执行
cd /Users/zobot/Desktop/unsplash-crawler/test/auto-gallery

mysql -h 49.235.98.5 -u Jason -p'Jason123456!' cardesignspace < backend/migrations/create_search_tables.sql
```

### 方式3：使用 MySQL 客户端（HeidiSQL/Navicat）

1. 连接到数据库：
   - 主机: `49.235.98.5`
   - 端口: `3306`
   - 用户: `Jason`
   - 密码: `Jason123456!`
   - 数据库: `cardesignspace`

2. 打开文件 `backend/migrations/create_search_tables.sql`

3. 执行整个脚本

---

## ✅ 验证安装

执行以下 SQL 验证表已创建：

```sql
-- 1. 检查表是否存在
SHOW TABLES LIKE 'search%';

-- 2. 查看表结构
DESC search_history;
DESC search_stats;

-- 3. 查看测试数据
SELECT query, count, last_searched_at 
FROM search_stats 
ORDER BY count DESC;
```

**期望输出：**
```
+-------------------------+-------+---------------------+
| query                   | count | last_searched_at    |
+-------------------------+-------+---------------------+
| BMW概念车               |    12 | 2025-12-10 ...      |
| 奔驰SUV                 |     9 | 2025-12-10 ...      |
| 红色跑车                |     5 | 2025-12-10 ...      |
| 蓝色轿车                |     3 | 2025-12-10 ...      |
+-------------------------+-------+---------------------+
```

---

## 🧪 API 测试

迁移完成后，测试 API 是否正常：

```bash
# 测试热门搜索 API（替换为实际服务器地址）
curl 'http://www.cardesignspace.com/api/search-stats/popular?limit=6'
```

**期望返回：**
```json
{
  "success": true,
  "data": [
    {
      "query": "BMW概念车",
      "count": 12,
      "last_searched_at": "2025-12-10T..."
    },
    {
      "query": "奔驰SUV",
      "count": 9,
      "last_searched_at": "2025-12-10T..."
    }
  ]
}
```

---

## 🎯 前端验证

1. 访问智能搜索页面：
   ```
   http://www.cardesignspace.com/smart-search
   ```

2. 检查页面底部"热门搜索"标签
   - ✅ 应显示真实的搜索词和计数（如 `BMW概念车 12`）
   - ❌ 不应显示假数据（count 为 0）

3. 执行几次搜索，验证：
   - 搜索会被记录到数据库
   - 热门标签会动态更新

---

## 📊 创建的数据库对象

### 表

1. **search_history**
   - 记录每次用户搜索的详细信息
   - 包含用户ID、搜索词、结果数、耗时等

2. **search_stats**
   - 汇总每个搜索词的统计数据
   - 记录搜索次数和最后搜索时间

### 视图（用于数据分析）

1. **v_popular_searches_30d** - 最近30天热门搜索
2. **v_user_search_stats** - 用户搜索行为统计
3. **v_failed_searches** - 搜索失败分析

### 存储过程

- **sp_cleanup_old_search_history** - 清理旧数据

---

## 🔍 故障排查

### 如果 API 仍返回假数据

1. **检查表是否有数据：**
   ```sql
   SELECT COUNT(*) FROM search_stats;
   ```
   如果为 0，手动插入测试数据：
   ```sql
   INSERT INTO search_stats (query, count, last_searched_at) 
   VALUES ('BMW概念车', 12, NOW());
   ```

2. **检查后端日志：**
   ```bash
   # 服务器上查看日志
   tail -f /opt/auto-gallery/backend/logs/backend.log
   ```

3. **重启后端服务：**
   ```bash
   pm2 restart auto-gallery-backend
   ```

4. **测试数据库连接：**
   ```bash
   mysql -h 49.235.98.5 -u Jason -p'Jason123456!' -e "SELECT 1"
   ```

### 如果前端仍显示假数据

1. **清除浏览器缓存**
2. **检查浏览器控制台**，看是否有 API 错误
3. **检查 Network 面板**，确认 `/api/search-stats/popular` 请求是否成功

---

## 📝 后续维护

### 定期清理旧数据

```sql
-- 清理90天前的搜索历史
CALL sp_cleanup_old_search_history(90);
```

或使用 API：
```bash
curl -X DELETE 'http://www.cardesignspace.com/api/search-stats/clean?days=90' \
  -H 'Authorization: Bearer YOUR_ADMIN_TOKEN'
```

### 监控搜索统计

```sql
-- 查看最近搜索趋势
SELECT 
  DATE(created_at) as date,
  COUNT(*) as searches
FROM search_history
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY DATE(created_at)
ORDER BY date;
```

---

## 📞 需要帮助？

如果部署过程中遇到问题：

1. 检查数据库连接权限
2. 确认 MySQL 版本 ≥ 5.7
3. 查看错误日志
4. 确认字符集为 utf8mb4

---

## 🎉 完成！

迁移完成后，智能搜索页面将显示真实的热门搜索数据，并且每次搜索都会被自动记录和统计。

