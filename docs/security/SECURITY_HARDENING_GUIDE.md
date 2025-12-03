# 🛡️ 安全加固指南

## 📋 概述

本文档详细说明了针对图片中展示的安全扫描攻击的防护方案。这些攻击包括对敏感文件、PHP漏洞、Laravel特定漏洞等的探测。

## 🚨 威胁分析

### 检测到的攻击类型

根据您提供的访问统计，系统遭受了以下类型的扫描攻击：

| 攻击路径 | 访问次数 | 占比 | 威胁等级 | 说明 |
|---------|---------|------|----------|------|
| `/phpinfo` | 3 | 14.29% | 🔴 高危 | 试图查看PHP配置信息 |
| `/.env` | 1 | 4.76% | 🔴 高危 | 试图获取环境变量和密钥 |
| `/test.php` | 1 | 4.76% | 🟡 中危 | 寻找测试文件 |
| `/console` | 1 | 4.76% | 🟡 中危 | 寻找管理控制台 |
| `/wiki` | 1 | 4.76% | 🟢 低危 | 寻找wiki系统 |
| `/_ignition/execute-solution` | 1 | 4.76% | 🔴 高危 | Laravel Ignition已知漏洞 |
| `/index.php` | 1 | 4.76% | 🟡 中危 | PHP入口文件探测 |

### 攻击特征

这是**典型的自动化安全扫描**，攻击者使用自动化工具：

1. **探测技术栈**：通过访问常见的框架和语言特定文件
2. **寻找配置文件**：试图获取敏感信息（如数据库密码、API密钥）
3. **利用已知漏洞**：针对特定框架的已知安全漏洞
4. **后台入口探测**：寻找未受保护的管理界面

## 🔧 已实施的防护措施

### 1. Nginx层防护（第一道防线）

增强的Nginx配置提供服务器级别的防护：

#### 敏感文件保护
```nginx
# 阻止所有隐藏文件访问
location ~ /\. {
    deny all;
    access_log off;
    log_not_found off;
}

# 阻止环境配置文件
location ~* ^/(\.env|\.git|\.svn|\.htaccess|\.htpasswd) {
    deny all;
}
```

#### PHP相关探测防护
```nginx
# 阻止PHP探测
location ~* ^/(phpinfo|info\.php|test\.php|php\.ini) {
    deny all;
}
```

#### Laravel漏洞防护
```nginx
# 阻止Laravel特定漏洞路径
location ~* ^/(_ignition|telescope|horizon|nova|debugbar) {
    deny all;
}
```

#### 通用恶意路径防护
```nginx
# 阻止常见恶意路径
location ~* ^/(wp-admin|wp-login|admin|phpmyadmin|console|wiki|config|setup|install) {
    deny all;
}
```

**效果**：这些请求会在到达应用之前被Nginx直接阻止，返回403状态码，不消耗后端资源。

### 2. 后端中间件防护（第二道防线）

增强的反爬虫中间件在应用层提供额外保护：

```javascript
const suspiciousPatterns = [
  // WordPress相关
  /wp-admin/i, /wp-login/i, /wp-signup/i,
  // 管理后台
  /admin/i, /administrator/i, /console/i,
  // 敏感配置文件
  /\.env/i, /\.git/i, /config/i,
  // PHP探测
  /phpinfo/i, /info\.php/i, /test\.php/i,
  // Laravel特定漏洞
  /_ignition/i, /telescope/i, /horizon/i,
  // 其他攻击路径
  /setup/i, /install/i, /wiki/i, /shell/i
];
```

**功能**：
- 自动识别恶意请求模式
- 将攻击者IP加入黑名单
- 记录详细的攻击日志
- 阻止后续访问

### 3. fail2ban自动封禁（第三道防线）

fail2ban监控日志并自动封禁恶意IP：

#### 恶意访问检测
```ini
[cardesignspace-malicious]
enabled = true
filter = cardesignspace-malicious
maxretry = 2      # 2次恶意请求就封禁
bantime = 7200    # 封禁2小时
```

#### 敏感文件访问检测
```ini
[cardesignspace-sensitive]
enabled = true
filter = cardesignspace-sensitive
maxretry = 1      # 1次就封禁
bantime = 86400   # 封禁24小时
```

