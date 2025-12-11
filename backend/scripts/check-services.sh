#!/bin/bash

echo "🔍 检查服务状态..."
echo ""

# 检查CLIP服务
echo "=== CLIP服务 (端口5001) ==="
if lsof -ti:5001 > /dev/null 2>&1; then
    echo "✅ CLIP服务正在运行"
    curl -s http://localhost:5001/health | python3 -m json.tool 2>/dev/null || echo "   但健康检查失败"
else
    echo "❌ CLIP服务未运行"
    echo "   启动命令: cd backend/services && python3 clip_vectorize_service.py"
fi
echo ""

# 检查主后端服务
echo "=== 主后端服务 (端口3000) ==="
if lsof -ti:3000 > /dev/null 2>&1; then
    echo "✅ 主后端服务正在运行"
    curl -s http://localhost:3000/api/health 2>/dev/null | head -1 || echo "   但健康检查失败"
else
    echo "❌ 主后端服务未运行"
    echo "   启动命令: cd backend && npm run dev"
fi
echo ""

# 检查Qdrant
echo "=== Qdrant服务 (49.235.98.5:6333) ==="
if curl -s --max-time 3 http://49.235.98.5:6333/collections > /dev/null 2>&1; then
    echo "✅ Qdrant服务可访问"
else
    echo "❌ Qdrant服务不可访问"
fi
echo ""

echo "✅ 检查完成"




