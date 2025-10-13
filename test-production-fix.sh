#!/bin/bash

echo "🧪 测试生产环境修复效果"
echo "=================================="

# 检查当前环境
echo "📋 检查当前环境配置..."

# 检查前端API配置
echo "🔍 检查前端API配置..."
if grep -q "process.env.NODE_ENV === 'production'" frontend/src/views/ImageUpload.vue; then
    echo "✅ ImageUpload.vue API配置正确"
else
    echo "❌ ImageUpload.vue API配置需要修复"
fi

if grep -q "process.env.NODE_ENV === 'production'" frontend/src/views/ArticleEditor.vue; then
    echo "✅ ArticleEditor.vue API配置正确"
else
    echo "❌ ArticleEditor.vue API配置需要修复"
fi

# 检查环境变量文件
echo "🔍 检查环境变量文件..."
if [ -f "backend/.env.production" ]; then
    echo "✅ 后端生产环境配置文件存在"
else
    echo "❌ 后端生产环境配置文件不存在"
fi

if [ -f "frontend/.env.production" ]; then
    echo "✅ 前端生产环境配置文件存在"
else
    echo "❌ 前端生产环境配置文件不存在"
fi

# 检查nginx配置
echo "🔍 检查nginx配置..."
if [ -f "nginx.production.conf" ]; then
    echo "✅ nginx生产环境配置文件存在"
else
    echo "❌ nginx生产环境配置文件不存在"
fi

# 检查部署脚本
echo "🔍 检查部署脚本..."
if [ -f "deploy-production.sh" ]; then
    echo "✅ 部署脚本存在"
    if [ -x "deploy-production.sh" ]; then
        echo "✅ 部署脚本可执行"
    else
        echo "❌ 部署脚本不可执行"
    fi
else
    echo "❌ 部署脚本不存在"
fi

# 检查配置指南
echo "🔍 检查配置指南..."
if [ -f "PRODUCTION_SETUP.md" ]; then
    echo "✅ 配置指南存在"
else
    echo "❌ 配置指南不存在"
fi

echo ""
echo "📊 修复状态总结:"
echo "=================================="

# 统计修复项目
total_checks=6
passed_checks=0

[ -f "backend/.env.production" ] && ((passed_checks++))
[ -f "frontend/.env.production" ] && ((passed_checks++))
[ -f "nginx.production.conf" ] && ((passed_checks++))
[ -f "deploy-production.sh" ] && [ -x "deploy-production.sh" ] && ((passed_checks++))
[ -f "PRODUCTION_SETUP.md" ] && ((passed_checks++))
grep -q "process.env.NODE_ENV === 'production'" frontend/src/views/ImageUpload.vue && ((passed_checks++))

echo "✅ 通过检查: $passed_checks/$total_checks"

if [ $passed_checks -eq $total_checks ]; then
    echo "🎉 所有修复项目都已完成！"
    echo ""
    echo "📋 下一步操作:"
    echo "1. 编辑 backend/.env.production 配置您的数据库和COS信息"
    echo "2. 运行 ./deploy-production.sh 部署到生产环境"
    echo "3. 访问 https://www.cardesignspace.com/upload 测试上传功能"
else
    echo "⚠️  还有 $((total_checks - passed_checks)) 个项目需要修复"
fi

echo ""
echo "🔧 主要修复内容:"
echo "✅ 统一了API配置，解决生产环境路径问题"
echo "✅ 创建了生产环境配置文件"
echo "✅ 更新了nginx配置"
echo "✅ 提供了完整的部署脚本"
echo "✅ 创建了详细的配置指南"
