#!/bin/bash

# CLIP向量化服务启动脚本
# 用于启动Python HTTP服务，提供文本向量化功能

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SERVICE_DIR="$SCRIPT_DIR"

echo "🚀 启动CLIP向量化服务..."
echo "=========================="

# 检查本地clip_utils目录（优先使用）
CLIP_UTILS_DIR="$SERVICE_DIR/clip_utils"
if [ -d "$CLIP_UTILS_DIR" ]; then
    echo "✅ 发现本地CLIP工具目录: $CLIP_UTILS_DIR"
    echo "   将使用本地文件，无需外部参考项目"
    USE_LOCAL=1
else
    echo "⚠️  警告: 本地CLIP工具目录不存在: $CLIP_UTILS_DIR"
    echo "   将尝试使用外部参考项目路径"
    USE_LOCAL=0
    
    # 如果设置了环境变量，使用它
    if [ -n "$CLIP_REFERENCE_PROJECT" ]; then
        REFERENCE_PROJECT="$CLIP_REFERENCE_PROJECT"
        echo "✅ 使用环境变量中的路径: $REFERENCE_PROJECT"
    else
        # 尝试默认路径
        DEFAULT_REFERENCE_PROJECT="/Users/zobot/Desktop/unsplash-crawler/daydayup-1"
        if [ -d "$DEFAULT_REFERENCE_PROJECT" ]; then
            REFERENCE_PROJECT="$DEFAULT_REFERENCE_PROJECT"
            echo "✅ 使用默认路径: $REFERENCE_PROJECT"
        else
            echo "❌ 错误: 未找到参考项目"
            echo "   请设置环境变量: export CLIP_REFERENCE_PROJECT=/path/to/daydayup-1"
            echo "   或确保 clip_utils 目录存在"
            exit 1
        fi
    fi
    
    # 检查参考项目是否存在
    if [ ! -d "$REFERENCE_PROJECT" ]; then
        echo "❌ 错误: 参考项目路径不存在: $REFERENCE_PROJECT"
        exit 1
    fi
    
    export CLIP_REFERENCE_PROJECT="$REFERENCE_PROJECT"
fi

# 检查Python环境
if ! command -v python3 &> /dev/null; then
    echo "❌ 错误: 未找到 python3"
    exit 1
fi

# 检查是否安装了必要的Python包
echo "📦 检查Python依赖..."
if ! python3 -c "import flask" 2>/dev/null; then
    echo "   安装Python依赖..."
    pip3 install -r "$SERVICE_DIR/requirements_clip.txt"
fi

# 设置环境变量
export CLIP_SERVICE_PORT=${CLIP_SERVICE_PORT:-5001}
export CLIP_SERVICE_HOST=${CLIP_SERVICE_HOST:-0.0.0.0}

echo "🌐 服务地址: http://${CLIP_SERVICE_HOST}:${CLIP_SERVICE_PORT}"
echo ""

# 启动服务
cd "$SERVICE_DIR"
echo "正在启动服务..."
echo "如果首次运行，CLIP模型加载可能需要1-2分钟，请耐心等待..."
echo ""
python3 clip_vectorize_service.py
