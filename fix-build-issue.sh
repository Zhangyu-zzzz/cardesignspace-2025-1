#!/bin/bash

echo "🔧 修复Node.js 18构建问题..."

# 方法1: 使用legacy OpenSSL provider
echo "尝试方法1: 设置legacy OpenSSL provider"
export NODE_OPTIONS="--openssl-legacy-provider"
npm run build

# 如果方法1失败，尝试方法2
if [ $? -ne 0 ]; then
    echo "方法1失败，尝试方法2: 更新依赖"
    
    # 更新terser-webpack-plugin到支持Node 18的版本
    npm install terser-webpack-plugin@5.3.9 --save-dev
    
    # 重新构建
    npm run build
fi

# 如果还是失败，提供降级Node.js的建议
if [ $? -ne 0 ]; then
    echo "❌ 构建仍然失败"
    echo "建议降级到Node.js 16:"
    echo "nvm install 16"
    echo "nvm use 16"
    echo "npm install"
    echo "npm run build"
fi 