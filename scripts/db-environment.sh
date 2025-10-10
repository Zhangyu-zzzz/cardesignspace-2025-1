#!/bin/bash

# 数据库环境配置管理脚本
# 
# 功能：
# 1. 统一管理多环境配置
# 2. 自动切换环境
# 3. 验证环境配置
# 4. 生成环境报告
#
# 使用方法：
# ./scripts/db-environment.sh [command] [options]

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

# 配置
CONFIG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$CONFIG_DIR")"
ENV_DIR="$PROJECT_ROOT/env"
CURRENT_ENV_FILE="$PROJECT_ROOT/.env"

# 环境配置定义
declare -A ENV_CONFIGS=(
    ["production"]="env.production"
    ["backup"]="env.backup"
    ["dev"]="env.dev"
)

# 确保环境目录存在
mkdir -p "$ENV_DIR"

# 创建环境配置文件
create_env_configs() {
    log_step "创建环境配置文件"
    
    # 生产环境配置
    cat > "$ENV_DIR/env.production" << 'EOF'
# 生产环境配置
NODE_ENV=production
PORT=3000

# 数据库配置
DB_HOST=49.235.98.5
DB_PORT=3306
DB_NAME=cardesignspace
DB_USER=Jason
DB_PASSWORD=Jason123456!

# JWT配置
JWT_SECRET=production-jwt-secret-key-2024
JWT_EXPIRES_IN=7d

# 腾讯云COS配置
TENCENT_SECRET_ID=your_production_secret_id
TENCENT_SECRET_KEY=your_production_secret_key
COS_BUCKET=cardesignspace-production
COS_REGION=ap-shanghai
COS_DOMAIN=https://cdn.cardesignspace.com

# 日志配置
LOG_LEVEL=info
LOG_MAX_SIZE=20m
LOG_MAX_FILES=14d

# 安全配置
CORS_ORIGIN=https://cardesignspace.com,https://www.cardesignspace.com
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOF

    # 备份环境配置
    cat > "$ENV_DIR/env.backup" << 'EOF'
# 备份环境配置
NODE_ENV=backup
PORT=3001

# 数据库配置
DB_HOST=124.221.249.173
DB_PORT=44302
DB_NAME=cardesignspace_backup
DB_USER=birdmanoutman
DB_PASSWORD=Zez12345687!

# 备份数据库配置（指向生产）
BACKUP_DB_HOST=49.235.98.5
BACKUP_DB_PORT=3306
BACKUP_DB_NAME=cardesignspace
BACKUP_DB_USER=Jason
BACKUP_DB_PASSWORD=Jason123456!

# JWT配置
JWT_SECRET=backup-jwt-secret-key-2024
JWT_EXPIRES_IN=7d

# 日志配置
LOG_LEVEL=info
LOG_MAX_SIZE=10m
LOG_MAX_FILES=7d

# 同步配置
SYNC_ENABLED=true
SYNC_MODE=incremental
SYNC_SCHEDULE="0 2 * * *"
EOF

    # 开发环境配置（本地和远程开发共用）
    cat > "$ENV_DIR/env.dev" << 'EOF'
# 开发环境配置（本地和远程开发共用）
NODE_ENV=development
PORT=3000

# 数据库配置（支持本地和远程）
DB_HOST=124.221.249.173
DB_PORT=44302
DB_NAME=cardesignspace_dev
DB_USER=birdmanoutman
DB_PASSWORD=Zez12345687!

# 备份数据库配置（指向备份环境）
BACKUP_DB_HOST=124.221.249.173
BACKUP_DB_PORT=44302
BACKUP_DB_NAME=cardesignspace_backup
BACKUP_DB_USER=birdmanoutman
BACKUP_DB_PASSWORD=Zez12345687!

# JWT配置
JWT_SECRET=dev-jwt-secret-key-2024
JWT_EXPIRES_IN=7d

# 腾讯云COS配置（开发环境）
TENCENT_SECRET_ID=your_dev_secret_id
TENCENT_SECRET_KEY=your_dev_secret_key
COS_BUCKET=cardesignspace-dev
COS_REGION=ap-shanghai
COS_DOMAIN=https://dev-cdn.cardesignspace.com

# 日志配置
LOG_LEVEL=debug
LOG_MAX_SIZE=5m
LOG_MAX_FILES=3d

# 开发功能
ENABLE_EXPERIMENTAL_FEATURES=true
ENABLE_DEBUG_ROUTES=true
ENABLE_MOCK_DATA=true
ENABLE_HOT_RELOAD=true

# CORS配置（支持本地和远程开发）
CORS_ORIGIN=http://localhost:8080,http://localhost:3000,https://dev.cardesignspace.com

# 本地开发配置（可选）
# 如果需要在本地使用MySQL，取消注释以下配置
# DB_HOST=localhost
# DB_PORT=3306
# DB_NAME=cardesignspace_dev
# DB_USER=root
# DB_PASSWORD=""
EOF

    log_info "环境配置文件创建完成"
}

