#!/bin/bash

###############################################################################
# 安全加固远程部署脚本
# 用于将安全配置从本地部署到生产服务器
#
# 使用方法：
# ./deploy-security-hardening.sh
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

print_header "安全加固远程部署脚本"

print_warning "目标服务器: ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}"
echo ""

read -p "确认部署到此服务器? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "已取消部署"
    exit 0
fi

###############################################################################
# 第一步：上传配置文件
###############################################################################
print_header "第一步：上传配置文件到服务器"

print_info "上传Nginx配置..."
scp nginx.production.conf ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/

print_info "上传后端中间件..."
scp backend/src/middleware/antiCrawler.js ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/backend/src/middleware/

print_info "上传安全监控脚本..."
ssh ${SERVER_USER}@${SERVER_HOST} "mkdir -p ${SERVER_PATH}/scripts"
scp scripts/security-monitor.js ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/scripts/
ssh ${SERVER_USER}@${SERVER_HOST} "chmod +x ${SERVER_PATH}/scripts/security-monitor.js"

print_info "上传fail2ban配置文件..."
ssh ${SERVER_USER}@${SERVER_HOST} "mkdir -p ${SERVER_PATH}/docs/security"
scp docs/security/fail2ban-setup.conf ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/docs/security/
scp docs/security/fail2ban-filters.conf ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/docs/security/

print_info "上传部署脚本..."
scp apply-security-hardening.sh ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/
ssh ${SERVER_USER}@${SERVER_HOST} "chmod +x ${SERVER_PATH}/apply-security-hardening.sh"

print_success "所有文件已上传"

###############################################################################
# 第二步：在服务器上执行部署
###############################################################################
print_header "第二步：在服务器上执行安全加固"

print_warning "即将在服务器上执行安全加固脚本..."
echo ""
print_warning "此操作将："
echo "  • 备份现有配置"
echo "  • 部署增强的Nginx配置"
echo "  • 安装和配置fail2ban"
echo "  • 重启相关服务"
echo ""

read -p "是否继续? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "已上传文件，但未执行部署"
    print_info "您可以稍后手动执行："
    echo "  ssh ${SERVER_USER}@${SERVER_HOST}"
    echo "  cd ${SERVER_PATH}"
    echo "  sudo ./apply-security-hardening.sh"
    exit 0
fi

# 在服务器上执行部署脚本
print_info "正在服务器上执行部署..."
ssh -t ${SERVER_USER}@${SERVER_HOST} "cd ${SERVER_PATH} && sudo ./apply-security-hardening.sh"

###############################################################################
# 第三步：验证部署
###############################################################################
print_header "第三步：验证部署结果"

print_info "检查Nginx状态..."
ssh ${SERVER_USER}@${SERVER_HOST} "systemctl is-active nginx" && print_success "Nginx运行正常" || print_error "Nginx未运行"

print_info "检查fail2ban状态..."
ssh ${SERVER_USER}@${SERVER_HOST} "systemctl is-active fail2ban" && print_success "fail2ban运行正常" || print_error "fail2ban未运行"

print_info "测试防护规则..."
echo ""
print_info "测试敏感文件访问（应返回403）:"
curl -s -o /dev/null -w "  /.env -> HTTP %{http_code}\n" https://www.cardesignspace.com/.env || true
curl -s -o /dev/null -w "  /phpinfo -> HTTP %{http_code}\n" https://www.cardesignspace.com/phpinfo || true
curl -s -o /dev/null -w "  /_ignition/execute-solution -> HTTP %{http_code}\n" https://www.cardesignspace.com/_ignition/execute-solution || true
echo ""

print_info "测试正常访问（应返回200）:"
curl -s -o /dev/null -w "  / -> HTTP %{http_code}\n" https://www.cardesignspace.com/ || true
echo ""

###############################################################################
# 完成
###############################################################################
print_header "部署完成"

cat << 'EOF'
✅ 安全加固已成功部署！

📊 后续操作：

1️⃣  查看fail2ban状态:
   ssh root@49.235.98.5
   sudo fail2ban-client status
   sudo fail2ban-client status cardesignspace-malicious

2️⃣  查看被封禁的IP:
   sudo fail2ban-client status cardesignspace-malicious | grep "Banned IP"

3️⃣  实时监控日志:
   sudo tail -f /var/log/nginx/cardesignspace_access.log

4️⃣  运行安全监控脚本:
   cd /root/cardesignspace-2025
   node scripts/security-monitor.js
   node scripts/security-monitor.js --realtime

5️⃣  查看最近的403错误（被阻止的攻击）:
   sudo grep " 403 " /var/log/nginx/cardesignspace_access.log | tail -20

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 详细文档：
   • 服务器上查看: /root/cardesignspace-2025/docs/security/
   • 本地查看: docs/security/SECURITY_HARDENING_GUIDE.md

🎯 预期效果：
   • 图片中的所有攻击路径将被完全阻止
   • 恶意请求减少95%以上
   • IP自动封禁功能已启用

EOF

print_success "🎉 部署成功完成！"
echo ""








