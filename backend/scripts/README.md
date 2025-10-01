# 后端脚本说明

## 📁 文件列表

### DeepSeek API 车型信息补充脚本

#### 概述
这套脚本使用DeepSeek API来自动补充车型信息和图片标签，提升数据库的完整性和用户体验。

#### 功能特性

##### 🚗 车型信息补充
- **类型分类**: 自动识别车型类型（轿车、SUV、MPV、跑车等）
- **基本参数**: 补充长宽高、轴距、发动机、功率等规格信息
- **车型描述**: 生成专业的车型介绍
- **风格标签**: 添加运动、豪华、商务等风格标签

##### 🖼️ 图片标签补充
- **图片类型**: 外型、内饰、零部件等
- **拍摄角度**: 正前、正侧、前45、后45等
- **具体部位**: 前脸、侧面、尾部、内饰等
- **风格特征**: 运动、豪华、时尚、科技等

#### 核心脚本

| 脚本名称 | 功能描述 |
|---------|---------|
| `deepseek-manager.js` | 综合管理脚本，提供统一接口 |
| `simple-enhance-models.js` | 车型信息补充脚本 |
| `process-empty-tags.js` | 图片标签补充脚本 |
| `test-deepseek.js` | API连接测试脚本 |
| `test-db-connection.js` | 数据库连接测试脚本 |

#### 辅助脚本

| 脚本名称 | 功能描述 |
|---------|---------|
| `find-empty-tags.js` | 查找空标签图片 |
| `check-image-tags.js` | 检查图片标签情况 |

### 备份系统脚本

| 文件名 | 功能 | 说明 |
|--------|------|------|
| `cos-to-s3-backup.js` | 主备份脚本 | 从COS直接传输到S3 |
| `backup-scheduler.js` | 调度器 | 业务低峰期自动运行 |
| `backup-monitor.js` | 监控工具 | 进度监控和完整性验证 |
| `setup-s3-backup.js` | S3配置 | 存储桶和权限设置 |
| `start-backup-system.sh` | 启动脚本 | 一键管理所有服务 |

## 🚀 快速使用

### DeepSeek 脚本使用

#### 1. 快速开始
```bash
# 进入脚本目录
cd backend/scripts

# 查看帮助信息
node deepseek-manager.js help

# 执行完整流程
node deepseek-manager.js all
```

#### 2. 分步执行
```bash
# 测试API连接
node deepseek-manager.js test

# 测试数据库连接
node deepseek-manager.js test-db

# 检查图片标签情况
node deepseek-manager.js check-tags

# 补充车型信息
node deepseek-manager.js enhance-models

# 补充图片标签
node deepseek-manager.js enhance-images
```

### 备份系统使用

#### 1. 初始化
```bash
./start-backup-system.sh setup
```

#### 2. 启动服务
```bash
./start-backup-system.sh start      # 启动调度器
./start-backup-system.sh monitor    # 启动监控界面
```

#### 3. 查看状态
```bash
./start-backup-system.sh status
```

#### 4. 访问监控
打开浏览器访问: http://localhost:3001

## 📊 特性说明

### DeepSeek 特性
- ✅ **智能分析**: 使用AI自动分析车型和图片
- ✅ **批量处理**: 支持批量处理车型和图片
- ✅ **错误处理**: 自动重试和错误恢复
- ✅ **成本控制**: 预估费用和预算管理

### 备份特性
- ✅ **纯备份**: 不影响生产环境
- ✅ **直连传输**: COS → S3，不经过本地
- ✅ **智能调度**: 业务低峰期运行
- ✅ **实时监控**: Web界面查看进度
- ✅ **完整性验证**: 自动验证备份完整性
- ✅ **容错机制**: 自动重试和断点续传

## 🔧 配置说明

### DeepSeek API配置
- **API Key**: `sk-8e14c606de1342959a484b6c860ed0a6`
- **API URL**: `https://api.deepseek.com/v1/chat/completions`
- **模型**: `deepseek-chat`
- **温度**: `0.3` (确保输出稳定性)

### 处理限制
- **车型处理**: 每次最多20个车型
- **图片处理**: 每次最多5张图片
- **请求间隔**: 1.5-2秒 (避免API限制)
- **超时设置**: 30秒

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