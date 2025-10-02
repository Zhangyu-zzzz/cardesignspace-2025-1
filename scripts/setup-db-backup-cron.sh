#!/bin/bash

# 数据库自动备份Cron任务设置脚本
# 
# 功能：
# 1. 自动配置cron任务
# 2. 支持多种备份策略
# 3. 验证cron任务配置
# 4. 提供管理命令
#
# 使用方法：
# ./scripts/setup-db-backup-cron.sh [options]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# 配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_SCRIPT="$SCRIPT_DIR/db-backup-scheduler.sh"
CRON_TEMP_FILE="/tmp/db-backup-cron.tmp"

# 检查备份脚本是否存在
check_backup_script() {
    if [ ! -f "$BACKUP_SCRIPT" ]; then
        log_error "备份脚本不存在: $BACKUP_SCRIPT"
        exit 1
    fi
    
    if [ ! -x "$BACKUP_SCRIPT" ]; then
        log_warn "备份脚本没有执行权限，正在修复..."
        chmod +x "$BACKUP_SCRIPT"
    fi
    
    log_info "备份脚本检查通过"
}

# 生成cron任务配置
generate_cron_config() {
    local strategy="${1:-standard}"
    
    log_step "生成Cron任务配置 ($strategy)"
    
    case "$strategy" in
        "standard")
            cat > "$CRON_TEMP_FILE" << EOF
# 数据库自动备份任务 - 标准策略（服务器空闲时执行）
# 每日凌晨3点执行每日备份（服务器空闲时间）
0 3 * * * $BACKUP_SCRIPT daily >> $PROJECT_ROOT/logs/db-backup-cron.log 2>&1

# 每周日凌晨2点清理旧备份
0 2 * * 0 $BACKUP_SCRIPT cleanup >> $PROJECT_ROOT/logs/db-backup-cron.log 2>&1
EOF
            ;;
        "frequent")
            cat > "$CRON_TEMP_FILE" << EOF
# 数据库自动备份任务 - 频繁策略
# 每6小时执行一次备份
0 */6 * * * $BACKUP_SCRIPT daily >> $PROJECT_ROOT/logs/db-backup-cron.log 2>&1

# 每日凌晨3点清理旧备份
0 3 * * * $BACKUP_SCRIPT cleanup >> $PROJECT_ROOT/logs/db-backup-cron.log 2>&1
EOF
            ;;
        "conservative")
            cat > "$CRON_TEMP_FILE" << EOF
# 数据库自动备份任务 - 保守策略
# 每周日凌晨2点执行备份
0 2 * * 0 $BACKUP_SCRIPT weekly >> $PROJECT_ROOT/logs/db-backup-cron.log 2>&1

# 每月1日凌晨1点执行每月备份
0 1 1 * * $BACKUP_SCRIPT monthly >> $PROJECT_ROOT/logs/db-backup-cron.log 2>&1

# 每月15日凌晨3点清理旧备份
0 3 15 * * $BACKUP_SCRIPT cleanup >> $PROJECT_ROOT/logs/db-backup-cron.log 2>&1
EOF
            ;;
        *)
            log_error "未知的策略: $strategy"
            exit 1
            ;;
    esac
    
    log_info "Cron配置已生成: $CRON_TEMP_FILE"
}

# 安装cron任务
install_cron() {
    local strategy="${1:-standard}"
    
    log_step "安装Cron任务 ($strategy)"
    
    # 生成配置
    generate_cron_config "$strategy"
    
    # 备份现有crontab
    log_info "备份现有crontab..."
    crontab -l > "/tmp/crontab.backup.$(date +%Y%m%d_%H%M%S)" 2>/dev/null || true
    
    # 获取现有crontab（排除数据库备份任务）
    local existing_cron=$(crontab -l 2>/dev/null | grep -v "db-backup-scheduler.sh" || true)
    
    # 合并现有crontab和新任务
    {
        echo "$existing_cron"
        echo ""
        cat "$CRON_TEMP_FILE"
    } | crontab -
    
    # 清理临时文件
    rm -f "$CRON_TEMP_FILE"
    
    log_info "Cron任务安装完成"
}

