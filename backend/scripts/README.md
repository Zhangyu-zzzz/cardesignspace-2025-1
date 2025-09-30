# 备份系统脚本说明

## 📁 文件列表

| 文件名 | 功能 | 说明 |
|--------|------|------|
| `cos-to-s3-backup.js` | 主备份脚本 | 从COS直接传输到S3 |
| `backup-scheduler.js` | 调度器 | 业务低峰期自动运行 |
| `backup-monitor.js` | 监控工具 | 进度监控和完整性验证 |
| `setup-s3-backup.js` | S3配置 | 存储桶和权限设置 |
| `start-backup-system.sh` | 启动脚本 | 一键管理所有服务 |

## 🚀 快速使用

### 1. 初始化
```bash
./start-backup-system.sh setup
```

### 2. 启动服务
```bash
./start-backup-system.sh start      # 启动调度器
./start-backup-system.sh monitor    # 启动监控界面
```

### 3. 查看状态
```bash
./start-backup-system.sh status
```

### 4. 访问监控
打开浏览器访问: http://localhost:3001

## 📊 备份特性

- ✅ **纯备份**: 不影响生产环境
- ✅ **直连传输**: COS → S3，不经过本地
- ✅ **智能调度**: 业务低峰期运行
- ✅ **实时监控**: Web界面查看进度
- ✅ **完整性验证**: 自动验证备份完整性
- ✅ **容错机制**: 自动重试和断点续传

## 🔧 手动操作

### 直接运行备份
```bash
# 测试模式（不实际传输）
node cos-to-s3-backup.js --dry-run --batch-size=10

# 正式备份
node cos-to-s3-backup.js --batch-size=50 --delay=2000

# 从上次中断处继续
node cos-to-s3-backup.js --resume
```

### 验证备份
```bash
# 验证完整性
node backup-monitor.js --verify --sample-size=100

# 生成报告
node backup-monitor.js --report

# 查看统计
node backup-monitor.js --stats
```

### S3配置
```bash
# 完整配置
node setup-s3-backup.js --all

# 仅验证配置
node setup-s3-backup.js --verify
```

## 📋 环境要求

- Node.js >= 14
- 已配置的环境变量 (.env)
- 网络连接到腾讯云COS和S3-bmnas

## 📞 故障排除

1. **检查环境变量**: 确保 `.env` 文件配置正确
2. **查看日志**: `logs/` 目录下的日志文件
3. **验证连接**: 使用 `--verify` 选项检查配置
4. **重启服务**: 使用 `stop` 和 `start` 命令重启

## 📈 性能指标

- **处理速度**: ~50张图片/分钟
- **批次大小**: 50张/批
- **重试次数**: 3次
- **运行时间**: 业务低峰期（凌晨2-6点）
- **预计完成**: 3天内完成40万张图片备份
