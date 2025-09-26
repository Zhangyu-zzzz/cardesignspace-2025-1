# GitHub Actions 自动部署配置指南

## 概述

本指南将帮助你配置GitHub Actions，实现代码推送到GitHub后自动部署到云服务器。

## 前置条件

1. 项目已推送到GitHub仓库
2. 云服务器已配置好Docker环境
3. 服务器SSH密钥已生成

## 配置步骤

### 1. 生成SSH密钥对

在本地生成SSH密钥对（如果还没有的话）：

```bash
ssh-keygen -t rsa -b 4096 -C "your-email@example.com"
```

### 2. 将公钥添加到服务器

将生成的公钥（`~/.ssh/id_rsa.pub`）添加到服务器的 `~/.ssh/authorized_keys`：

```bash
# 在本地执行
ssh-copy-id -i ~/.ssh/id_rsa.pub username@your-server-ip
```

### 3. 配置GitHub Secrets

在GitHub仓库中配置以下Secrets：

1. 进入你的GitHub仓库
2. 点击 `Settings` 标签
3. 在左侧菜单中点击 `Secrets and variables` → `Actions`
4. 点击 `New repository secret` 添加以下密钥：

#### 必需的Secrets

| Secret名称 | 描述 | 示例值 |
|-----------|------|--------|
| `SERVER_HOST` | 服务器IP地址 | `49.235.98.5` |
| `SERVER_USER` | 服务器用户名 | `root` 或你的用户名 |
| `SERVER_PORT` | SSH端口 | `22` |
| `SERVER_KEY` | 私钥内容 | 复制 `~/.ssh/id_rsa` 的全部内容 |

### 4. 获取私钥内容

```bash
# 在本地执行，复制输出的全部内容
cat ~/.ssh/id_rsa
```

### 5. 测试SSH连接

确保GitHub Actions可以连接到你的服务器：

```bash
# 测试SSH连接
ssh -p 22 username@your-server-ip
```

## 工作流程

### 触发条件

- 推送到 `main` 或 `master` 分支时自动触发
- 在GitHub Actions页面手动触发

### 执行步骤

1. **构建阶段**：
   - 检出代码
   - 安装Node.js依赖
   - 构建前端项目
   - 运行测试（如果有）
   - 上传构建产物

2. **部署阶段**：
   - 下载构建产物
   - 设置SSH连接
   - 复制文件到服务器
   - 执行部署脚本
   - 健康检查验证

## 部署脚本功能

`scripts/github-deploy.sh` 脚本会执行以下操作：

1. 备份当前版本
2. 停止现有服务
3. 复制新文件
4. 构建Docker镜像
5. 启动服务
6. 健康检查
7. 清理旧镜像

## 故障排除

### 常见问题

1. **SSH连接失败**
   - 检查服务器IP和端口是否正确
   - 确认私钥内容完整复制
   - 验证服务器防火墙设置

2. **权限问题**
   - 确保服务器用户有Docker权限
   - 检查目录权限设置

3. **构建失败**
   - 检查Node.js版本兼容性
   - 确认所有依赖都已安装

4. **服务启动失败**
   - 查看Docker日志：`docker logs auto-gallery-backend`
   - 检查端口是否被占用
   - 验证环境变量配置

### 查看日志

在GitHub Actions页面可以查看详细的执行日志，包括：
- 构建日志
- 部署日志
- 错误信息

## 安全注意事项

1. **私钥安全**：不要将私钥提交到代码仓库
2. **服务器安全**：定期更新SSH密钥
3. **访问控制**：限制服务器用户权限
4. **防火墙**：只开放必要的端口

## 监控和通知

部署完成后，GitHub Actions会显示：
- 前端访问地址
- 后端API地址
- 健康检查地址
- 部署时间

## 回滚操作

如果需要回滚到之前的版本：

```bash
# 在服务器上执行
cd /home/username/auto-gallery-backup
./start.sh
```

## 更新配置

如果需要修改部署配置：

1. 更新 `.github/workflows/deploy.yml`
2. 更新 `scripts/github-deploy.sh`
3. 提交并推送到GitHub
4. 自动触发新的部署

## 联系支持

如果遇到问题，请检查：
1. GitHub Actions日志
2. 服务器Docker日志
3. 网络连接状态
4. 配置文件语法
