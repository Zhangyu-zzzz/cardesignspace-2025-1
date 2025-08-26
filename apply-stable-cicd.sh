#!/bin/bash
echo "=== 应用稳定CI/CD配置 ==="

# 备份当前配置
echo "备份当前CI/CD配置..."
cp .github/workflows/ci-cd.yml .github/workflows/ci-cd.yml.backup.$(date +%Y%m%d_%H%M%S)

# 替换为稳定配置
echo "替换为稳定CI/CD配置..."
cp .github/workflows/ci-cd-stable.yml .github/workflows/ci-cd.yml

echo "稳定CI/CD配置已应用！"
echo ""
echo "🔧 稳定性改进："
echo ""
echo "⚡ SSH连接优化："
echo "  - 添加 ServerAliveInterval=60 保持连接活跃"
echo "  - 添加 ServerAliveCountMax=10 增加重试次数"
echo "  - 设置 timeout-minutes: 30 增加超时时间"
echo ""
echo "🏗️ 构建优化："
echo "  - 分步构建前后端，避免资源冲突"
echo "  - 智能检测代码变化，减少不必要的构建"
echo "  - 增加构建完成确认步骤"
echo ""
echo "📊 监控改进："
echo "  - 更详细的状态检查"
echo "  - 分步验证构建结果"
echo "  - 增强错误处理机制"
echo ""
echo "💡 解决SSH连接中断问题："
echo "  - 连接更稳定"
echo "  - 构建过程更可靠"
echo "  - 部署成功率更高"
