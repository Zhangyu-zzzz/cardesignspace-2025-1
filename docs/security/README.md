# 🛡️ 安全防护系统

## 📋 快速导航

- **[完整加固指南](./SECURITY_HARDENING_GUIDE.md)** - 详细的安全配置和使用说明
- **[fail2ban配置](./fail2ban-setup.conf)** - 自动封禁规则
- **[fail2ban过滤器](./fail2ban-filters.conf)** - 攻击检测规则

## ⚡ 快速部署

### 在生产服务器上执行：

```bash
cd /root/cardesignspace-2025
sudo ./apply-security-hardening.sh
```

## 🛡️ 三层防护体系

```
第一层: Nginx层防护
├── 阻止敏感文件访问 (.env, .git, 配置文件)
├── 阻止PHP探测 (phpinfo, test.php)
├── 阻止Laravel漏洞 (_ignition, telescope)
└── 阻止恶意路径 (wp-admin, phpmyadmin, shell)

第二层: 后端中间件防护
├── 恶意User-Agent检测
├── IP黑名单机制
├── 异常请求模式识别
└── 详细攻击日志

第三层: fail2ban自动封禁
├── 实时监控日志
├── 自动识别攻击
├── 动态封禁IP（iptables）
└── 分级封禁策略
```

## 📊 日常监控

### 查看系统状态
```bash
# fail2ban状态
sudo fail2ban-client status

# 查看被封禁的IP
sudo fail2ban-client status cardesignspace-malicious

# 实时查看日志
sudo tail -f /var/log/nginx/cardesignspace_access.log
```

### 运行安全报告
```bash
# 分析历史日志
node scripts/security-monitor.js

# 实时监控
node scripts/security-monitor.js --realtime
```

## 🚨 常用操作

### IP管理
```bash
# 手动封禁IP
sudo fail2ban-client set cardesignspace-malicious banip <IP>

# 解封IP
sudo fail2ban-client set cardesignspace-malicious unbanip <IP>

# 查看封禁列表
sudo fail2ban-client status cardesignspace-malicious
```

### 配置调整
```bash
# 编辑fail2ban配置
sudo nano /etc/fail2ban/jail.d/cardesignspace.conf

# 重启fail2ban
sudo systemctl restart fail2ban

# 测试配置
sudo fail2ban-client -t
```

## 📈 监控指标

| 指标 | 命令 |
|-----|------|
| 总封禁IP数 | `sudo fail2ban-client status cardesignspace-malicious` |
| 最近403错误 | `sudo grep " 403 " /var/log/nginx/cardesignspace_access.log \| tail -20` |
| 恶意路径访问 | `sudo grep "phpinfo\|\.env\|_ignition" /var/log/nginx/*.log` |
| Nginx状态 | `sudo systemctl status nginx` |
| fail2ban状态 | `sudo systemctl status fail2ban` |

## 🎯 封禁策略

| 攻击类型 | 触发条件 | 封禁时长 |
|---------|---------|---------|
| 敏感文件访问 | 1次 | 24小时 |
| 恶意路径访问 | 2次/5分钟 | 2小时 |
| API频率超限 | 10次/1分钟 | 30分钟 |
| 暴力破解 | 5次/5分钟 | 1小时 |

## 📞 紧急情况

### 发现大规模攻击
```bash
# 1. 查看攻击情况
sudo fail2ban-client status cardesignspace-malicious

# 2. 调整为更严格的策略
sudo fail2ban-client set cardesignspace-malicious maxretry 1
sudo fail2ban-client set cardesignspace-malicious bantime 86400

# 3. 查看最近的攻击日志
sudo tail -100 /var/log/nginx/cardesignspace_access.log | grep "403"
```

### 误封正常用户
```bash
# 立即解封
sudo fail2ban-client set cardesignspace-malicious unbanip <IP>

# 加入白名单（永久）
sudo nano /etc/fail2ban/jail.d/cardesignspace.conf
# 添加: ignoreip = 127.0.0.1/8 ::1 <用户IP>
sudo systemctl restart fail2ban
```

## 📚 相关文档

- **[完整加固指南](./SECURITY_HARDENING_GUIDE.md)** - 详细配置和故障排除
- **[防爬虫使用指南](../operations/anti-crawler-guide.md)** - 反爬虫系统说明
- **[安全加固报告](../../SECURITY_HARDENING_REPORT.md)** - 威胁分析和防护效果

## ✅ 检查清单

部署后验证：

- [ ] Nginx配置已更新并重启
- [ ] fail2ban已安装并运行
- [ ] 所有jail都已启用
- [ ] 测试访问 /.env 返回403
- [ ] 测试访问 /phpinfo 返回403
- [ ] 正常页面访问正常
- [ ] 运行一次安全监控脚本

---

**更新时间**: 2025-11-03  
**维护者**: DevOps Team  
**状态**: ✅ 生产就绪