# 切换环境
switch_environment() {
    local env_name="$1"
    
    if [ -z "$env_name" ]; then
        log_error "请指定环境名称"
        echo "可用环境: ${!ENV_CONFIGS[@]}"
        exit 1
    fi
    
    if [ -z "${ENV_CONFIGS[$env_name]}" ]; then
        log_error "未知环境: $env_name"
        echo "可用环境: ${!ENV_CONFIGS[@]}"
        exit 1
    fi
    
    local env_file="$ENV_DIR/${ENV_CONFIGS[$env_name]}"
    
    if [ ! -f "$env_file" ]; then
        log_error "环境配置文件不存在: $env_file"
        log_info "请先运行: $0 init"
        exit 1
    fi
    
    log_step "切换到环境: $env_name"
    
    # 备份当前配置
    if [ -f "$CURRENT_ENV_FILE" ]; then
        cp "$CURRENT_ENV_FILE" "$CURRENT_ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    fi
    
    # 复制环境配置
    cp "$env_file" "$CURRENT_ENV_FILE"
    
    log_info "环境切换完成: $env_name"
    log_info "当前环境文件: $CURRENT_ENV_FILE"
}

# 验证环境配置
verify_environment() {
    local env_name="${1:-current}"
    
    log_step "验证环境配置: $env_name"
    
    if [ "$env_name" = "current" ]; then
        local env_file="$CURRENT_ENV_FILE"
    else
        local env_file="$ENV_DIR/${ENV_CONFIGS[$env_name]}"
    fi
    
    if [ ! -f "$env_file" ]; then
        log_error "环境配置文件不存在: $env_file"
        return 1
    fi
    
    # 加载环境变量
    source "$env_file"
    
    local validation_passed=true
    
    # 验证必需配置
    local required_vars=("NODE_ENV" "DB_HOST" "DB_PORT" "DB_NAME" "DB_USER" "JWT_SECRET")
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            log_error "缺少必需配置: $var"
            validation_passed=false
        else
            log_info "✓ $var: ${!var}"
        fi
    done
    
    # 验证数据库连接
    if [ -n "$DB_PASSWORD" ]; then
        local db_password_param="-p$DB_PASSWORD"
    else
        local db_password_param=""
    fi
    
    log_info "测试数据库连接..."
    if mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" $db_password_param -e "SELECT 1;" "$DB_NAME" >/dev/null 2>&1; then
        log_info "✓ 数据库连接成功"
    else
        log_error "✗ 数据库连接失败"
        validation_passed=false
    fi
    
    if [ "$validation_passed" = true ]; then
        log_info "✓ 环境配置验证通过"
        return 0
    else
        log_error "✗ 环境配置验证失败"
        return 1
    fi
}

