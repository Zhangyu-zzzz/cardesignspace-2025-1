# CLIP向量化服务

这个服务提供HTTP API，将文本转换为向量，用于智能搜索功能。

## 功能

- 将单个文本编码为向量
- 批量将多个文本编码为向量
- 健康检查接口

## 安装

### 1. 安装Python依赖

```bash
cd backend/services
pip3 install -r requirements_clip.txt
```

### 2. 配置参考项目路径

服务需要访问参考项目中的CLIP模型和代码。可以通过环境变量设置：

```bash
export CLIP_REFERENCE_PROJECT=/path/to/daydayup-1
```

或者在云服务器上，确保参考项目路径正确。

### 3. 启动服务

```bash
# 方式1: 使用启动脚本
chmod +x start_clip_service.sh
./start_clip_service.sh

# 方式2: 直接运行Python
python3 clip_vectorize_service.py
```

### 4. 配置环境变量（可选）

```bash
export CLIP_SERVICE_PORT=5001        # 服务端口，默认5001
export CLIP_SERVICE_HOST=0.0.0.0    # 监听地址，默认0.0.0.0
export CLIP_REFERENCE_PROJECT=/path/to/daydayup-1  # 参考项目路径
```

## API接口

### 健康检查

```bash
GET /health
```

响应：
```json
{
  "status": "ok",
  "service": "clip-vectorize",
  "clip_loaded": true
}
```

### 文本向量化

```bash
POST /encode-text
Content-Type: application/json

{
  "text": "红色的宝马SUV"
}
```

响应：
```json
{
  "status": "success",
  "text": "红色的宝马SUV",
  "vector": [0.123, 0.456, ...],
  "dimension": 512
}
```

### 批量文本向量化

```bash
POST /encode-texts
Content-Type: application/json

{
  "texts": ["红色的", "宝马", "SUV"]
}
```

响应：
```json
{
  "status": "success",
  "texts": ["红色的", "宝马", "SUV"],
  "vectors": [[0.123, ...], [0.456, ...], ...],
  "count": 3,
  "dimension": 512
}
```

## 在Node.js后端中使用

服务会自动被 `clip_vectorize_client.js` 调用。确保：

1. CLIP服务已启动
2. 环境变量 `CLIP_SERVICE_URL` 指向正确的服务地址（默认: http://localhost:5001）

## 云服务器部署

在云服务器上：

1. 确保参考项目（daydayup-1）已部署
2. 设置正确的 `CLIP_REFERENCE_PROJECT` 环境变量
3. 使用 systemd 或 supervisor 管理服务（可选）

示例 systemd 服务文件：

```ini
[Unit]
Description=CLIP Vectorize Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/path/to/backend/services
Environment="CLIP_REFERENCE_PROJECT=/path/to/daydayup-1"
Environment="CLIP_SERVICE_PORT=5001"
ExecStart=/usr/bin/python3 /path/to/backend/services/clip_vectorize_service.py
Restart=always

[Install]
WantedBy=multi-user.target
```




