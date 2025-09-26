# CarDesignSpace 2025 - 汽车设计空间

CarDesignSpace 是一个面向设计师和营销团队的整合平台，包含 Vue 2 前端单页应用与 Node.js/Express 后端服务，集中管理官方车型图片及其标签、变体和权限。

## 项目结构
- `frontend/`：Vue 2 + Element UI 前端，业务页面位于 `src/views`，通用组件在 `src/components`，状态存放在 `src/store`。
- `backend/`：Express API，核心逻辑集中在 `src/`，数据库迁移脚本位于 `migrations/`，批量任务与运维脚本在 `scripts/`。
- `tests/e2e/`：Playwright 端到端测试用例，配置由仓库根目录的 `playwright.config.ts` 管理。
- `docs/`：存放特性说明、运维手册与架构文档，更新功能时请同步相关指南。
- `start.sh` / `start.bat`：一键安装依赖并启动前后端的本地脚本。

## 快速开始
### 使用启动脚本
**Linux / macOS**
```bash
chmod +x start.sh
./start.sh
```

**Windows**
```batch
start.bat
```

### 手动启动（开发模式）
1. 启动后端
   ```bash
   cd backend
   cp ../env.example .env # 首次配置时复制根目录示例文件
   npm install
   npm run dev            # 使用 nodemon 热重载
   ```

2. 启动前端
   ```bash
   cd frontend
   npm install
   npm run serve          # 默认 http://localhost:8080
   ```

## 技术栈
- 前端：Vue 2、Vue Router、Vuex、Element UI、Quill 编辑器
- 后端：Node.js (>=16)、Express、Sequelize、BullMQ、Sharp
- 数据：MySQL 主库，Redis 用于队列与缓存，腾讯云 COS 作为对象存储

## 开发环境要求
- Node.js >= 16.0.0，推荐使用 18 LTS
- npm >= 8.0.0
- 本地需提供 MySQL 5.7+ 数据库与 Redis 6+（若需验证队列流程）

## 文档与贡献指南
- 阅读 `AGENTS.md` 获取提交流程、命名约定、测试要求等贡献指南。
- 功能设计与修复记录集中在 `docs/features/` 与 `docs/fixes/`，运维手册位于 `docs/operations/`。
- 手动调试 HTML 页面已归档到 `docs/manual-tools/`，方便离线验证。
- 部署与排障脚本位于仓库根目录，更多运维说明见 `docs/`。

## 许可证
MIT License
