#!/bin/bash
echo "=== 应用终极CI/CD配置 ==="

# 备份当前配置
echo "备份当前CI/CD配置..."
cp .github/workflows/ci-cd.yml .github/workflows/ci-cd.yml.backup.$(date +%Y%m%d_%H%M%S)

# 替换为终极配置
echo "替换为终极CI/CD配置..."
cp .github/workflows/ci-cd-ultimate.yml .github/workflows/ci-cd.yml

echo "终极CI/CD配置已应用！"
echo ""
echo "🚀 终极改进："
echo ""
echo "🔧 SSH连接重试机制："
echo "  - 5次自动重试连接"
echo "  - 每次失败后等待5秒"
echo "  - 连接超时30秒"
echo ""
echo "⚡ SSH配置优化："
echo "  - ServerAliveInterval 30"
echo "  - ServerAliveCountMax 20"
echo "  - TCPKeepAlive yes"
echo "  - Compression yes"
echo "  - ControlMaster auto"
echo ""
echo "⏱️ 超时设置："
echo "  - GitHub Actions: 45分钟"
echo "  - SSH连接: 30秒"
echo "  - 服务启动等待: 20秒"
echo ""
echo "🛡️ 错误处理："
echo "  - 连接失败自动重试"
echo "  - 详细的错误日志"
echo "  - 优雅的失败处理"
echo ""
echo "💡 解决SSH连接问题："
echo "  - 网络不稳定时的重试"
echo "  - 服务器负载高时的等待"
echo "  - 连接中断时的恢复"
