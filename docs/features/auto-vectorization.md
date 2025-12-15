# 自动向量化功能

## 功能概述

自动向量化功能实现了当图片上传到MySQL数据库后，自动将其使用CLIP模型向量化，并存储到Qdrant向量数据库中。这样可以支持基于图片语义的智能搜索功能。

## 技术架构

### 核心组件

1. **Python向量化脚本** (`backend/services/clip_image_encoder_standalone.py`)
   - 使用CLIP模型将图片编码为512维向量
   - 支持从URL或本地路径加载图片
   - 输出JSON格式的向量数据

2. **Node.js向量化服务** (`backend/src/services/imageVectorizeService.js`)
   - 封装Python脚本调用
   - 提供异步向量化接口
   - 支持批量处理

3. **自动向量化服务** (`backend/src/services/autoVectorizeService.js`)
   - 协调向量化和数据库操作
   - 提供异步触发机制
   - 支持批量向量化历史数据

4. **Qdrant配置扩展** (`backend/src/config/qdrant.js`)
   - 新增 `upsertImageVector` - 插入或更新单个图片向量
   - 新增 `batchUpsertImageVectors` - 批量插入或更新向量
   - 新增 `deleteImageVector` - 删除图片向量

## 工作流程

### 图片上传时自动向量化

当用户上传新图片时，系统会自动执行以下步骤：

```
用户上传图片
    ↓
保存到COS存储
    ↓
保存到MySQL数据库
    ↓
生成图片变体（缩略图等）
    ↓
异步触发向量化 ← 新增功能
    ↓
调用CLIP模型生成向量
    ↓
存入Qdrant向量数据库
```

### 异步处理机制

向量化过程采用异步非阻塞方式，不会影响图片上传的响应速度：

- 图片上传成功后立即返回响应给用户
- 在后台异步执行向量化任务
- 如果向量化失败，不影响图片的正常使用
- 失败的任务会记录日志，可以通过批量脚本重新处理

## 使用方法

### 1. 配置环境

确保已安装必要的Python依赖：

```bash
cd backend/services
pip3 install -r requirements.txt
```

主要依赖：
- `torch` - PyTorch深度学习框架
- `transformers` - Hugging Face Transformers（CLIP模型）
- `Pillow` - Python图片处理库
- `requests` - HTTP请求库

### 2. 配置CLIP模型

系统会自动检测并使用本地CLIP模型（如果存在），否则会从网络下载。

推荐的模型路径：
- `backend/services/clip_utils/clip-vit-base-patch32/`
- `backend/services/clip-vit-base-patch32/`
- 项目根目录下的 `clip-vit-base-patch32/`

可以通过环境变量指定外部模型路径：
```bash
export CLIP_REFERENCE_PROJECT=/path/to/model
```

### 3. 新图片自动向量化

新上传的图片会自动触发向量化，无需额外配置。

在上传控制器中已集成：
- `uploadController.js` 的 `uploadSingleImage` 方法
- `uploadController.js` 的 `uploadMultipleImages` 方法

### 4. 批量向量化历史图片

使用批量向量化脚本处理已存在的图片：

```bash
cd backend

# 向量化所有图片
node scripts/vectorize_existing_images.js

# 只向量化前100张图片，每批10张
node scripts/vectorize_existing_images.js --limit 100 --batch 10

# 向量化指定车型的图片
node scripts/vectorize_existing_images.js --model-id 123

# 向量化指定品牌的图片
node scripts/vectorize_existing_images.js --brand-id 456

# 模拟运行（不实际向量化）
node scripts/vectorize_existing_images.js --dry-run --limit 10

# 查看帮助
node scripts/vectorize_existing_images.js --help
```

### 5. 手动触发向量化

如果需要手动触发某张图片的向量化：

```javascript
const { vectorizeAndUpsertImage } = require('./services/autoVectorizeService');

// 方式1：只提供图片ID（会从数据库查询URL和元数据）
await vectorizeAndUpsertImage(imageId);

// 方式2：提供图片ID和URL（更快，适合刚上传的场景）
await vectorizeAndUpsertImage(imageId, imageUrl);
```

## 数据结构

### Qdrant中的向量点结构

```javascript
{
  id: 12345,              // 图片ID（与MySQL中的ID一致）
  vector: [0.123, ...],   // 512维向量
  payload: {
    image_id: 12345,
    title: "宝马X5",
    description: "红色外观",
    category: "exterior",
    model_id: 100,
    model_name: "X5",
    brand_id: 10,
    brand_name: "BMW",
    brand_chinese_name: "宝马",
    upload_date: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z"
  }
}
```

## 性能优化

### 1. 异步处理

- 向量化任务在后台异步执行，不阻塞用户请求
- 使用 `setTimeout` 将任务放入下一个事件循环

### 2. 批量处理

- 批量脚本支持分批处理，避免内存溢出
- 可配置批次大小和批次间延迟

### 3. 错误恢复

- 单张图片向量化失败不影响其他图片
- 失败的任务记录日志，可通过批量脚本重新处理

