#!/bin/bash

# 本地开发环境启动脚本
# 用于快速启动实验性功能开发环境

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
ENV_FILE="$PROJECT_ROOT/.env.local"
DOCKER_COMPOSE_FILE="$PROJECT_ROOT/docker-compose.dev.yml"

# 检查环境文件
check_env_file() {
    log_step "检查环境配置文件"
    
    if [ ! -f "$ENV_FILE" ]; then
        log_error "本地开发环境配置文件不存在: $ENV_FILE"
        log_info "请先创建 .env.local 文件"
        exit 1
    fi
    
    log_info "环境配置文件检查通过"
}

# 检查Docker
check_docker() {
    log_step "检查Docker环境"
    
    if ! command -v docker >/dev/null 2>&1; then
        log_error "Docker未安装"
        exit 1
    fi
    
    if ! command -v docker-compose >/dev/null 2>&1; then
        log_error "Docker Compose未安装"
        exit 1
    fi
    
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker服务未运行"
        exit 1
    fi
    
    log_info "Docker环境检查通过"
}

# 创建必要的目录
create_directories() {
    log_step "创建必要的目录"
    
    mkdir -p "$PROJECT_ROOT/backend/uploads/dev"
    mkdir -p "$PROJECT_ROOT/backend/logs"
    mkdir -p "$PROJECT_ROOT/frontend/dist"
    
    log_info "目录创建完成"
}

# 启动开发环境
start_dev_environment() {
    log_step "启动本地开发环境"
    
    # 加载环境变量
    export $(cat "$ENV_FILE" | grep -v '^#' | xargs)
    
    # 启动服务
    docker-compose -f "$DOCKER_COMPOSE_FILE" --env-file "$ENV_FILE" up -d
    
    log_info "开发环境启动完成"
}

# 等待服务就绪
wait_for_services() {
    log_step "等待服务就绪"
    
    # 等待数据库
    if [ "${DB_HOST:-}" = "mysql-dev" ] || [ "${DB_HOST:-}" = "localhost" ]; then
        log_info "等待本地MySQL容器启动..."
        timeout=60
        while [ $timeout -gt 0 ]; do
            if docker exec cardesignspace-mysql-dev mysqladmin ping -h localhost --silent 2>/dev/null; then
                log_info "MySQL数据库已就绪"
                break
            fi
            sleep 2
            timeout=$((timeout - 2))
        done
        
        if [ $timeout -le 0 ]; then
            log_error "MySQL数据库启动超时"
            exit 1
        fi
    else
        log_info "使用远程数据库 ${DB_HOST}:${DB_PORT}，跳过本地MySQL检查"
    fi
    
    # 等待MinIO
    if [ "${STORAGE_DRIVER:-minio}" = "minio" ]; then
        log_info "等待MinIO存储启动..."
        timeout=30
        while [ $timeout -gt 0 ]; do
            if curl -s http://localhost:9000/minio/health/live >/dev/null 2>&1; then
                log_info "MinIO存储已就绪"
                break
            fi
            sleep 2
            timeout=$((timeout - 2))
        done
        
        if [ $timeout -le 0 ]; then
            log_warn "MinIO存储启动超时，但继续执行"
        fi
    else
        log_info "跳过本地 MinIO 检查 (当前存储驱动: ${STORAGE_DRIVER})"
    fi
    
    # 等待后端服务
    log_info "等待后端服务启动..."
    timeout=60
    while [ $timeout -gt 0 ]; do
        if curl -s http://localhost:3000/api/health >/dev/null 2>&1; then
            log_info "后端服务已就绪"
            break
        fi
        sleep 2
        timeout=$((timeout - 2))
    done
    
    if [ $timeout -le 0 ]; then
        log_warn "后端服务启动超时，但继续执行"
    fi
}

# 显示服务状态
show_status() {
    log_step "显示服务状态"
    
    echo ""
    echo "🚀 本地开发环境已启动"
    echo "=================================="
    echo ""
    echo "📊 服务状态:"
    docker-compose -f "$DOCKER_COMPOSE_FILE" ps
    echo ""
    echo "🌐 访问地址:"
    echo "  前端应用: http://localhost:8080"
    echo "  后端API: http://localhost:3000"
    echo "  S3控制台: ${S3_DOMAIN:-https://minio.birdmanoutman.com}"
    echo "  MySQL数据库: ${DB_HOST:-remote}:${DB_PORT:-3306}"
    echo ""
    echo "🔧 开发工具:"
    echo "  查看日志: docker-compose -f $DOCKER_COMPOSE_FILE logs -f"
    echo "  停止服务: docker-compose -f $DOCKER_COMPOSE_FILE down"
    echo "  重启服务: docker-compose -f $DOCKER_COMPOSE_FILE restart"
    echo ""
    echo "📝 实验性功能:"
    echo "  - AI图片分析: 已启用"
    echo "  - 新标签系统: 已启用"
    echo "  - 高级筛选: 已启用"
    echo "  - 批量处理: 已禁用"
    echo ""
}

# 清理函数
cleanup() {
    log_info "清理资源..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" down
}

# 主函数
main() {
    case "${1:-start}" in
        "start")
            check_env_file
            check_docker
            create_directories
            start_dev_environment
            wait_for_services
            show_status
            ;;
        "stop")
            log_step "停止开发环境"
            cleanup
            log_info "开发环境已停止"
            ;;
        "restart")
            log_step "重启开发环境"
            cleanup
            sleep 2
            main start
            ;;
        "status")
            show_status
            ;;
        "logs")
            docker-compose -f "$DOCKER_COMPOSE_FILE" logs -f "${2:-}"
            ;;
        "help"|"--help"|"-h")
            echo "本地开发环境管理脚本"
            echo ""
            echo "使用方法:"
            echo "  $0 [command]"
            echo ""
            echo "命令:"
            echo "  start [默认]  - 启动开发环境"
            echo "  stop          - 停止开发环境"
            echo "  restart       - 重启开发环境"
            echo "  status        - 显示服务状态"
            echo "  logs [service] - 查看服务日志"
            echo "  help          - 显示帮助信息"
            ;;
        *)
            log_error "未知命令: $1"
            echo "使用 '$0 help' 查看帮助信息"
            exit 1
            ;;
    esac
}

# 捕获中断信号
trap cleanup INT TERM

# 执行主函数
main "$@"
