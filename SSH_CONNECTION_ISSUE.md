# SSH 连接问题与替代解决方案

## 🔴 当前问题

```
ssh: connect to host 49.235.98.5 port 22: Connection refused
```

## 🤔 可能原因

1. **临时网络问题** - 防火墙或网络波动
2. **SSH 连接限制** - 服务器限制了同时连接数
3. **IP 限制** - 你的 IP 可能被暂时限制
4. **服务器繁忙** - 正在处理 GitHub Actions 的部署

**注意**：GitHub Actions 可以连接，说明服务器本身是正常的。

## ✅ 解决方案

### 方案 1：等待并重试（推荐）

```bash
# 等待 1-2 分钟后重试
sleep 120

# 重新连接
ssh root@49.235.98.5

# 连接成功后执行修复脚本
cd /opt/auto-gallery
bash server-post-deploy.sh
```

### 方案 2：使用云服务商控制台

如果服务器托管在腾讯云/阿里云等：

1. 登录云服务商控制台
2. 使用 **Web SSH** 或 **VNC 控制台** 连接
3. 执行修复命令：
   ```bash
   cd /opt/auto-gallery
   bash server-post-deploy.sh
   ```

### 方案 3：通过 GitHub Actions 执行（如果配置了）

创建一个修复用的 workflow，或者在现有部署脚本中添加：

```bash
# 在部署脚本中添加
bash server-post-deploy.sh
```

### 方案 4：检查本地网络

```bash
# 检查网络连接
ping 49.235.98.5

# 检查端口是否开放
nc -zv 49.235.98.5 22

# 或使用 telnet
telnet 49.235.98.5 22

# 尝试使用不同的网络（如切换 WiFi 或使用手机热点）
```

### 方案 5：查看部署日志（从 GitHub）

既然 GitHub Actions 能连接，查看它的输出：

1. 打开 GitHub 仓库
2. 进入 **Actions** 标签
3. 查看最新的部署日志
4. 确认服务状态

## 🔍 从部署日志看当前状态

根据最后的 GitHub Actions 日志：

```
✅ 前端服务正常 (HTTP 200)
❌ 后端服务失败 (HTTP 000)
✅ 容器已启动 (auto-gallery-backend: Up 2 seconds)
⚠️  健康检查未通过 (health: starting)
```

**诊断**：后端容器已启动但服务未就绪。

## 🛠️ 远程修复指令

### 快速修复命令（一键执行）

当你能够 SSH 连接后，执行：

```bash
ssh root@49.235.98.5 'cd /opt/auto-gallery && bash server-post-deploy.sh'
```

或者分步执行：

```bash
# 连接服务器
ssh root@49.235.98.5

# 进入项目目录
cd /opt/auto-gallery

# 创建持久化目录
mkdir -p persistent/clip_models persistent/logs

# 检查备份并恢复模型文件
LATEST_BACKUP=$(ls -td backup_*/ 2>/dev/null | head -1)
if [ -n "$LATEST_BACKUP" ]; then
    cp -r "${LATEST_BACKUP}backend/services/clip_utils/clip-vit-base-patch32/"* \
          persistent/clip_models/ 2>/dev/null || true
fi

# 查看模型文件
ls -lh persistent/clip_models/

# 重启后端
docker-compose restart backend

# 等待10秒
sleep 10

# 查看日志
docker logs auto-gallery-backend --tail 50

# 测试服务
curl http://localhost:3000/api/health
```

## 📊 验证服务状态

### 通过外部访问测试

如果服务器对外开放了端口：

```bash
# 从本地测试（替换为实际端口）
# 前端
curl -I http://49.235.98.5:8080/

# 后端健康检查
curl http://49.235.98.5:3001/api/health

# 后端根路径
curl http://49.235.98.5:3001/
```

### 通过 Docker 状态判断

如果能通过其他方式访问服务器：

```bash
# 查看容器状态
docker ps --filter name=auto-gallery

# 查看后端日志（最后100行）
docker logs auto-gallery-backend --tail 100

# 查看实时日志
docker logs -f auto-gallery-backend

# 进入容器检查
docker exec -it auto-gallery-backend sh
ls -la /app/services/clip_utils/clip-vit-base-patch32/
env | grep -E "CLIP|QDRANT|DB"
exit
```

## 🎯 根本问题：模型文件缺失

根据分析，最可能的问题是 **CLIP 模型文件缺失或未正确挂载**。

### 临时禁用智能搜索（最快解决）

```bash
# SSH 连接后执行
cd /opt/auto-gallery

# 编辑 docker-compose.yml，注释掉模型 volume
# 或编辑 .env，注释掉 CLIP_SERVICE_URL

# 方案 A: 移除 volume 挂载（如果模型文件确实不存在）
# 编辑 docker-compose.yml，临时注释这一行：
# - ./persistent/clip_models:/app/services/clip_utils/clip-vit-base-patch32

# 方案 B: 禁用 CLIP 服务
echo "CLIP_SERVICE_URL=" >> .env

# 重启
docker-compose restart backend
```

### 完整解决：上传模型文件

```bash
# 从本地上传（如果你本地有模型文件）
cd /Users/zobot/Desktop/unsplash-crawler/test/auto-gallery

# 检查本地模型文件
ls -lh backend/services/clip_utils/clip-vit-base-patch32/

# 压缩模型文件
tar -czf clip-models.tar.gz backend/services/clip_utils/clip-vit-base-patch32/

# 上传到服务器
scp clip-models.tar.gz root@49.235.98.5:/opt/auto-gallery/

# SSH 到服务器解压
ssh root@49.235.98.5
cd /opt/auto-gallery
tar -xzf clip-models.tar.gz -C persistent/ --strip-components=4
rm clip-models.tar.gz
docker-compose restart backend
```

## 📝 部署检查清单

- [ ] SSH 可以连接
- [ ] `persistent/clip_models/` 目录存在
- [ ] 模型文件已放置在 `persistent/clip_models/`
- [ ] 目录权限正确 (755)
- [ ] Docker 容器运行中
- [ ] 后端健康检查通过
- [ ] 服务可以正常访问

## 🆘 紧急联系

如果上述方案都无效：

1. 检查云服务商控制台的安全组/防火墙设置
2. 查看服务器系统日志 `/var/log/auth.log`
3. 重启 SSH 服务（通过控制台）：`systemctl restart sshd`
4. 检查磁盘空间是否充足：`df -h`

## 📌 记住

**GitHub Actions 能连接并完成部署，说明服务器和代码都是正常的。**

主要问题是：
1. 你暂时无法 SSH 连接（可能是临时的）
2. 后端需要 `persistent/clip_models/` 目录和模型文件

**最简单的解决方案**：等待几分钟后重新尝试 SSH 连接，然后执行 `server-post-deploy.sh` 脚本。

---

*创建时间：2025年12月3日*

