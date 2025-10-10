# CarDesignSpace Docker 使用指南

## 🐳 Docker 架构概览

CarDesignSpace 使用 Docker 容器化部署，支持生产环境和开发环境两种模式。

```
生产环境                   开发环境
┌─────────────────┐      ┌─────────────────┐
│ docker-compose  │      │ docker-compose  │
│ .yml            │      │ .dev.yml        │
├─────────────────┤      ├─────────────────┤
│ backend         │      │ backend-dev     │
│ (Node.js API)   │      │ (热重载)        │
├─────────────────┤      ├─────────────────┤
│ frontend        │      │ frontend-dev    │
│ (Nginx静态)     │      │ (热重载)        │
└─────────────────┘      └─────────────────┘
```

## 📁 Dockerfile 说明

### 后端服务

#### `backend/Dockerfile` - 生产环境
- **基础镜像**: Node.js 18 Alpine
- **特点**: 优化构建、安全配置、健康检查
- **用途**: 生产环境部署
- **体积**: 最小化生产镜像

#### `backend/Dockerfile.local` - 本地开发
- **基础镜像**: Node.js 18 Alpine (linux/amd64)
- **特点**: 快速构建、简化依赖
- **用途**: 本地开发环境
- **体积**: 轻量化开发镜像

#### `backend/Dockerfile.optimized` - CI/CD 优化
- **基础镜像**: Node.js 18 Alpine
- **特点**: 解决构建超时、增强重试机制
- **用途**: CI/CD 流水线
- **体积**: 优化构建成功率

### 前端服务

#### `frontend/Dockerfile` - 生产环境
- **构建阶段**: Node.js 16 Alpine (Vue 2 构建)
- **运行阶段**: Nginx Alpine (静态文件服务)
- **特点**: 多阶段构建、健康检查
- **用途**: 生产环境前端部署

## 🚀 快速开始

### 生产环境部署
```bash
# 1. 准备环境配置
cp env/env.production .env

# 2. 构建并启动服务
docker-compose up -d

# 3. 检查服务状态
docker-compose ps

# 4. 查看日志
docker-compose logs -f
```

### 开发环境启动
```bash
# 1. 准备开发配置
cp env/env.dev .env.dev

# 2. 启动开发环境
docker-compose -f docker-compose.dev.yml up -d

# 3. 查看开发日志
docker-compose -f docker-compose.dev.yml logs -f
```

## 🔧 环境管理

### 环境切换
```bash
# 切换到生产环境
./scripts/db-environment.sh switch production
docker-compose up -d

# 切换到开发环境
./scripts/db-environment.sh switch dev
docker-compose -f docker-compose.dev.yml up -d
```

### 服务管理
```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 重新构建
docker-compose build --no-cache
```

## 📊 服务配置详解

### 生产环境服务

#### Backend 服务
```yaml
backend:
  build:
    context: ./backend
    dockerfile: Dockerfile
  container_name: auto-gallery-backend
  restart: unless-stopped
  environment:
    NODE_ENV: production
    DB_HOST: 49.235.98.5
    DB_PORT: 3306
    DB_NAME: cardesignspace
    DB_USER: Jason
    DB_PASSWORD: Jason123456!
  ports:
    - "3001:3000"
  volumes:
    - ./backend/uploads:/app/uploads
    - ./backend/logs:/app/logs
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
    interval: 30s
    timeout: 10s
    retries: 3
```

#### Frontend 服务
```yaml
frontend:
  build:
    context: ./frontend
    dockerfile: Dockerfile
  container_name: auto-gallery-frontend
  restart: unless-stopped
  ports:
    - "8080:80"
  depends_on:
    - backend
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost/health"]
    interval: 30s
    timeout: 10s
    retries: 3
```

### 开发环境服务