### 4. 模型缓存

- Python进程中的CLIP模型会被缓存（单例模式）
- 首次加载模型需要1-2分钟，后续调用秒级响应

## 监控与日志

### 日志输出

向量化过程会输出详细日志：

```
🚀 开始自动向量化: imageId=12345
📸 开始向量化图片: https://example.com/image.jpg
✅ 图片向量化成功: imageId=12345 -> 512维向量
💾 存入向量数据库: imageId=12345
✅ 图片自动向量化成功: imageId=12345
```

### 错误处理

如果向量化失败，会记录错误日志：

```
❌ 图片自动向量化失败 (imageId=12345): 图片加载失败
```

常见错误类型：
- `CLIP_PYTHON_DEPS_MISSING` - Python依赖缺失
- `图片加载失败` - 无法从URL下载图片
- `向量维度错误` - 向量格式不正确
- `Qdrant连接失败` - 向量数据库不可用

## 故障排查

### 1. Python依赖缺失

**症状**: 日志中出现 `ModuleNotFoundError` 或 `CLIP_PYTHON_DEPS_MISSING`

**解决方法**:
```bash
cd backend/services
pip3 install -r requirements.txt
```

### 2. CLIP模型下载缓慢

**症状**: 首次运行时卡在"加载CLIP模型"

**解决方法**:
- 使用代理或VPN
- 手动下载模型文件并放到指定目录
- 设置 `CLIP_REFERENCE_PROJECT` 环境变量指向已下载的模型

### 3. Qdrant连接失败

**症状**: 日志中出现 `Qdrant连接失败`

**解决方法**:
- 检查 `.env` 中的 `QDRANT_URL` 配置
- 确保Qdrant服务正在运行
- 检查网络连接和防火墙设置

### 4. 图片加载失败

**症状**: 日志中出现 `图片加载失败`

**解决方法**:
- 检查图片URL是否可访问
- 确保COS存储配置正确
- 检查图片格式是否支持（jpg, png, webp等）

## 配置选项

### 环境变量

```bash
# Qdrant向量数据库配置
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION=car_images

# CLIP模型配置
CLIP_MODEL=openai/clip-vit-base-patch32
CLIP_REFERENCE_PROJECT=/path/to/model  # 可选，指定外部模型路径

# 批量处理配置（可在脚本参数中覆盖）
BATCH_SIZE=10
BATCH_DELAY=1000  # 毫秒
```

## API接口

### 自动向量化服务API

```javascript
// 导入服务
const {
  vectorizeAndUpsertImage,
  triggerAsyncVectorization,
  batchVectorizeImages,
  isVectorizeServiceAvailable
} = require('./services/autoVectorizeService');

// 同步向量化单张图片
const result = await vectorizeAndUpsertImage(imageId, imageUrl);
// 返回: { success: true, imageId, vectorized: true, upserted: true }

// 异步触发向量化（不阻塞）
triggerAsyncVectorization(imageId, imageUrl);

// 批量向量化
const results = await batchVectorizeImages([id1, id2, id3]);
// 返回: { total: 3, success: 2, failed: 1, errors: [...] }

// 检查服务可用性
const isAvailable = await isVectorizeServiceAvailable();
// 返回: true/false
```

### Qdrant操作API

```javascript
// 导入Qdrant配置
const {
  upsertImageVector,
  batchUpsertImageVectors,
  deleteImageVector
} = require('../config/qdrant');

// 插入或更新单个向量
await upsertImageVector(imageId, vector, payload);

// 批量插入或更新向量
await batchUpsertImageVectors([
  { imageId: 1, vector: [...], payload: {...} },
  { imageId: 2, vector: [...], payload: {...} }
]);

// 删除向量
await deleteImageVector(imageId);
```

## 最佳实践

### 1. 新图片上传

- 让系统自动触发向量化即可
- 不要在上传流程中阻塞等待向量化结果
- 向量化失败不影响图片的正常使用

### 2. 历史数据处理

- 使用批量脚本分批处理
- 建议批次大小设置为10-50
- 设置合理的批次间延迟（1-2秒）
- 先使用 `--dry-run` 测试

### 3. 生产环境

- 确保CLIP模型已预下载
- 监控Qdrant服务状态
- 定期检查向量化失败的图片
- 考虑使用队列系统（如BullMQ）处理大批量任务

### 4. 性能调优

- 首次运行会加载CLIP模型（1-2分钟）
- 后续调用秒级响应
- 如果有GPU，向量化速度会更快
- 批量处理时注意内存占用

## 相关文档

- [智能搜索功能](./smart-search.md)
- [CLIP集成指南](../../backend/services/CLIP_INTEGRATION.md)
- [Qdrant向量数据库配置](../../backend/src/config/qdrant.js)

## 更新日志

### 2024-12-04
- 实现图片自动向量化功能
- 在图片上传流程中集成异步向量化
- 创建批量向量化历史数据脚本
- 扩展Qdrant配置，增加向量操作方法





