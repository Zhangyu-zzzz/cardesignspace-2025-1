#!/bin/bash

# 开发环境服务管理脚本
# 用于启动、停止和管理本地 Docker 开发环境

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
DOCKER_COMPOSE_FILE="$PROJECT_ROOT/docker-compose.dev.yml"

# 检查 Docker 是否运行
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker 未运行，请先启动 Docker"
        exit 1
    fi
}

# 检查环境配置文件
check_env_file() {
    if [ ! -f "$PROJECT_ROOT/.env.dev" ]; then
        log_warn ".env.dev 文件不存在，使用默认配置"
        log_info "建议运行: ./scripts/db-environment.sh switch dev"
    fi
}

# 启动开发环境
start_dev() {
    log_step "启动 CardesignSpace 开发环境"
    
    check_docker
    check_env_file
    
    # 停止可能存在的旧容器
    log_info "停止现有容器..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" down --remove-orphans 2>/dev/null || true
    
    # 清理未使用的镜像和容器
    log_info "清理 Docker 资源..."
    docker system prune -f
    
    # 构建并启动服务
    log_info "构建并启动开发环境..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" up --build -d
    
    # 等待服务启动
    log_info "等待服务启动..."
    sleep 10
    
    # 检查服务状态
    log_info "检查服务状态..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" ps
    
    # 显示服务访问信息
    echo ""
    log_info "开发环境启动完成！"
    echo ""
    echo "📱 服务访问地址："
    echo "   - 前端: http://localhost:8080"
    echo "   - 后端: http://localhost:3000"
    echo "   - 数据库: localhost:3306"
    echo "   - MinIO: http://localhost:9000 (admin: minioadmin/minioadmin)"
    echo "   - Redis: localhost:6379"
    echo ""
    echo "🔧 管理命令："
    echo "   - 查看日志: docker-compose -f docker-compose.dev.yml logs -f"
    echo "   - 停止服务: $0 stop"
    echo "   - 重启服务: $0 restart"
    echo "   - 进入容器: docker exec -it cardesignspace-backend-dev bash"
    echo ""
    echo "📝 开发提示："
    echo "   - 代码修改会自动热重载"
    echo "   - 数据库数据持久化在 Docker volume 中"
    echo "   - 日志文件在 ./backend/logs/ 目录"
}

# 停止开发环境
stop_dev() {
    log_step "停止 CardesignSpace 开发环境"
    
    # 停止所有服务
    docker-compose -f "$DOCKER_COMPOSE_FILE" down
    
    # 可选：清理数据卷（谨慎使用）
    if [ "$1" = "--clean" ]; then
        log_warn "清理数据卷..."
        docker-compose -f "$DOCKER_COMPOSE_FILE" down -v
        docker volume prune -f
        log_info "数据卷已清理"
    fi
    
    log_info "开发环境已停止"
}

# 重启开发环境
restart_dev() {
    log_step "重启开发环境"
    stop_dev
    sleep 2
    start_dev
}

# 查看服务状态
status_dev() {
    log_step "开发环境状态"
    
    if docker-compose -f "$DOCKER_COMPOSE_FILE" ps | grep -q "Up"; then
        log_info "开发环境正在运行"
        docker-compose -f "$DOCKER_COMPOSE_FILE" ps
    else
        log_warn "开发环境未运行"
    fi
}

# 查看日志
logs_dev() {
    log_step "查看开发环境日志"
    docker-compose -f "$DOCKER_COMPOSE_FILE" logs -f
}

# 进入容器
shell_dev() {
    log_step "进入后端容器"
    docker exec -it cardesignspace-backend-dev bash
}

# 显示帮助信息
show_help() {
    echo "开发环境服务管理脚本"
    echo ""
    echo "使用方法:"
    echo "  $0 [command] [options]"
    echo ""
    echo "命令:"
    echo "  start      - 启动开发环境（默认）"
    echo "  stop       - 停止开发环境"
    echo "  restart    - 重启开发环境"
    echo "  status     - 查看服务状态"
    echo "  logs       - 查看服务日志"
    echo "  shell      - 进入后端容器"
    echo "  help       - 显示帮助信息"
    echo ""
    echo "选项:"
    echo "  --clean    - 停止时清理数据卷（仅用于 stop 命令）"
    echo ""
    echo "示例:"
    echo "  $0 start           # 启动开发环境"
    echo "  $0 stop --clean    # 停止并清理数据"
    echo "  $0 restart         # 重启开发环境"
    echo "  $0 logs            # 查看日志"
}

# 主函数
main() {
    case "${1:-start}" in
        "start")
            start_dev
            ;;
        "stop")
            stop_dev "$2"
            ;;
        "restart")
            restart_dev
            ;;
        "status")
            status_dev
            ;;
        "logs")
            logs_dev
            ;;
        "shell")
            shell_dev
            ;;
        "help"|"--help"|"-h")
            show_help
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
