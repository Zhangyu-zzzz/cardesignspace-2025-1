# CLIP向量化服务快速启动

## 📍 本地调试 vs 云服务器部署

本文档包含两种场景的说明：
- **本地调试**：在本地Mac/Windows上运行和测试
- **云服务器部署**：在生产服务器上运行

---

## 🖥️ 本地调试（推荐先本地测试）

### 0. 准备CLIP工具文件（已完成 ✅）

CLIP相关文件已经复制到 `backend/services/clip_utils/` 目录：
- ✅ `clip_encoder.py` - CLIP编码器
- ✅ `config.py` - 配置文件

**可选**：如果需要更快的启动速度，可以复制CLIP模型文件：

```bash
# 复制CLIP模型（约577MB，可选）
cp -r /Users/zobot/Desktop/unsplash-crawler/daydayup-1/clip-vit-base-patch32 backend/services/clip_utils/
```

如果不复制模型，首次运行会自动下载（需要网络，较慢）。

### 1. 安装Python依赖

```bash
cd backend/services
pip3 install -r requirements_clip.txt
```

如果使用虚拟环境（推荐）：

```bash
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements_clip.txt
```

### 2. 启动服务（无需设置环境变量！）

现在可以直接启动，**不需要设置CLIP_REFERENCE_PROJECT环境变量**：

```bash
python3 clip_vectorize_service.py
```

服务会自动使用 `clip_utils/` 目录中的本地文件。

**或者**使用启动脚本：

```bash
./start_clip_service.sh
```

服务将在 `http://localhost:5001` 启动。

### 4. 验证服务

打开**新的终端窗口**，运行：

```bash
# 健康检查
curl http://localhost:5001/health

# 测试向量化
curl -X POST http://localhost:5001/encode-text \
  -H "Content-Type: application/json" \
  -d '{"text": "红色的宝马"}'
```

### 5. 启动Node.js后端

在**另一个终端窗口**中：

```bash
cd backend
npm run dev  # 或 npm start
```

现在可以在前端测试智能搜索功能了！

---

## ☁️ 云服务器部署

### 1. 安装Python依赖

```bash
cd /path/to/auto-gallery/backend/services
pip3 install -r requirements_clip.txt
```

### 2. 设置环境变量（云服务器）

**方式1: 临时设置（当前会话）**

```bash
export CLIP_REFERENCE_PROJECT=/root/daydayup-1  # 云服务器上的实际路径
export CLIP_SERVICE_PORT=5001
```

**方式2: 永久设置（推荐）**

编辑 `~/.bashrc` 或 `~/.bash_profile`：

```bash
nano ~/.bashrc
```

添加：

```bash
export CLIP_REFERENCE_PROJECT=/root/daydayup-1
export CLIP_SERVICE_PORT=5001
```

然后执行：

```bash
source ~/.bashrc
```

**方式3: 使用systemd服务文件（生产环境推荐）**

见 `README_CLIP_SERVICE.md` 中的systemd配置示例。

### 3. 启动服务

```bash
# 直接运行
python3 clip_vectorize_service.py

# 或后台运行
nohup python3 clip_vectorize_service.py > clip_service.log 2>&1 &

# 或使用systemd（推荐）
sudo systemctl start clip-vectorize
```

### 4. 验证服务

```bash
curl http://localhost:5001/health
```

---

## 🔍 如何找到参考项目路径？

### 本地（Mac/Linux）

```bash
# 查找daydayup-1项目
find ~ -name "daydayup-1" -type d 2>/dev/null

# 或者直接查看
ls -la ~/Desktop/unsplash-crawler/daydayup-1
```

### 云服务器

```bash
# 查找daydayup-1项目
find /root -name "daydayup-1" -type d 2>/dev/null
find /home -name "daydayup-1" -type d 2>/dev/null

# 或者查看当前项目位置
pwd
# 如果daydayup-1在同一目录下，路径可能是：
# /root/unsplash-crawler/daydayup-1
```

---

## ⚠️ 故障排查

### 本地调试

- **无法导入模块**: 
  ```bash
  # 检查路径是否正确
  ls -la $CLIP_REFERENCE_PROJECT/clip_encoder.py
  
  # 如果路径不对，重新设置
  export CLIP_REFERENCE_PROJECT=/正确的/路径/daydayup-1
  ```

- **端口被占用**: 
  ```bash
  # 查看端口占用
  lsof -i :5001  # Mac/Linux
  netstat -ano | findstr :5001  # Windows
  ```

- **模型加载慢**: 首次运行需要下载CLIP模型（约577MB），请耐心等待

### 云服务器

- **服务无法启动**: 检查Python版本和依赖
  ```bash
  python3 --version  # 需要3.7+
  pip3 list | grep flask
  ```

- **无法访问服务**: 检查防火墙
  ```bash
  # 开放端口
  sudo ufw allow 5001
  ```

---

## 💡 提示

1. **本地调试时**：确保daydayup-1项目在本地存在
2. **云服务器部署时**：确保daydayup-1项目已上传到服务器
3. **路径格式**：
   - Mac/Linux: `/Users/zobot/Desktop/...` 或 `/root/...`
   - Windows: `C:\Users\...`（但建议使用WSL）
4. **测试顺序**：先本地测试通过，再部署到云服务器

