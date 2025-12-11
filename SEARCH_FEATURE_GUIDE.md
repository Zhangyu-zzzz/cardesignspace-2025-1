# 🔍 搜索统计功能使用指南

## ✨ 功能概述

智能搜索页面现已集成完整的搜索统计和分析功能：

1. **实时热门搜索** - 根据真实用户搜索数据动态显示
2. **完整搜索历史** - 记录每次搜索的详细信息
3. **数据分析** - 支持多维度搜索行为分析
4. **隐私保护** - 匿名用户使用会话ID跟踪

## 📦 已完成的工作

### 前端改进
- ✅ 热门搜索移到翻译信息下方
- ✅ 动态从后端API获取热门搜索
- ✅ 显示每个搜索词的搜索次数
- ✅ 美化的UI设计（渐变背景、悬停动画）
- ✅ 记录详细搜索信息（翻译、品牌、结果数等）
- ✅ 会话ID跟踪（localStorage）

### 后端实现
- ✅ `search_history` 表 - 详细搜索记录
- ✅ `search_stats` 表 - 搜索统计汇总
- ✅ 完整的API接口
- ✅ 数据分析视图
- ✅ 自动安装脚本

### 数据库
- ✅ 两个主表已创建并插入测试数据
- ✅ 分析视图已创建
- ✅ 索引优化完成

## 🚀 快速开始

### 1. 数据表已安装 ✅

数据表已成功创建在数据库中：
```
数据库: cardesignspace@49.235.98.5
表:
  - search_history (搜索历史详细记录)
  - search_stats (搜索统计汇总)
  - v_popular_searches_30d (热门搜索视图)
```

### 2. 启动后端服务

```bash
cd backend
npm run dev
```

### 3. 启动前端服务

```bash
cd frontend  
npm run serve
```

### 4. 访问智能搜索页面

```
http://localhost:8080/smart-search
```

## 📊 数据结构

### search_history（搜索历史表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键 |
| user_id | INT | 用户ID（已登录） |
| session_id | VARCHAR(255) | 会话ID（未登录） |
| query | VARCHAR(500) | 搜索关键词 |
| translated_query | VARCHAR(500) | 翻译后的查询 |
| brand_id | INT | 识别到的品牌ID |
| results_count | INT | 返回结果数量 |
| search_type | ENUM | 搜索类型（smart/normal/tag） |
| ip_address | VARCHAR(45) | IP地址 |
| user_agent | VARCHAR(500) | 用户代理 |
| device_type | VARCHAR(50) | 设备类型 |
| search_duration_ms | INT | 搜索耗时 |
| is_successful | BOOLEAN | 是否成功 |
| error_message | TEXT | 错误信息 |
| created_at | DATETIME | 搜索时间 |

### search_stats（搜索统计表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 |
| query | VARCHAR(255) | 搜索关键词（唯一） |
| count | INT | 搜索次数 |
| last_searched_at | DATETIME | 最后搜索时间 |

## 🔌 API接口

### 公开接口

#### 1. 记录搜索
```
POST /api/search-stats/record
```

**请求体：**
```json
{
  "query": "红色跑车",
  "translatedQuery": "red sports car",
  "brandId": 10,
  "resultsCount": 25,
  "searchType": "smart",
  "isSuccessful": true,
  "sessionId": "sess_1234567890_abc123"
}
```

#### 2. 获取热门搜索
```
GET /api/search-stats/popular?limit=6&days=30
```

**响应：**
```json
{
  "success": true,
  "data": [
    {
      "query": "BMW概念车",
      "count": 12,
      "last_searched_at": "2025-12-09T10:05:30.000Z"
    },
    {
      "query": "奔驰SUV",
      "count": 8,
      "last_searched_at": "2025-12-09T10:05:30.000Z"
    }
  ]
}
```

### 管理接口（需认证）

#### 3. 获取所有统计
```
GET /api/search-stats/all?page=1&limit=50
```

#### 4. 获取搜索历史
```
GET /api/search-stats/history?page=1&limit=50&userId=123
```

#### 5. 搜索分析
```
GET /api/search-stats/analytics?days=7
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "period_days": 7,
    "total_searches": 150,
    "unique_users": 45,
    "avg_results": "23.50",
    "success_rate": "95.33%"
  }
}
```

