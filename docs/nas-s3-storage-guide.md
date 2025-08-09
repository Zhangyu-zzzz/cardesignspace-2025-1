# NAS S3 对象存储指南

本文档描述如何将群晖 NAS 配置为 S3 兼容的对象存储服务，用于替代腾讯云 COS。

## 📋 概述

### 架构方案
- **存储后端**: 群晖 NAS + MinIO (S3 兼容)
- **访问方式**: Synology 反向代理 → `minio.birdmanoutman.synology.me`
- **优势**: 直接域名访问，无需 frp 端口转发

### 网络架构
```
前端应用 → 后端服务 → minio.birdmanoutman.synology.me → NAS MinIO → 本地存储
```

## 🛠️ MinIO 安装配置

### 1. 创建数据目录
```bash
# 连接到 NAS (具体连接信息请查看私密文档)
ssh USERNAME@'[YOUR_NAS_IPV6]'
sudo -i

# 选择存储卷并创建目录
if [ -d /volume1 ]; then V=/volume1; else V=/volume2; fi
mkdir -p "$V/docker/minio-data"
```

### 2. 启动 MinIO 容器
```bash
# 停止旧容器（如果存在）
docker rm -f minio >/dev/null 2>&1 || true

# 启动 MinIO 服务
docker run -d --name minio --restart unless-stopped \
  --network host \
  -e MINIO_ROOT_USER=YOUR_USERNAME \
  -e MINIO_ROOT_PASSWORD='YOUR_PASSWORD' \
  -v "$V/docker/minio-data":/data \
  docker.m.daocloud.io/minio/minio:latest \
  server /data --address ":9000" --console-address ":9001"
```

### 3. 访问端点
- **管理控制台**: http://[YOUR_NAS_IPV6]:9001
- **S3 API 端点**: http://[YOUR_NAS_IPV6]:9000
- **公网访问**: https://minio.birdmanoutman.synology.me

> 🔐 **连接信息**: 实际的IPv6地址和凭证请查看 `docs/private/credentials/nas-connection-details.md`

## 🔧 Synology 反向代理配置

### 配置步骤
1. 登录 Synology DSM 管理界面
2. 打开 **控制面板** → **应用程序门户** → **反向代理**
3. 添加新的反向代理规则：

| 字段 | 值 |
|------|-----|
| 描述 | MinIO S3 服务 |
| 来源协议 | HTTPS |
| 主机名 | minio.birdmanoutman.synology.me |
| 端口 | 443 |
| 目标协议 | HTTP |
| 主机名 | localhost |
| 端口 | 9000 |

### SSL 证书配置
- 使用 Let's Encrypt 自动获取 SSL 证书
- 确保域名 `minio.birdmanoutman.synology.me` 正确解析到 NAS 公网地址

## 🗂️ Bucket 配置

### 创建 Bucket
```bash
# 使用 mc (MinIO Client) 配置
mc alias set bmnas https://minio.birdmanoutman.synology.me YOUR_USERNAME 'YOUR_PASSWORD'

# 创建 cars bucket
mc mb bmnas/cars

# 设置公有读权限
mc anonymous set public bmnas/cars
```

### Access Key 配置

MinIO API 访问密钥配置请参考私密文档：
> 🔐 **访问密钥**: `docs/private/credentials/nas-connection-details.md`

## 💻 后端集成配置

### 环境变量配置
在后端项目中配置以下环境变量：

```bash
# S3 存储配置
STORAGE_DRIVER=s3
S3_ENDPOINT=https://minio.birdmanoutman.synology.me
S3_BUCKET=cars
S3_REGION=us-east-1
S3_ACCESS_KEY=YOUR_ACCESS_KEY
S3_SECRET_KEY=YOUR_SECRET_KEY
S3_PUBLIC_BASE_URL=https://minio.birdmanoutman.synology.me
```

> 🔐 **实际密钥**: 请从 `docs/private/credentials/nas-connection-details.md` 获取真实的访问密钥

### 代码改造要点

#### 1. 替换 COS SDK
```javascript
// 原有的腾讯 COS SDK
// const COS = require('cos-nodejs-sdk-v5');

// 改为 AWS S3 SDK
const { S3Client } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
  forcePathStyle: true, // MinIO 需要此配置
});
```

