#!/bin/bash
echo "=== 应用健壮CI/CD配置 ==="

# 备份当前配置
echo "备份当前CI/CD配置..."
cp .github/workflows/ci-cd.yml .github/workflows/ci-cd.yml.backup.$(date +%Y%m%d_%H%M%S)

# 替换为健壮配置
echo "替换为健壮CI/CD配置..."
cp .github/workflows/ci-cd-robust.yml .github/workflows/ci-cd.yml

echo "健壮CI/CD配置已应用！"
echo ""
echo "🛡️ 健壮性改进："
echo ""
echo "🔧 Git错误处理："
echo "  - 自动清理Git锁定文件"
echo "  - 重置Git仓库状态"
echo "  - 验证Git同步状态"
echo ""
echo "⚡ SSH连接优化："
echo "  - ServerAliveInterval=60 保持连接"
echo "  - ServerAliveCountMax=10 重试机制"
echo "  - timeout-minutes: 30 超时设置"
echo ""
echo "🏗️ 构建优化："
echo "  - 分步构建前后端"
echo "  - 智能代码变化检测"
echo "  - 构建完成确认"
echo ""
echo "📊 监控增强："
echo "  - 详细状态检查"
echo "  - Git状态验证"
echo "  - 服务健康检查"
echo ""
echo "💡 解决所有已知问题："
echo "  - Git引用锁定问题"
echo "  - SSH连接中断问题"
echo "  - 构建资源冲突问题"
echo "  - 部署稳定性问题"
