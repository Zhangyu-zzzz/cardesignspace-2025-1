# 智能搜索功能部署检查清单

## 📋 问题：上线网站智能搜索页面什么都没有显示

本文档帮助您系统地检查和修复智能搜索功能的部署问题。

---

## 🔍 第一步：确认代码已部署到服务器

### 1.1 SSH连接到服务器

```bash
ssh root@49.235.98.5
```

### 1.2 进入项目目录并拉取最新代码

```bash
cd /opt/auto-gallery  # 或您的实际部署路径
git fetch origin
git pull origin main
```

**检查点：** 确认拉取到最新提交 `c117ee3`

```bash
git log --oneline -1
# 应该显示: c117ee3 feat: 完整更新项目文件，包含智能搜索、安全加固、UI优化等所有功能
```

---

## 🎨 第二步：重新构建前端

### 2.1 构建前端代码

```bash
cd /opt/auto-gallery/frontend
npm install  # 更新依赖
npm run build  # 构建生产版本
```

### 2.2 确认SmartSearch.vue已包含在构建中

```bash
# 检查源文件是否存在
ls -lh src/views/SmartSearch.vue

# 检查构建输出
ls -lh dist/
```

### 2.3 重启Nginx（如果需要）

```bash
sudo nginx -t  # 测试配置
sudo systemctl reload nginx  # 重载配置
```

---

## 🔧 第三步：检查后端服务状态

### 3.1 检查Node.js后端是否运行

```bash
# 检查进程
ps aux | grep node

# 或使用PM2
pm2 list
pm2 logs backend  # 查看日志
```

### 3.2 重启后端服务

```bash
cd /opt/auto-gallery/backend

# 如果使用PM2
pm2 restart backend
pm2 logs backend --lines 100

# 或直接运行
npm install  # 更新依赖
npm start
```

---

## 🤖 第四步：检查CLIP向量化服务（关键！）

智能搜索依赖CLIP服务将文本转换为向量。

### 4.1 检查CLIP服务是否运行

```bash
# 检查进程
ps aux | grep clip

# 检查端口
netstat -tuln | grep 5001
# 或
lsof -i :5001
```

### 4.2 测试CLIP服务健康状态

```bash
curl http://localhost:5001/health
```

**期望输出：**
```json
{
  "status": "ok",
  "service": "clip-vectorize",
  "clip_loaded": true
}
```

### 4.3 如果CLIP服务未运行，启动它

**方式1：使用systemd（推荐）**

```bash
# 检查服务状态
sudo systemctl status clip-vectorize

# 如果服务不存在，创建服务文件
sudo nano /etc/systemd/system/clip-vectorize.service
```

添加以下内容：

```ini
[Unit]
Description=CLIP Vectorize Service for Smart Search
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/auto-gallery/backend/services
Environment="CLIP_SERVICE_PORT=5001"
Environment="CLIP_SERVICE_HOST=0.0.0.0"
ExecStart=/usr/bin/python3 /opt/auto-gallery/backend/services/clip_vectorize_service.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

然后启动服务：

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

**方式2：手动启动（测试用）**

```bash
cd /opt/auto-gallery/backend/services

# 检查Python依赖
pip3 list | grep -E "flask|torch|transformers"

# 如果依赖缺失，安装
pip3 install -r requirements_clip.txt

# 启动服务
python3 clip_vectorize_service.py

# 或后台运行
nohup python3 clip_vectorize_service.py > clip_service.log 2>&1 &
```

### 4.4 测试CLIP向量化功能

```bash
curl -X POST http://localhost:5001/encode-text \
  -H "Content-Type: application/json" \
  -d '{"text": "红色的宝马SUV"}'
```

**期望输出：** 一个512维的向量数组

---

## 🗄️ 第五步：检查Qdrant向量数据库

### 5.1 检查Qdrant服务

```bash
# 检查进程
ps aux | grep qdrant

# 测试连接
curl http://49.235.98.5:6333/collections
```

### 5.2 检查集合是否有数据

```bash
# 检查image_vectors集合
curl http://49.235.98.5:6333/collections/image_vectors

# 应该显示点数（points_count）大于0
```

### 5.3 如果没有数据，运行向量化脚本

```bash
cd /opt/auto-gallery/backend/scripts

# 检查是否有向量化脚本
ls -la *vector*.js

# 运行向量化（如果脚本存在）
node vectorize-images.js
```

---

## ⚙️ 第六步：检查后端配置

### 6.1 检查.env文件配置

```bash
cd /opt/auto-gallery/backend
cat .env | grep -E "(CLIP|QDRANT)"
```

**必需的配置项：**

```bash
# CLIP服务配置
CLIP_SERVICE_URL=http://localhost:5001

# Qdrant配置
QDRANT_HOST=49.235.98.5
QDRANT_PORT=6333
QDRANT_COLLECTION=image_vectors
```

### 6.2 如果配置缺失，添加到.env

```bash
nano /opt/auto-gallery/backend/.env
```

添加缺失的配置，然后重启后端：

```bash
pm2 restart backend
```

---

## 🔍 第七步：检查API端点

### 7.1 测试智能搜索API

```bash
# 在服务器上测试
curl -X POST http://localhost:3000/api/smart-search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "红色的汽车",
    "searchMode": "vector",
    "limit": 10
  }'
