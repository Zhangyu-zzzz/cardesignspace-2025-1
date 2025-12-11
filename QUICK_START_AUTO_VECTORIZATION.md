# 自动向量化功能 - 快速开始

## 功能说明

✨ 新图片上传到MySQL后，**自动向量化并存入Qdrant向量数据库**

## 快速测试

### 1. 环境准备

```bash
# 安装Python依赖
cd backend/services
pip3 install torch transformers Pillow requests

# 确保Qdrant服务运行中
# 默认地址: http://49.235.98.5:6333
```

### 2. 运行测试

```bash
cd backend
node scripts/test_vectorization.js
```

测试脚本会：
- ✅ 检查Qdrant连接
- ✅ 检查Python环境
- ✅ 向量化一张测试图片
- ✅ 验证存入Qdrant

### 3. 上传新图片

通过前端或API上传图片后，查看日志：

```
🎯 已触发图片向量化: imageId=123
📸 开始向量化图片: https://...
✅ 图片向量化成功: 512维向量
💾 存入向量数据库: imageId=123
```

## 批量处理历史图片

```bash
# 向量化前10张图片（测试）
node scripts/vectorize_existing_images.js --limit 10

# 向量化所有图片
node scripts/vectorize_existing_images.js

# 指定车型
node scripts/vectorize_existing_images.js --model-id 123

# 模拟运行
node scripts/vectorize_existing_images.js --dry-run --limit 5
```

## 常见问题

### Python依赖缺失

```bash
# 错误: CLIP_PYTHON_DEPS_MISSING
# 解决:
cd backend/services
pip3 install -r requirements.txt
```

### CLIP模型下载慢

首次运行会下载模型（约577MB），需要1-2分钟

### Qdrant连接失败

检查 `.env` 配置：
```bash
QDRANT_URL=http://49.235.98.5:6333
QDRANT_COLLECTION=car_images
```

## 验证效果

1. 上传几张新图片
2. 访问智能搜索页面：`/smart-search`
3. 输入关键词搜索（如"红色"、"跑车"等）
4. 应该能看到刚上传的图片

## 工作原理

```
上传图片 → 保存MySQL → 异步触发向量化 → CLIP编码 → 存入Qdrant
```

- **异步处理**: 不阻塞上传响应
- **失败容错**: 向量化失败不影响图片使用
- **自动触发**: 无需手动操作

## 详细文档

- [完整功能文档](./docs/features/auto-vectorization.md)
- [功能实现说明](./AUTO_VECTORIZATION_FEATURE.md)

---

🎉 现在每次上传图片都会自动向量化，实现真正的自动化！




