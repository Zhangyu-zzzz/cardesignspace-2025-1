# CLIP工具模块

这个目录包含了从参考项目（daydayup-1）复制的CLIP相关代码。

## 文件说明

- `clip_encoder.py` - CLIP编码器，用于将文本和图片转换为向量
- `config.py` - CLIP配置，包含模型配置和向量维度设置

## CLIP模型文件

CLIP模型文件（`clip-vit-base-patch32/`）可以选择性复制：

### 方式1: 使用本地模型（推荐，更快）

如果daydayup-1项目中有模型文件，可以复制过来：

```bash
# 从参考项目复制模型（约577MB，可能需要一些时间）
cp -r /path/to/daydayup-1/clip-vit-base-patch32 backend/services/clip_utils/
```

### 方式2: 自动下载（首次运行）

如果不复制模型文件，CLIP会在首次运行时自动从网络下载模型（需要网络连接，较慢）。

### 方式3: 使用外部模型路径

可以通过环境变量指定外部模型路径：

```bash
export CLIP_REFERENCE_PROJECT=/path/to/daydayup-1
```

## 注意事项

- 模型文件较大（约577MB），如果磁盘空间有限，可以不复制
- 首次运行会自动下载模型，需要网络连接
- 模型下载后会被缓存，后续运行会更快