```

### 7.2 查看返回结果

**正常情况：** 返回图片数组
**异常情况：** 返回错误信息或空数组

---

## 📊 第八步：查看日志排查问题

### 8.1 后端日志

```bash
# PM2日志
pm2 logs backend --lines 200

# 或者查看日志文件
tail -f /opt/auto-gallery/backend/logs/*.log
```

### 8.2 CLIP服务日志

```bash
# systemd日志
sudo journalctl -u clip-vectorize -n 200 --no-pager

# 或者查看日志文件
tail -f /opt/auto-gallery/backend/services/clip_service.log
```

### 8.3 Nginx日志

```bash
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

---

## 🌐 第九步：前端检查

### 9.1 在浏览器中打开开发者工具

1. 访问智能搜索页面：`https://你的域名/smart-search`
2. 打开浏览器开发者工具（F12）
3. 查看Console标签是否有错误
4. 查看Network标签，检查API请求

### 9.2 常见前端问题

- **API 404错误：** 路由配置问题，检查nginx配置
- **API 500错误：** 后端服务问题，查看后端日志
- **API超时：** CLIP服务未启动或响应慢
- **返回空数组：** Qdrant没有数据或相似度阈值太高

---

## 🔄 第十步：完整重启流程（如果问题仍未解决）

```bash
# 1. 停止所有服务
pm2 stop all
sudo systemctl stop clip-vectorize
sudo systemctl stop qdrant  # 如果使用systemd管理

# 2. 启动Qdrant
sudo systemctl start qdrant
# 或
docker start qdrant  # 如果使用Docker

# 3. 启动CLIP服务
sudo systemctl start clip-vectorize
# 等待10秒让服务完全启动
sleep 10

# 4. 验证CLIP服务
curl http://localhost:5001/health

# 5. 启动后端
cd /opt/auto-gallery/backend
pm2 restart backend

# 6. 查看所有服务状态
pm2 list
sudo systemctl status clip-vectorize
curl http://49.235.98.5:6333/collections
```

---

## 🎯 快速诊断脚本

创建并运行诊断脚本：

```bash
cd /opt/auto-gallery/backend/scripts
chmod +x diagnose-search.js
node diagnose-search.js
```

这个脚本会自动检查所有关键服务的状态。

---

## 📝 常见问题解答

### Q1: CLIP服务启动失败

**A:** 检查以下几点：
1. Python依赖是否完整：`pip3 list | grep -E "flask|torch|transformers"`
2. 端口是否被占用：`lsof -i :5001`
3. 内存是否足够：`free -h`（CLIP模型需要约2GB内存）

### Q2: Qdrant返回空结果

**A:** 
1. 检查是否有向量数据：`curl http://49.235.98.5:6333/collections/image_vectors`
2. 降低相似度阈值（在`smartSearchController.js`中修改）
3. 检查图片是否已向量化

### Q3: 前端页面空白

**A:**
1. 检查前端是否重新构建：`ls -lh /opt/auto-gallery/frontend/dist/`
2. 检查Nginx配置是否正确指向dist目录
3. 清除浏览器缓存（Ctrl+Shift+R）

### Q4: API请求超时

**A:**
1. CLIP服务首次加载模型需要1-2分钟，请耐心等待
2. 检查CLIP服务日志：`sudo journalctl -u clip-vectorize -f`
3. 考虑增加API超时时间（在前端配置中）

---

## ✅ 验证清单

完成部署后，确认以下所有项目都正常：

- [ ] 代码已拉取到最新版本（c117ee3）
- [ ] 前端已重新构建（`npm run build`）
- [ ] Nginx已重载配置
- [ ] Node.js后端正在运行（`pm2 list`）
- [ ] CLIP服务正在运行并响应（`curl http://localhost:5001/health`）
- [ ] Qdrant服务正在运行并有数据
- [ ] 后端.env配置正确
- [ ] API端点返回正确结果
- [ ] 浏览器Console无错误
- [ ] 智能搜索页面可以显示结果

---

## 📞 需要帮助？

如果按照以上步骤仍然无法解决问题，请提供以下信息：

1. 后端日志最后50行：`pm2 logs backend --lines 50`
2. CLIP服务日志：`sudo journalctl -u clip-vectorize -n 50`
3. API测试结果：`curl http://localhost:3000/api/smart-search`（完整输出）
4. 浏览器Console截图
5. Qdrant集合信息：`curl http://49.235.98.5:6333/collections/image_vectors`

---

## 🚀 部署成功后的优化建议

1. **设置监控**：使用PM2监控服务状态
2. **配置日志轮转**：防止日志文件过大
3. **设置自动重启**：使用systemd或PM2确保服务崩溃后自动重启
4. **性能优化**：如果有GPU，配置CLIP使用GPU加速
5. **缓存策略**：考虑为搜索结果添加缓存

---

*最后更新：2025-12-03*

