# 🚀 Nmap扫描防护部署指南

## 📋 概述

本指南说明如何部署针对Nmap扫描、配置文件探测等新攻击模式的防护规则。

## 🎯 防护内容

本次部署将添加以下防护规则：

1. **Nmap扫描防护** - 阻止所有Nmap扫描工具的特征路径
2. **配置文件防护** - 增强对 `.ini` 配置文件的保护
3. **SDK端点防护** - 阻止 `/sdk` 路径的未授权访问

---

## 🚀 快速部署（推荐）

### 方法一：使用自动部署脚本

```bash
# 1. 确保在项目根目录
cd /Users/zobot/Desktop/unsplash-crawler/test/auto-gallery

# 2. 运行部署脚本
./deploy-nmap-protection.sh
```

脚本会自动完成：
- ✅ 上传配置文件到服务器
- ✅ 备份现有配置
- ✅ 部署新配置
- ✅ 测试配置语法
- ✅ 重新加载Nginx（不中断服务）
- ✅ 验证防护效果

---

## 📝 手动部署步骤

如果您想手动部署，请按照以下步骤操作：

### 步骤1：上传配置文件

```bash
# 从本地上传配置文件到服务器
scp nginx.production.conf root@49.235.98.5:/root/cardesignspace-2025/
```

### 步骤2：SSH连接到服务器

```bash
ssh root@49.235.98.5
cd /root/cardesignspace-2025
```

### 步骤3：备份现有配置

```bash
# 创建备份目录
BACKUP_DIR="/root/config-backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# 备份现有配置
cp /etc/nginx/sites-available/cardesignspace "$BACKUP_DIR/nginx-cardesignspace.conf"

echo "✅ 配置已备份到: $BACKUP_DIR"
```

### 步骤4：部署新配置

```bash
# 复制新配置
cp nginx.production.conf /etc/nginx/sites-available/cardesignspace

# 测试配置语法（非常重要！）
sudo nginx -t
```

**如果测试通过**，您会看到：
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

**如果测试失败**，请检查错误信息并修复配置。

### 步骤5：重新加载Nginx

```bash
# 重新加载Nginx（不中断服务）
sudo systemctl reload nginx

# 或者重启Nginx（会短暂中断服务）
# sudo systemctl restart nginx
```

### 步骤6：验证部署

```bash
# 检查Nginx状态
sudo systemctl status nginx

# 测试防护规则（应该返回403）
curl -I https://www.cardesignspace.com/NmapUpperCheck1762984292
curl -I https://www.cardesignspace.com/webconfig.ini
curl -I https://www.cardesignspace.com/sdk

# 测试正常访问（应该返回200）
curl -I https://www.cardesignspace.com/
```

---

## ✅ 验证清单

部署完成后，请验证以下内容：

- [ ] Nginx配置语法测试通过
- [ ] Nginx服务正常运行
- [ ] Nmap扫描路径返回403
- [ ] 配置文件访问返回403
- [ ] SDK端点返回403
- [ ] 正常网站访问正常（返回200）
- [ ] 网站功能正常（登录、上传等）

---

## 🔍 验证防护效果

### 1. 查看Nginx日志

```bash
# 实时查看访问日志
sudo tail -f /var/log/nginx/cardesignspace_access.log

# 查看被阻止的Nmap扫描
sudo grep -i "nmap" /var/log/nginx/cardesignspace_access.log | tail -20

# 查看配置文件访问尝试
sudo grep -i "webconfig\|config\.ini" /var/log/nginx/cardesignspace_access.log | tail -20

# 查看所有403错误（被阻止的攻击）
sudo grep " 403 " /var/log/nginx/cardesignspace_access.log | tail -20
```

### 2. 测试防护规则

```bash
# 测试Nmap扫描路径（应该返回403）
curl -I https://www.cardesignspace.com/NmapUpperCheck1762984292
curl -I https://www.cardesignspace.com/nmaplowercheck1762984292
curl -I https://www.cardesignspace.com/Nmap/folder/check1762984292

# 测试配置文件（应该返回403）
curl -I https://www.cardesignspace.com/webconfig.ini
curl -I https://www.cardesignspace.com/config.ini

# 测试SDK端点（应该返回403）
curl -I https://www.cardesignspace.com/sdk

# 测试正常访问（应该返回200）
curl -I https://www.cardesignspace.com/
```

### 3. 检查fail2ban状态（如果已配置）

```bash
# 查看fail2ban状态
sudo fail2ban-client status

# 查看被封禁的IP
sudo fail2ban-client status cardesignspace-malicious
```

---

## ⚠️ 故障排除

### 问题1：Nginx配置测试失败

**错误信息**：
```
nginx: [emerg] unexpected "}" in /etc/nginx/sites-available/cardesignspace:XX
```

**解决方法**：
1. 检查配置文件语法
2. 查看错误信息中指定的行号
3. 修复语法错误
4. 重新测试：`sudo nginx -t`

### 问题2：Nginx重新加载失败

**错误信息**：
```
Job for nginx.service failed because the control process exited with error code.
```

**解决方法**：
1. 恢复备份配置：
   ```bash
   cp /root/config-backups/YYYYMMDD_HHMMSS/nginx-cardesignspace.conf /etc/nginx/sites-available/cardesignspace
   sudo nginx -t
   sudo systemctl reload nginx
   ```
2. 检查Nginx错误日志：
   ```bash
   sudo tail -50 /var/log/nginx/error.log
   ```

### 问题3：网站无法访问

**可能原因**：
- Nginx配置错误
- SSL证书问题
- 防火墙规则

**解决方法**：
1. 检查Nginx状态：`sudo systemctl status nginx`
2. 检查Nginx错误日志：`sudo tail -50 /var/log/nginx/error.log`
3. 检查防火墙：`sudo ufw status`
4. 恢复备份配置

### 问题4：正常功能受影响

**如果您的应用确实需要 `/sdk` 路径**：

编辑 `nginx.production.conf`，删除或注释掉以下规则：

```nginx
# 阻止SDK端点探测（除非是合法的API端点）
# location ~* ^/sdk$ {
#     deny all;
#     access_log off;
#     log_not_found off;
#     return 403;
# }
```

然后重新部署。

---

## 📊 监控建议

### 1. 定期查看日志

建议每天查看一次日志，了解攻击趋势：

```bash
# 查看今天的攻击统计
sudo grep "$(date +%d/%b/%Y)" /var/log/nginx/cardesignspace_access.log | grep " 403 " | wc -l
```

### 2. 设置告警

可以设置日志监控，当检测到大量攻击时发送告警。

### 3. 定期更新规则

攻击模式在不断演变，建议：
- 每月审查一次防护规则
- 关注新的攻击模式
- 及时更新防护规则

---

## 📚 相关文档

- [安全扫描攻击分析报告](./SECURITY_SCAN_ANALYSIS.md)
- [安全加固指南](./docs/security/SECURITY_HARDENING_GUIDE.md)
- [fail2ban配置](./docs/security/fail2ban-setup.conf)

---

## 🔗 快速命令参考

```bash
# 部署
./deploy-nmap-protection.sh

# 查看日志
sudo tail -f /var/log/nginx/cardesignspace_access.log

# 测试防护
curl -I https://www.cardesignspace.com/NmapUpperCheck1762984292

# 检查Nginx状态
sudo systemctl status nginx

# 重新加载Nginx
sudo systemctl reload nginx
```

---

**最后更新**: 2025-01-XX  
**状态**: ✅ 已测试，可部署


