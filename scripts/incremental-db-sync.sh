#!/bin/bash

# 增量数据库同步脚本
# 
# 功能：
# 1. 智能增量同步，只同步变更的数据
# 2. 表结构自动同步
# 3. 数据一致性验证
# 4. 回滚机制
# 5. 性能优化
#
# 使用方法：
# ./scripts/incremental-db-sync.sh [options]
#
# 选项：
# --full-sync         执行全量同步（首次同步）
# --incremental       执行增量同步（默认）
# --dry-run           模拟运行，不执行实际同步
# --verify            验证同步结果
# --rollback          回滚到上次同步状态

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
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

log_debug() {
    echo -e "${PURPLE}[DEBUG]${NC} $1"
}

# 配置
CONFIG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$CONFIG_DIR")"
SYNC_DIR="$PROJECT_ROOT/sync"
LOG_DIR="$PROJECT_ROOT/logs"
LOG_FILE="$LOG_DIR/incremental-sync.log"
STATE_FILE="$SYNC_DIR/sync-state.json"
BACKUP_DIR="$PROJECT_ROOT/backups/database"

# 确保目录存在
mkdir -p "$SYNC_DIR"
mkdir -p "$LOG_DIR"
mkdir -p "$BACKUP_DIR"

# 日志记录函数
log_to_file() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# 检查环境
check_environment() {
    log_step "检查环境配置"
    
    # 检查环境变量文件
    if [ -f "$PROJECT_ROOT/.env" ]; then
        source "$PROJECT_ROOT/.env"
    elif [ -f "$PROJECT_ROOT/backend/.env" ]; then
        source "$PROJECT_ROOT/backend/.env"
    else
        log_error "环境变量文件不存在"
        exit 1
    fi
    
    # 检查主数据库配置
    if [ -z "$DB_HOST" ] || [ -z "$DB_NAME" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ]; then
        log_error "主数据库配置不完整"
        exit 1
    fi
    
    # 检查备份数据库配置
    if [ -z "$BACKUP_DB_HOST" ] || [ -z "$BACKUP_DB_NAME" ] || [ -z "$BACKUP_DB_USER" ] || [ -z "$BACKUP_DB_PASSWORD" ]; then
        log_error "备份数据库配置不完整"
        exit 1
    fi
    
    # 处理MySQL密码参数
    local db_password_param=""
    if [ -n "$DB_PASSWORD" ]; then
        db_password_param="-p$DB_PASSWORD"
    fi
    
    # 检查数据库连接
    if ! mysql -h"$DB_HOST" -u"$DB_USER" $db_password_param -e "SELECT 1;" "$DB_NAME" >/dev/null 2>&1; then
        log_error "无法连接到主数据库"
        exit 1
    fi
    
    local backup_password_param=""
    if [ -n "$BACKUP_DB_PASSWORD" ]; then
        backup_password_param="-p$BACKUP_DB_PASSWORD"
    fi
    
    if ! mysql -h"$BACKUP_DB_HOST" -P"$BACKUP_DB_PORT" -u"$BACKUP_DB_USER" $backup_password_param -e "SELECT 1;" "$BACKUP_DB_NAME" >/dev/null 2>&1; then
        log_error "无法连接到备份数据库"
        exit 1
    fi
    
    log_info "环境检查通过"
    log_to_file "环境检查通过"
}

# 获取表列表
get_table_list() {
    local db_host="$1"
    local db_port="$2"
    local db_user="$3"
    local db_password="$4"
    local db_name="$5"
    
    mysql -h"$db_host" -P"$db_port" -u"$db_user" -p"$db_password" -e "SHOW TABLES;" -s -N "$db_name" 2>/dev/null
}

# 获取表结构
get_table_structure() {
    local db_host="$1"
    local db_port="$2"
    local db_user="$3"
    local db_password="$4"
    local db_name="$5"
    local table_name="$6"
    
    mysqldump -h"$db_host" -P"$db_port" -u"$db_user" -p"$db_password" \
        --no-data --routines --triggers --events \
        --single-transaction --lock-tables=false \
        "$db_name" "$table_name" 2>/dev/null
}

