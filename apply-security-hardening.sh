#!/bin/bash

###############################################################################
# 安全加固部署脚本
# CarDesignSpace Security Hardening Script
#
# 功能：
# 1. 部署增强的Nginx配置
# 2. 配置fail2ban自动封禁
# 3. 重启相关服务
# 4. 验证配置
#
# 使用方法：
# ./apply-security-hardening.sh
###############################################################################

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
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
# 检查权限
###############################################################################
check_permissions() {
    print_header "检查权限"
    
    if [ "$EUID" -ne 0 ]; then 
        print_error "请使用sudo运行此脚本"
        exit 1
    fi
    
    print_success "权限检查通过"
}

###############################################################################
# 备份现有配置
###############################################################################
backup_configs() {
    print_header "备份现有配置"
    
    BACKUP_DIR="/root/config-backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # 备份Nginx配置
    if [ -f /etc/nginx/sites-available/cardesignspace ]; then
        cp /etc/nginx/sites-available/cardesignspace "$BACKUP_DIR/nginx-cardesignspace.conf"
        print_success "已备份Nginx配置"
    fi
    
    # 备份fail2ban配置（如果存在）
    if [ -f /etc/fail2ban/jail.d/cardesignspace.conf ]; then
        cp /etc/fail2ban/jail.d/cardesignspace.conf "$BACKUP_DIR/fail2ban-cardesignspace.conf"
        print_success "已备份fail2ban配置"
    fi
    
    print_success "配置备份完成: $BACKUP_DIR"
}

###############################################################################
# 部署Nginx配置
###############################################################################
deploy_nginx_config() {
    print_header "部署增强的Nginx配置"
    
    # 检查nginx.production.conf是否存在
    if [ ! -f nginx.production.conf ]; then
        print_error "找不到nginx.production.conf文件"
        exit 1
    fi
    
    # 复制配置文件
    cp nginx.production.conf /etc/nginx/sites-available/cardesignspace
    print_info "已复制配置文件"
    
    # 测试Nginx配置
    print_info "测试Nginx配置..."
    if nginx -t; then
        print_success "Nginx配置测试通过"
    else
        print_error "Nginx配置测试失败"
        print_warning "正在恢复备份..."
        cp "$BACKUP_DIR/nginx-cardesignspace.conf" /etc/nginx/sites-available/cardesignspace
        exit 1
    fi
    
    # 重启Nginx
    print_info "重启Nginx..."
    systemctl reload nginx
    print_success "Nginx已重启"
}

###############################################################################
# 安装和配置fail2ban
###############################################################################
setup_fail2ban() {
    print_header "配置fail2ban"
    
    # 检查fail2ban是否已安装
    if ! command -v fail2ban-client &> /dev/null; then
        print_warning "fail2ban未安装，正在安装..."
        apt-get update
        apt-get install -y fail2ban
        print_success "fail2ban安装完成"
    else
        print_info "fail2ban已安装"
    fi
    
    # 创建过滤器目录
    mkdir -p /etc/fail2ban/filter.d
    mkdir -p /etc/fail2ban/jail.d
    
    # 部署恶意访问过滤器
    print_info "部署fail2ban过滤器..."
    
    cat > /etc/fail2ban/filter.d/cardesignspace-malicious.conf << 'EOF'
[Definition]
failregex = ^<HOST> .* "(GET|POST|HEAD) /(phpinfo|wp-admin|wp-login|\.env|\.git|test\.php|console|wiki|_ignition|phpmyadmin|config|setup|install|shell|backdoor|webshell).*" (403|404|500)
            ^<HOST> .* "(bot|crawler|spider|scraper|scanner|probe|wget|curl|python-requests|java|nikto|sqlmap)" .*
ignoreregex =
EOF
    
    cat > /etc/fail2ban/filter.d/cardesignspace-sensitive.conf << 'EOF'
[Definition]
failregex = ^<HOST> .* "(GET|POST) /(\.env|\.git|\.svn|\.htaccess|composer\.json|package\.json|web\.config|php\.ini).*" .*
ignoreregex =
EOF
    
    cat > /etc/fail2ban/filter.d/cardesignspace-api-limit.conf << 'EOF'
[Definition]
failregex = limiting requests, excess: .* by zone "api", client: <HOST>
            limiting requests, excess: .* by zone "general", client: <HOST>
ignoreregex =
EOF
    
    print_success "过滤器部署完成"
    
    # 部署jail配置
    print_info "部署jail配置..."
    
    cat > /etc/fail2ban/jail.d/cardesignspace.conf << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[cardesignspace-malicious]
enabled = true
port = http,https
filter = cardesignspace-malicious
logpath = /var/log/nginx/cardesignspace_access.log
          /var/log/nginx/cardesignspace_error.log
maxretry = 2
bantime = 7200
findtime = 300

[cardesignspace-sensitive]
enabled = true
port = http,https
filter = cardesignspace-sensitive
logpath = /var/log/nginx/cardesignspace_access.log
maxretry = 1
bantime = 86400
findtime = 600

[cardesignspace-api-limit]
enabled = true
port = http,https
filter = cardesignspace-api-limit
logpath = /var/log/nginx/cardesignspace_error.log
maxretry = 10
bantime = 1800
findtime = 60
EOF
    
    print_success "jail配置部署完成"
    
    # 测试fail2ban配置
    print_info "测试fail2ban配置..."
    if fail2ban-client -t; then
        print_success "fail2ban配置测试通过"
    else
        print_error "fail2ban配置测试失败"
        exit 1
    fi
    
    # 重启fail2ban
    print_info "重启fail2ban..."
    systemctl restart fail2ban
    systemctl enable fail2ban
    print_success "fail2ban已重启并设置为开机启动"
}

