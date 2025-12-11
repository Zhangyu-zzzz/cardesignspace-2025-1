#!/bin/bash

# 服务器项目路径查找脚本
SERVER="49.235.98.5"
PASSWORD="2006724ZHANGyu"

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║         🔍 查找服务器项目路径                              ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# 生成SSH命令
cat << 'SSHCMD' > /tmp/find_project.sh
#!/bin/bash

echo "=== 查找项目目录 ==="
find /opt /home /var/www /root -maxdepth 3 -name "auto-gallery" -type d 2>/dev/null

echo ""
echo "=== 查找Node.js进程 ==="
ps aux | grep node | grep -v grep | head -5

echo ""
echo "=== 查找backend目录 ==="
find / -path "*/auto-gallery/backend" -type d 2>/dev/null | head -3

echo ""
echo "=== 检查常见路径 ==="
for path in /opt/auto-gallery /home/ubuntu/auto-gallery /var/www/auto-gallery /root/auto-gallery; do
    if [ -d "$path" ]; then
        echo "✅ 找到: $path"
        echo "   backend/services 路径: $path/backend/services"
        if [ -d "$path/backend/services" ]; then
            echo "   ✅ backend/services 存在"
            ls -la "$path/backend/services/" 2>/dev/null | head -10
        fi
    fi
done
SSHCMD

chmod +x /tmp/find_project.sh

echo "正在连接服务器..."
echo "服务器: $SERVER"
echo ""
echo "请手动复制以下命令到终端执行："
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "ssh root@$SERVER"
echo "密码: $PASSWORD"
echo ""
echo "连接后，执行以下命令："
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cat /tmp/find_project.sh
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"