#### 2. 上传函数改造
```javascript
// 位置: backend/src/config/cos.js
const { PutObjectCommand } = require('@aws-sdk/client-s3');

async function uploadToS3(fileBuffer, key, contentType) {
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
    // 设置公有读权限
    ACL: 'public-read'
  });
  
  const result = await s3Client.send(command);
  
  // 返回公网访问 URL
  return `${process.env.S3_PUBLIC_BASE_URL}/${process.env.S3_BUCKET}/${key}`;
}
```

#### 3. URL 生成规则
保持现有的变体规则：
```javascript
// 原图 URL
const originalUrl = `${S3_PUBLIC_BASE_URL}/${S3_BUCKET}/CARS/${brand}/${series}/${model}/${filename}`;

// 变体 URL
const variantUrl = `${S3_PUBLIC_BASE_URL}/${S3_BUCKET}/variants/${variant}/CARS/${brand}/${series}/${model}/${filename}`;
```

## 🔍 测试验证

### 1. 连接测试
```bash
# 测试 S3 端点连通性
curl -I https://minio.birdmanoutman.synology.me

# 测试 bucket 访问
curl -I https://minio.birdmanoutman.synology.me/cars/
```

### 2. 上传测试
```bash
# 使用 mc 测试上传
echo "test content" > test.txt
mc cp test.txt bmnas/cars/test/test.txt

# 验证公网访问
curl https://minio.birdmanoutman.synology.me/cars/test/test.txt
```

## 🚀 迁移步骤

### 从腾讯 COS 迁移到 NAS S3

1. **并行运行阶段**
   - 保持现有 COS 配置
   - 添加 S3 配置选项
   - 通过环境变量切换存储后端

2. **数据迁移**
   - 使用工具批量迁移现有图片到 MinIO
   - 更新数据库中的 URL 引用

3. **切换验证**
   - 小批量测试 S3 上传和访问
   - 验证变体生成功能正常
   - 确认前端显示无误

4. **完全切换**
   - 更新生产环境配置
   - 停止使用腾讯 COS

## 📊 优势对比

### 相比腾讯 COS
| 特性 | 腾讯 COS | NAS MinIO |
|------|----------|-----------|
| 成本 | 按量付费 | 一次性硬件投入 |
| 带宽 | 有限制 | 本地网络带宽 |
| 控制权 | 受限 | 完全控制 |
| 延迟 | 网络延迟 | 本地访问更快 |
| 可靠性 | 云服务商保证 | 依赖本地设备 |

### 相比 frp 端口转发
| 特性 | frp 转发 | Synology 反向代理 |
|------|----------|-------------------|
| 配置复杂度 | 较高 | 简单 |
| 域名访问 | 需端口号 | 标准 HTTPS |
| SSL 证书 | 手动配置 | 自动管理 |
| 稳定性 | 依赖中转服务器 | 直接访问 |
| 性能 | 有中转损耗 | 直接连接 |

## 🔧 故障排除

### 常见问题

1. **无法访问 minio.birdmanoutman.synology.me**
   - 检查域名 DNS 解析
   - 确认反向代理配置正确
   - 验证 SSL 证书状态

2. **上传失败**
   - 检查 MinIO 服务状态：`docker logs minio`
   - 验证 Access Key 和 Secret Key
   - 确认 bucket 权限设置

3. **图片无法显示**
   - 检查 bucket 公有读权限
   - 验证 URL 生成规则
   - 确认 Content-Type 设置正确

### 监控命令
```bash
# 检查 MinIO 容器状态
docker ps | grep minio

# 查看 MinIO 日志
docker logs minio -f

# 检查存储使用情况
mc admin info bmnas
```

## 📝 注意事项

1. **安全考虑**
   - 定期更换 Access Key
   - 监控异常访问日志
   - 确保只开放必要的 bucket 权限

2. **备份策略**
   - 定期备份 MinIO 数据
   - 考虑多副本或异地备份
   - 保留关键配置文件

3. **性能优化**
   - 根据使用情况调整 MinIO 配置
   - 监控磁盘 I/O 和网络带宽
   - 考虑使用 SSD 加速热点数据

---

## 📞 技术支持

如有问题，请查阅：
- [MinIO 官方文档](https://docs.min.io/)
- [Synology 反向代理指南](https://kb.synology.com/zh-cn/DSM/help/DSM/AdminCenter/application_appportalias)
- 项目内其他相关文档：`docs/connect-to-bmNAS.md`
