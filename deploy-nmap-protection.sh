#!/bin/bash

###############################################################################
# Nmap扫描防护部署脚本
# 用于部署针对Nmap扫描、配置文件探测等新攻击模式的防护
#
# 使用方法：
# ./deploy-nmap-protection.sh
###############################################################################

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

###############################################################################
# 配置
###############################################################################
SERVER_USER="root"
SERVER_HOST="49.235.98.5"
SERVER_PATH="/root/cardesignspace-2025"

print_header "Nmap扫描防护部署脚本"

print_warning "目标服务器: ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}"
echo ""

print_info "此脚本将部署以下防护规则："
echo "  • Nmap扫描工具探测防护"
echo "  • webconfig.ini配置文件防护"
echo "  • SDK端点探测防护"
echo ""

read -p "确认部署到此服务器? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "已取消部署"
    exit 0
fi

###############################################################################
# 第一步：上传更新的配置文件
###############################################################################
print_header "第一步：上传更新的Nginx配置"

print_info "上传nginx.production.conf..."
if scp nginx.production.conf ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/; then
    print_success "配置文件上传成功"
else
    print_error "配置文件上传失败"
    exit 1
fi

###############################################################################
# 第二步：在服务器上部署配置
###############################################################################
print_header "第二步：在服务器上部署配置"

print_warning "即将在服务器上执行以下操作："
echo "  • 备份现有Nginx配置"
echo "  • 部署新的安全规则"
echo "  • 测试配置语法"
echo "  • 重新加载Nginx（不中断服务）"
echo ""

read -p "是否继续? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "已上传文件，但未执行部署"
    print_info "您可以稍后手动执行："
    echo "  ssh ${SERVER_USER}@${SERVER_HOST}"
    echo "  cd ${SERVER_PATH}"
    echo "  sudo cp nginx.production.conf /etc/nginx/sites-available/cardesignspace"
    echo "  sudo nginx -t"
    echo "  sudo systemctl reload nginx"
    exit 0
fi

# 在服务器上执行部署
print_info "正在服务器上执行部署..."
ssh -t ${SERVER_USER}@${SERVER_HOST} << 'DEPLOY_SCRIPT'
set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

cd /root/cardesignspace-2025

echo -e "${BLUE}📦 备份现有配置...${NC}"
BACKUP_DIR="/root/config-backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
if [ -f /etc/nginx/sites-available/cardesignspace ]; then
    cp /etc/nginx/sites-available/cardesignspace "$BACKUP_DIR/nginx-cardesignspace.conf"
    echo -e "${GREEN}✅ 配置已备份到: $BACKUP_DIR${NC}"
fi

echo -e "${BLUE}📝 部署新配置...${NC}"
cp nginx.production.conf /etc/nginx/sites-available/cardesignspace
echo -e "${GREEN}✅ 配置文件已复制${NC}"

echo -e "${BLUE}🧪 测试Nginx配置语法...${NC}"
if nginx -t; then
    echo -e "${GREEN}✅ Nginx配置测试通过${NC}"
else
    echo -e "${RED}❌ Nginx配置测试失败，正在恢复备份...${NC}"
    cp "$BACKUP_DIR/nginx-cardesignspace.conf" /etc/nginx/sites-available/cardesignspace
    exit 1
fi

echo -e "${BLUE}🔄 重新加载Nginx（不中断服务）...${NC}"
systemctl reload nginx
echo -e "${GREEN}✅ Nginx已重新加载${NC}"

echo -e "${GREEN}🎉 部署完成！${NC}"
DEPLOY_SCRIPT

if [ $? -eq 0 ]; then
    print_success "服务器端部署成功"
else
    print_error "服务器端部署失败"
    exit 1
fi

###############################################################################
# 第三步：验证部署
###############################################################################
print_header "第三步：验证部署结果"

print_info "检查Nginx状态..."
if ssh ${SERVER_USER}@${SERVER_HOST} "systemctl is-active nginx" > /dev/null 2>&1; then
    print_success "Nginx运行正常"
else
    print_error "Nginx未运行"
fi

print_info "测试防护规则..."
echo ""
print_info "测试Nmap扫描路径（应返回403）:"
curl -s -o /dev/null -w "  /NmapUpperCheck1762984292 -> HTTP %{http_code}\n" https://www.cardesignspace.com/NmapUpperCheck1762984292 || true
curl -s -o /dev/null -w "  /nmaplowercheck1762984292 -> HTTP %{http_code}\n" https://www.cardesignspace.com/nmaplowercheck1762984292 || true
curl -s -o /dev/null -w "  /Nmap/folder/check1762984292 -> HTTP %{http_code}\n" https://www.cardesignspace.com/Nmap/folder/check1762984292 || true
echo ""

print_info "测试配置文件访问（应返回403）:"
curl -s -o /dev/null -w "  /webconfig.ini -> HTTP %{http_code}\n" https://www.cardesignspace.com/webconfig.ini || true
curl -s -o /dev/null -w "  /config.ini -> HTTP %{http_code}\n" https://www.cardesignspace.com/config.ini || true
echo ""

print_info "测试SDK端点（应返回403）:"
curl -s -o /dev/null -w "  /sdk -> HTTP %{http_code}\n" https://www.cardesignspace.com/sdk || true
echo ""

print_info "测试正常访问（应返回200）:"
curl -s -o /dev/null -w "  / -> HTTP %{http_code}\n" https://www.cardesignspace.com/ || true
echo ""

###############################################################################
# 完成
###############################################################################
print_header "部署完成"

cat << 'EOF'
✅ Nmap扫描防护已成功部署！

📊 已部署的防护规则：

1️⃣  Nmap扫描防护
   • /NmapUpperCheck*
   • /nmaplowercheck*
   • /Nmap/folder/*

2️⃣  配置文件防护
   • /webconfig.ini
   • /config.ini
   • 所有 .ini 文件

3️⃣  SDK端点防护
   • /sdk

📋 后续操作：

1️⃣  查看Nginx日志（查看被阻止的攻击）:
   ssh root@49.235.98.5
   sudo tail -f /var/log/nginx/cardesignspace_access.log | grep "403"

2️⃣  查看最近的Nmap扫描尝试:
   sudo grep -i "nmap" /var/log/nginx/cardesignspace_access.log | tail -20

3️⃣  查看配置文件访问尝试:
   sudo grep -i "webconfig\|config\.ini" /var/log/nginx/cardesignspace_access.log | tail -20

4️⃣  如果配置了fail2ban，查看封禁状态:
   sudo fail2ban-client status cardesignspace-malicious

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 预期效果：
   • 所有Nmap扫描请求将被直接阻止（403）
   • 配置文件访问请求将被阻止
   • SDK端点探测将被阻止
   • 攻击请求不会到达后端，减少服务器负载

⚠️  注意事项：
   • 如果您的应用确实需要 /sdk 路径，请修改nginx.production.conf
   • 建议定期查看日志，了解攻击趋势
   • 如果发现新的攻击模式，请及时更新防护规则

EOF

print_success "🎉 部署成功完成！"
echo ""






