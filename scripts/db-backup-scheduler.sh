#!/bin/bash

# 数据库自动备份调度器
# 
# 功能：
# 1. 自动执行数据库备份
# 2. 智能清理旧备份
# 3. 备份验证和通知
# 4. 支持多种调度策略
#
# 使用方法：
# ./scripts/db-backup-scheduler.sh [options]
#
# 选项：
# --daily           每日备份
# --weekly          每周备份
# --monthly         每月备份
# --cleanup         清理旧备份
# --verify          验证备份完整性

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
CONFIG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$CONFIG_DIR")"
BACKUP_DIR="$PROJECT_ROOT/backups/database"
LOG_DIR="$PROJECT_ROOT/logs"
LOG_FILE="$LOG_DIR/db-backup.log"
S3_BACKUP_DIR="database-backups"

# 确保目录存在
mkdir -p "$BACKUP_DIR"
mkdir -p "$LOG_DIR"

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
    
    # 检查必需的数据库配置
    if [ -z "$DB_HOST" ] || [ -z "$DB_NAME" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ]; then
        log_error "数据库配置不完整"
        exit 1
    fi
    
    # 检查S3配置（可选）
    if [ -z "$S3_ENDPOINT" ] || [ -z "$S3_BUCKET" ] || [ -z "$S3_ACCESS_KEY" ] || [ -z "$S3_SECRET_KEY" ]; then
        log_warn "S3配置不完整，将跳过S3上传"
        export SKIP_S3_UPLOAD=true
    else
        export SKIP_S3_UPLOAD=false
        log_info "S3配置检查通过"
    fi
    
    # 检查MySQL连接
    if ! mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1;" "$DB_NAME" >/dev/null 2>&1; then
        log_error "无法连接到数据库"
        exit 1
    fi
    
    log_info "环境检查通过"
    log_to_file "环境检查通过"
}

# 执行数据库备份
backup_database() {
    local backup_type="${1:-daily}"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/${backup_type}_backup_${timestamp}.sql"
    
    log_step "开始${backup_type}数据库备份"
    log_to_file "开始${backup_type}数据库备份"
    
    # 执行备份
    if mysqldump \
        -h"$DB_HOST" \
        -u"$DB_USER" \
        -p"$DB_PASSWORD" \
        --single-transaction \
        --routines \
        --triggers \
        --events \
        --hex-blob \
        --complete-insert \
        --extended-insert \
        --lock-tables=false \
        "$DB_NAME" > "$backup_file" 2>/dev/null; then
        
        # 压缩备份文件
        gzip "$backup_file"
        local compressed_file="${backup_file}.gz"
        
        # 检查备份文件大小
        local file_size=$(du -h "$compressed_file" | cut -f1)
        
        log_info "数据库备份完成: $compressed_file (大小: $file_size)"
        log_to_file "数据库备份完成: $compressed_file (大小: $file_size)"
        
        # 验证备份文件
        if [ -s "$compressed_file" ]; then
            log_info "备份文件验证成功"
            log_to_file "备份文件验证成功"
            
            # 测试备份文件可读性
            if zcat "$compressed_file" | head -10 >/dev/null 2>&1; then
                log_info "备份文件完整性验证通过"
                log_to_file "备份文件完整性验证通过"
                
                # 上传到S3
                if upload_to_s3 "$compressed_file" "$backup_type"; then
                    log_info "备份已成功上传到S3"
                    log_to_file "备份已成功上传到S3"
                else
                    log_warn "S3上传失败，但本地备份成功"
                    log_to_file "S3上传失败，但本地备份成功"
                fi
                
                return 0
            else
                log_error "备份文件损坏"
                log_to_file "备份文件损坏"
                rm -f "$compressed_file"
                return 1
            fi
        else
            log_error "备份文件为空"
            log_to_file "备份文件为空"
            rm -f "$compressed_file"
            return 1
        fi
    else
        log_error "数据库备份失败"
        log_to_file "数据库备份失败"
        return 1
    fi
}

# 清理旧备份
cleanup_old_backups() {
    log_step "清理旧备份文件"
    
    local cleanup_count=0
    
    # 清理每日备份（保留7天）
    cleanup_count=$((cleanup_count + $(find "$BACKUP_DIR" -name "daily_backup_*.sql.gz" -mtime +7 -delete -print | wc -l)))
    
    # 清理每周备份（保留4周）
    cleanup_count=$((cleanup_count + $(find "$BACKUP_DIR" -name "weekly_backup_*.sql.gz" -mtime +28 -delete -print | wc -l)))
    
    # 清理每月备份（保留12个月）
    cleanup_count=$((cleanup_count + $(find "$BACKUP_DIR" -name "monthly_backup_*.sql.gz" -mtime +365 -delete -print | wc -l)))
    
    if [ $cleanup_count -gt 0 ]; then
        log_info "清理了 $cleanup_count 个旧备份文件"
        log_to_file "清理了 $cleanup_count 个旧备份文件"
    else
        log_info "没有需要清理的旧备份文件"
        log_to_file "没有需要清理的旧备份文件"
    fi
}