**效果**：攻击者的IP会被自动添加到iptables规则中，在网络层面直接阻止访问。

### 4. 实时安全监控

自定义的安全监控脚本提供：

- 实时日志分析
- 威胁检测和分类
- 自动告警
- 详细的安全报告

## 🚀 部署步骤

### 快速部署（推荐）

```bash
# 1. 进入项目目录
cd /root/cardesignspace-2025

# 2. 运行自动部署脚本
sudo ./apply-security-hardening.sh
```

脚本会自动完成：
- ✅ 备份现有配置
- ✅ 部署增强的Nginx配置
- ✅ 安装和配置fail2ban
- ✅ 重启相关服务
- ✅ 验证部署结果

### 手动部署

#### 步骤1: 更新Nginx配置

```bash
# 备份现有配置
sudo cp /etc/nginx/sites-available/cardesignspace /root/nginx-backup-$(date +%Y%m%d).conf

# 复制新配置
sudo cp nginx.production.conf /etc/nginx/sites-available/cardesignspace

# 测试配置
sudo nginx -t

# 重新加载Nginx
sudo systemctl reload nginx
```

#### 步骤2: 安装fail2ban

```bash
# 安装fail2ban
sudo apt-get update
sudo apt-get install fail2ban

# 复制配置文件
sudo cp docs/security/fail2ban-setup.conf /etc/fail2ban/jail.d/cardesignspace.conf

# 创建过滤器（参考docs/security/fail2ban-filters.conf）
# 每个过滤器创建对应的文件

# 重启fail2ban
sudo systemctl restart fail2ban
sudo systemctl enable fail2ban
```

#### 步骤3: 重启后端服务

```bash
cd /root/cardesignspace-2025/backend
pm2 restart cardesignspace-backend
```

## 📊 监控和维护

### 日常监控命令

#### 查看fail2ban状态
```bash
# 查看所有jail状态
sudo fail2ban-client status

# 查看特定jail的详细信息
sudo fail2ban-client status cardesignspace-malicious

# 查看被封禁的IP列表
sudo fail2ban-client status cardesignspace-malicious | grep "Banned IP"
```

#### 查看Nginx日志
```bash
# 实时查看访问日志
sudo tail -f /var/log/nginx/cardesignspace_access.log

# 查看错误日志
sudo tail -f /var/log/nginx/cardesignspace_error.log

# 搜索特定的攻击模式
sudo grep "phpinfo\|\.env\|_ignition" /var/log/nginx/cardesignspace_access.log
```

#### 运行安全监控脚本
```bash
# 分析历史日志
node scripts/security-monitor.js

# 实时监控模式
node scripts/security-monitor.js --realtime

# 查看生成的报告
cat logs/security-report.log
```

### IP封禁管理

#### 查看当前封禁的IP
```bash
sudo fail2ban-client status cardesignspace-malicious
```

#### 手动封禁IP
```bash
sudo fail2ban-client set cardesignspace-malicious banip <IP地址>
```

#### 解封IP（误封时）
```bash
sudo fail2ban-client set cardesignspace-malicious unbanip <IP地址>
```

#### 清空所有封禁
```bash
sudo fail2ban-client unban --all
```

## 📈 效果验证

### 测试防护规则

```bash
# 测试敏感文件访问（应返回403）
curl -I http://your-domain.com/.env
curl -I http://your-domain.com/phpinfo
curl -I http://your-domain.com/_ignition/execute-solution

# 测试正常访问（应返回200）
curl -I http://your-domain.com/
curl -I http://your-domain.com/api/images
```

### 查看防护效果

部署后，您应该能看到：

1. **Nginx日志中403状态码增多**
   - 恶意请求被直接阻止
   - 日志中显示403 Forbidden

2. **fail2ban开始封禁IP**
   ```bash
   sudo fail2ban-client status cardesignspace-malicious
   # 输出会显示被封禁的IP数量
   ```

3. **后端日志中恶意请求减少**
   - 大部分攻击在Nginx层就被阻止
   - 后端处理的恶意请求大幅减少

## 🔍 安全报告示例

运行监控脚本后，会生成如下报告：

