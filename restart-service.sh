#!/bin/bash

echo "🔄 重启CarDesignSpace服务..."

# 1. 停止当前服务
echo "🛑 停止当前服务..."
pm2 stop cardesignspace-final

# 2. 等待进程完全停止
echo "⏰ 等待进程停止..."
sleep 3

# 3. 重新启动服务
echo "🚀 重新启动服务..."
pm2 start cardesignspace-final

# 4. 等待启动完成
echo "⏰ 等待服务启动..."
sleep 5

# 5. 检查服务状态
echo "📊 检查服务状态..."
pm2 list

# 6. 显示最新日志
echo "📋 最新服务日志:"
pm2 logs cardesignspace-final --lines 10

echo "✅ 服务重启完成！" 