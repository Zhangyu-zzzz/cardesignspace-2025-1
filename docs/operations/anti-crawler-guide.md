# 🛡️ 防爬虫系统使用指南

## 📋 概述

您的网站现在已经配置了完整的防爬虫系统，可以有效防止恶意爬虫、扫描器和自动化攻击。

## 🔧 已部署的防护措施

### 1. robots.txt 配置
- **位置**: `frontend/public/robots.txt`
- **功能**: 指导搜索引擎爬虫的访问规则
- **防护**: 禁止访问API、管理页面等敏感路径

### 2. Nginx 防护层
- **位置**: `nginx.conf`
- **功能**: 服务器级别的防护
- **特性**:
  - 请求频率限制 (API: 10r/s, 一般: 30r/s)
  - 连接数限制
  - 恶意User-Agent检测
  - 可疑路径阻止
  - 恶意文件类型阻止

### 3. 后端防护层
- **位置**: `backend/src/middleware/antiCrawler.js`
- **功能**: 应用级别的智能防护
- **特性**:
  - 多层频率限制
  - 恶意User-Agent检测
  - 可疑请求模式检测
  - IP黑名单机制
  - 详细请求日志

## 📊 监控工具

### 日志分析脚本
```bash
# 分析历史日志
node backend/scripts/monitor-crawlers.js

# 实时监控
node backend/scripts/monitor-crawlers.js --realtime
```

### 功能测试脚本
```bash
# 测试防爬虫功能
node test-anti-crawler.js
```

## 🚨 检测到的威胁类型

### 1. 恶意User-Agent
- **检测**: `python`, `curl`, `wget`, `bot`, `crawler`, `spider` 等
- **响应**: 立即阻止并加入IP黑名单
- **日志**: 记录详细信息

### 2. 可疑路径访问
- **检测**: `/wp-admin`, `/wp-signup.php`, `/admin`, `/phpmyadmin` 等
- **响应**: 阻止访问并记录
- **说明**: 这些是常见的恶意扫描目标

### 3. 异常请求模式
- **检测**: 高频请求、异常状态码、可疑参数
- **响应**: 根据严重程度采取不同措施

## 📈 监控指标

### 关键指标
- 总请求数
- 可疑请求数
- 恶意User-Agent数
- 被封禁IP数
- 可疑路径访问统计

### 警报类型
- `MALICIOUS_USER_AGENT`: 恶意爬虫
- `SUSPICIOUS_REQUEST`: 可疑请求
- `IP_BANNED`: IP被封禁
- `RATE_LIMIT_EXCEEDED`: 频率限制

## 🔍 如何分析可疑活动

### 1. 查看实时日志
```bash
# 后端日志
tail -f backend/logs/app.log

# Nginx访问日志
tail -f /var/log/nginx/cardesignspace_access.log
```

### 2. 运行监控报告
```bash
node backend/scripts/monitor-crawlers.js
```

### 3. 分析特定IP
```bash
# 查看特定IP的访问记录
grep "IP地址" /var/log/nginx/cardesignspace_access.log
```

## 🛠️ 配置调整

### 频率限制调整
编辑 `backend/src/middleware/antiCrawler.js`:

```javascript
// 调整API频率限制
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 时间窗口
  max: 50, // 最大请求数
  // ...
});
```

### 黑名单管理
```javascript
// 查看当前黑名单
console.log(Array.from(maliciousIPs));

// 清空黑名单（重启服务后）
maliciousIPs.clear();
```

### 自定义规则
在 `antiCrawler.js` 中添加新的检测规则：

```javascript
// 添加新的恶意User-Agent模式
maliciousUserAgents.push(/your-pattern/i);

// 添加新的可疑路径
suspiciousPatterns.push(/your-path/i);
```

## 🚀 部署到生产环境

### 1. 应用配置
```bash
./apply-anti-crawler.sh
```

### 2. 验证配置
```bash
# 测试防爬虫功能
node test-anti-crawler.js

# 检查服务状态
pm2 status
nginx -t
```

### 3. 监控部署
```bash
# 启动实时监控
node backend/scripts/monitor-crawlers.js --realtime
```

## 📞 应急响应

### 发现异常活动时：

1. **立即检查**
   ```bash
   # 查看最新警报
   tail -f backend/logs/crawler-alerts.log
   
   # 分析可疑IP
   node backend/scripts/monitor-crawlers.js
   ```

2. **临时措施**
   - 手动封禁恶意IP
   - 调整频率限制参数
   - 增加监控频率

3. **长期措施**
   - 分析攻击模式
   - 更新防护规则
   - 考虑使用CDN/WAF

## 🔒 安全建议

### 1. 定期维护
- 每周运行监控报告
- 每月更新防护规则
- 定期检查日志文件

### 2. 性能优化
- 监控防护系统对性能的影响
- 根据实际情况调整参数
- 考虑使用Redis缓存

### 3. 备份策略
- 定期备份配置文件
- 保存重要的监控数据
- 建立恢复流程

## 📞 技术支持

如果遇到问题或需要调整配置，请：

1. 查看日志文件
2. 运行诊断脚本
3. 检查配置文件
4. 联系技术支持

---

**注意**: 防爬虫系统会记录所有可疑活动，请定期检查日志文件以了解网站的安全状况。
