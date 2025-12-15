# CLIP服务集成说明

## 概述

CLIP服务已集成到主后端中，无需单独运行Python HTTP服务。系统会自动选择最佳方案：

1. **优先使用集成版**：直接调用Python脚本（无需HTTP服务）
2. **自动回退到HTTP服务**：如果Python环境缺少依赖，自动使用HTTP服务

## 工作方式

### 集成版（推荐）

- **位置**：`backend/src/services/clip_vectorize_service.js`
- **Python脚本**：`backend/services/clip_vectorize_standalone.py`
- **工作原理**：Node.js通过`child_process`直接调用Python脚本
- **优点**：
  - 无需运行独立的HTTP服务
  - 减少网络开销
  - 简化部署

### HTTP服务（备选）

- **位置**：`backend/src/services/clip_vectorize_client.js`
- **Python服务**：`backend/services/clip_vectorize_service.py`
- **工作原理**：通过HTTP请求调用Python Flask服务
- **使用场景**：当Python环境缺少依赖时自动回退

## 环境要求

### 集成版要求

1. **Python 3.x**：系统需要安装Python 3
2. **Python依赖**：
   ```bash
   cd backend/services
   pip install -r requirements_clip.txt
   ```
3. **CLIP工具目录**：确保`backend/services/clip_utils/`目录存在，包含：
   - `clip_encoder.py`
   - `config.py`

### HTTP服务要求（备选）

如果集成版不可用，需要运行独立的Python HTTP服务：

```bash
cd backend/services
python3 clip_vectorize_service.py
```

服务默认运行在 `http://localhost:5001`

## 配置

### 环境变量（可选）

- `CLIP_SERVICE_URL`：HTTP服务的URL（默认：`http://localhost:5001`）
- `CLIP_SERVICE_TIMEOUT`：HTTP服务超时时间（默认：15000ms）
- `CLIP_REFERENCE_PROJECT`：外部CLIP项目路径（如果本地工具目录不存在）

## 自动回退机制

系统会自动检测并回退：

1. **集成版失败** → 自动尝试HTTP服务
2. **HTTP服务失败** → 抛出错误（需要检查服务状态）

### 错误类型

- `CLIP_PYTHON_DEPS_MISSING`：Python依赖缺失，会自动回退到HTTP服务
- 其他错误：会尝试HTTP服务，如果也失败则抛出错误

## 测试

### 测试集成版

```bash
cd backend
node -e "const { encodeText } = require('./src/services/clip_vectorize_service'); encodeText('red car').then(v => console.log('✅ 成功，维度:', v.length)).catch(e => console.error('❌ 错误:', e.message));"
```

### 测试HTTP服务

```bash
curl -X POST http://localhost:5001/encode-text \
  -H "Content-Type: application/json" \
  -d '{"text": "red car"}'
```

## 故障排查

### 问题1：集成版失败，回退到HTTP服务

**原因**：Python环境缺少依赖（如torch）

**解决**：
1. 安装Python依赖：`pip install -r requirements_clip.txt`
2. 或运行HTTP服务作为备选

### 问题2：所有服务都失败

**检查**：
1. Python是否安装：`python3 --version`
2. Python依赖是否完整：`python3 -c "import torch; import transformers"`
3. HTTP服务是否运行：`curl http://localhost:5001/health`

## 性能说明

- **首次调用**：需要加载CLIP模型（1-2分钟）
- **后续调用**：模型已加载，响应速度快（<1秒）
- **超时设置**：集成版60秒，HTTP服务15秒

## 推荐配置

**生产环境**：
- 使用集成版（减少网络开销）
- 确保Python环境完整
- 考虑预热模型（首次调用后模型常驻内存）

**开发环境**：
- 可以使用HTTP服务（便于调试）
- 或使用集成版（简化部署）