# 上传备份到S3
upload_to_s3() {
    local backup_file="$1"
    local backup_type="$2"
    
    if [ "$SKIP_S3_UPLOAD" = "true" ]; then
        log_info "跳过S3上传（配置不完整）"
        return 0
    fi
    
    log_step "上传备份到S3"
    
    local s3_key="$S3_BACKUP_DIR/$backup_type/$(basename "$backup_file")"
    local s3_url="$S3_ENDPOINT/$S3_BUCKET/$s3_key"
    
    # 使用Node.js S3上传工具（优先）
    local upload_tool="$PROJECT_ROOT/scripts/s3-upload-tool.js"
    if [ -f "$upload_tool" ] && command -v node >/dev/null 2>&1; then
        log_info "使用Node.js S3上传工具"
        
        if cd "$PROJECT_ROOT/backend" && NODE_PATH=./node_modules node "$upload_tool" "$backup_file" "$s3_key"; then
            log_info "S3上传成功: $s3_url"
            log_to_file "S3上传成功: $s3_url"
            return 0
        else
            log_error "S3上传失败"
            log_to_file "S3上传失败"
            return 1
        fi
    
    # 使用AWS CLI上传（备用方案）
    elif command -v aws >/dev/null 2>&1; then
        log_info "使用AWS CLI上传到S3"
        
        # 配置AWS CLI
        export AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY"
        export AWS_SECRET_ACCESS_KEY="$S3_SECRET_KEY"
        export AWS_DEFAULT_REGION="${S3_REGION:-ap-shanghai}"
        
        if aws s3 cp "$backup_file" "s3://$S3_BUCKET/$s3_key" \
            --endpoint-url "$S3_ENDPOINT" \
            --region "${S3_REGION:-ap-shanghai}"; then
            
            log_info "S3上传成功: $s3_url"
            log_to_file "S3上传成功: $s3_url"
            return 0
        else
            log_error "S3上传失败"
            log_to_file "S3上传失败"
            return 1
        fi
    
    else
        log_warn "没有可用的上传工具（Node.js 或 AWS CLI），跳过S3上传"
        return 0
    fi
}

# 验证备份完整性
verify_backups() {
    log_step "验证备份完整性"
    
    local backup_files=($(find "$BACKUP_DIR" -name "*.sql.gz" -type f | head -5))
    local verified_count=0
    local failed_count=0
    
    for backup_file in "${backup_files[@]}"; do
        if zcat "$backup_file" | head -10 >/dev/null 2>&1; then
            log_info "验证通过: $(basename "$backup_file")"
            verified_count=$((verified_count + 1))
        else
            log_error "验证失败: $(basename "$backup_file")"
            failed_count=$((failed_count + 1))
        fi
    done
    
    log_info "验证完成: $verified_count 个成功, $failed_count 个失败"
    log_to_file "验证完成: $verified_count 个成功, $failed_count 个失败"
    
    return $failed_count
}

# 生成备份报告
generate_report() {
    local report_file="$LOG_DIR/db-backup-report-$(date +%Y%m%d).txt"
    
    log_step "生成备份报告"
    
    {
        echo "数据库备份报告 - $(date '+%Y-%m-%d %H:%M:%S')"
        echo "=========================================="
        echo ""
        echo "备份目录: $BACKUP_DIR"
        echo "日志文件: $LOG_FILE"
        echo ""
        echo "备份文件统计:"
        echo "  每日备份: $(find "$BACKUP_DIR" -name "daily_backup_*.sql.gz" | wc -l) 个"
        echo "  每周备份: $(find "$BACKUP_DIR" -name "weekly_backup_*.sql.gz" | wc -l) 个"
        echo "  每月备份: $(find "$BACKUP_DIR" -name "monthly_backup_*.sql.gz" | wc -l) 个"
        echo ""
        echo "存储使用情况:"
        du -sh "$BACKUP_DIR" | sed 's/^/  总大小: /'
        echo ""
        echo "最近的备份文件:"
        find "$BACKUP_DIR" -name "*.sql.gz" -type f -printf "  %TY-%Tm-%Td %TH:%TM  %f\n" | sort -r | head -5
        echo ""
        echo "最近的日志:"
        tail -10 "$LOG_FILE" | sed 's/^/  /'
    } > "$report_file"
    
    log_info "备份报告已生成: $report_file"
    log_to_file "备份报告已生成: $report_file"
}

# 主函数
main() {
    case "${1:-daily}" in
        "daily")
            check_environment
            backup_database "daily"
            cleanup_old_backups
            generate_report
            ;;
        "weekly")
            check_environment
            backup_database "weekly"
            cleanup_old_backups
            generate_report
            ;;
        "monthly")
            check_environment
            backup_database "monthly"
            cleanup_old_backups
            generate_report
            ;;
        "cleanup")
            cleanup_old_backups
            ;;
        "verify")
            verify_backups
            ;;
        "report")
            generate_report
            ;;
        "help"|"--help"|"-h")
            echo "数据库备份调度器"
            echo ""
            echo "使用方法:"
            echo "  $0 [command]"
            echo ""
            echo "命令:"
            echo "  daily [默认]   - 执行每日备份"
            echo "  weekly         - 执行每周备份"
            echo "  monthly        - 执行每月备份"
            echo "  cleanup        - 清理旧备份"
            echo "  verify         - 验证备份完整性"
            echo "  report         - 生成备份报告"
            echo "  help           - 显示帮助信息"
            echo ""
            echo "自动调度建议:"
            echo "  # 每日凌晨2点备份"
            echo "  0 2 * * * $0 daily"
            echo ""
            echo "  # 每周日凌晨1点备份"
            echo "  0 1 * * 0 $0 weekly"
            echo ""
            echo "  # 每月1日凌晨0点备份"
            echo "  0 0 1 * * $0 monthly"
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
