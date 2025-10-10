#!/bin/bash
echo "=== 重新构建前端并部署 ==="
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@49.235.98.5 << 'EOF'
cd /opt/auto-gallery
echo "1. 停止前端容器..."
docker-compose stop frontend
echo "2. 删除旧的前端镜像..."
docker rmi auto-gallery-frontend || echo "镜像不存在，跳过删除"
echo "3. 重新构建前端镜像..."
docker-compose build --no-cache frontend
echo "4. 启动前端容器..."
docker-compose up -d frontend
echo "5. 等待服务启动..."
sleep 10
echo "6. 检查容器状态..."
docker-compose ps
echo "7. 检查构建后的index.html..."
docker exec auto-gallery-frontend cat /usr/share/nginx/html/index.html | head -20
echo "8. 测试网站访问..."
curl -s -o /dev/null -w "HTTP状态码: %{http_code}\n" http://localhost:8080
echo "9. 检查百度统计代码是否生效..."
curl -s http://localhost:8080 | grep -i "hm.baidu.com" || echo "未找到百度统计代码"
EOF
