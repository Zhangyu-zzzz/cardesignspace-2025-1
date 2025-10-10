#!/bin/bash

# 修复车型详情页面图片排序问题
# 让图片按文件名排序显示，而不是随机顺序

echo "🔧 开始修复车型详情页面图片排序问题..."
echo "================================================"

# 检查当前目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误: 请在项目根目录运行此脚本"
    exit 1
fi

echo "📋 修复内容:"
echo "- 修改后端图片查询排序逻辑"
echo "- 实现按文件名数字排序功能（01.jpg, 02.jpg, 03.jpg...）"
echo "- 保持精选图片优先显示"
echo "- 解决字母排序导致的乱序问题"
echo ""

# 检查修改的文件
echo "🔍 检查修改的文件:"
echo "1. backend/src/controllers/imageController.js"
echo "2. backend/src/controllers/imagesQueryController.js" 
echo "3. backend/src/controllers/uploadController.js"
echo ""

# 显示修改内容
echo "📝 主要修改内容:"
echo "- 实现应用层数字排序逻辑，提取文件名中的数字进行排序"
echo "- 排序优先级: 精选状态 → 精选分数 → 文件名数字 → 创建时间 → ID"
echo "- 支持前导零的数字排序：01.jpg, 02.jpg, 03.jpg, ..., 37.jpg"
echo "- 解决字母排序导致的乱序问题（37.jpeg 不会排在 01.jpg 前面）"
echo ""

# 检查后端服务状态
echo "🔍 检查后端服务状态..."
if pgrep -f "node.*server" > /dev/null; then
    echo "✅ 后端服务正在运行"
    echo "🔄 重启后端服务以应用修改..."
    
    # 重启后端服务
    cd backend
    if [ -f "ecosystem.config.js" ]; then
        pm2 restart auto-gallery-backend
        echo "✅ 后端服务已重启"
    else
        echo "⚠️  请手动重启后端服务: cd backend && npm run dev"
    fi
    cd ..
else
    echo "⚠️  后端服务未运行，请手动启动: cd backend && npm run dev"
fi

echo ""
echo "🧪 运行测试脚本验证修复效果..."
if [ -f "test-numeric-sorting-fix.js" ]; then
    node test-numeric-sorting-fix.js
elif [ -f "test-image-sorting-fix.js" ]; then
    node test-image-sorting-fix.js
else
    echo "⚠️  测试脚本不存在，跳过测试"
fi

echo ""
echo "✅ 图片排序修复完成！"
echo ""
echo "📋 修复说明:"
echo "1. 图片现在会按文件名中的数字排序显示（01.jpg, 02.jpg, 03.jpg...）"
echo "2. 精选图片仍然优先显示在最前面"
echo "3. 普通图片按文件名数字顺序排列，不再是字母顺序"
echo "4. 解决了 37.jpeg 排在 01.jpg 前面的问题"
echo "5. 这样可以让车型详情页面看起来更整齐有序"
echo ""
echo "🔍 验证方法:"
echo "1. 打开任意车型详情页面"
echo "2. 查看图片是否按数字顺序显示（01, 02, 03...）"
echo "3. 精选图片应该在最前面"
echo "4. 普通图片应该按文件名数字排序"
echo "5. 第一张图片应该是 01.jpg 而不是 37.jpeg"
echo ""
echo "如果问题仍然存在，请检查:"
echo "- 数据库中的 filename 字段是否有值"
echo "- 图片文件名是否以数字开头（如 01.jpg, 02.jpg）"
echo "- 后端服务是否已重启"
echo "- 浏览器缓存是否已清除"
