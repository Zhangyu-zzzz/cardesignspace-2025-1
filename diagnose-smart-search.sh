#!/bin/bash

echo "=================================================="
echo "🔍 智能搜索功能诊断工具"
echo "=================================================="
echo ""

# 服务器配置
SERVER_HOST="49.235.98.5"
SERVER_USER="root"

echo "📋 正在连接服务器: $SERVER_HOST"
echo ""

ssh $SERVER_USER@$SERVER_HOST << 'EOF'

echo "=================================================="
echo "1️⃣  检查CLIP服务状态（文本/图片向量化）"
echo "=================================================="

# 检查CLIP服务进程
CLIP_PID=$(ps aux | grep "clip_vectorize_service.py" | grep -v grep | awk '{print $2}')

if [ -z "$CLIP_PID" ]; then
    echo "❌ CLIP服务未运行！"
    echo ""
    echo "   CLIP服务是智能搜索的核心组件，用于将搜索文本转换为向量"
else
    echo "✅ CLIP服务正在运行"
    echo "   PID: $CLIP_PID"
fi

# 检查5001端口
PORT_5001=$(netstat -tlnp 2>/dev/null | grep ":5001" || ss -tlnp 2>/dev/null | grep ":5001")

if [ -z "$PORT_5001" ]; then
    echo "❌ 端口5001未监听！"
else
    echo "✅ 端口5001正在监听"
    echo "   $PORT_5001"
fi

# 测试CLIP服务健康检查
echo ""
echo "🔍 测试CLIP服务..."
CLIP_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5001/health 2>/dev/null)

if [ "$CLIP_HEALTH" = "200" ]; then
    echo "✅ CLIP服务健康检查通过 (HTTP $CLIP_HEALTH)"
else
    echo "❌ CLIP服务健康检查失败 (HTTP $CLIP_HEALTH)"
fi

echo ""
echo "=================================================="
echo "2️⃣  检查Qdrant向量数据库状态"
echo "=================================================="

# 检查Qdrant进程
QDRANT_PID=$(ps aux | grep "qdrant" | grep -v grep | awk '{print $2}')

if [ -z "$QDRANT_PID" ]; then
    echo "❌ Qdrant服务未运行！"
    echo ""
    echo "   Qdrant是向量数据库，用于存储和搜索图片向量"
else
    echo "✅ Qdrant服务正在运行"
    echo "   PID: $QDRANT_PID"
fi

# 检查6333端口
PORT_6333=$(netstat -tlnp 2>/dev/null | grep ":6333" || ss -tlnp 2>/dev/null | grep ":6333")

if [ -z "$PORT_6333" ]; then
    echo "❌ 端口6333未监听！"
else
    echo "✅ 端口6333正在监听"
    echo "   $PORT_6333"
fi

