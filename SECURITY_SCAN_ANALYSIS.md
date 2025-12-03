# 🚨 安全扫描攻击分析报告

## 📋 攻击概述

根据您提供的访问日志，服务器遭受了**自动化安全扫描攻击**，攻击者使用了多种探测技术来寻找系统漏洞。

**生成时间**: 2025-01-XX  
**威胁等级**: 🔴 **高危**

---

## 🎯 检测到的攻击类型

### 1. Nmap端口扫描探测（高危）🔴

| 攻击路径 | 访问次数 | 占比 | 说明 |
|---------|---------|------|------|
| `/NmapUpperCheck1762984292` | 1 | 8.33% | Nmap扫描工具的特征路径 |
| `/nmaplowercheck1762984292` | 2 | 16.67% | Nmap扫描工具的特征路径 |
| `/Nmap/folder/check1762984292` | 1 | 8.33% | Nmap扫描工具的特征路径 |

**威胁分析**:
- Nmap是著名的网络扫描和安全审计工具
- 这些路径是Nmap在扫描时留下的特征标识
- 攻击者正在探测服务器的开放端口和服务信息
- 可能用于后续的针对性攻击

### 2. 配置文件探测（高危）🔴

| 攻击路径 | 访问次数 | 占比 | 说明 |
|---------|---------|------|------|
| `/webconfig.ini` | 1 | 8.33% | 尝试获取Web服务器配置文件 |

**威胁分析**:
- 配置文件通常包含敏感信息（数据库密码、API密钥等）
- 如果配置文件暴露，可能导致系统完全被攻破
- 这是典型的敏感信息收集攻击

### 3. SDK端点探测（中危）🟡

| 攻击路径 | 访问次数 | 占比 | 说明 |
|---------|---------|------|------|
| `/sdk` | 1 | 8.33% | 寻找API端点或开发工具包 |

**威胁分析**:
- 攻击者可能在寻找未受保护的API端点
- SDK端点可能包含开发文档或测试接口
- 可能用于发现API漏洞

### 4. 可疑域名访问（中危）🟡

| 访问来源 | 访问次数 | 占比 | 说明 |
|---------|---------|------|------|
| `https://axmnxsrqvz.ac.pe` | 1 | 8.33% | 可疑的恶意域名 |

**威胁分析**:
- 可能是恶意请求的Referer
- 或者是攻击者使用的代理域名
- 需要进一步调查

### 5. 正常访问（低危）🟢

| 访问路径 | 访问次数 | 占比 | 说明 |
|---------|---------|------|------|
| `https://49.235.98.5` | 3 | 25% | 直接访问IP地址 |
| `http://49.235.98.5:8080` | 2 | 16.67% | 访问8080端口（可能是前端开发端口） |

---

## 📊 攻击统计

- **总访问次数**: 12次
- **恶意访问次数**: 7次（58.33%）
- **正常访问次数**: 5次（41.67%）
- **攻击类型**: 自动化安全扫描
- **攻击特征**: 系统性探测、寻找漏洞、收集信息

---

## 🛡️ 已实施的防护措施

### 1. Nginx层防护（已增强）

已在 `nginx.production.conf` 中添加以下防护规则：

#### ✅ Nmap扫描防护
```nginx
# 阻止Nmap扫描工具探测（高危）
location ~* ^/(Nmap|nmap|nmaplowercheck|NmapUpperCheck|Nmap/folder) {
    deny all;
    access_log off;
    log_not_found off;
    return 403;
}
```

#### ✅ 配置文件防护（已增强）
```nginx
# 阻止环境配置文件（已添加webconfig.ini）
location ~* ^/(\.env|\.git|\.svn|\.htaccess|\.htpasswd|\.DS_Store|composer\.json|composer\.lock|package\.json|package-lock\.json|yarn\.lock|web\.config|webconfig\.ini|config\.ini|\.ini) {
    deny all;
    access_log off;
    log_not_found off;
    return 403;
}
```

#### ✅ SDK端点防护
```nginx
# 阻止SDK端点探测
location ~* ^/sdk$ {
    deny all;
    access_log off;
    log_not_found off;
    return 403;
}
```

