# CarDesignSpace 部署架构

本文档详细描述 CarDesignSpace 在生产环境的部署架构和运维策略。

## 部署架构图

```mermaid
graph TB
    subgraph "用户访问层"
        USERS["互联网用户"]
        DOMAIN["域名解析<br/>cardesignspace.com"]
    end
    
    subgraph "CDN 与负载均衡"
        CDN["腾讯云 CDN<br/>静态资源加速"]
        LB["负载均衡器<br/>流量分发"]
    end
    
    subgraph "腾讯云轻量服务器 (124.221.249.173)"
        subgraph "Web 服务层"
            NGINX_PROD["Nginx 生产环境<br/>端口: 80/443<br/>SSL 证书"]
            NGINX_CONF["Nginx 配置<br/>反向代理 + 静态文件"]
        end
        
        subgraph "应用服务层"
            FRONTEND_PROD["前端应用<br/>Vue 2 SPA<br/>静态文件服务"]
            BACKEND_PROD["后端应用<br/>Express.js<br/>Node.js 进程"]
        end
        
        subgraph "数据库服务"
            MYSQL_PROD["MySQL 8.0<br/>主数据库<br/>端口: 3306"]
            REDIS_CACHE["Redis 缓存<br/>会话存储<br/>端口: 6379"]
        end
        
        subgraph "文件存储"
            COS_CLIENT["腾讯云 COS<br/>客户端 SDK<br/>对象存储"]
        end
        
        subgraph "监控与日志"
            LOG_SVC["日志服务<br/>Winston + 文件轮转"]
            MONITOR["监控脚本<br/>系统资源监控"]
        end
        
        subgraph "备份服务"
            BACKUP_SCRIPT["备份脚本<br/>定时数据库备份"]
            BACKUP_STORAGE["备份存储<br/>本地 + 云端"]
        end
    end
    
    subgraph "内网环境 (192.168.31.0/24)"
        subgraph "Dell 工作站 (192.168.31.119)"
            DELL_DEV["开发环境<br/>Docker Compose"]
            DELL_FRPC["FRP 客户端<br/>内网穿透"]
        end
        
        subgraph "群晖 NAS (192.168.31.150)"
            NAS_STORAGE["NAS 存储<br/>数据备份"]
            NAS_FRPC["FRP 客户端<br/>内网穿透"]
            MINIO_SVC["MinIO 服务<br/>S3 兼容存储"]
        end
        
        subgraph "小米路由器 (192.168.31.1)"
            ROUTER["路由器<br/>内网网关"]
        end
    end
    
    subgraph "外部服务"
        TENCENT_COS["腾讯云 COS<br/>对象存储服务"]
        TENCENT_CDN["腾讯云 CDN<br/>内容分发网络"]
        DNSPOD["DNSPod<br/>DNS 解析服务"]
        DELL_DB["DELL 数据源<br/>外部车型数据"]
    end
    
    subgraph "CI/CD 流水线"
        GITHUB["GitHub<br/>代码仓库"]
        GITHUB_ACTIONS["GitHub Actions<br/>自动化部署"]
        SSH_DEPLOY["SSH 部署<br/>服务器连接"]
    end
    
    %% 用户访问流
    USERS --> DOMAIN
    DOMAIN --> DNSPOD
    DNSPOD --> LB
    LB --> CDN
    CDN --> NGINX_PROD
    
    %% 生产环境内部流
    NGINX_PROD --> NGINX_CONF
    NGINX_CONF --> FRONTEND_PROD
    NGINX_CONF --> BACKEND_PROD
    
    %% 应用服务连接
    BACKEND_PROD --> MYSQL_PROD
    BACKEND_PROD --> REDIS_CACHE
    BACKEND_PROD --> COS_CLIENT
    
    %% 外部服务连接
    COS_CLIENT --> TENCENT_COS
    CDN --> TENCENT_CDN
    
    %% 内网穿透连接
    DELL_FRPC -.->|"FRP 隧道"| NGINX_PROD
    NAS_FRPC -.->|"FRP 隧道"| NGINX_PROD
    
    %% 内网连接
    DELL_DEV -.->|"有线连接"| ROUTER
    NAS_STORAGE -.->|"有线连接"| ROUTER
    
    %% 数据同步
    BACKEND_PROD --> DELL_DB
    BACKUP_SCRIPT --> MYSQL_PROD
    BACKUP_SCRIPT --> NAS_STORAGE
    BACKUP_SCRIPT --> BACKUP_STORAGE
    
    %% CI/CD 流程
    GITHUB --> GITHUB_ACTIONS
    GITHUB_ACTIONS --> SSH_DEPLOY
    SSH_DEPLOY --> NGINX_PROD
    SSH_DEPLOY --> BACKEND_PROD
    
    %% 监控连接
    MONITOR --> MYSQL_PROD
    MONITOR --> BACKEND_PROD
    LOG_SVC --> BACKEND_PROD
    
    %% 样式定义
    classDef userLayer fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef cdnLayer fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef prodLayer fill:#e8f5e8,stroke:#388e3c,stroke-width:2px
    classDef localLayer fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef externalLayer fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef cicdLayer fill:#f1f8e9,stroke:#689f38,stroke-width:2px
    
    class USERS,DOMAIN userLayer
    class CDN,LB cdnLayer
    class NGINX_PROD,NGINX_CONF,FRONTEND_PROD,BACKEND_PROD,MYSQL_PROD,REDIS_CACHE,COS_CLIENT,LOG_SVC,MONITOR,BACKUP_SCRIPT,BACKUP_STORAGE prodLayer
    class DELL_DEV,DELL_FRPC,NAS_STORAGE,NAS_FRPC,MINIO_SVC,ROUTER localLayer
    class TENCENT_COS,TENCENT_CDN,DNSPOD,DELL_DB externalLayer
    class GITHUB,GITHUB_ACTIONS,SSH_DEPLOY cicdLayer
```

