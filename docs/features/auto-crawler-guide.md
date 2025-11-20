# 🤖 自动化爬虫系统使用指南

## 📋 概述

自动化爬虫系统可以自动监控指定网页，提取最新动态中的文字内容和图片，识别车型信息，并自动上传到网站中。实现全自动运行，减少人工重复劳动。

## 🏗️ 系统架构

### 核心组件

1. **爬虫服务** (`crawlerService.js`) - 负责抓取网页内容
2. **内容解析器** (`contentParser.js`) - 从HTML中提取文字和图片
3. **车型识别器** (`modelIdentifier.js`) - 从文字中识别车型信息
4. **自动上传服务** (`autoUploadService.js`) - 自动创建车型和上传图片
5. **定时任务调度器** (`schedulerService.js`) - 定期执行爬虫任务

### 数据库表

- `monitored_pages` - 存储监控的网页信息
- `crawl_history` - 存储抓取历史记录

## 🚀 快速开始

### 1. 安装依赖

```bash
cd backend
npm install
```

### 2. 创建数据库表

```bash
node scripts/create-crawler-tables.js
```

### 3. 配置环境变量

确保 `.env` 文件中包含以下配置：

```env
JWT_SECRET=your_jwt_secret
API_BASE_URL=http://localhost:3000  # 可选，默认为 http://localhost:3000
```

### 4. 启动服务

```bash
npm start
# 或开发模式
npm run dev
```

调度器会在服务启动时自动启动。

## 📝 API 使用

### 认证

所有API都需要认证，使用JWT Token：

```
Authorization: Bearer <your_token>
```

### 1. 创建监控页面

```bash
POST /api/crawler/pages
Content-Type: application/json

{
  "url": "https://example.com/car-news",
  "name": "汽车新闻网站",
  "selector": ".article-content",
  "imageSelector": "img",
  "textSelector": ".article-text",
  "interval": 3600,
  "enabled": true,
  "config": {
    "headers": {
      "User-Agent": "Mozilla/5.0..."
    }
  }
}
```

**参数说明：**
- `url` (必填) - 要监控的网页URL
- `name` (必填) - 页面名称/描述
- `selector` (可选) - 主要内容选择器（CSS选择器）
- `imageSelector` (可选) - 图片选择器，默认为 `img`
- `textSelector` (可选) - 文字内容选择器，默认为 `body`
- `interval` (可选) - 抓取间隔（秒），默认3600秒（1小时）
- `enabled` (可选) - 是否启用，默认true
- `config` (可选) - 额外配置（headers、cookies等）

### 2. 获取所有监控页面

```bash
GET /api/crawler/pages
```

### 3. 获取单个监控页面

```bash
GET /api/crawler/pages/:id
```

### 4. 更新监控页面

```bash
PUT /api/crawler/pages/:id
Content-Type: application/json

{
  "enabled": false,
  "interval": 7200
}
```

### 5. 删除监控页面

```bash
DELETE /api/crawler/pages/:id
```

### 6. 手动触发抓取

```bash
POST /api/crawler/pages/:id/trigger
```

### 7. 获取抓取历史

```bash
GET /api/crawler/history?pageId=1
```

## 🔍 工作原理

### 1. 网页抓取

系统使用 `axios` 和 `cheerio` 抓取网页内容：
- 支持自定义User-Agent和Headers
- 自动处理重定向
- 计算内容哈希值用于检测更新

### 2. 内容解析

从HTML中提取：
- **标题** - 从 `<title>`、`<h1>` 或指定选择器
- **描述** - 从 `<meta name="description">` 或指定选择器
- **文字内容** - 从指定选择器提取，自动清理格式
- **图片** - 从指定选择器提取，自动处理相对路径

### 3. 车型识别

使用关键词匹配和模式识别：
- **品牌识别** - 支持30+常见汽车品牌（中英文）
- **车型名称** - 识别数字+字母组合、中文车型名、英文车型名
- **车型类型** - 识别轿车、SUV、MPV、跑车等
- **年份识别** - 从文字中提取年份（2000-2099）
- **价格识别** - 识别价格信息（支持"万"单位）

