# DeepSeek API 车型信息补充脚本

## 概述

这套脚本使用DeepSeek API来自动补充车型信息和图片标签，提升数据库的完整性和用户体验。

## 功能特性

### 🚗 车型信息补充
- **类型分类**: 自动识别车型类型（轿车、SUV、MPV、跑车等）
- **基本参数**: 补充长宽高、轴距、发动机、功率等规格信息
- **车型描述**: 生成专业的车型介绍
- **风格标签**: 添加运动、豪华、商务等风格标签

### 🖼️ 图片标签补充
- **图片类型**: 外型、内饰、零部件等
- **拍摄角度**: 正前、正侧、前45、后45等
- **具体部位**: 前脸、侧面、尾部、内饰等
- **风格特征**: 运动、豪华、时尚、科技等

## 脚本说明

### 核心脚本

| 脚本名称 | 功能描述 |
|---------|---------|
| `deepseek-manager.js` | 综合管理脚本，提供统一接口 |
| `simple-enhance-models.js` | 车型信息补充脚本 |
| `process-empty-tags.js` | 图片标签补充脚本 |
| `test-deepseek.js` | API连接测试脚本 |
| `test-db-connection.js` | 数据库连接测试脚本 |

### 辅助脚本

| 脚本名称 | 功能描述 |
|---------|---------|
| `find-empty-tags.js` | 查找空标签图片 |
| `check-image-tags.js` | 检查图片标签情况 |

## 使用方法

### 1. 快速开始

```bash
# 进入脚本目录
cd backend/scripts

# 查看帮助信息
node deepseek-manager.js help

# 执行完整流程
node deepseek-manager.js all
```

### 2. 分步执行

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

### 3. 直接运行脚本

```bash
# 测试API连接
node test-deepseek.js

# 测试数据库连接
node test-db-connection.js

# 补充车型信息
node simple-enhance-models.js

# 补充图片标签
node process-empty-tags.js
```

## 配置说明

### API配置
- **API Key**: `sk-8e14c606de1342959a484b6c860ed0a6`
- **API URL**: `https://api.deepseek.com/v1/chat/completions`
- **模型**: `deepseek-chat`
- **温度**: `0.3` (确保输出稳定性)

### 处理限制
- **车型处理**: 每次最多20个车型
- **图片处理**: 每次最多5张图片
- **请求间隔**: 1.5-2秒 (避免API限制)
- **超时设置**: 30秒

## 费用估算

### DeepSeek定价
- **输入**: $0.14/1M tokens
- **输出**: $0.28/1M tokens

### 预估费用
- **单个车型**: ~$0.001-0.002
- **单张图片**: ~$0.0005-0.001
- **完整流程**: ~$0.01-0.05 (取决于数据量)

## 注意事项

### ⚠️ 重要提醒
1. **API费用**: 此操作会产生费用，请确认预算
2. **数据备份**: 建议在运行前备份数据库
3. **网络稳定**: 确保网络连接稳定
4. **错误处理**: 脚本包含错误处理，但建议监控执行过程

### 🔧 故障排除
1. **API连接失败**: 检查网络和API Key
2. **数据库连接失败**: 检查数据库配置
3. **JSON解析错误**: 检查API响应格式
4. **权限问题**: 确保有数据库写入权限

## 输出示例

### 车型信息补充
```
🔄 处理车型: 宝马X5 (ID: 123)
   品牌: 宝马
📝 API响应: {"type": "SUV", "specs": {...}, "description": "...", "styleTags": [...]}
✅ 解析成功: SUV - 5个标签
✅ 车型 123 更新成功
   - 类型: SUV
   - 标签: 豪华, 运动, 实用, 科技感, 商务
```

### 图片标签补充
```
🔄 处理图片: BMW_X5_01.jpg (ID: 456)
   车型: 宝马 宝马X5
📝 标签响应: ["外型", "正前", "前脸", "运动", "时尚"]
✅ 解析成功: 5个标签
✅ 图片 456 标签更新: 外型, 正前, 前脸, 运动, 时尚
```

## 技术架构

### 数据库表结构
- **models表**: 存储车型基本信息
- **images表**: 存储图片信息和标签
- **brands表**: 存储品牌信息

### API集成
- **HTTP客户端**: axios
- **数据库ORM**: Sequelize
- **异步处理**: Promise/async-await
- **错误处理**: try-catch + 重试机制

## 扩展功能

### 未来计划
1. **批量处理**: 支持更大批量处理
2. **智能重试**: 自动重试失败的请求
3. **进度监控**: 实时显示处理进度
4. **数据验证**: 自动验证补充的数据质量
5. **成本控制**: 设置费用上限和预警

## 联系支持

如有问题或建议，请联系开发团队。




