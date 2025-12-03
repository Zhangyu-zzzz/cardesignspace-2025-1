#!/bin/bash

###############################################################################
# 安全部署验证脚本
# 用于验证安全加固是否成功部署并正常运行
###############################################################################

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

SERVER="root@49.235.98.5"
DOMAIN="https://www.cardesignspace.com"

print_header "🔍 安全部署验证"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  第一步：测试防护规则"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "🔴 测试敏感文件访问（应该被阻止 - 返回403）:"
echo ""

# 测试敏感路径
test_paths=(
    "/.env"
    "/phpinfo"
    "/_ignition/execute-solution"
    "/test.php"
    "/console"
    "/wiki"
)

for path in "${test_paths[@]}"; do
    status=$(curl -s -o /dev/null -w "%{http_code}" ${DOMAIN}${path})
    if [ "$status" == "403" ]; then
        echo -e "  ${GREEN}✅${NC} ${path} -> HTTP ${status} (已阻止)"
    else
        echo -e "  ${RED}❌${NC} ${path} -> HTTP ${status} (未阻止!)"
    fi
done

echo ""
echo "🟢 测试正常访问（应该正常 - 返回200）:"
echo ""

status=$(curl -s -o /dev/null -w "%{http_code}" ${DOMAIN}/)
if [ "$status" == "200" ]; then
    echo -e "  ${GREEN}✅${NC} / -> HTTP ${status} (正常)"
else
    echo -e "  ${YELLOW}⚠️${NC}  / -> HTTP ${status}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  第二步：检查服务器状态"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "📊 Nginx状态:"
if ssh $SERVER "systemctl is-active nginx" &>/dev/null; then
    echo -e "  ${GREEN}✅${NC} Nginx 运行正常"
else
    echo -e "  ${RED}❌${NC} Nginx 未运行"
fi

echo ""
echo "🛡️  fail2ban状态:"
if ssh $SERVER "systemctl is-active fail2ban" &>/dev/null; then
    echo -e "  ${GREEN}✅${NC} fail2ban 运行正常"
    
    echo ""
    echo "📋 fail2ban监控的jail:"
    ssh $SERVER "fail2ban-client status" | grep "Jail list"
    
    echo ""
    echo "🚫 cardesignspace-malicious 状态:"
    ssh $SERVER "fail2ban-client status cardesignspace-malicious 2>/dev/null | grep -E 'Currently banned|Total banned'" || echo "  ℹ️  jail尚未启动或无封禁记录"
else
    echo -e "  ${RED}❌${NC} fail2ban 未运行"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  第三步：查看最近的攻击记录"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "🚨 最近被阻止的攻击（403错误）:"
echo ""
recent_403=$(ssh $SERVER "grep ' 403 ' /var/log/nginx/cardesignspace_access.log 2>/dev/null | tail -5")

if [ -n "$recent_403" ]; then
    echo "$recent_403" | while IFS= read -r line; do
        # 提取IP和路径
        ip=$(echo "$line" | awk '{print $1}')
        path=$(echo "$line" | grep -oP '"(GET|POST) \K[^"]+(?= HTTP)')
        echo -e "  ${YELLOW}⚠️${NC}  IP: $ip -> 访问: $path"
    done
else
    echo -e "  ${GREEN}✅${NC} 暂无攻击记录或日志不存在"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  第四步：运行安全监控报告"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "📊 正在生成安全监控报告..."
echo ""

ssh $SERVER "cd /root/cardesignspace-2025 && node scripts/security-monitor.js 2>/dev/null | head -40" || echo "  ℹ️  监控脚本需要累积日志数据"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}✅ 验证完成！${NC}"
echo ""
echo "📚 更多操作："
echo ""
echo "  查看详细fail2ban状态:"
echo "    ssh $SERVER 'fail2ban-client status cardesignspace-malicious'"
echo ""
echo "  实时监控日志:"
echo "    ssh $SERVER 'tail -f /var/log/nginx/cardesignspace_access.log'"
echo ""
echo "  运行实时监控:"
echo "    ssh $SERVER 'cd /root/cardesignspace-2025 && node scripts/security-monitor.js --realtime'"
echo ""










