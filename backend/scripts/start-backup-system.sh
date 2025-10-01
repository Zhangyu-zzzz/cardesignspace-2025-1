#!/bin/bash

# 备份系统启动脚本
# 
# 功能：
# 1. 初始化S3存储配置
# 2. 启动备份调度器
# 3. 启动监控界面
# 4. 提供完整的管理命令
#
# 使用方法：
# ./start-backup-system.sh [command] [options]
#
# 命令：
# setup        初始化S3配置
# start        启动备份调度器
# monitor      启动监控界面
# stop         停止所有服务
# status       查看状态
# test         测试备份功能
# help         显示帮助

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
BACKEND_DIR="$PROJECT_ROOT"
LOG_DIR="$PROJECT_ROOT/logs"
PID_DIR="$PROJECT_ROOT"

# 确保日志目录存在
mkdir -p "$LOG_DIR"

# 检查环境
check_environment() {
    log_step "检查环境配置"
    
    # 检查Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装"
        exit 1
    fi
    
    # 检查npm包
    cd "$BACKEND_DIR"
    if [ ! -d "node_modules" ]; then
        log_warn "依赖包未安装，正在安装..."
        npm install
    fi
    
    # 检查环境变量文件
    if [ ! -f ".env" ]; then
        log_error "环境变量文件 .env 不存在"
        exit 1
    fi
    
    # 检查必需的环境变量
    source .env
    required_vars=(
        "DB_HOST" "DB_NAME" "DB_USER" "DB_PASSWORD"
        "TENCENT_SECRET_ID" "TENCENT_SECRET_KEY" "COS_BUCKET"
        "S3_ENDPOINT" "S3_BUCKET" "S3_ACCESS_KEY" "S3_SECRET_KEY"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            log_error "环境变量 $var 未设置"
            exit 1
        fi
    done
    
    log_info "环境检查通过"
}

# 初始化S3配置
setup_s3() {
    log_step "初始化S3存储配置"
    
    cd "$BACKEND_DIR"
    node scripts/setup-s3-backup.js --all
    
    if [ $? -eq 0 ]; then
        log_info "S3配置完成"
    else
        log_error "S3配置失败"
        exit 1
    fi
}

# 启动备份调度器
start_scheduler() {
    log_step "启动备份调度器"
    
    cd "$BACKEND_DIR"
    
    # 检查是否已在运行
    if [ -f "$PID_DIR/backup-scheduler.pid" ]; then
        local pid=$(cat "$PID_DIR/backup-scheduler.pid")
        if ps -p "$pid" > /dev/null 2>&1; then
            log_warn "备份调度器已在运行 (PID: $pid)"
            return 0
        else
            rm -f "$PID_DIR/backup-scheduler.pid"
        fi
    fi
    
    # 启动调度器
    nohup node scripts/backup-scheduler.js --daemon --low-traffic > "$LOG_DIR/backup-scheduler.log" 2>&1 &
    local pid=$!
    echo $pid > "$PID_DIR/backup-scheduler.pid"
    
    sleep 2
    
    if ps -p "$pid" > /dev/null 2>&1; then
        log_info "备份调度器启动成功 (PID: $pid)"
    else
        log_error "备份调度器启动失败"
        exit 1
    fi
}

# 启动监控界面
start_monitor() {
    log_step "启动监控界面"
    
    cd "$BACKEND_DIR"
    
    # 检查是否已在运行
    if [ -f "$PID_DIR/backup-monitor.pid" ]; then
        local pid=$(cat "$PID_DIR/backup-monitor.pid")
        if ps -p "$pid" > /dev/null 2>&1; then
            log_warn "监控界面已在运行 (PID: $pid)"
            return 0
        else
            rm -f "$PID_DIR/backup-monitor.pid"
        fi
    fi
    
    # 启动监控界面
    nohup node scripts/backup-monitor.js --web --port=3001 > "$LOG_DIR/backup-monitor.log" 2>&1 &
    local pid=$!
    echo $pid > "$PID_DIR/backup-monitor.pid"
    
    sleep 2
    
    if ps -p "$pid" > /dev/null 2>&1; then
        log_info "监控界面启动成功 (PID: $pid)"
        log_info "访问地址: http://localhost:3001"
    else
        log_error "监控界面启动失败"
        exit 1
    fi
}

# 停止所有服务
stop_services() {
    log_step "停止所有服务"
    
    # 停止调度器
    if [ -f "$PID_DIR/backup-scheduler.pid" ]; then
        local pid=$(cat "$PID_DIR/backup-scheduler.pid")
        if ps -p "$pid" > /dev/null 2>&1; then
            log_info "停止备份调度器 (PID: $pid)"
            kill "$pid"
            rm -f "$PID_DIR/backup-scheduler.pid"
        fi
    fi
    
    # 停止监控界面
    if [ -f "$PID_DIR/backup-monitor.pid" ]; then
        local pid=$(cat "$PID_DIR/backup-monitor.pid")
        if ps -p "$pid" > /dev/null 2>&1; then
            log_info "停止监控界面 (PID: $pid)"
            kill "$pid"
            rm -f "$PID_DIR/backup-monitor.pid"
        fi
    fi
    
    # 停止备份任务
    pkill -f "cos-to-s3-backup.js" || true
    
    log_info "所有服务已停止"
}

# 查看状态
show_status() {
    log_step "查看服务状态"
    
    echo "=== 备份调度器状态 ==="
    if [ -f "$PID_DIR/backup-scheduler.pid" ]; then
        local pid=$(cat "$PID_DIR/backup-scheduler.pid")
        if ps -p "$pid" > /dev/null 2>&1; then
            echo "状态: 运行中 (PID: $pid)"
        else
            echo "状态: 已停止"
            rm -f "$PID_DIR/backup-scheduler.pid"
        fi
    else
        echo "状态: 未启动"
    fi
    
    echo ""
    echo "=== 监控界面状态 ==="
    if [ -f "$PID_DIR/backup-monitor.pid" ]; then
        local pid=$(cat "$PID_DIR/backup-monitor.pid")
        if ps -p "$pid" > /dev/null 2>&1; then
            echo "状态: 运行中 (PID: $pid)"
            echo "访问地址: http://localhost:3001"
        else
            echo "状态: 已停止"
            rm -f "$PID_DIR/backup-monitor.pid"
        fi
    else
        echo "状态: 未启动"
    fi
    
    echo ""
    echo "=== 备份任务状态 ==="
    if pgrep -f "cos-to-s3-backup.js" > /dev/null; then
        echo "状态: 运行中"
        pgrep -f "cos-to-s3-backup.js" | while read pid; do
            echo "  PID: $pid"
        done
    else
        echo "状态: 无运行中的备份任务"
    fi
    
    echo ""
    echo "=== 最近日志 ==="
    if [ -f "$LOG_DIR/backup-scheduler.log" ]; then
        echo "调度器日志 (最后5行):"
        tail -5 "$LOG_DIR/backup-scheduler.log"
    fi
    
    if [ -f "$LOG_DIR/backup-monitor.log" ]; then
        echo ""
        echo "监控日志 (最后5行):"
        tail -5 "$LOG_DIR/backup-monitor.log"
    fi
}

# 测试备份功能
test_backup() {
    log_step "测试备份功能"
    
    cd "$BACKEND_DIR"
    
    log_info "执行测试备份 (仅处理10张图片)"
    node scripts/cos-to-s3-backup.js --batch-size=10 --dry-run
    
    if [ $? -eq 0 ]; then
        log_info "测试备份完成"
        
        log_info "验证备份完整性"
        node scripts/backup-monitor.js --verify --sample-size=5
        
    else
        log_error "测试备份失败"
        exit 1
    fi
}

# 显示帮助
show_help() {
    echo "备份系统管理脚本"
    echo ""
    echo "使用方法:"
    echo "  $0 [command] [options]"
    echo ""
    echo "命令:"
    echo "  setup        初始化S3存储配置"
    echo "  start        启动备份调度器"
    echo "  monitor      启动监控界面"
    echo "  stop         停止所有服务"
    echo "  status       查看服务状态"
    echo "  test         测试备份功能"
    echo "  help         显示帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 setup                    # 初始化配置"
    echo "  $0 start                    # 启动调度器"
    echo "  $0 monitor                  # 启动监控"
    echo "  $0 status                   # 查看状态"
    echo "  $0 test                     # 测试功能"
    echo ""
    echo "注意事项:"
    echo "  - 首次使用请先执行 'setup' 命令"
    echo "  - 备份任务会在业务低峰期自动运行"
    echo "  - 可通过监控界面实时查看进度"
    echo "  - 所有日志保存在 logs/ 目录"
}

# 主程序
main() {
    case "${1:-help}" in
        "setup")
            check_environment
            setup_s3
            ;;
        "start")
            check_environment
            start_scheduler
            ;;
        "monitor")
            check_environment
            start_monitor
            ;;
        "stop")
            stop_services
            ;;
        "status")
            show_status
            ;;
        "test")
            check_environment
            test_backup
            ;;
        "help"|"--help"|"-h")
            show_help
            ;;
        *)
            log_error "未知命令: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# 执行主程序
main "$@"