### 4. 自动上传

当识别置信度 >= 0.5 时自动上传：
1. 确保品牌存在（不存在则创建）
2. 确保车型存在（不存在则创建）
3. 下载图片
4. 调用上传API上传图片
5. 记录上传结果

### 5. 定时调度

- 每分钟检查一次是否有需要执行的任务
- 根据 `interval` 设置自动执行抓取
- 支持动态添加/删除任务

## ⚙️ 配置说明

### 选择器配置示例

**简单配置：**
```json
{
  "url": "https://example.com",
  "name": "示例网站",
  "imageSelector": "img",
  "textSelector": "body"
}
```

**详细配置：**
```json
{
  "url": "https://example.com",
  "name": "示例网站",
  "selector": ".article-content",
  "imageSelector": ".article-content img",
  "textSelector": ".article-content p",
  "interval": 1800,
  "config": {
    "headers": {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Cookie": "session=xxx"
    }
  }
}
```

### 抓取间隔设置

- `3600` - 每小时抓取一次
- `7200` - 每2小时抓取一次
- `86400` - 每天抓取一次

## 📊 监控和日志

### 查看抓取历史

通过API获取抓取历史：
```bash
GET /api/crawler/history?pageId=1
```

返回信息包括：
- 抓取状态（success/failed/no_change）
- 发现的图片数量
- 成功上传的数量
- 错误信息（如果有）
- 识别到的车型信息

### 日志

系统日志保存在 `backend/logs/` 目录：
- `combined.log` - 所有日志
- `error.log` - 错误日志

## 🔧 故障排查

### 1. 抓取失败

**可能原因：**
- URL无法访问
- 需要登录或特殊认证
- 网站有反爬虫保护
- 网络超时

**解决方法：**
- 检查URL是否可访问
- 在 `config` 中添加必要的headers或cookies
- 增加 `timeout` 设置
- 检查网络连接

### 2. 内容识别失败

**可能原因：**
- 文字内容不包含车型信息
- 品牌不在识别列表中
- 车型名称格式不标准

**解决方法：**
- 检查网页内容是否包含车型信息
- 手动创建品牌（如果品牌不在数据库中）
- 调整选择器以获取更准确的内容

### 3. 图片上传失败

**可能原因：**
- 图片URL无法访问
- 图片格式不支持
- 文件过大
- 系统用户权限不足

**解决方法：**
- 检查图片URL是否可访问
- 确保系统有管理员或活跃用户
- 检查图片格式和大小

## 🎯 最佳实践

1. **合理设置抓取间隔**
   - 避免过于频繁的抓取，建议至少1小时
   - 根据网站更新频率调整

2. **精确配置选择器**
   - 使用浏览器开发者工具找到准确的选择器
   - 避免选择到无关内容（如导航栏、广告等）

3. **监控抓取结果**
   - 定期查看抓取历史
   - 关注失败记录，及时调整配置

4. **品牌管理**
   - 确保常用品牌已在数据库中
   - 系统会自动创建新品牌，但建议预先添加

5. **测试配置**
   - 先手动触发一次抓取，检查结果
   - 确认识别和上传正常后再启用定时任务

## 📈 性能优化

- 系统会自动检测内容是否有更新（通过哈希值）
- 如果内容未更新，不会重复上传
- 图片上传之间有1秒延迟，避免请求过快
- 每次最多上传10张图片

## 🔐 安全注意事项

1. **认证保护** - 所有API都需要管理员或编辑者权限
2. **URL验证** - 系统会验证URL格式
3. **内容过滤** - 自动过滤无效图片（logo、icon等）
4. **错误处理** - 完善的错误处理和日志记录

## 📚 相关文档

- [数据库架构文档](../development/database-architecture.md)
- [API文档](../api/api-documentation.md)

## 🆘 支持

如遇问题，请检查：
1. 日志文件中的错误信息
2. 抓取历史记录
3. 数据库连接状态
4. 网络连接状态