# 显示环境状态
show_environment_status() {
    log_step "环境状态报告"
    
    echo ""
    echo "=== 环境配置文件 ==="
    for env_name in "${!ENV_CONFIGS[@]}"; do
        local env_file="$ENV_DIR/${ENV_CONFIGS[$env_name]}"
        if [ -f "$env_file" ]; then
            echo "✓ $env_name: $env_file"
        else
            echo "✗ $env_name: 配置文件不存在"
        fi
    done
    
    echo ""
    echo "=== 当前环境 ==="
    if [ -f "$CURRENT_ENV_FILE" ]; then
        echo "当前环境文件: $CURRENT_ENV_FILE"
        echo ""
        echo "主要配置:"
        source "$CURRENT_ENV_FILE"
        echo "  NODE_ENV: ${NODE_ENV:-未设置}"
        echo "  DB_HOST: ${DB_HOST:-未设置}"
        echo "  DB_NAME: ${DB_NAME:-未设置}"
        echo "  PORT: ${PORT:-未设置}"
    else
        echo "当前环境文件不存在"
    fi
    
    echo ""
    echo "=== 数据库状态 ==="
    for env_name in "${!ENV_CONFIGS[@]}"; do
        local env_file="$ENV_DIR/${ENV_CONFIGS[$env_name]}"
        if [ -f "$env_file" ]; then
            source "$env_file"
            echo -n "$env_name: "
            if [ -n "$DB_PASSWORD" ]; then
                local db_password_param="-p$DB_PASSWORD"
            else
                local db_password_param=""
            fi
            
            if mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" $db_password_param -e "SELECT 1;" "$DB_NAME" >/dev/null 2>&1; then
                echo "✓ 连接正常"
            else
                echo "✗ 连接失败"
            fi
        fi
    done
}

# 生成环境报告
generate_report() {
    local report_file="$PROJECT_ROOT/database-environment-report.md"
    
    log_step "生成环境报告"
    
    cat > "$report_file" << 'EOF'
# 数据库环境报告

生成时间: $(date)

## 环境概览

| 环境 | 数据库 | 主机 | 端口 | 状态 |
|------|--------|------|------|------|
EOF

    for env_name in "${!ENV_CONFIGS[@]}"; do
        local env_file="$ENV_DIR/${ENV_CONFIGS[$env_name]}"
        if [ -f "$env_file" ]; then
            source "$env_file"
            local status="未知"
            if [ -n "$DB_PASSWORD" ]; then
                local db_password_param="-p$DB_PASSWORD"
            else
                local db_password_param=""
            fi
            
            if mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" $db_password_param -e "SELECT 1;" "$DB_NAME" >/dev/null 2>&1; then
                status="✓ 正常"
            else
                status="✗ 失败"
            fi
            
            echo "| $env_name | $DB_NAME | $DB_HOST | $DB_PORT | $status |" >> "$report_file"
        fi
    done
    
    cat >> "$report_file" << 'EOF'

## 同步状态

### 生产 → 备份
- 状态: 自动同步
- 频率: 每日 02:00
- 方式: 增量同步

### 备份 → 开发
- 状态: 手动同步
- 频率: 按需
- 方式: 增量同步 + 新功能

### 开发 → 生产
- 状态: 手动部署
- 频率: 功能发布
- 方式: 表结构同步

## 建议操作

1. 定期验证环境配置
2. 监控同步状态
3. 备份重要数据
4. 测试回滚流程

EOF

    log_info "环境报告已生成: $report_file"
}

# 主函数
main() {
    case "${1:-help}" in
        "init")
            create_env_configs
            ;;
        "switch")
            switch_environment "$2"
            ;;
        "verify")
            verify_environment "$2"
            ;;
        "status")
            show_environment_status
            ;;
        "report")
            generate_report
            ;;
        "help"|"--help"|"-h")
            echo "数据库环境配置管理脚本"
            echo ""
            echo "使用方法:"
            echo "  $0 [command] [options]"
            echo ""
            echo "命令:"
            echo "  init                    - 初始化环境配置文件"
            echo "  switch <env>            - 切换到指定环境"
            echo "  verify [env]            - 验证环境配置"
            echo "  status                  - 显示环境状态"
            echo "  report                  - 生成环境报告"
            echo "  help                    - 显示帮助信息"
            echo ""
            echo "可用环境:"
            for env_name in "${!ENV_CONFIGS[@]}"; do
                echo "  - $env_name"
            done
            echo ""
            echo "示例:"
            echo "  $0 init                 # 初始化环境配置"
            echo "  $0 switch dev           # 切换到开发环境"
            echo "  $0 verify production    # 验证生产环境"
            echo "  $0 status               # 查看环境状态"
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
