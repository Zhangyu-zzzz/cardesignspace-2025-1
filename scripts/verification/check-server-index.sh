#!/bin/bash
echo "=== 检查服务器上的index.html文件 ==="
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@49.235.98.5 << 'EOF'
cd /opt/auto-gallery
echo "当前目录: $(pwd)"
echo "检查frontend/public/index.html是否存在:"
ls -la frontend/public/index.html
echo ""
echo "=== index.html文件内容 ==="
cat frontend/public/index.html
echo ""
echo "=== 检查Docker容器状态 ==="
docker-compose ps
echo ""
echo "=== 检查前端容器日志 ==="
docker-compose logs --tail=20 frontend
EOF
