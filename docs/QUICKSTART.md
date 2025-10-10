# CarDesignSpace 快速上手指南

## 🎯 5分钟快速启动

### 1. 环境准备
```bash
# 确保已安装 Node.js 18+ 和 npm
node --version
npm --version

# 克隆项目（如果还没有）
git clone <repository-url>
cd cardesignspace-2025-1
```

### 2. 一键启动（推荐）
```bash
# Linux/macOS
chmod +x scripts/development/start.sh
./scripts/development/start.sh

# Windows
scripts\development\start.bat
```

### 3. 访问应用
- 前端应用: http://localhost:8080
- 后端API: http://localhost:3000
- API文档: http://localhost:3000/api/docs

## 🐳 Docker 快速启动

### 开发环境
```bash
# 1. 准备环境配置
cp env/env.dev .env.dev

# 2. 启动开发环境
docker-compose -f docker-compose.dev.yml up -d

# 3. 查看服务状态
docker-compose -f docker-compose.dev.yml ps
```

### 生产环境
```bash
# 1. 准备生产配置
cp env/env.production .env

# 2. 启动生产服务
docker-compose up -d

# 3. 检查服务健康状态
docker-compose ps
```

## 🔧 环境管理

### 初始化环境
```bash
# 初始化所有环境配置
./scripts/db-environment.sh init

# 查看环境状态
./scripts/db-environment.sh status
```

### 切换环境
```bash
# 切换到开发环境
./scripts/db-environment.sh switch dev

# 切换到生产环境
./scripts/db-environment.sh switch production

# 切换到备份环境
./scripts/db-environment.sh switch backup
```

### 验证环境
```bash
# 验证当前环境配置
./scripts/db-environment.sh verify

# 验证特定环境
./scripts/db-environment.sh verify dev
```

## 🚀 开发工作流

### 1. 启动开发环境
```bash
# 使用脚本启动
./scripts/dev-server.sh start

# 或手动启动
cd backend && npm run dev &
cd frontend && npm run serve
```

### 2. 开发调试
```bash
# 查看后端日志
./scripts/dev-server.sh logs backend

# 查看前端日志
./scripts/dev-server.sh logs frontend

# 进入后端容器（Docker模式）
./scripts/dev-server.sh shell
```

### 3. 停止开发环境
```bash
# 停止所有服务
./scripts/dev-server.sh stop

# 重启服务
./scripts/dev-server.sh restart
```

## 📊 数据库操作

### 数据同步
```bash
# 从生产环境同步到备份环境
./scripts/incremental-db-sync.sh incremental

# 从备份环境同步到开发环境
./scripts/incremental-db-sync.sh test-dev

# 验证同步结果
./scripts/incremental-db-sync.sh verify
```

### 数据备份
```bash
# 手动备份
./scripts/backup-db.sh

# 设置自动备份
./scripts/db-backup-scheduler.sh daily
```

## 🔍 验证和测试

### 验证脚本
```bash
# 检查标签数据
node scripts/verification/check-tags.js

# 创建测试用户
node scripts/verification/create-test-user.js

# 查找用户
node scripts/verification/find-users.js
```

### 端到端测试
```bash
# 安装 Playwright
npm run playwright:install

# 运行测试
npx playwright test
```

## 🆘 常见问题解决

### 问题 1: 环境配置错误
```bash
# 解决方案
./scripts/db-environment.sh init
./scripts/db-environment.sh verify
```

### 问题 2: 数据库连接失败
```bash
# 检查网络连接
ping 49.235.98.5
ping 124.221.249.173

# 检查环境配置
./scripts/db-environment.sh status
```

### 问题 3: Docker 启动失败
```bash
# 清理 Docker 缓存
docker system prune -a

# 重新构建
docker-compose build --no-cache
```

### 问题 4: 端口占用
```bash
# 检查端口占用
netstat -tulpn | grep :3000
netstat -tulpn | grep :8080

# 停止占用进程
sudo kill -9 <PID>
```

## 📚 更多资源

### 详细文档
- [项目架构文档](docs/architecture/)
- [环境策略指南](scripts/ENVIRONMENTS.md)
- [Docker 使用指南](scripts/DOCKER_GUIDE.md)
- [备份恢复指南](docs/operations/backup-recovery-guide.md)

### 脚本工具
- [脚本目录说明](scripts/README.md)
- [开发环境设置](docs/development/dev-environment-setup.md)
- [贡献指南](AGENTS.md)

### 技术支持
- 查看日志: `./scripts/dev-server.sh logs`
- 环境状态: `./scripts/db-environment.sh status`
- 脚本帮助: `./scripts/[script-name].sh help`

## 🎉 下一步

1. **熟悉项目结构**: 查看 `docs/architecture/` 了解项目架构
2. **配置开发环境**: 参考 `docs/development/dev-environment-setup.md`
3. **了解环境策略**: 阅读 `scripts/ENVIRONMENTS.md`
4. **学习脚本工具**: 查看 `scripts/README.md`
5. **开始开发**: 参考 `AGENTS.md` 了解开发规范

---

*需要帮助？查看 [README.md](README.md) 或联系开发团队*

