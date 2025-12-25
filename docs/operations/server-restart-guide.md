# 服务器重启后项目重启指南

## 📋 概述

本文档说明在云服务器重启后如何重启项目，以及Git推送后是否会自动部署。

## 🔄 服务器重启后的自动恢复

### Docker容器自动启动

项目使用Docker Compose部署，容器配置了 `restart: unless-stopped`，这意味着：

1. **服务器重启后，Docker容器会自动启动**
2. 前提条件：Docker服务需要在系统启动时自动运行

### 验证Docker自动启动

在服务器上执行以下命令检查Docker是否设置为开机自启：

```bash
# 检查Docker服务状态
sudo systemctl status docker

# 如果未启用开机自启，执行以下命令
sudo systemctl enable docker
```

### 验证容器自动启动

服务器重启后，SSH连接到服务器并检查容器状态：

```bash
# 连接到服务器
ssh root@你的服务器IP

# 进入项目目录
cd /root/auto-gallery  # 或 /opt/auto-gallery（根据实际部署路径）

# 检查容器状态
docker-compose ps

# 如果容器未运行，手动启动
docker-compose up -d
```

## 🚀 Git推送后的自动部署

### 自动部署流程

项目已配置GitHub Actions CI/CD，**当您push代码到main或develop分支时，会自动触发部署**：

1. 推送到远程仓库：`git push origin main`
2. GitHub Actions自动触发
3. 自动SSH连接到服务器
4. 自动拉取最新代码
5. 自动重新构建Docker镜像
6. 自动重启容器

### 查看自动部署状态

1. 访问GitHub仓库的Actions页面
2. 查看最新的workflow运行状态
3. 如果失败，查看日志排查问题

### 手动触发部署

如果自动部署失败，可以手动执行部署脚本：

```bash
# 在本地执行（需要配置SSH密钥）
./deploy.sh

# 或使用连接脚本
./connect-and-deploy.sh
```

## 🔧 手动重启项目

### 方法1：通过SSH手动重启

```bash
# 1. 连接到服务器
ssh root@你的服务器IP

# 2. 进入项目目录
cd /root/auto-gallery  # 或 /opt/auto-gallery

# 3. 重启容器
docker-compose restart

# 或停止后重新启动
docker-compose down
docker-compose up -d

# 4. 检查服务状态
docker-compose ps

# 5. 查看日志
docker-compose logs -f
```

### 方法2：使用部署脚本

在服务器上执行：

```bash
cd /root/auto-gallery
./server-fix.sh
```

## 📊 检查服务健康状态

重启后，验证服务是否正常运行：

```bash
# 检查前端服务
curl -I http://localhost:8080

# 检查后端服务
curl -I http://localhost:3001/api/health

# 检查容器日志
docker-compose logs backend --tail 50
docker-compose logs frontend --tail 50
```

## ⚠️ 常见问题

### 问题1：服务器重启后容器未自动启动

**解决方案：**

```bash
# 1. 确保Docker服务已启用开机自启
sudo systemctl enable docker

# 2. 确保Docker Compose已安装
docker-compose --version

# 3. 手动启动容器
cd /root/auto-gallery
docker-compose up -d
```

### 问题2：Git推送后未自动部署

**检查清单：**

1. ✅ 确认推送到的是 `main` 或 `develop` 分支
2. ✅ 检查GitHub仓库的Actions是否启用
3. ✅ 确认GitHub Secrets已配置（SERVER_HOST, SERVER_USER, SSH_PRIVATE_KEY）
4. ✅ 查看GitHub Actions日志排查错误

**解决方案：**

如果自动部署失败，手动执行：

```bash
# 在服务器上执行
cd /root/auto-gallery
git pull origin main
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### 问题3：服务启动后无法访问

**排查步骤：**

```bash
# 1. 检查容器是否运行
docker-compose ps

# 2. 检查端口是否被占用
netstat -tulpn | grep -E '8080|3001'

# 3. 检查防火墙设置
sudo ufw status

# 4. 检查Nginx配置（如果使用Nginx反向代理）
sudo nginx -t
sudo systemctl status nginx
```

## 📝 快速重启命令

### 一键重启脚本（在服务器上执行）

创建 `restart.sh` 文件：

```bash
#!/bin/bash
cd /root/auto-gallery
echo "停止容器..."
docker-compose down
echo "启动容器..."
docker-compose up -d
echo "等待服务启动..."
sleep 10
echo "检查服务状态..."
docker-compose ps
echo "检查服务健康..."
curl -I http://localhost:8080 || echo "前端服务未就绪"
curl -I http://localhost:3001/api/health || echo "后端服务未就绪"
```

使用：

```bash
chmod +x restart.sh
./restart.sh
```

## 🔐 安全建议

1. **定期备份**：服务器重启前建议备份数据库和重要文件
2. **监控日志**：重启后检查应用日志确保无错误
3. **健康检查**：重启后执行健康检查确保服务正常
4. **通知机制**：配置监控告警，服务异常时及时通知

## 📞 相关文档

- [生产环境配置指南](../../PRODUCTION_SETUP.md)
- [部署架构文档](../architecture/deployment-architecture.md)
- [CI/CD配置](../../.github/workflows/ci-cd.yml)