#### Backend Dev 服务
```yaml
backend-dev:
  image: ghcr.io/catthehacker/ubuntu:act-latest
  container_name: cardesignspace-backend-dev
  restart: unless-stopped
  env_file:
    - .env.dev
  environment:
    NODE_ENV: development
    ENABLE_EXPERIMENTAL_FEATURES: true
    STORAGE_DRIVER: s3
  ports:
    - "3000:3000"
  volumes:
    - ./backend:/app
  command: bash -lc "npm install --legacy-peer-deps && npm run dev"
```

#### Frontend Dev 服务
```yaml
frontend-dev:
  image: ghcr.io/catthehacker/ubuntu:act-latest
  container_name: cardesignspace-frontend-dev
  restart: unless-stopped
  env_file:
    - .env.dev
  environment:
    NODE_ENV: development
    VUE_APP_API_URL: http://localhost:3000/api
  ports:
    - "8080:8080"
  volumes:
    - ./frontend:/app
  depends_on:
    backend-dev:
      condition: service_healthy
  command: bash -lc "npm install --legacy-peer-deps && npm run serve -- --host 0.0.0.0 --port 8080"
```

## 🔍 故障排除

### 常见问题

#### 1. 构建失败
```bash
# 清理 Docker 缓存
docker system prune -a

# 重新构建
docker-compose build --no-cache

# 检查网络连接
docker run --rm alpine ping -c 3 registry.npmmirror.com
```

#### 2. 服务启动失败
```bash
# 检查容器日志
docker-compose logs [service-name]

# 检查端口占用
netstat -tulpn | grep :3000
netstat -tulpn | grep :8080

# 检查环境变量
docker-compose config
```

#### 3. 数据库连接问题
```bash
# 测试数据库连接
docker run --rm mysql:8.0 mysql -h49.235.98.5 -P3306 -uJason -pJason123456! cardesignspace -e "SELECT 1;"

# 检查网络连通性
docker run --rm alpine ping -c 3 49.235.98.5
```

#### 4. 健康检查失败
```bash
# 手动测试健康检查
curl -f http://localhost:3000/api/health
curl -f http://localhost:8080/health

# 检查服务状态
docker-compose ps
```

### 调试技巧

#### 进入容器调试
```bash
# 进入后端容器
docker-compose exec backend sh

# 进入前端容器
docker-compose exec frontend sh

# 进入开发环境容器
docker-compose -f docker-compose.dev.yml exec backend-dev bash
```

#### 查看实时日志
```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend

# 查看开发环境日志
docker-compose -f docker-compose.dev.yml logs -f
```

#### 性能监控
```bash
# 查看容器资源使用
docker stats

# 查看容器详细信息
docker inspect [container-name]

# 查看镜像大小
docker images
```

## 🔧 高级配置

### 自定义网络
```yaml
networks:
  auto-gallery-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

### 数据持久化
```yaml
volumes:
  backend-uploads:
    driver: local
  backend-logs:
    driver: local
```

### 环境变量管理
```bash
# 使用 .env 文件
docker-compose --env-file .env up -d

# 使用多个环境文件
docker-compose --env-file .env --env-file .env.local up -d
```

## 📈 性能优化

### 镜像优化
- 使用 Alpine 基础镜像
- 多阶段构建减少镜像大小
- 清理构建缓存和临时文件

### 构建优化
- 使用 .dockerignore 排除不必要文件
- 优化 Dockerfile 层缓存
- 并行构建多个服务

### 运行时优化
- 设置合适的资源限制
- 使用健康检查监控服务状态
- 配置日志轮转

## 🛡️ 安全最佳实践

### 镜像安全
- 使用官方基础镜像
- 定期更新基础镜像
- 扫描镜像漏洞

### 运行时安全
- 使用非 root 用户运行
- 限制容器权限
- 使用只读文件系统

### 网络安全
- 使用自定义网络
- 限制端口暴露
- 使用 TLS 加密

## 📞 支持和维护

### 日常维护
- 定期更新镜像
- 监控资源使用
- 清理无用镜像和容器

### 故障恢复
- 备份重要数据
- 准备回滚方案
- 建立监控告警

---

*最后更新: 2025-01-10*
*版本: 1.0*

