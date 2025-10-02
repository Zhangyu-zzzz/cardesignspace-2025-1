# 网络架构文档

本目录包含 CarDesignSpace 项目的网络架构相关文档和图表。

## 文档结构

- `README.md` - 本文件，网络架构文档索引
- `network-architecture-diagram.mmd` - 网络架构 Mermaid 图表源文件
- `network-architecture-analysis.md` - 详细的网络架构分析报告
- `network-architecture-analysis.pdf` - 网络架构分析报告 PDF 版本

## 架构概览

CarDesignSpace 的网络架构采用混合云部署模式，结合本地内网环境和云端服务：

### 核心组件

1. **本地内网环境 (192.168.31.0/24)**
   - Dell 工作站 (192.168.31.119) - 开发环境
   - 群晖 NAS (192.168.31.150) - 存储与备份
   - 小米路由器 AX3000 (192.168.31.1) - 内网网关

2. **腾讯云服务器 (124.221.249.173)**
   - 轻量应用服务器
   - 生产环境部署
   - FRP 服务端

3. **外部服务**
   - 腾讯云 COS (对象存储)
   - DNSPod (DNS 解析)
   - FRP 隧道服务

### 网络连接

- **内网连接**: 有线千兆连接
- **外网访问**: FRP 隧道 + 域名解析
- **数据同步**: 定时备份 + 实时同步
- **安全策略**: TLS 加密 + 令牌认证

## 快速导航

- [网络架构图](./network-architecture-diagram.mmd) - 查看完整的网络拓扑图
- [详细分析报告](./network-architecture-analysis.md) - 深入了解网络配置和优化建议
- [PDF 报告](./network-architecture-analysis.pdf) - 离线阅读版本

## 相关文档

- [项目架构总览](../project-overview.md)
- [应用架构与数据流](../application-flow.md)
- [部署架构](../deployment-architecture.md)
- [腾讯云部署指南](../../deployment/tencent-cloud.md)

