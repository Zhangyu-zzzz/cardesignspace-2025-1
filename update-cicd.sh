#!/bin/bash
echo "=== 更新CI/CD配置 ==="

# 备份当前配置
echo "备份当前CI/CD配置..."
cp .github/workflows/ci-cd.yml .github/workflows/ci-cd.yml.backup.$(date +%Y%m%d_%H%M%S)

# 替换为改进的配置
echo "替换为改进的CI/CD配置..."
cp .github/workflows/ci-cd-improved.yml .github/workflows/ci-cd.yml

echo "CI/CD配置已更新！"
echo ""
echo "主要改进："
echo "1. ✅ 每次部署都会重新构建Docker镜像"
echo "2. ✅ 使用 --no-cache 确保使用最新代码"
echo "3. ✅ 删除旧镜像避免缓存问题"
echo "4. ✅ 更健壮的Git冲突处理"
echo "5. ✅ 更详细的部署状态检查"
echo "6. ✅ 验证构建后的文件内容"
echo ""
echo "现在每次git push后，CI/CD将："
echo "- 拉取最新代码"
echo "- 重新构建前端和后端镜像"
echo "- 启动新容器"
echo "- 验证部署结果"
