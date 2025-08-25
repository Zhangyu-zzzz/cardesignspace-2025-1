#!/bin/bash

# 数据库备份脚本
set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# 检查环境变量
check_env() {
    if [ -z "$MYSQL_ROOT_PASSWORD" ]; then
        log_error "MYSQL_ROOT_PASSWORD 环境变量未设置"
        exit 1
    fi
    
    if [ -z "$MYSQL_DATABASE" ]; then
        export MYSQL_DATABASE=auto_gallery
        log_warn "MYSQL_DATABASE 未设置，使用默认值: auto_gallery"
    fi
}

# 创建备份目录
create_backup_dir() {
    BACKUP_DIR="./backups"
    mkdir -p "$BACKUP_DIR"
    
    # 清理旧备份（保留最近7天的）
    find "$BACKUP_DIR" -name "backup_*.sql" -mtime +7 -delete 2>/dev/null || true
    
    log_info "备份目录: $BACKUP_DIR"
}

# 备份数据库
backup_database() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="./backups/backup_${timestamp}.sql"
    
    log_info "开始备份数据库: $MYSQL_DATABASE"
    
    # 检查MySQL容器是否运行
    if ! docker ps | grep -q auto-gallery-mysql; then
        log_error "MySQL容器未运行，无法备份数据库"
        return 1
    fi
    
    # 执行备份
    if docker exec auto-gallery-mysql mysqldump \
        -u root \
        -p"$MYSQL_ROOT_PASSWORD" \
        --single-transaction \
        --routines \
        --triggers \
        "$MYSQL_DATABASE" > "$backup_file" 2>/dev/null; then
        
        # 压缩备份文件
        gzip "$backup_file"
        local compressed_file="${backup_file}.gz"
        
        # 检查备份文件大小
        local file_size=$(du -h "$compressed_file" | cut -f1)
        
        log_info "数据库备份完成: $compressed_file (大小: $file_size)"
        
        # 验证备份文件
        if [ -s "$compressed_file" ]; then
            log_info "备份文件验证成功"
            return 0
        else
            log_error "备份文件为空或损坏"
            rm -f "$compressed_file"
            return 1
        fi
    else
        log_error "数据库备份失败"
        return 1
    fi
}

# 主函数
main() {
    case "$1" in
        "backup")
            check_env
            create_backup_dir
            backup_database
            ;;
        "help"|"--help"|"-h")
            echo "用法: $0 {backup|help}"
            echo ""
            echo "命令:"
            echo "  backup [默认]  - 备份数据库"
            echo "  help          - 显示帮助信息"
            ;;
        "")
            # 默认执行备份
            check_env
            create_backup_dir
            backup_database
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
