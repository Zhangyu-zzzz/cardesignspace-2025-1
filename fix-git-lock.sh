#!/bin/bash
echo "=== 修复Git引用锁定问题 ==="
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@49.235.98.5 << 'EOF'
cd /opt/auto-gallery
echo "当前目录: $(pwd)"
echo "检查Git状态..."
git status
echo ""
echo "检查远程分支..."
git branch -r
echo ""
echo "检查本地分支..."
git branch -a
echo ""
echo "清理Git引用锁定..."
rm -f .git/refs/remotes/origin/main.lock || echo "没有找到锁定文件"
echo ""
echo "重置Git状态..."
git fetch origin
git reset --hard origin/main
git clean -fd
echo ""
echo "验证Git状态..."
git status
echo ""
echo "检查最新提交..."
git log --oneline -3
echo ""
echo "Git修复完成！"
EOF