#### 6. 清理旧数据
```
DELETE /api/search-stats/clean?days=90
DELETE /api/search-stats/clean-history?days=180
```

## 💡 使用场景

### 1. 热门搜索展示
前端自动从 `/api/search-stats/popular` 获取并展示热门搜索词

### 2. 用户行为分析
```sql
-- 查看某用户的搜索历史
SELECT * FROM search_history 
WHERE user_id = 123 
ORDER BY created_at DESC;

-- 分析用户搜索偏好
SELECT 
  query,
  COUNT(*) as count,
  AVG(results_count) as avg_results
FROM search_history
WHERE user_id = 123
GROUP BY query
ORDER BY count DESC;
```

### 3. 搜索优化
```sql
-- 找出经常失败的搜索
SELECT query, COUNT(*) as fail_count
FROM search_history
WHERE is_successful = 0
GROUP BY query
ORDER BY fail_count DESC
LIMIT 20;

-- 找出零结果搜索
SELECT query, COUNT(*) as count
FROM search_history
WHERE results_count = 0 AND is_successful = 1
GROUP BY query
ORDER BY count DESC;
```

### 4. 性能分析
```sql
-- 平均搜索耗时
SELECT 
  AVG(search_duration_ms) as avg_duration,
  MAX(search_duration_ms) as max_duration,
  MIN(search_duration_ms) as min_duration
FROM search_history
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY);
```

## 🎯 前端集成

### 在其他页面集成热门搜索

```vue
<template>
  <div class="popular-searches">
    <h3>热门搜索</h3>
    <div v-for="tag in popularTags" :key="tag.query">
      <span @click="search(tag.query)">
        {{ tag.query }} ({{ tag.count }})
      </span>
    </div>
  </div>
</template>

<script>
import { apiClient } from '@/services/api'

export default {
  data() {
    return {
      popularTags: []
    }
  },
  async mounted() {
    const response = await apiClient.get('/search-stats/popular', {
      params: { limit: 10, days: 7 }
    })
    this.popularTags = response.data
  }
}
</script>
```

## 📈 数据分析示例

### 按时间段统计
```sql
SELECT 
  DATE(created_at) as date,
  COUNT(*) as searches,
  COUNT(DISTINCT session_id) as unique_sessions
FROM search_history
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY DATE(created_at)
ORDER BY date;
```

### 设备类型分布
```sql
SELECT 
  device_type,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM search_history), 2) as percentage
FROM search_history
GROUP BY device_type;
```

### 品牌搜索排行
```sql
SELECT 
  b.name as brand_name,
  COUNT(*) as search_count
FROM search_history sh
LEFT JOIN brands b ON sh.brand_id = b.id
WHERE sh.brand_id IS NOT NULL
GROUP BY sh.brand_id, b.name
ORDER BY search_count DESC
LIMIT 20;
```

## 🧹 维护建议

### 定期清理（可设置cron任务）

```bash
# 清理180天前的搜索历史
curl -X DELETE "http://localhost:3000/api/search-stats/clean-history?days=180" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 清理90天前的低频统计
curl -X DELETE "http://localhost:3000/api/search-stats/clean?days=90" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 性能优化建议

1. **索引优化** - 已创建必要索引
2. **分区表** - 数据量大时可考虑按月分区
3. **归档** - 定期将旧数据归档到历史表
4. **缓存** - 热门搜索结果可缓存5-10分钟

## 🔒 隐私说明

- 未登录用户：使用 `session_id` 标识（不关联个人信息）
- 已登录用户：记录 `user_id`
- IP地址：仅用于防刷和地区分析
- 自动清理：定期删除旧数据

## 📝 测试数据

安装脚本已插入4条测试数据：
- BMW概念车 (12次)
- 奔驰SUV (8次)
- 红色跑车 (5次)
- 蓝色轿车 (3次)

访问智能搜索页面即可看到这些热门搜索标签！

## 🎉 效果展示

现在智能搜索页面会：
1. 在翻译信息下方显示热门搜索
2. 每个标签显示搜索次数
3. 点击标签快速搜索
4. 每次搜索自动更新统计
5. 实时刷新热门搜索列表

---

**提示：** 所有功能已完全集成并可用！开始使用即可看到效果。🎊


