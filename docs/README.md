# Documentation Index

CarDesignSpace 文档按用途分区，便于快速定位信息：

## 🏗️ 架构文档
- `architecture/`：**系统架构文档**
  - [`project-overview.md`](architecture/project-overview.md) - 项目整体架构概览
  - [`application-flow.md`](architecture/application-flow.md) - 应用架构与数据流
  - [`deployment-architecture.md`](architecture/deployment-architecture.md) - 部署架构设计
  - [`network-architecture/`](architecture/network-architecture/) - 网络架构详细说明

## 🚀 部署文档
- `deployment/`：针对云环境或操作系统的部署步骤（如腾讯云、Ubuntu）

## 💻 开发文档
- `development/`：后端/数据库方案、任务回顾及 PR 说明
- `features/`：功能实现与优化记录，涵盖标签体系、右键导航、车型更新等
- `fixes/`：缺陷分析与补丁流程，说明修复背景、操作步骤、验证清单

## 🔧 运维文档
- `operations/`：运维类指南（防爬虫、NAS 挂载、GitHub Actions 配置等）

## 🛠️ 工具文档
- `manual-tools/`：HTML 调试面板与一次性校验页面，仅在本地排查时使用

## 📊 报告文档
- `reports/`、`tickets/`：历史报告、需求清单与 CSV 数据

## 📋 快速导航

### 新手上路
1. 从 [项目架构总览](architecture/project-overview.md) 开始了解整体架构
2. 查看 [应用架构与数据流](architecture/application-flow.md) 理解系统交互
3. 参考 [部署架构](architecture/deployment-architecture.md) 了解生产环境

### 开发指南
- [后端架构详细说明](development/backend-architecture.md)
- [数据库架构详细说明](development/database-architecture.md)
- [功能实现指南](features/)

### 运维指南
- [腾讯云部署指南](deployment/tencent-cloud.md)
- [运维操作指南](operations/)

---

新增文档时请选取最贴近的目录；若需新增分类，先与维护者沟通以保持结构一致。
