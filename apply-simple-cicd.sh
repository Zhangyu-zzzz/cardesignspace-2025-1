#!/bin/bash
echo "=== 应用简化CI/CD配置 ==="

# 备份当前配置
echo "备份当前CI/CD配置..."
cp .github/workflows/ci-cd.yml .github/workflows/ci-cd.yml.backup.$(date +%Y%m%d_%H%M%S)

# 替换为简化配置
echo "替换为简化CI/CD配置..."
cp .github/workflows/ci-cd-simple.yml .github/workflows/ci-cd.yml

echo "简化CI/CD配置已应用！"
echo ""
echo "🎯 简化策略："
echo ""
echo "🔧 SSH配置简化："
echo "  - 移除复杂的重试机制"
echo "  - 使用基本的SSH配置"
echo "  - 增加连接超时到60秒"
echo ""
echo "⚡ 部署流程简化："
echo "  - 每次都重新构建镜像"
echo "  - 移除智能检测逻辑"
echo "  - 使用单次SSH连接"
echo ""
echo "🛡️ 错误处理简化："
echo "  - 减少复杂的错误处理"
echo "  - 使用基本的连接测试"
echo "  - 简化日志输出"
echo ""
echo "💡 解决SSH连接问题："
echo "  - 避免复杂的SSH配置"
echo "  - 减少连接失败点"
echo "  - 提高连接成功率"
