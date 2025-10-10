#!/bin/bash

# 开发环境增量同步测试脚本
# 使用 cardesignspace_dev 作为主数据库

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
INCREMENTAL_SCRIPT="$SCRIPT_DIR/incremental-db-sync.sh"

# 开发环境数据库配置
DEV_DB_NAME="cardesignspace_dev"
BACKUP_DB_NAME="cardesignspace_dev_backup"

log_step "开发环境增量同步测试"
echo "主数据库: $DEV_DB_NAME"
echo "备份数据库: $BACKUP_DB_NAME"
echo ""

# 检查数据库是否存在
check_databases() {
    log_step "检查数据库"
    
    if mysql -e "USE $DEV_DB_NAME;" 2>/dev/null; then
        log_info "✓ 开发数据库 $DEV_DB_NAME 存在"
    else
        log_error "✗ 开发数据库 $DEV_DB_NAME 不存在"
        exit 1
    fi
    
    if mysql -e "USE $BACKUP_DB_NAME;" 2>/dev/null; then
        log_info "✓ 备份数据库 $BACKUP_DB_NAME 存在"
    else
        log_warn "⚠ 备份数据库 $BACKUP_DB_NAME 不存在，正在创建..."
        mysql -e "CREATE DATABASE $BACKUP_DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
        log_info "✓ 备份数据库创建完成"
    fi
}

# 检查表结构
check_table_structure() {
    log_step "检查表结构"
    
    local table_count=$(mysql -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DEV_DB_NAME';" -s -N)
    log_info "开发数据库表数量: $table_count"
    
    if [ "$table_count" -gt 0 ]; then
        log_info "✓ 开发数据库包含 $table_count 个表"
        
        # 显示前几个表
        local tables=$(mysql -e "SELECT table_name FROM information_schema.tables WHERE table_schema='$DEV_DB_NAME' LIMIT 5;" -s -N | tr '\n' ', ' | sed 's/,$//')
        log_info "示例表: $tables"
    else
        log_warn "⚠ 开发数据库为空"
    fi
}

# 测试增量同步
test_incremental_sync() {
    log_step "测试增量同步"
    
    # 设置环境变量
    export DB_HOST=localhost
    export DB_PORT=3306
    export DB_NAME="$DEV_DB_NAME"
    export DB_USER=root
    export DB_PASSWORD=""
    export BACKUP_DB_HOST=localhost
    export BACKUP_DB_PORT=3306
    export BACKUP_DB_NAME="$BACKUP_DB_NAME"
    export BACKUP_DB_USER=root
    export BACKUP_DB_PASSWORD=""
    
    log_info "环境变量设置完成"
    log_info "主数据库: $DB_HOST:$DB_PORT/$DB_NAME"
    log_info "备份数据库: $BACKUP_DB_HOST:$BACKUP_DB_PORT/$BACKUP_DB_NAME"
    
    # 执行模拟同步
    log_info "执行模拟增量同步..."
    if bash "$INCREMENTAL_SCRIPT" dry-run; then
        log_info "✓ 模拟增量同步成功"
    else
        log_error "✗ 模拟增量同步失败"
        return 1
    fi
}

# 显示开发环境信息
show_dev_info() {
    log_step "开发环境信息"
    
    echo ""
    echo "🔧 开发环境配置:"
    echo "  主数据库: $DEV_DB_NAME (localhost:3306)"
    echo "  备份数据库: $BACKUP_DB_NAME (localhost:3306)"
    echo "  用户: root (无密码)"
    echo ""
    echo "📊 数据库状态:"
    local dev_tables=$(mysql -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DEV_DB_NAME';" -s -N)
    local backup_tables=$(mysql -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$BACKUP_DB_NAME';" -s -N)
    echo "  开发数据库表数: $dev_tables"
    echo "  备份数据库表数: $backup_tables"
    echo ""
    echo "🚀 可用命令:"
    echo "  查看开发数据库: mysql $DEV_DB_NAME"
    echo "  查看备份数据库: mysql $BACKUP_DB_NAME"
    echo "  执行增量同步: ./scripts/incremental-db-sync.sh incremental"
    echo "  模拟同步: ./scripts/incremental-db-sync.sh dry-run"
    echo ""
}

# 主函数
main() {
    echo "=== 开发环境增量同步测试 ==="
    echo ""
    
    # 检查数据库
    check_databases
    
    # 检查表结构
    check_table_structure
    
    # 测试增量同步
    if test_incremental_sync; then
        log_info "✓ 增量同步测试成功"
    else
        log_error "✗ 增量同步测试失败"
        exit 1
    fi
    
    # 显示开发环境信息
    show_dev_info
    
    log_info "🎉 开发环境配置完成！"
}

# 执行测试
main "$@"



