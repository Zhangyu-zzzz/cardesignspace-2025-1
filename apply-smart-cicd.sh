#!/bin/bash
echo "=== 应用智能CI/CD配置 ==="

# 备份当前配置
echo "备份当前CI/CD配置..."
cp .github/workflows/ci-cd.yml .github/workflows/ci-cd.yml.backup.$(date +%Y%m%d_%H%M%S)

# 替换为智能配置
echo "替换为智能CI/CD配置..."
cp .github/workflows/ci-cd-smart.yml .github/workflows/ci-cd.yml

echo "智能CI/CD配置已应用！"
echo ""
echo "🎯 智能部署策略："
echo ""
echo "📊 代码变化检测："
echo "  - 前端变化：检查 frontend/src, frontend/public, frontend/package.json, frontend/vue.config.js"
echo "  - 后端变化：检查 backend/src, backend/package.json, backend/app.js"
echo ""
echo "🚀 部署策略："
echo "  ✅ 有代码变化 → 重新构建镜像"
echo "  ✅ 无代码变化 → 仅重启服务"
echo "  ✅ 镜像不存在 → 首次构建"
echo ""
echo "⏱️ 时间对比："
echo "  - 重新构建：5-10分钟"
echo "  - 仅重启：30秒"
echo ""
echo "💡 优势："
echo "  - 大幅减少不必要的构建时间"
echo "  - 节省服务器资源"
echo "  - 提高部署效率"
echo "  - 保持代码更新的可靠性"