## 部署环境说明

### 生产环境 (腾讯云轻量服务器)
- **服务器配置**: 2核4GB，40GB SSD
- **操作系统**: Ubuntu 20.04 LTS
- **公网 IP**: 124.221.249.173
- **域名**: cardesignspace.com

### 服务端口配置
```yaml
# 生产环境端口映射
nginx: 80/443 (HTTP/HTTPS)
backend: 3000 (内部端口)
mysql: 3306 (内部端口)
redis: 6379 (内部端口)
```

### 内网环境
- **Dell 工作站**: 192.168.31.119 (开发环境)
- **群晖 NAS**: 192.168.31.150 (存储与备份)
- **路由器**: 192.168.31.1 (内网网关)

## 部署流程

### 1. 自动化部署流程
```mermaid
sequenceDiagram
    participant DEV as 开发者
    participant GH as GitHub
    participant GA as GitHub Actions
    participant SERVER as 生产服务器
    participant NGINX as Nginx
    participant APP as 应用服务
    
    DEV->>GH: 推送代码到 main 分支
    GH->>GA: 触发 CI/CD 流水线
    GA->>GA: 运行测试和构建
    GA->>SERVER: SSH 连接服务器
    SERVER->>SERVER: 拉取最新代码
    SERVER->>SERVER: 安装依赖和构建
    SERVER->>APP: 重启应用服务
    SERVER->>NGINX: 重新加载配置
    NGINX-->>APP: 健康检查
    APP-->>SERVER: 服务就绪
    SERVER-->>GA: 部署完成
    GA-->>DEV: 通知部署结果
```

### 2. 手动部署流程
```bash
# 1. 连接到生产服务器
ssh root@124.221.249.173

# 2. 进入项目目录
cd /opt/cardesignspace

# 3. 拉取最新代码
git pull origin main

# 4. 安装依赖
cd backend && npm install
cd ../frontend && npm install

# 5. 构建前端
npm run build

# 6. 重启后端服务
pm2 restart backend

# 7. 重新加载 Nginx
nginx -s reload
```

## 监控与运维

### 1. 系统监控
- **CPU 使用率**: 实时监控服务器 CPU 负载
- **内存使用率**: 监控内存使用情况
- **磁盘空间**: 定期检查磁盘使用率
- **网络流量**: 监控入站和出站流量

### 2. 应用监控
- **服务状态**: PM2 进程管理监控
- **数据库连接**: MySQL 连接池监控
- **API 响应时间**: 接口性能监控
- **错误日志**: 应用错误日志收集

### 3. 备份策略
```mermaid
gantt
    title 备份策略时间表
    dateFormat HH:mm
    axisFormat %H:%M
    
    section 数据库备份
    每日全量备份    :active, db1, 02:00, 1h
    每小时增量备份  :db2, 03:00, 30m
    
    section 文件备份
    每日文件同步    :file1, 04:00, 2h
    每周归档备份    :file2, 05:00, 3h
    
    section 配置备份
    每日配置备份    :config1, 06:00, 30m
    每周配置归档    :config2, 07:00, 1h
```

### 4. 日志管理
- **应用日志**: Winston 日志轮转
- **访问日志**: Nginx 访问日志
- **错误日志**: 系统错误日志收集
- **审计日志**: 用户操作审计

## 安全策略

### 1. 网络安全
- **防火墙**: UFW 防火墙配置
- **SSL 证书**: Let's Encrypt 自动续期
- **访问控制**: IP 白名单限制
- **DDoS 防护**: 腾讯云 DDoS 防护

### 2. 应用安全
- **JWT 认证**: 用户身份验证
- **CORS 配置**: 跨域请求控制
- **输入验证**: 参数验证和过滤
- **SQL 注入防护**: 参数化查询

### 3. 数据安全
- **数据加密**: 敏感数据加密存储
- **备份加密**: 备份文件加密
- **访问控制**: 数据库用户权限管理
- **审计日志**: 数据访问审计

## 性能优化

### 1. 前端优化
- **静态资源**: CDN 加速
- **图片优化**: WebP 格式转换
- **代码分割**: 按需加载
- **缓存策略**: 浏览器缓存

### 2. 后端优化
- **数据库索引**: 查询性能优化
- **连接池**: 数据库连接复用
- **缓存策略**: Redis 缓存
- **压缩传输**: Gzip 压缩

### 3. 存储优化
- **对象存储**: 腾讯云 COS
- **图片处理**: 多尺寸生成
- **CDN 加速**: 全球节点分发
- **存储分层**: 热冷数据分离

## 故障恢复

### 1. 服务恢复
- **自动重启**: PM2 自动重启
- **健康检查**: 服务健康检查
- **故障转移**: 备用服务切换
- **回滚机制**: 快速版本回滚

### 2. 数据恢复
- **数据库恢复**: 从备份恢复数据
- **文件恢复**: 从 COS 恢复文件
- **配置恢复**: 从备份恢复配置
- **完整恢复**: 系统完整恢复流程

## 相关文档

- [项目架构总览](./project-overview.md)
- [应用架构与数据流](./application-flow.md)
- [网络架构详细说明](./network-architecture/network-architecture-analysis.md)
- [腾讯云部署指南](../deployment/tencent-cloud.md)
- [Ubuntu 部署指南](../deployment/ubuntu.md)

