# SSL证书错误修复指南

## 问题描述

访问 `https://www.cardesignspace.com` 时出现错误：
- **错误代码**: `NET::ERR_CERT_DATE_INVALID`
- **错误信息**: "您的连接不是私密连接"
- **原因**: SSL证书日期无效（可能过期或未生效）

## 快速诊断

### 1. 运行诊断脚本

```bash
# 在服务器上运行
sudo ./fix-ssl-certificate.sh
```

脚本会自动检查：
- ✅ 服务器时间是否正确
- ✅ 证书文件是否存在
- ✅ 证书有效期
- ✅ 证书域名匹配
- ✅ Nginx配置

### 2. 手动检查证书

```bash
# 检查证书有效期
sudo openssl x509 -in /etc/ssl/certs/cardesignspace/fullchain.pem -noout -dates

# 检查证书域名
sudo openssl x509 -in /etc/ssl/certs/cardesignspace/fullchain.pem -noout -text | grep DNS
```

## 解决方案

### 方案1: 使用Let's Encrypt自动续期（推荐）

Let's Encrypt证书有效期90天，需要定期续期。

#### 1.1 安装Certbot

```bash
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx
```

#### 1.2 获取新证书

```bash
# 首次获取或强制续期
sudo certbot --nginx -d www.cardesignspace.com -d cardesignspace.com

# 如果证书已过期，使用强制续期
sudo certbot --nginx -d www.cardesignspace.com -d cardesignspace.com --force-renewal
```

#### 1.3 设置自动续期

```bash
# 测试自动续期
sudo certbot renew --dry-run

# 设置定时任务（通常certbot会自动设置）
sudo systemctl status certbot.timer
```

#### 1.4 验证证书

```bash
# 检查证书有效期
sudo certbot certificates

# 测试Nginx配置
sudo nginx -t

# 重载Nginx
sudo systemctl reload nginx
```

### 方案2: 手动更新证书

如果使用其他证书提供商（如付费证书）：

#### 2.1 获取新证书文件

从证书提供商下载：
- `fullchain.pem` (完整证书链)
- `privkey.pem` (私钥)

#### 2.2 上传到服务器

```bash
# 创建证书目录（如果不存在）
sudo mkdir -p /etc/ssl/certs/cardesignspace
sudo mkdir -p /etc/ssl/private/cardesignspace

# 复制证书文件
sudo cp fullchain.pem /etc/ssl/certs/cardesignspace/fullchain.pem
sudo cp privkey.pem /etc/ssl/private/cardesignspace/privkey.key

# 设置正确的权限
sudo chmod 644 /etc/ssl/certs/cardesignspace/fullchain.pem
sudo chmod 600 /etc/ssl/private/cardesignspace/privkey.key
sudo chown root:root /etc/ssl/certs/cardesignspace/fullchain.pem
sudo chown root:root /etc/ssl/private/cardesignspace/privkey.key
```

#### 2.3 测试和重载

```bash
# 测试Nginx配置
sudo nginx -t

# 如果测试通过，重载Nginx
sudo systemctl reload nginx
```

### 方案3: 修复服务器时间问题

如果证书未过期但显示错误，可能是服务器时间不正确：

```bash
# 检查当前时间
date

# 检查时区
timedatectl status

# 同步网络时间
sudo timedatectl set-ntp true

# 如果时间仍然不对，手动设置时区
sudo timedatectl set-timezone Asia/Shanghai
```

## 常见问题排查

### 问题1: 证书已过期

**症状**: 证书过期时间早于当前时间

**解决**:
```bash
# 使用Let's Encrypt续期
sudo certbot renew --nginx

# 或重新获取
sudo certbot --nginx -d www.cardesignspace.com -d cardesignspace.com --force-renewal
```

### 问题2: 证书未生效

**症状**: 证书生效时间晚于当前时间

**解决**: 
- 检查服务器时间是否正确
- 等待证书生效时间到达
- 如果时间不对，同步服务器时间