**防护效果**:
- ✅ 所有Nmap扫描请求将被直接阻止
- ✅ 配置文件访问请求将被阻止
- ✅ SDK端点探测将被阻止
- ✅ 返回403 Forbidden，不消耗后端资源
- ✅ 不记录到访问日志，减少日志噪音

---

## 🚀 部署步骤

### 快速部署（推荐）

```bash
# 1. 进入项目目录
cd /root/cardesignspace-2025

# 2. 备份现有配置
sudo cp /etc/nginx/sites-available/cardesignspace /root/nginx-backup-$(date +%Y%m%d-%H%M%S).conf

# 3. 复制新配置
sudo cp nginx.production.conf /etc/nginx/sites-available/cardesignspace

# 4. 测试配置语法
sudo nginx -t

# 5. 重新加载Nginx（不中断服务）
sudo systemctl reload nginx

# 6. 验证防护效果
curl -I https://your-domain.com/NmapUpperCheck1762984292
# 应该返回 403 Forbidden
```

---

## 📈 监控建议

### 1. 实时监控日志

```bash
# 实时查看访问日志
sudo tail -f /var/log/nginx/cardesignspace_access.log

# 搜索Nmap相关请求
sudo grep -i "nmap" /var/log/nginx/cardesignspace_access.log

# 搜索配置文件访问
sudo grep -i "webconfig\|config\.ini" /var/log/nginx/cardesignspace_access.log
```

### 2. 使用fail2ban自动封禁

如果已配置fail2ban，这些攻击请求会被自动识别并封禁IP。

```bash
# 查看fail2ban状态
sudo fail2ban-client status

# 查看被封禁的IP
sudo fail2ban-client status cardesignspace-malicious
```

### 3. 定期安全审计

建议每周运行一次安全监控脚本：

```bash
node scripts/security-monitor.js
```

---

## ⚠️ 重要建议

### 1. 端口安全

- **8080端口**: 如果这是开发端口，建议：
  - 仅在内网开放
  - 或使用防火墙限制访问
  - 生产环境应关闭此端口

### 2. 域名安全

- 检查 `axmnxsrqvz.ac.pe` 的来源
- 如果确认是恶意域名，可以加入黑名单

### 3. 持续监控

- 这些攻击是持续性的
- 建议设置告警机制
- 定期审查安全日志

### 4. 安全加固

- 确保所有安全规则已部署
- 定期更新防护规则
- 关注新的攻击模式

---

## 🔍 攻击者行为分析

### 攻击流程

1. **信息收集阶段**
   - 扫描开放端口（8080端口）
   - 探测服务器类型和版本

2. **漏洞探测阶段**
   - 使用Nmap进行深度扫描
   - 寻找配置文件
   - 探测API端点

3. **后续攻击准备**
   - 收集系统信息
   - 寻找可利用的漏洞
   - 准备针对性攻击

### 攻击特征

- ✅ **自动化**: 使用工具批量扫描
- ✅ **系统性**: 按照常见漏洞列表逐一探测
- ✅ **持续性**: 会定期重复扫描
- ✅ **隐蔽性**: 使用合法工具（Nmap）进行探测

---

## 📞 应急响应

如果发现大规模攻击：

1. **立即检查系统状态**
   ```bash
   sudo fail2ban-client status
   sudo netstat -tulpn | grep LISTEN
   ```

2. **查看攻击日志**
   ```bash
   sudo tail -100 /var/log/nginx/cardesignspace_access.log | grep "403\|404"
   ```

3. **临时加强防护**
   ```bash
   # 更严格的封禁策略
   sudo fail2ban-client set cardesignspace-malicious maxretry 1
   sudo fail2ban-client set cardesignspace-malicious bantime 86400
   ```

4. **联系安全团队**
   - 如果攻击规模较大
   - 如果发现系统被入侵迹象
   - 如果发现数据泄露

---

## 📚 相关文档

- [安全加固指南](./docs/security/SECURITY_HARDENING_GUIDE.md)
- [fail2ban配置](./docs/security/fail2ban-setup.conf)
- [安全监控脚本](./scripts/security-monitor.js)

---

**最后更新**: 2025-01-XX  
**状态**: ✅ 防护规则已更新，待部署








