# CarDesignSpace 应用架构与数据流

本文档详细描述 CarDesignSpace 应用的核心架构和数据流转过程。

## 应用架构图

```mermaid
graph TB
    subgraph "前端层 (Vue 2 SPA)"
        subgraph "用户界面"
            UI["用户界面<br/>响应式设计"]
            COMP["组件层<br/>ImageGallery, ModelList<br/>TagFilter, SearchBox"]
            VIEWS["页面层<br/>Home, Gallery<br/>ModelDetail, Admin"]
        end
        
        subgraph "状态管理"
            STORE["Vuex Store<br/>集中状态管理"]
            MODULES["模块化状态<br/>images, models<br/>tags, auth"]
        end
        
        subgraph "服务层"
            API["API 服务<br/>axios 封装"]
            UTILS["工具函数<br/>格式化, 验证"]
        end
    end
    
    subgraph "API 网关层"
        NGINX["Nginx 反向代理<br/>负载均衡 + SSL"]
        PROXY["代理配置<br/>/api/* → backend"]
    end
    
    subgraph "后端层 (Express.js)"
        subgraph "中间件层"
            CORS_MW["CORS 中间件<br/>跨域处理"]
            AUTH_MW["认证中间件<br/>JWT 验证"]
            LOG_MW["日志中间件<br/>morgan + winston"]
            PARSE_MW["解析中间件<br/>JSON, URL-encoded"]
        end
        
        subgraph "路由层"
            AUTH_R["认证路由<br/>/api/auth/*"]
            IMG_R["图片路由<br/>/api/images/*"]
            MODEL_R["车型路由<br/>/api/models/*"]
            TAG_R["标签路由<br/>/api/tags/*"]
            UPLOAD_R["上传路由<br/>/api/upload/*"]
        end
        
        subgraph "控制器层"
            AUTH_C["authController<br/>登录/注册/验证"]
            IMG_C["imageController<br/>图片 CRUD"]
            MODEL_C["modelController<br/>车型管理"]
            TAG_C["tagController<br/>标签管理"]
            UPLOAD_C["uploadController<br/>文件上传"]
        end
        
        subgraph "服务层"
            ASSET_S["assetService<br/>图片处理/存储"]
            ANALYSIS_S["analysisService<br/>图片分析"]
            ACTIVITY_S["activityService<br/>用户活动"]
            NOTIFICATION_S["notificationService<br/>消息通知"]
        end
    end
    
    subgraph "数据访问层"
        SEQUELIZE["Sequelize ORM<br/>数据库抽象层"]
        
        subgraph "数据模型"
            USER_M["User 模型<br/>用户信息"]
            IMAGE_M["Image 模型<br/>图片元数据"]
            MODEL_M["Model 模型<br/>车型信息"]
            TAG_M["Tag 模型<br/>标签数据"]
            SERIES_M["Series 模型<br/>车系信息"]
            BRAND_M["Brand 模型<br/>品牌信息"]
        end
        
        subgraph "关联关系"
            ASSOC["模型关联<br/>hasMany, belongsTo<br/>多对多关系"]
        end
    end
    
    subgraph "数据存储层"
        MYSQL["MySQL 数据库<br/>主数据存储"]
        COS["腾讯云 COS<br/>对象存储"]
        CACHE["内存缓存<br/>Redis (可选)"]
    end
    
    subgraph "外部服务"
        DELL_API["DELL 数据源<br/>外部车型 API"]
        FRP_TUNNEL["FRP 隧道<br/>内网穿透"]
        BACKUP_SVC["备份服务<br/>定时备份"]
    end
    
    %% 用户交互流
    UI --> COMP
    COMP --> VIEWS
    VIEWS --> STORE
    STORE --> MODULES
    
    %% 前端服务调用
    COMP --> API
    API --> UTILS
    
    %% API 请求流
    API --> NGINX
    NGINX --> PROXY
    PROXY --> CORS_MW
    
    %% 中间件处理链
    CORS_MW --> AUTH_MW
    AUTH_MW --> LOG_MW
    LOG_MW --> PARSE_MW
    
    %% 路由分发
    PARSE_MW --> AUTH_R
    PARSE_MW --> IMG_R
    PARSE_MW --> MODEL_R
    PARSE_MW --> TAG_R
    PARSE_MW --> UPLOAD_R
    
    %% 控制器处理
    AUTH_R --> AUTH_C
    IMG_R --> IMG_C
    MODEL_R --> MODEL_C
    TAG_R --> TAG_C
    UPLOAD_R --> UPLOAD_C
    
    %% 服务层调用
    AUTH_C --> ACTIVITY_S
    IMG_C --> ASSET_S
    IMG_C --> ANALYSIS_S
    MODEL_C --> ASSET_S
    UPLOAD_C --> ASSET_S
    
    %% 数据访问
    AUTH_C --> SEQUELIZE
    IMG_C --> SEQUELIZE
    MODEL_C --> SEQUELIZE
    TAG_C --> SEQUELIZE
    UPLOAD_C --> SEQUELIZE
    
    %% 模型映射
    SEQUELIZE --> USER_M
    SEQUELIZE --> IMAGE_M
    SEQUELIZE --> MODEL_M
    SEQUELIZE --> TAG_M
    SEQUELIZE --> SERIES_M
    SEQUELIZE --> BRAND_M
    
    %% 关联关系
    USER_M --> ASSOC
    IMAGE_M --> ASSOC
    MODEL_M --> ASSOC
    TAG_M --> ASSOC
    SERIES_M --> ASSOC
    BRAND_M --> ASSOC
    
    %% 数据存储
    ASSOC --> MYSQL
    ASSET_S --> COS
    ANALYSIS_S --> CACHE
    
    %% 外部服务集成
    MODEL_C --> DELL_API
    BACKUP_SVC --> MYSQL
    FRP_TUNNEL -.->|"内网访问"| NGINX
    
    %% 样式定义
    classDef frontend fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef middleware fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef controller fill:#e8f5e8,stroke:#388e3c,stroke-width:2px
    classDef service fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef data fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef storage fill:#f1f8e9,stroke:#689f38,stroke-width:2px
    classDef external fill:#e0f2f1,stroke:#00695c,stroke-width:2px
    
    class UI,COMP,VIEWS,STORE,MODULES,API,UTILS frontend
    class CORS_MW,AUTH_MW,LOG_MW,PARSE_MW middleware
    class AUTH_C,IMG_C,MODEL_C,TAG_C,UPLOAD_C controller
    class ASSET_S,ANALYSIS_S,ACTIVITY_S,NOTIFICATION_S service
    class SEQUELIZE,USER_M,IMAGE_M,MODEL_M,TAG_M,SERIES_M,BRAND_M,ASSOC data
    class MYSQL,COS,CACHE storage
    class DELL_API,FRP_TUNNEL,BACKUP_SVC external
```

