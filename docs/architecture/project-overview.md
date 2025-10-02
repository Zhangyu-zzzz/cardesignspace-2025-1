# CarDesignSpace 项目架构总览

本文档提供 CarDesignSpace 项目的整体架构概览，包括系统组件、数据流、部署架构等核心信息。

## 项目架构图

```mermaid
graph TB
    subgraph "用户层"
        WEB["Web 用户<br/>浏览器访问"]
        MOBILE["移动端用户<br/>响应式界面"]
    end
    
    subgraph "前端层 (Vue 2 SPA)"
        FE_APP["Vue 应用<br/>localhost:8080"]
        FE_COMP["组件层<br/>src/components/"]
        FE_VIEWS["页面层<br/>src/views/"]
        FE_STORE["状态管理<br/>src/store/"]
    end
    
    subgraph "API 网关层"
        NGINX["Nginx 反向代理<br/>负载均衡"]
        CORS["CORS 中间件"]
        AUTH["JWT 认证中间件"]
    end
    
    subgraph "后端服务层 (Express.js)"
        BE_APP["Express 应用<br/>src/app.js"]
        BE_ROUTES["路由层<br/>src/routes/"]
        BE_CTRL["控制器层<br/>src/controllers/"]
        BE_SVC["服务层<br/>src/services/"]
        BE_MW["中间件<br/>src/middleware/"]
    end
    
    subgraph "数据访问层"
        ORM["Sequelize ORM<br/>MySQL 适配器"]
        MODELS["数据模型<br/>src/models/"]
        MIGRATIONS["数据库迁移<br/>migrations/"]
    end
    
    subgraph "数据存储层"
        MYSQL["MySQL 数据库<br/>主数据存储"]
        COS["腾讯云 COS<br/>图片/文件存储"]
        BACKUP["备份存储<br/>NAS + 云端"]
    end
    
    subgraph "外部服务"
        DELL_DB["DELL 数据源<br/>外部车型数据"]
        FRP["FRP 隧道<br/>内网穿透"]
        DNS["DNS 解析<br/>域名管理"]
    end
    
    subgraph "部署环境"
        LOCAL["本地开发<br/>Docker Compose"]
        CLOUD["腾讯云服务器<br/>生产环境"]
        NAS["群晖 NAS<br/>存储与备份"]
    end
    
    %% 用户访问流
    WEB --> NGINX
    MOBILE --> NGINX
    
    %% 前端架构
    NGINX --> FE_APP
    FE_APP --> FE_COMP
    FE_APP --> FE_VIEWS
    FE_APP --> FE_STORE
    
    %% API 调用流
    FE_APP --> CORS
    CORS --> AUTH
    AUTH --> BE_APP
    
    %% 后端架构
    BE_APP --> BE_ROUTES
    BE_ROUTES --> BE_CTRL
    BE_CTRL --> BE_SVC
    BE_CTRL --> BE_MW
    
    %% 数据访问
    BE_SVC --> ORM
    ORM --> MODELS
    MODELS --> MYSQL
    
    %% 文件存储
    BE_SVC --> COS
    
    %% 外部数据源
    BE_SVC --> DELL_DB
    
    %% 部署关系
    LOCAL -.->|"开发环境"| FE_APP
    LOCAL -.->|"开发环境"| BE_APP
    CLOUD -.->|"生产环境"| NGINX
    CLOUD -.->|"生产环境"| BE_APP
    NAS -.->|"存储服务"| BACKUP
    
    %% 网络连接
    FRP -.->|"内网穿透"| LOCAL
    DNS -.->|"域名解析"| CLOUD
    
    %% 样式定义
    classDef userLayer fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef frontendLayer fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef backendLayer fill:#e8f5e8,stroke:#388e3c,stroke-width:2px
    classDef dataLayer fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef externalLayer fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef deployLayer fill:#f1f8e9,stroke:#689f38,stroke-width:2px
    
    class WEB,MOBILE userLayer
    class FE_APP,FE_COMP,FE_VIEWS,FE_STORE frontendLayer
    class BE_APP,BE_ROUTES,BE_CTRL,BE_SVC,BE_MW backendLayer
    class ORM,MODELS,MYSQL,COS,BACKUP dataLayer
    class DELL_DB,FRP,DNS externalLayer
    class LOCAL,CLOUD,NAS deployLayer
```

## 核心组件说明

### 前端架构 (Vue 2 SPA)
- **应用入口**: `frontend/src/main.js`
- **组件系统**: `src/components/` - 可复用 UI 组件
- **页面路由**: `src/views/` - 页面级组件
- **状态管理**: `src/store/` - Vuex 状态管理
- **构建工具**: Vue CLI + Webpack

### 后端架构 (Express.js)
- **应用入口**: `backend/src/app.js`
- **路由层**: `src/routes/` - API 路由定义
- **控制器**: `src/controllers/` - 业务逻辑处理
- **服务层**: `src/services/` - 核心业务服务
- **中间件**: `src/middleware/` - 认证、日志等中间件
- **数据模型**: `src/models/` - Sequelize 模型定义

### 数据架构
- **主数据库**: MySQL - 存储用户、图片、标签等核心数据
- **文件存储**: 腾讯云 COS - 图片和文件对象存储
- **外部数据**: DELL 数据库 - 车型数据源
- **备份策略**: NAS + 云端双重备份

### 部署架构
- **开发环境**: Docker Compose 本地开发
- **生产环境**: 腾讯云轻量服务器
- **网络穿透**: FRP 隧道服务
- **域名管理**: DNS 解析服务

## 数据流说明

1. **用户请求流**: 用户 → Nginx → Vue 前端 → Express API → 数据库
2. **文件上传流**: 前端 → API → 腾讯云 COS → 数据库记录
3. **数据同步流**: DELL 数据源 → ETL 服务 → MySQL → 前端展示
4. **备份流**: MySQL → 定时备份 → NAS 存储 → 云端备份

## 技术栈

- **前端**: Vue 2, Vuex, Vue Router, Element UI
- **后端**: Node.js, Express.js, Sequelize ORM
- **数据库**: MySQL 8.0
- **存储**: 腾讯云 COS
- **部署**: Docker, Nginx, FRP
- **监控**: Winston 日志, 自定义监控脚本

## 相关文档

- [网络架构详细说明](./network-architecture/network-architecture-analysis.md)
- [后端架构详细说明](../development/backend-architecture.md)
- [数据库架构详细说明](../development/database-architecture.md)
- [部署指南](../deployment/)