# 卸载cron任务
uninstall_cron() {
    log_step "卸载数据库备份Cron任务"
    
    # 备份现有crontab
    log_info "备份现有crontab..."
    crontab -l > "/tmp/crontab.backup.$(date +%Y%m%d_%H%M%S)" 2>/dev/null || true
    
    # 移除数据库备份任务
    crontab -l 2>/dev/null | grep -v "db-backup-scheduler.sh" | crontab -
    
    log_info "数据库备份Cron任务已卸载"
}

# 显示cron任务状态
show_status() {
    log_step "显示Cron任务状态"
    
    echo "当前Cron任务:"
    echo "=============="
    crontab -l 2>/dev/null | grep -E "(db-backup|# 数据库)" || echo "  无数据库备份任务"
    
    echo ""
    echo "数据库备份任务详情:"
    echo "=================="
    crontab -l 2>/dev/null | grep "db-backup-scheduler.sh" | while read line; do
        echo "  $line"
    done || echo "  无数据库备份任务"
    
    echo ""
    echo "备份脚本状态:"
    echo "============"
    if [ -f "$BACKUP_SCRIPT" ]; then
        echo "  脚本路径: $BACKUP_SCRIPT"
        echo "  脚本权限: $(ls -l "$BACKUP_SCRIPT" | awk '{print $1}')"
        echo "  脚本大小: $(du -h "$BACKUP_SCRIPT" | cut -f1)"
    else
        echo "  脚本不存在: $BACKUP_SCRIPT"
    fi
    
    echo ""
    echo "日志文件状态:"
    echo "============"
    local log_file="$PROJECT_ROOT/logs/db-backup-cron.log"
    if [ -f "$log_file" ]; then
        echo "  日志文件: $log_file"
        echo "  文件大小: $(du -h "$log_file" | cut -f1)"
        echo "  最后修改: $(stat -c %y "$log_file")"
        echo "  最近日志:"
        tail -5 "$log_file" | sed 's/^/    /'
    else
        echo "  日志文件不存在: $log_file"
    fi
}

# 测试cron任务
test_cron() {
    log_step "测试数据库备份任务"
    
    log_info "执行测试备份..."
    if "$BACKUP_SCRIPT" daily; then
        log_info "测试备份成功"
    else
        log_error "测试备份失败"
        exit 1
    fi
    
    log_info "验证备份文件..."
    if "$BACKUP_SCRIPT" verify; then
        log_info "备份验证成功"
    else
        log_warn "备份验证失败"
    fi
    
    log_info "生成测试报告..."
    "$BACKUP_SCRIPT" report
    
    log_info "测试完成"
}

# 主函数
main() {
    case "${1:-help}" in
        "install")
            check_backup_script
            install_cron "${2:-standard}"
            ;;
        "uninstall")
            uninstall_cron
            ;;
        "status")
            show_status
            ;;
        "test")
            check_backup_script
            test_cron
            ;;
        "help"|"--help"|"-h")
            echo "数据库自动备份Cron任务管理"
            echo ""
            echo "使用方法:"
            echo "  $0 [command] [options]"
            echo ""
            echo "命令:"
            echo "  install [strategy]  - 安装cron任务"
            echo "  uninstall          - 卸载cron任务"
            echo "  status             - 显示状态"
            echo "  test               - 测试备份任务"
            echo "  help               - 显示帮助信息"
            echo ""
            echo "策略选项 (install命令):"
            echo "  standard [默认]    - 标准策略 (每日+每周+每月)"
            echo "  frequent          - 频繁策略 (每6小时)"
            echo "  conservative      - 保守策略 (每周+每月)"
            echo ""
            echo "示例:"
            echo "  $0 install standard    # 安装标准策略"
            echo "  $0 install frequent    # 安装频繁策略"
            echo "  $0 status              # 查看状态"
            echo "  $0 test                # 测试备份"
            echo "  $0 uninstall           # 卸载任务"
            echo ""
            echo "注意事项:"
            echo "  - 安装前请确保数据库连接正常"
            echo "  - 建议先执行 'test' 命令验证配置"
            echo "  - 卸载前会自动备份现有crontab"
            ;;
        *)
            log_error "未知命令: $1"
            echo "使用 '$0 help' 查看帮助信息"
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"