# 测试Qdrant连接
echo ""
echo "🔍 测试Qdrant连接..."
QDRANT_HEALTH=$(curl -s http://localhost:6333/health 2>/dev/null)

if [ ! -z "$QDRANT_HEALTH" ]; then
    echo "✅ Qdrant服务响应正常"
    echo "   响应: $QDRANT_HEALTH"
else
    echo "❌ Qdrant服务无响应"
fi

# 检查Qdrant集合
echo ""
echo "🔍 检查Qdrant集合..."
COLLECTIONS=$(curl -s http://localhost:6333/collections 2>/dev/null)

if [ ! -z "$COLLECTIONS" ]; then
    echo "✅ 获取集合列表成功"
    echo "   集合: $COLLECTIONS"
else
    echo "❌ 无法获取集合列表"
fi

echo ""
echo "=================================================="
echo "3️⃣  检查Python环境"
echo "=================================================="

# 检查Python
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo "✅ Python已安装: $PYTHON_VERSION"
else
    echo "❌ Python未安装"
fi

# 检查Python依赖
echo ""
echo "🔍 检查Python依赖..."

TORCH_INSTALLED=$(python3 -c "import torch; print('✅ torch已安装')" 2>&1)
if [[ $TORCH_INSTALLED == *"✅"* ]]; then
    echo "$TORCH_INSTALLED"
else
    echo "❌ torch未安装或有问题"
fi

TRANSFORMERS_INSTALLED=$(python3 -c "import transformers; print('✅ transformers已安装')" 2>&1)
if [[ $TRANSFORMERS_INSTALLED == *"✅"* ]]; then
    echo "$TRANSFORMERS_INSTALLED"
else
    echo "❌ transformers未安装或有问题"
fi

FLASK_INSTALLED=$(python3 -c "import flask; print('✅ flask已安装')" 2>&1)
if [[ $FLASK_INSTALLED == *"✅"* ]]; then
    echo "$FLASK_INSTALLED"
else
    echo "❌ flask未安装或有问题"
fi

echo ""
echo "=================================================="
echo "4️⃣  检查CLIP服务文件"
echo "=================================================="

# 检查CLIP服务脚本
if [ -f "/opt/auto-gallery/backend/services/clip_vectorize_service.py" ]; then
    echo "✅ CLIP服务脚本存在: /opt/auto-gallery/backend/services/clip_vectorize_service.py"
else
    echo "❌ CLIP服务脚本不存在"
fi

# 检查CLIP工具目录
if [ -d "/opt/auto-gallery/backend/services/clip_utils" ]; then
    echo "✅ CLIP工具目录存在"
    ls -la /opt/auto-gallery/backend/services/clip_utils/
else
    echo "❌ CLIP工具目录不存在"
fi

# 检查requirements文件
if [ -f "/opt/auto-gallery/backend/services/requirements_clip.txt" ]; then
    echo "✅ requirements_clip.txt存在"
else
    echo "❌ requirements_clip.txt不存在"
fi

echo ""
echo "=================================================="
echo "5️⃣  检查后端API"
echo "=================================================="

# 测试智能搜索API
echo "🔍 测试智能搜索API..."
SEARCH_API=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/smart-search/search \
  -H "Content-Type: application/json" \
  -d '{"query":"BMW","limit":10}' 2>/dev/null)

if [ "$SEARCH_API" = "200" ]; then
    echo "✅ 智能搜索API响应正常 (HTTP $SEARCH_API)"
else
    echo "❌ 智能搜索API响应异常 (HTTP $SEARCH_API)"
fi

echo ""
echo "=================================================="
echo "📝 诊断总结"
echo "=================================================="

# 生成总结
ISSUES=()

if [ -z "$CLIP_PID" ]; then
    ISSUES+=("CLIP服务未运行")
fi

if [ "$CLIP_HEALTH" != "200" ]; then
    ISSUES+=("CLIP服务不健康")
fi

if [ -z "$QDRANT_PID" ]; then
    ISSUES+=("Qdrant服务未运行")
fi

if [ -z "$QDRANT_HEALTH" ]; then
    ISSUES+=("Qdrant服务无响应")
fi

if [ ${#ISSUES[@]} -eq 0 ]; then
    echo "✅ 所有核心服务运行正常！"
    echo ""
    echo "💡 如果智能搜索仍然没有结果，可能是："
    echo "   1. 图片数据尚未向量化（需要运行向量化任务）"
    echo "   2. Qdrant集合中没有数据"
    echo "   3. 前端查询参数有问题"
else
    echo "❌ 发现以下问题:"
    for issue in "${ISSUES[@]}"; do
        echo "   - $issue"
    done
    echo ""
    echo "💡 修复建议:"
    if [[ " ${ISSUES[@]} " =~ " CLIP服务未运行 " ]]; then
        echo "   1. 启动CLIP服务:"
        echo "      cd /opt/auto-gallery/backend/services"
        echo "      pip3 install -r requirements_clip.txt"
        echo "      nohup python3 clip_vectorize_service.py > clip_service.log 2>&1 &"
    fi
    if [[ " ${ISSUES[@]} " =~ " Qdrant服务未运行 " ]]; then
        echo "   2. 安装并启动Qdrant:"
        echo "      docker run -d -p 6333:6333 qdrant/qdrant"
    fi
fi

echo ""
echo "=================================================="

EOF

echo ""
echo "✅ 诊断完成！"







