#!/bin/bash

# SSL证书修复脚本
# 用于解决 NET::ERR_CERT_DATE_INVALID 错误

set -e

echo "=========================================="
echo "SSL证书诊断和修复工具"
echo "=========================================="
echo ""

# 证书路径
CERT_DIR="/etc/ssl/certs/cardesignspace"
KEY_DIR="/etc/ssl/private/cardesignspace"
FULLCHAIN="${CERT_DIR}/fullchain.pem"
PRIVKEY="${KEY_DIR}/privkey.key"
DOMAIN="www.cardesignspace.com"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}错误: 请使用sudo运行此脚本${NC}"
    exit 1
fi

echo "1. 检查服务器时间..."
echo "----------------------------------------"
date
echo ""

# 检查证书文件是否存在
echo "2. 检查证书文件..."
echo "----------------------------------------"
if [ ! -f "$FULLCHAIN" ]; then
    echo -e "${RED}错误: 证书文件不存在: $FULLCHAIN${NC}"
    exit 1
fi

if [ ! -f "$PRIVKEY" ]; then
    echo -e "${RED}错误: 私钥文件不存在: $PRIVKEY${NC}"
    exit 1
fi

echo -e "${GREEN}✓ 证书文件存在${NC}"
echo ""

# 检查证书有效期
echo "3. 检查证书有效期..."
echo "----------------------------------------"
CERT_INFO=$(openssl x509 -in "$FULLCHAIN" -noout -dates 2>/dev/null || echo "")

if [ -z "$CERT_INFO" ]; then
    echo -e "${RED}错误: 无法读取证书信息${NC}"
    exit 1
fi

echo "$CERT_INFO"
echo ""

# 提取证书有效期
NOT_BEFORE=$(openssl x509 -in "$FULLCHAIN" -noout -startdate 2>/dev/null | cut -d= -f2)
NOT_AFTER=$(openssl x509 -in "$FULLCHAIN" -noout -enddate 2>/dev/null | cut -d= -f2)

echo "证书生效时间: $NOT_BEFORE"
echo "证书过期时间: $NOT_AFTER"
echo ""

# 检查证书是否过期
CURRENT_TIME=$(date +%s)
EXPIRE_TIME=$(date -d "$NOT_AFTER" +%s 2>/dev/null || echo "0")

if [ "$EXPIRE_TIME" -lt "$CURRENT_TIME" ]; then
    echo -e "${RED}⚠ 证书已过期！${NC}"
    CERT_EXPIRED=true
elif [ "$EXPIRE_TIME" -lt $((CURRENT_TIME + 86400 * 30)) ]; then
    echo -e "${YELLOW}⚠ 证书将在30天内过期${NC}"
    CERT_EXPIRED=false
else
    echo -e "${GREEN}✓ 证书有效期正常${NC}"
    CERT_EXPIRED=false
fi
echo ""

# 检查证书域名
echo "4. 检查证书域名..."
echo "----------------------------------------"
CERT_DOMAINS=$(openssl x509 -in "$FULLCHAIN" -noout -text 2>/dev/null | grep -oP 'DNS:\K[^,]+' || echo "")
echo "证书包含的域名:"
echo "$CERT_DOMAINS" | sed 's/^/  - /'
echo ""

if echo "$CERT_DOMAINS" | grep -q "$DOMAIN"; then
    echo -e "${GREEN}✓ 证书包含目标域名${NC}"
else
    echo -e "${RED}⚠ 证书可能不包含目标域名${NC}"
fi
echo ""

# 检查nginx配置
echo "5. 检查Nginx配置..."
echo "----------------------------------------"
NGINX_CONF="/etc/nginx/sites-available/cardesignspace"
if [ -f "$NGINX_CONF" ]; then
    echo "Nginx配置文件: $NGINX_CONF"
    grep -E "ssl_certificate|ssl_certificate_key" "$NGINX_CONF" || echo "未找到SSL配置"
else
    echo -e "${YELLOW}⚠ 未找到Nginx配置文件${NC}"
fi
echo ""

# 提供修复建议
echo "=========================================="
echo "修复建议"
echo "=========================================="
echo ""

if [ "$CERT_EXPIRED" = true ]; then
    echo -e "${RED}证书已过期，需要更新证书${NC}"
    echo ""
    echo "方案1: 使用Let's Encrypt自动续期"
    echo "----------------------------------------"
    echo "# 安装certbot（如果未安装）"
    echo "sudo apt-get update"
    echo "sudo apt-get install certbot python3-certbot-nginx"
    echo ""
    echo "# 获取新证书"
    echo "sudo certbot --nginx -d www.cardesignspace.com -d cardesignspace.com"
    echo ""
    echo "方案2: 手动更新证书"
    echo "----------------------------------------"
    echo "# 1. 获取新证书文件"
    echo "# 2. 将证书复制到服务器:"
    echo "sudo mkdir -p $CERT_DIR"
    echo "sudo mkdir -p $KEY_DIR"
    echo "sudo cp fullchain.pem $FULLCHAIN"
    echo "sudo cp privkey.pem $PRIVKEY"
    echo "sudo chmod 644 $FULLCHAIN"
    echo "sudo chmod 600 $PRIVKEY"
    echo "sudo chown root:root $FULLCHAIN $PRIVKEY"
    echo ""
    echo "# 3. 测试Nginx配置"
    echo "sudo nginx -t"
    echo ""
    echo "# 4. 重载Nginx"
    echo "sudo systemctl reload nginx"
    echo ""
else
    echo "证书未过期，可能的问题："
    echo ""
    echo "1. 服务器时间不正确"
    echo "----------------------------------------"
    echo "# 检查并同步时间"
    echo "sudo timedatectl status"
    echo "sudo timedatectl set-ntp true"
    echo ""
    echo "2. 证书文件权限问题"
    echo "----------------------------------------"
    echo "sudo chmod 644 $FULLCHAIN"
    echo "sudo chmod 600 $PRIVKEY"
    echo "sudo chown root:root $FULLCHAIN $PRIVKEY"
    echo ""
    echo "3. Nginx配置问题"
    echo "----------------------------------------"
    echo "# 测试配置"
    echo "sudo nginx -t"
    echo ""
    echo "# 重载配置"
    echo "sudo systemctl reload nginx"
    echo ""
    echo "4. 清除浏览器缓存"
    echo "----------------------------------------"
    echo "Chrome: 设置 > 隐私和安全 > 清除浏览数据 > 高级 > 时间范围：全部时间 > 清除数据"
    echo ""
fi

echo ""
echo "=========================================="
echo "快速修复命令（如果证书已过期）"
echo "=========================================="
echo ""
echo "# 使用Let's Encrypt自动续期（推荐）"
echo "sudo certbot renew --nginx"
echo ""
echo "# 或者重新获取证书"
echo "sudo certbot --nginx -d www.cardesignspace.com -d cardesignspace.com --force-renewal"
echo ""
echo "=========================================="