## 核心数据流

### 1. 用户认证流程
```mermaid
sequenceDiagram
    participant U as 用户
    participant F as 前端
    participant B as 后端
    participant D as 数据库
    
    U->>F: 输入用户名密码
    F->>B: POST /api/auth/login
    B->>D: 验证用户凭据
    D-->>B: 返回用户信息
    B-->>F: 返回 JWT Token
    F->>F: 存储 Token 到 localStorage
    F-->>U: 登录成功，跳转首页
```

### 2. 图片上传流程
```mermaid
sequenceDiagram
    participant U as 用户
    participant F as 前端
    participant B as 后端
    participant C as 腾讯云 COS
    participant D as 数据库
    
    U->>F: 选择图片文件
    F->>B: POST /api/upload/image
    B->>B: 验证文件类型和大小
    B->>C: 上传到 COS
    C-->>B: 返回文件 URL
    B->>D: 保存图片元数据
    D-->>B: 返回图片 ID
    B-->>F: 返回上传结果
    F-->>U: 显示上传成功
```

### 3. 车型数据同步流程
```mermaid
sequenceDiagram
    participant E as ETL 服务
    participant D as DELL 数据源
    participant B as 后端
    participant M as MySQL
    participant F as 前端
    
    E->>D: 拉取最新车型数据
    D-->>E: 返回车型列表
    E->>B: 调用数据同步 API
    B->>M: 更新车型信息
    M-->>B: 确认更新
    B-->>E: 同步完成
    E->>E: 记录同步日志
    F->>B: 获取车型列表
    B->>M: 查询车型数据
    M-->>B: 返回车型信息
    B-->>F: 返回格式化数据
```

## 关键技术实现

### 前端架构特点
- **组件化设计**: 可复用的 UI 组件库
- **状态管理**: Vuex 集中式状态管理
- **路由管理**: Vue Router 单页面应用路由
- **响应式设计**: 适配不同设备屏幕

### 后端架构特点
- **分层架构**: 控制器-服务-数据访问层分离
- **中间件模式**: 可插拔的中间件系统
- **ORM 抽象**: Sequelize 数据库抽象层
- **RESTful API**: 标准化的 API 设计

### 数据架构特点
- **关系型设计**: MySQL 关系型数据库
- **对象存储**: 腾讯云 COS 文件存储
- **数据同步**: ETL 外部数据源集成
- **备份策略**: 多重备份保障数据安全

## 性能优化策略

1. **前端优化**
   - 组件懒加载
   - 图片懒加载
   - API 请求缓存
   - 静态资源压缩

2. **后端优化**
   - 数据库索引优化
   - 查询语句优化
   - 连接池管理
   - 缓存策略

3. **存储优化**
   - 图片压缩和格式转换
   - CDN 加速
   - 分片上传
   - 存储分层

## 相关文档

- [项目架构总览](./project-overview.md)
- [网络架构详细说明](./network-architecture/network-architecture-analysis.md)
- [后端架构详细说明](../development/backend-architecture.md)
- [数据库架构详细说明](../development/database-architecture.md)