```
📊 安全监控报告
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
生成时间: 2025-11-03T10:30:00.000Z

📈 总体统计
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
总请求数: 1000
恶意请求数: 21
恶意请求占比: 2.10%
独立攻击IP数: 3

🎯 攻击类型分布
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
敏感文件访问: 5
PHP探测: 8
后台探测: 4
Laravel漏洞: 2
SQL注入: 0
恶意User-Agent: 2

👤 Top5 攻击者IP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. 192.168.1.100 - 12次攻击
2. 192.168.1.101 - 6次攻击
3. 192.168.1.102 - 3次攻击

🎯 Top10 被攻击路径
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. /phpinfo - 3次
2. /.env - 2次
3. /wp-admin - 2次
```

## ⚙️ 高级配置

### 调整封禁时间

编辑 `/etc/fail2ban/jail.d/cardesignspace.conf`：

```ini
[cardesignspace-malicious]
bantime = 7200    # 改为更长的时间，如86400（24小时）
maxretry = 2      # 改为更严格的值，如1
findtime = 300    # 检测时间窗口
```

### 添加白名单IP

编辑 `/etc/fail2ban/jail.d/cardesignspace.conf`，在[DEFAULT]部分添加：

```ini
[DEFAULT]
ignoreip = 127.0.0.1/8 ::1 192.168.1.0/24 <你的办公室IP>
```

### 自定义告警

编辑 `scripts/security-monitor.js`，可以添加：
- 邮件告警
- Slack/钉钉通知
- 短信告警
- Webhook集成

## 🚨 应急响应

### 场景1: 发现大规模攻击

```bash
# 1. 查看当前攻击情况
sudo fail2ban-client status cardesignspace-malicious

# 2. 查看最近的攻击日志
sudo tail -100 /var/log/nginx/cardesignspace_access.log | grep "403\|404"

# 3. 临时调整策略（更严格）
sudo fail2ban-client set cardesignspace-malicious bantime 86400
sudo fail2ban-client set cardesignspace-malicious maxretry 1
```

### 场景2: 误封正常用户

```bash
# 1. 确认被封禁的IP
sudo fail2ban-client status cardesignspace-malicious

# 2. 解封特定IP
sudo fail2ban-client set cardesignspace-malicious unbanip <IP地址>

# 3. 将IP加入白名单（如果是固定IP）
# 编辑 /etc/fail2ban/jail.d/cardesignspace.conf
# 添加 ignoreip = <IP地址>
```

### 场景3: 性能问题

如果fail2ban或安全规则影响性能：

```bash
# 1. 临时禁用某个jail
sudo fail2ban-client stop cardesignspace-api-limit

# 2. 调整检测频率
# 编辑配置文件，增加findtime和maxretry的值

# 3. 优化Nginx规则
# 减少正则表达式的复杂度
```

## 📚 相关文档

- [防爬虫系统使用指南](../operations/anti-crawler-guide.md)
- [fail2ban配置文件](./fail2ban-setup.conf)
- [fail2ban过滤器配置](./fail2ban-filters.conf)

## 🔗 参考资源

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Nginx安全配置最佳实践](https://www.nginx.com/blog/mitigating-ddos-attacks-with-nginx-and-nginx-plus/)
- [fail2ban官方文档](https://www.fail2ban.org/wiki/index.php/Main_Page)

## ⚠️ 重要提示

1. **定期更新规则**
   - 攻击模式在不断演变
   - 建议每月检查和更新防护规则

2. **监控系统资源**
   - fail2ban会消耗一定的CPU和内存
   - 在高流量时期需要关注性能

3. **保留日志**
   - 日志对于分析攻击模式很重要
   - 建议至少保留30天的日志

4. **定期审查**
   - 每周查看安全报告
   - 分析新的攻击模式
   - 及时调整防护策略

## 📞 技术支持

如遇问题，请：
1. 查看日志文件诊断问题
2. 运行 `nginx -t` 和 `fail2ban-client -t` 检查配置
3. 检查系统日志 `journalctl -xe`
4. 联系技术团队

---

**最后更新**: 2025-11-03  
**版本**: 1.0  
**状态**: ✅ 已部署并测试










