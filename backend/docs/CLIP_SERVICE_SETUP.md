# CLIP向量化服务集成指南

## 概述

智能搜索功能需要CLIP模型将文本转换为向量，然后使用Qdrant进行向量相似度搜索。本指南说明如何设置和启动CLIP向量化服务。

## 架构

```
前端 -> Node.js后端 -> CLIP Python服务 -> CLIP模型
                      -> Qdrant向量数据库
```

## 步骤1: 准备参考项目

确保参考项目（daydayup-1）已部署在云服务器上，包含：
- `clip_encoder.py` - CLIP编码器模块
- `config.py` - 配置文件
- `clip-vit-base-patch32/` - CLIP模型文件（可选，会自动下载）

## 步骤2: 安装Python依赖

在云服务器上：

```bash
cd /path/to/auto-gallery/backend/services
pip3 install -r requirements_clip.txt
```

如果使用虚拟环境：

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements_clip.txt
```

## 步骤3: 配置环境变量

在云服务器上设置环境变量：

```bash
# CLIP服务配置
export CLIP_SERVICE_PORT=5001
export CLIP_SERVICE_HOST=0.0.0.0
export CLIP_REFERENCE_PROJECT=/path/to/daydayup-1

# Node.js后端配置（在.env文件中）
CLIP_SERVICE_URL=http://localhost:5001
```

## 步骤4: 启动CLIP服务

### 方式1: 直接运行

```bash
cd /path/to/auto-gallery/backend/services
python3 clip_vectorize_service.py
```

### 方式2: 使用启动脚本

```bash
cd /path/to/auto-gallery/backend/services
chmod +x start_clip_service.sh
./start_clip_service.sh
```

### 方式3: 使用systemd（推荐生产环境）

创建服务文件 `/etc/systemd/system/clip-vectorize.service`:

```ini
[Unit]
Description=CLIP Vectorize Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/path/to/auto-gallery/backend/services
Environment="CLIP_REFERENCE_PROJECT=/path/to/daydayup-1"
Environment="CLIP_SERVICE_PORT=5001"
Environment="CLIP_SERVICE_HOST=0.0.0.0"
ExecStart=/usr/bin/python3 /path/to/auto-gallery/backend/services/clip_vectorize_service.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

启动服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable clip-vectorize
sudo systemctl start clip-vectorize
sudo systemctl status clip-vectorize
```

查看日志：

```bash
sudo journalctl -u clip-vectorize -f
```

## 步骤5: 验证服务

### 检查服务健康状态

```bash
curl http://localhost:5001/health
```

应该返回：

```json
{
  "status": "ok",
  "service": "clip-vectorize",
  "clip_loaded": true
}
```

### 测试文本向量化

```bash
curl -X POST http://localhost:5001/encode-text \
  -H "Content-Type: application/json" \
  -d '{"text": "红色的宝马SUV"}'
```

应该返回512维向量数组。

## 步骤6: 启动Node.js后端

确保CLIP服务已启动后，启动Node.js后端：

```bash
cd /path/to/auto-gallery/backend
npm start
```

后端会自动连接到CLIP服务进行文本向量化。

## 故障排查

### CLIP服务无法启动

1. 检查Python依赖是否安装：
   ```bash
   pip3 list | grep -E "flask|torch|transformers"
   ```

2. 检查参考项目路径是否正确：
   ```bash
   ls -la $CLIP_REFERENCE_PROJECT/clip_encoder.py
   ```

3. 检查端口是否被占用：
   ```bash
   netstat -tuln | grep 5001
   ```

### CLIP模型加载失败

1. 检查模型文件是否存在：
   ```bash
   ls -la $CLIP_REFERENCE_PROJECT/clip-vit-base-patch32/
   ```

2. 如果模型不存在，CLIP会自动从网络下载（首次运行较慢）

3. 检查磁盘空间是否足够（模型约577MB）

### Node.js后端无法连接CLIP服务

1. 检查CLIP服务是否运行：
   ```bash
   curl http://localhost:5001/health
   ```

2. 检查环境变量：
   ```bash
   echo $CLIP_SERVICE_URL
   ```

3. 检查防火墙设置，确保端口5001可访问

### 向量搜索返回空结果

1. 检查Qdrant服务是否运行：
   ```bash
   curl http://49.235.98.5:6333/collections
   ```

2. 检查Qdrant集合中是否有向量数据

3. 调整相似度阈值（默认0.3，可在代码中调整）

## 性能优化

1. **使用GPU加速**（如果有GPU）：
   ```bash
   export DEVICE=cuda
   ```

2. **调整批量大小**：
   在`config.py`中设置`BATCH_SIZE`

3. **使用模型缓存**：
   确保CLIP模型文件在本地，避免每次下载

## 监控

建议监控以下指标：
- CLIP服务响应时间
- 向量化请求成功率
- 服务内存使用情况
- Qdrant搜索响应时间

## 注意事项

1. CLIP模型首次加载需要1-2分钟（CPU）或几秒（GPU）
2. 服务需要足够的内存（建议至少2GB）
3. 如果CLIP服务不可用，系统会自动回退到payload过滤搜索
4. 确保CLIP服务和Node.js后端在同一网络环境中