### 问题3: 证书域名不匹配

**症状**: 证书不包含 `www.cardesignspace.com`

**解决**:
```bash
# 重新获取包含正确域名的证书
sudo certbot --nginx -d www.cardesignspace.com -d cardesignspace.com
```

### 问题4: Nginx配置错误

**症状**: 证书文件存在但Nginx无法读取

**解决**:
```bash
# 检查Nginx配置
sudo nginx -t

# 检查证书路径是否正确
sudo grep -E "ssl_certificate" /etc/nginx/sites-available/cardesignspace

# 检查文件权限
ls -la /etc/ssl/certs/cardesignspace/
ls -la /etc/ssl/private/cardesignspace/
```

### 问题5: 浏览器缓存

**症状**: 服务器证书已更新但浏览器仍显示错误

**解决**:
1. **Chrome**: 
   - 设置 > 隐私和安全 > 清除浏览数据
   - 选择"高级"标签
   - 时间范围：全部时间
   - 勾选"缓存的图片和文件"
   - 点击"清除数据"

2. **Firefox**:
   - 设置 > 隐私与安全 > Cookie和网站数据
   - 点击"清除数据"

3. **Safari**:
   - 偏好设置 > 隐私
   - 点击"管理网站数据"
   - 搜索域名并删除

## 预防措施

### 1. 设置自动续期

```bash
# 检查certbot定时任务
sudo systemctl status certbot.timer

# 如果未启用，启用它
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

### 2. 设置证书过期提醒

创建监控脚本：

```bash
#!/bin/bash
# check-cert-expiry.sh

CERT_FILE="/etc/ssl/certs/cardesignspace/fullchain.pem"
DAYS_BEFORE_EXPIRY=30

if [ -f "$CERT_FILE" ]; then
    EXPIRY_DATE=$(openssl x509 -in "$CERT_FILE" -noout -enddate | cut -d= -f2)
    EXPIRY_EPOCH=$(date -d "$EXPIRY_DATE" +%s)
    CURRENT_EPOCH=$(date +%s)
    DAYS_UNTIL_EXPIRY=$(( (EXPIRY_EPOCH - CURRENT_EPOCH) / 86400 ))
    
    if [ "$DAYS_UNTIL_EXPIRY" -lt "$DAYS_BEFORE_EXPIRY" ]; then
        echo "警告: SSL证书将在 $DAYS_UNTIL_EXPIRY 天后过期！"
        # 可以添加邮件通知或webhook通知
    fi
fi
```

### 3. 定期检查

```bash
# 添加到crontab，每周检查一次
0 0 * * 0 /path/to/check-cert-expiry.sh
```

## 验证修复

修复后，验证步骤：

1. **检查证书有效期**
   ```bash
   sudo openssl x509 -in /etc/ssl/certs/cardesignspace/fullchain.pem -noout -dates
   ```

2. **测试HTTPS连接**
   ```bash
   curl -I https://www.cardesignspace.com
   ```

3. **在线检查工具**
   - https://www.ssllabs.com/ssltest/analyze.html?d=www.cardesignspace.com
   - https://crt.sh/?q=cardesignspace.com

4. **浏览器测试**
   - 清除浏览器缓存
   - 访问 https://www.cardesignspace.com
   - 应该看到绿色的锁图标

## 相关文件

- 证书文件: `/etc/ssl/certs/cardesignspace/fullchain.pem`
- 私钥文件: `/etc/ssl/private/cardesignspace/privkey.key`
- Nginx配置: `/etc/nginx/sites-available/cardesignspace`
- 诊断脚本: `./fix-ssl-certificate.sh`

## 联系支持

如果以上方法都无法解决问题，请检查：
1. 域名DNS解析是否正确
2. 服务器防火墙是否开放443端口
3. Nginx服务是否正常运行
4. 证书文件是否损坏

---

**最后更新**: 2025年12月25日