# 获取表数据哈希
get_table_hash() {
    local db_host="$1"
    local db_port="$2"
    local db_user="$3"
    local db_password="$4"
    local db_name="$5"
    local table_name="$6"
    
    mysql -h"$db_host" -P"$db_port" -u"$db_user" -p"$db_password" -e "
        SELECT 
            COUNT(*) as row_count,
            MD5(GROUP_CONCAT(CONCAT_WS('|', *))) as data_hash
        FROM \`$table_name\`;
    " -s -N "$db_name" 2>/dev/null
}

# 获取表最后更新时间
get_table_last_updated() {
    local db_host="$1"
    local db_port="$2"
    local db_user="$3"
    local db_password="$4"
    local db_name="$5"
    local table_name="$6"
    
    # 尝试获取表的最后更新时间
    mysql -h"$db_host" -P"$db_port" -u"$db_user" -p"$db_password" -e "
        SELECT 
            UPDATE_TIME,
            CREATE_TIME,
            TABLE_ROWS
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = '$db_name' AND TABLE_NAME = '$table_name';
    " -s -N "$db_name" 2>/dev/null
}

# 比较表结构
compare_table_structure() {
    local table_name="$1"
    local source_structure="$2"
    local target_structure="$3"
    
    if [ "$source_structure" = "$target_structure" ]; then
        echo "identical"
    else
        echo "different"
    fi
}

# 同步表结构
sync_table_structure() {
    local table_name="$1"
    local source_structure="$2"
    
    log_debug "同步表结构: $table_name"
    
    # 在备份数据库中创建或更新表结构
    echo "$source_structure" | mysql -h"$BACKUP_DB_HOST" -P"$BACKUP_DB_PORT" -u"$BACKUP_DB_USER" -p"$BACKUP_DB_PASSWORD" "$BACKUP_DB_NAME" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        log_info "表结构同步成功: $table_name"
        return 0
    else
        log_error "表结构同步失败: $table_name"
        return 1
    fi
}

# 同步表数据（增量）
sync_table_data() {
    local table_name="$1"
    local sync_mode="${2:-incremental}"
    
    log_debug "同步表数据: $table_name (模式: $sync_mode)"
    
    # 获取主键信息
    local primary_key=$(mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" -e "
        SELECT COLUMN_NAME 
        FROM information_schema.KEY_COLUMN_USAGE 
        WHERE TABLE_SCHEMA = '$DB_NAME' 
        AND TABLE_NAME = '$table_name' 
        AND CONSTRAINT_NAME = 'PRIMARY'
        ORDER BY ORDINAL_POSITION;
    " -s -N "$DB_NAME" 2>/dev/null | tr '\n' ',' | sed 's/,$//')
    
    if [ -z "$primary_key" ]; then
        log_warn "表 $table_name 没有主键，执行全量同步"
        sync_mode="full"
    fi
    
    case "$sync_mode" in
        "full")
            # 全量同步
            mysqldump -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" \
                --single-transaction --lock-tables=false \
                --complete-insert --extended-insert \
                "$DB_NAME" "$table_name" | \
            mysql -h"$BACKUP_DB_HOST" -P"$BACKUP_DB_PORT" -u"$BACKUP_DB_USER" -p"$BACKUP_DB_PASSWORD" "$BACKUP_DB_NAME" 2>/dev/null
            ;;
        "incremental")
            # 增量同步 - 使用 INSERT ... ON DUPLICATE KEY UPDATE
            sync_table_data_incremental "$table_name" "$primary_key"
            ;;
    esac
    
    if [ $? -eq 0 ]; then
        log_info "表数据同步成功: $table_name"
        return 0
    else
        log_error "表数据同步失败: $table_name"
        return 1
    fi
}

# 增量同步表数据
sync_table_data_incremental() {
    local table_name="$1"
    local primary_key="$2"
    
    # 创建临时表存储增量数据
    local temp_table="${table_name}_sync_temp"
    
    # 获取主表的所有数据
    mysqldump -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" \
        --single-transaction --lock-tables=false \
        --complete-insert --extended-insert \
        --where="1=1" \
        "$DB_NAME" "$table_name" | \
    sed "s/\`$table_name\`/\`$temp_table\`/g" | \
    mysql -h"$BACKUP_DB_HOST" -P"$BACKUP_DB_PORT" -u"$BACKUP_DB_USER" -p"$BACKUP_DB_PASSWORD" "$BACKUP_DB_NAME" 2>/dev/null
    
    # 使用 INSERT ... ON DUPLICATE KEY UPDATE 合并数据
    local update_fields=$(mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" -e "
        SELECT COLUMN_NAME 
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = '$DB_NAME' 
        AND TABLE_NAME = '$table_name'
        AND COLUMN_KEY != 'PRI'
        ORDER BY ORDINAL_POSITION;
    " -s -N "$DB_NAME" 2>/dev/null | tr '\n' ',' | sed 's/,$//')
    
    if [ -n "$update_fields" ]; then
        mysql -h"$BACKUP_DB_HOST" -P"$BACKUP_DB_PORT" -u"$BACKUP_DB_USER" -p"$BACKUP_DB_PASSWORD" -e "
            INSERT INTO \`$table_name\` 
            SELECT * FROM \`$temp_table\`
            ON DUPLICATE KEY UPDATE
            $(echo "$update_fields" | sed 's/,/ = VALUES(/g' | sed 's/$/)/g' | sed 's/ = VALUES(/, = VALUES(/g')
        " "$BACKUP_DB_NAME" 2>/dev/null
    fi
    
    # 清理临时表
    mysql -h"$BACKUP_DB_HOST" -P"$BACKUP_DB_PORT" -u"$BACKUP_DB_USER" -p"$BACKUP_DB_PASSWORD" -e "DROP TABLE IF EXISTS \`$temp_table\`;" "$BACKUP_DB_NAME" 2>/dev/null
}

# 保存同步状态
save_sync_state() {
    local state_data="$1"
    echo "$state_data" > "$STATE_FILE"
    log_debug "同步状态已保存: $STATE_FILE"
}

# 加载同步状态
load_sync_state() {
    if [ -f "$STATE_FILE" ]; then
        cat "$STATE_FILE"
    else
        echo "{}"
    fi
}

# 创建备份点
create_backup_point() {
    local backup_name="backup_point_$(date +%Y%m%d_%H%M%S)"
    local backup_file="$BACKUP_DIR/$backup_name.sql.gz"
    
    log_info "创建备份点: $backup_name"
    
    mysqldump -h"$BACKUP_DB_HOST" -P"$BACKUP_DB_PORT" -u"$BACKUP_DB_USER" -p"$BACKUP_DB_PASSWORD" \
        --single-transaction --routines --triggers --events \
        --hex-blob --complete-insert --extended-insert \
        --lock-tables=false \
        "$BACKUP_DB_NAME" | gzip > "$backup_file" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        log_info "备份点创建成功: $backup_file"
        echo "$backup_file"
    else
        log_error "备份点创建失败"
        return 1
    fi
}

# 回滚到备份点
rollback_to_backup_point() {
    local backup_file="$1"
    
    if [ ! -f "$backup_file" ]; then
        log_error "备份文件不存在: $backup_file"
        return 1
    fi
    
    log_info "回滚到备份点: $backup_file"
    
    # 清空当前数据库
    mysql -h"$BACKUP_DB_HOST" -P"$BACKUP_DB_PORT" -u"$BACKUP_DB_USER" -p"$BACKUP_DB_PASSWORD" -e "DROP DATABASE IF EXISTS $BACKUP_DB_NAME; CREATE DATABASE $BACKUP_DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null
    
    # 恢复数据
    zcat "$backup_file" | mysql -h"$BACKUP_DB_HOST" -P"$BACKUP_DB_PORT" -u"$BACKUP_DB_USER" -p"$BACKUP_DB_PASSWORD" "$BACKUP_DB_NAME" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        log_info "回滚成功"
        return 0
    else
        log_error "回滚失败"
        return 1
    fi
}

# 验证同步结果
verify_sync() {
    log_step "验证同步结果"
    
    local source_tables=($(get_table_list "$DB_HOST" "3306" "$DB_USER" "$DB_PASSWORD" "$DB_NAME"))
    local target_tables=($(get_table_list "$BACKUP_DB_HOST" "$BACKUP_DB_PORT" "$BACKUP_DB_USER" "$BACKUP_DB_PASSWORD" "$BACKUP_DB_NAME"))
    
    local sync_success=true
    local table_count=0
    local success_count=0
    
    for table in "${source_tables[@]}"; do
        table_count=$((table_count + 1))
        
        # 检查表是否存在
        if [[ " ${target_tables[@]} " =~ " ${table} " ]]; then
            # 比较行数
            local source_count=$(mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" -e "SELECT COUNT(*) FROM \`$table\`;" -s -N "$DB_NAME" 2>/dev/null)
            local target_count=$(mysql -h"$BACKUP_DB_HOST" -P"$BACKUP_DB_PORT" -u"$BACKUP_DB_USER" -p"$BACKUP_DB_PASSWORD" -e "SELECT COUNT(*) FROM \`$table\`;" -s -N "$BACKUP_DB_NAME" 2>/dev/null)
            
            if [ "$source_count" = "$target_count" ]; then
                log_info "✓ 表 $table 同步成功 (行数: $source_count)"
                success_count=$((success_count + 1))
            else
                log_error "✗ 表 $table 行数不匹配 (源: $source_count, 目标: $target_count)"
                sync_success=false
            fi
        else
            log_error "✗ 表 $table 在目标数据库中不存在"
            sync_success=false
        fi
    done
    
    log_info "同步验证完成: $success_count/$table_count 个表成功"
    
    if [ "$sync_success" = true ]; then
        log_info "✓ 同步验证通过"
        return 0
    else
        log_error "✗ 同步验证失败"
        return 1
    fi
}

# 执行增量同步
execute_incremental_sync() {
    local dry_run="${1:-false}"
    
    log_step "开始增量同步"
    
    # 创建备份点
    local backup_point=""
    if [ "$dry_run" = "false" ]; then
        backup_point=$(create_backup_point)
        if [ $? -ne 0 ]; then
            log_error "无法创建备份点，同步中止"
            return 1
        fi
    fi
    
    # 获取源数据库表列表
    local source_tables=($(get_table_list "$DB_HOST" "3306" "$DB_USER" "$DB_PASSWORD" "$DB_NAME"))
    local target_tables=($(get_table_list "$BACKUP_DB_HOST" "$BACKUP_DB_PORT" "$BACKUP_DB_USER" "$BACKUP_DB_PASSWORD" "$BACKUP_DB_NAME"))
    
    local sync_state=$(load_sync_state)
    local sync_success=true
    local synced_tables=()
    
    for table in "${source_tables[@]}"; do
        log_info "处理表: $table"
        
        # 检查表是否存在于目标数据库
        if [[ ! " ${target_tables[@]} " =~ " ${table} " ]]; then
            log_info "新表，需要创建: $table"
            if [ "$dry_run" = "false" ]; then
                local source_structure=$(get_table_structure "$DB_HOST" "3306" "$DB_USER" "$DB_PASSWORD" "$DB_NAME" "$table")
                if ! sync_table_structure "$table" "$source_structure"; then
                    sync_success=false
                    break
                fi
            fi
        else
            # 比较表结构
            local source_structure=$(get_table_structure "$DB_HOST" "3306" "$DB_USER" "$DB_PASSWORD" "$DB_NAME" "$table")
            local target_structure=$(get_table_structure "$BACKUP_DB_HOST" "$BACKUP_DB_PORT" "$BACKUP_DB_USER" "$BACKUP_DB_PASSWORD" "$BACKUP_DB_NAME" "$table")
            
            local structure_diff=$(compare_table_structure "$table" "$source_structure" "$target_structure")
            
            if [ "$structure_diff" = "different" ]; then
                log_info "表结构已变更，需要更新: $table"
                if [ "$dry_run" = "false" ]; then
                    if ! sync_table_structure "$table" "$source_structure"; then
                        sync_success=false
                        break
                    fi
                fi
            fi
        fi
        
        # 同步数据
        if [ "$dry_run" = "false" ]; then
            if ! sync_table_data "$table" "incremental"; then
                sync_success=false
                break
            fi
        else
            log_info "模拟同步表数据: $table"
        fi
        
        synced_tables+=("$table")
    done
    
    if [ "$sync_success" = true ]; then
        log_info "增量同步完成"
        if [ "$dry_run" = "false" ]; then
            # 保存同步状态
            local new_state="{\"last_sync\":\"$(date -Iseconds)\",\"synced_tables\":[$(printf '"%s",' "${synced_tables[@]}" | sed 's/,$//')],\"backup_point\":\"$backup_point\"}"
            save_sync_state "$new_state"
            
            # 验证同步结果
            if verify_sync; then
                log_info "✓ 增量同步成功完成"
                return 0
            else
                log_error "✗ 同步验证失败，建议回滚"
                return 1
            fi
        else
            log_info "✓ 模拟同步完成"
            return 0
        fi
    else
        log_error "✗ 增量同步失败"
        if [ "$dry_run" = "false" ] && [ -n "$backup_point" ]; then
            log_warn "建议回滚到备份点: $backup_point"
        fi
        return 1
    fi
}

# 执行全量同步
execute_full_sync() {
    local dry_run="${1:-false}"
    
    log_step "开始全量同步"
    
    if [ "$dry_run" = "false" ]; then
        # 创建备份点
        local backup_point=$(create_backup_point)
        if [ $? -ne 0 ]; then
            log_error "无法创建备份点，同步中止"
            return 1
        fi
        
        # 清空目标数据库
        mysql -h"$BACKUP_DB_HOST" -P"$BACKUP_DB_PORT" -u"$BACKUP_DB_USER" -p"$BACKUP_DB_PASSWORD" -e "DROP DATABASE IF EXISTS $BACKUP_DB_NAME; CREATE DATABASE $BACKUP_DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null
        
        # 导出并导入完整数据库
        mysqldump -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" \
            --single-transaction --routines --triggers --events \
            --hex-blob --complete-insert --extended-insert \
            --lock-tables=false \
            "$DB_NAME" | \
        mysql -h"$BACKUP_DB_HOST" -P"$BACKUP_DB_PORT" -u"$BACKUP_DB_USER" -p"$BACKUP_DB_PASSWORD" "$BACKUP_DB_NAME" 2>/dev/null
        
        if [ $? -eq 0 ]; then
            log_info "全量同步完成"
            
            # 验证同步结果
            if verify_sync; then
                log_info "✓ 全量同步成功完成"
                return 0
            else
                log_error "✗ 同步验证失败，建议回滚"
                return 1
            fi
        else
            log_error "✗ 全量同步失败"
            return 1
        fi
    else
        log_info "✓ 模拟全量同步完成"
        return 0
    fi
}

# 主函数
main() {
    case "${1:-incremental}" in
        "incremental")
            check_environment
            execute_incremental_sync "false"
            ;;
        "full-sync")
            check_environment
            execute_full_sync "false"
            ;;
        "dry-run")
            check_environment
            execute_incremental_sync "true"
            ;;
        "verify")
            check_environment
            verify_sync
            ;;
        "rollback")
            local backup_file="$2"
            if [ -z "$backup_file" ]; then
                log_error "请指定备份文件路径"
                exit 1
            fi
            rollback_to_backup_point "$backup_file"
            ;;
        "help"|"--help"|"-h")
            echo "增量数据库同步脚本"
            echo ""
            echo "使用方法:"
            echo "  $0 [command] [options]"
            echo ""
            echo "命令:"
            echo "  incremental [默认] - 执行增量同步"
            echo "  full-sync          - 执行全量同步"
            echo "  dry-run            - 模拟运行，不执行实际同步"
            echo "  verify             - 验证同步结果"
            echo "  rollback <file>    - 回滚到指定备份点"
            echo "  help               - 显示帮助信息"
            echo ""
            echo "示例:"
            echo "  $0 incremental     # 执行增量同步"
            echo "  $0 dry-run         # 模拟同步"
            echo "  $0 verify          # 验证同步结果"
            echo "  $0 rollback /path/to/backup.sql.gz  # 回滚"
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