###############################################################################
# 重启后端服务
###############################################################################
restart_backend() {
    print_header "重启后端服务"
    
    cd /root/cardesignspace-2025/backend
    
    # 使用PM2重启
    if command -v pm2 &> /dev/null; then
        print_info "使用PM2重启后端..."
        pm2 restart cardesignspace-backend || pm2 start npm --name "cardesignspace-backend" -- start
        print_success "后端服务已重启"
    else
        print_warning "PM2未安装，跳过后端重启"
    fi
}

###############################################################################
# 验证部署
###############################################################################
verify_deployment() {
    print_header "验证部署"
    
    # 检查Nginx状态
    print_info "检查Nginx状态..."
    if systemctl is-active --quiet nginx; then
        print_success "Nginx运行正常"
    else
        print_error "Nginx未运行"
    fi
    
    # 检查fail2ban状态
    print_info "检查fail2ban状态..."
    if systemctl is-active --quiet fail2ban; then
        print_success "fail2ban运行正常"
        
        # 显示fail2ban监控状态
        echo ""
        print_info "fail2ban监控状态:"
        fail2ban-client status | grep "Jail list" || true
        echo ""
        
        # 显示各个jail的状态
        for jail in cardesignspace-malicious cardesignspace-sensitive cardesignspace-api-limit; do
            if fail2ban-client status $jail &> /dev/null; then
                echo "📊 $jail:"
                fail2ban-client status $jail | grep "Currently banned" || true
            fi
        done
    else
        print_error "fail2ban未运行"
    fi
    
    # 测试安全规则
    print_info "测试安全规则..."
    echo ""
    print_info "尝试访问敏感路径（应该被阻止）:"
    curl -s -o /dev/null -w "  /.env -> HTTP %{http_code}\n" http://localhost/.env || true
    curl -s -o /dev/null -w "  /phpinfo -> HTTP %{http_code}\n" http://localhost/phpinfo || true
    curl -s -o /dev/null -w "  /wp-admin -> HTTP %{http_code}\n" http://localhost/wp-admin || true
    echo ""
    
    print_success "部署验证完成"
}

###############################################################################
# 显示使用说明
###############################################################################
show_instructions() {
    print_header "使用说明"
    
    cat << 'EOF'
📋 后续操作:

1️⃣  查看fail2ban状态:
   sudo fail2ban-client status
   sudo fail2ban-client status cardesignspace-malicious

2️⃣  查看被封禁的IP:
   sudo fail2ban-client status cardesignspace-malicious | grep "Banned IP"

3️⃣  手动解封IP:
   sudo fail2ban-client set cardesignspace-malicious unbanip <IP地址>

4️⃣  查看Nginx日志:
   sudo tail -f /var/log/nginx/cardesignspace_access.log

5️⃣  运行安全监控脚本:
   node scripts/security-monitor.js
   node scripts/security-monitor.js --realtime

6️⃣  查看安全报告:
   cat logs/security-report.log

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  重要提示:
   - fail2ban会自动封禁可疑IP，封禁时长根据严重程度从30分钟到24小时不等
   - 被封禁的IP无法访问网站，请谨慎配置
   - 建议定期查看监控报告，了解网站安全状况
   - 如果误封正常用户，使用上述命令手动解封

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF
}

###############################################################################
# 主程序
###############################################################################
main() {
    clear
    
    cat << 'EOF'
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║     🛡️  CarDesignSpace 安全加固部署脚本                      ║
║                                                               ║
║     Security Hardening Deployment Script                     ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
EOF
    
    echo ""
    print_warning "此脚本将部署增强的安全配置，包括:"
    echo "  • 增强的Nginx防护规则"
    echo "  • fail2ban自动封禁系统"
    echo "  • 敏感文件访问阻止"
    echo "  • 恶意路径检测"
    echo ""
    
    read -p "是否继续? (y/N): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "已取消部署"
        exit 0
    fi
    
    # 执行部署步骤
    check_permissions
    backup_configs
    deploy_nginx_config
    setup_fail2ban
    restart_backend
    verify_deployment
    show_instructions
    
    echo ""
    print_success "🎉 安全加固部署完成!"
    echo ""
}

# 运行主程序
main






