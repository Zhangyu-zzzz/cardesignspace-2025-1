## NAS 远程连接指南

> ⚠️ **敏感信息提醒**: 具体的IP地址、用户名、密码等信息已移至 `docs/private/credentials/nas-connection-details.md`

### IPv6 网络连接配置

连接前的网络环境要求：
- 必须使用手机热点网络（saic+网络不可用）
- 如使用代理软件，需要配置 IPv6 直连规则

#### Clash 代理配置示例
```yaml
rules:
  - IP-CIDR,192.168.0.0/16,DIRECT,no-resolve
  - IP-CIDR,10.0.0.0/8,DIRECT,no-resolve
  - IP-CIDR,172.16.0.0/12,DIRECT,no-resolve
  - IP-CIDR6,::1/128,DIRECT,no-resolve
  - IP-CIDR6,fe80::/10,DIRECT,no-resolve
  - IP-CIDR6,fc00::/7,DIRECT,no-resolve
  - IP-CIDR6,YOUR_NAS_IPV6/128,DIRECT,no-resolve  # NAS IPv6 地址
  - MATCH,Proxy
dns:
  enable: true
  ipv6: true
```

### SSH 连接方式
```bash
ssh USERNAME@'[YOUR_NAS_IPV6]'
```

连接信息请参考：`docs/private/credentials/nas-connection-details.md`

### 进入管理员模式
```bash
sudo -i
```

### MinIO S3 对象存储

如需在 NAS 上配置 MinIO S3 对象存储服务，请参考专门的配置指南：

> 📖 **详细配置**: [NAS S3 存储指南](docs/nas-s3-storage-guide.md)

该指南包含：
- MinIO 完整安装配置
- Synology 反向代理设置  
- Bucket 创建和权限配置
- 后端 S3 集成方案
- 测试验证和故障排除

## 📚 相关文档

- 🔒 [NAS 连接私密信息](docs/private/credentials/nas-connection-details.md)
- 📖 [NAS S3 存储指南](docs/nas-s3-storage-guide.md)
- 🏗️ [网络架构分析](docs/network-architecture-analysis.md)


