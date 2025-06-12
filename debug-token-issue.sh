#!/bin/bash

# 快速调试"无效的访问令牌"问题
echo "🐛 调试上传图片token问题"
echo "========================="

# 检查是否存在token
echo "1. 检查浏览器localStorage中的token:"
echo "   - 打开浏览器开发者工具"
echo "   - 切换到Application/Storage标签"
echo "   - 查看Local Storage中的token值"
echo ""

# 检查环境变量
echo "2. 检查服务器JWT_SECRET配置:"
if command -v pm2 >/dev/null 2>&1; then
    if pm2 jlist | grep -q "cardesignspace-backend"; then
        echo "PM2进程状态:"
        pm2 list | grep cardesignspace-backend
        echo ""
        echo "环境变量检查命令:"
        echo "pm2 env cardesignspace-backend | grep JWT_SECRET"
    else
        echo "❌ 未找到PM2进程 cardesignspace-backend"
    fi
else
    echo "❌ PM2未安装或不可用"
fi

echo ""
echo "3. 测试API连接:"
echo "运行以下命令测试API是否正常:"
echo 'curl -X GET http://localhost:3000/api/auth/me -H "Authorization: Bearer YOUR_TOKEN_HERE"'

echo ""
echo "4. 检查日志:"
echo "后端日志: pm2 logs cardesignspace-backend --lines 20"
echo "Nginx日志: sudo tail -20 /var/log/nginx/error.log"

echo ""
echo "🔧 常见解决方案:"
echo "=================="
echo "问题1: JWT_SECRET不一致"
echo "- 本地和线上的JWT_SECRET不同"
echo "- 解决: 运行 ./fix-jwt-secret.sh"
echo ""
echo "问题2: Token已过期"
echo "- Token超过7天有效期"
echo "- 解决: 重新登录获取新token"
echo ""
echo "问题3: 环境变量未加载"
echo "- PM2进程没有正确加载.env文件"
echo "- 解决: pm2 restart cardesignspace-backend"
echo ""
echo "问题4: 跨域或代理配置"
echo "- nginx代理配置问题"
echo "- 解决: 检查nginx配置中的proxy_pass设置"

echo ""
echo "🚀 一键诊断:"
echo "============"
echo "./check-jwt-secret.sh  # 检查JWT配置"
echo "./fix-jwt-secret.sh    # 修复JWT配置" 