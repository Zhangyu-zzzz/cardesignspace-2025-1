# CLIP 模型文件下载说明

## 📦 模型文件未包含在仓库中

由于CLIP模型文件较大（约1.7GB），未包含在Git仓库中。

## 🔽 如何获取模型

### 方法1: 自动下载（推荐）

运行以下命令，模型会自动从 Hugging Face 下载：

```bash
cd backend/services/clip_utils
python3 clip_encoder.py
```

首次运行时，程序会自动下载 `openai/clip-vit-base-patch32` 模型到当前目录。

### 方法2: 手动下载

1. 访问 Hugging Face: https://huggingface.co/openai/clip-vit-base-patch32
2. 下载所有模型文件到 `backend/services/clip_utils/clip-vit-base-patch32/` 目录
3. 确保包含以下文件：
   - `pytorch_model.bin` (577MB)
   - `config.json`
   - `tokenizer.json`
   - `vocab.json`
   - 等其他配置文件

## 📁 模型目录结构

```
backend/services/clip_utils/
├── clip_encoder.py
├── config.py
├── DOWNLOAD_MODEL.md  (本文件)
└── clip-vit-base-patch32/  (需要下载)
    ├── pytorch_model.bin
    ├── config.json
    ├── tokenizer.json
    └── ...
```

## ⚠️ 注意事项

- 模型文件已添加到 `.gitignore`，不会被提交到Git
- 确保有足够的磁盘空间（至少2GB）
- 下载可能需要一些时间，请耐心等待
- 模型文件仅在**首次使用时**需要下载

## 🚀 验证模型是否正确

运行测试脚本：

```bash
cd backend/services
python3 clip_vectorize_standalone.py "red sports car"
```

如果输出向量数组，说明模型配置正确。

