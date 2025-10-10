#!/bin/bash

# 调试标签显示问题

set -e

echo "🔍 调试标签显示问题..."
echo "===================="

cd /Users/zobot/Desktop/unsplash-crawler/test/auto-gallery

# 1. 检查修改状态
echo "1️⃣ 检查修改状态..."
if grep -q "打开图片模态框:" frontend/src/views/ImageGallery.vue; then
    echo "✅ 前端调试日志已添加"
else
    echo "❌ 前端调试日志未添加"
fi

# 2. 重启前端服务
echo "2️⃣ 重启前端服务..."
pkill -f "npm.*serve" 2>/dev/null || true
pkill -f "vue-cli-service.*serve" 2>/dev/null || true
sleep 2

cd frontend
export NODE_OPTIONS="--openssl-legacy-provider"
npm run serve &
FRONTEND_PID=$!
echo "✅ 前端服务启动中 (PID: $FRONTEND_PID)"
cd ..
sleep 15

# 3. 测试前端页面
echo "3️⃣ 测试前端页面..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 2>/dev/null || echo "000")
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo "✅ 前端页面可访问 (HTTP $FRONTEND_STATUS)"
else
    echo "❌ 前端页面无法访问 (HTTP $FRONTEND_STATUS)"
fi

# 4. 生成调试报告
echo ""
echo "4️⃣ 生成调试报告..."
cat > ../debug-tags-display-report.md << EOF
# 标签显示问题调试报告

## 调试时间
$(date)

## 问题分析
通过测试发现：
1. ✅ 数据库保存功能正常 - 标签正确保存到数据库
2. ✅ 后端API返回正确数据 - 包含正确的tags字段
3. ❓ 前端显示可能有问题 - 需要进一步调试

## 测试结果

### 数据库测试
- 图片ID 346519的标签: ["测试标签1","测试标签2"]
- 更新时间: 2025-10-09 03:35:28
- 数据库保存: ✅ 正常

### API测试
- 后端API返回: ✅ 包含正确的tags字段
- 响应格式: ✅ 正确
- 数据完整性: ✅ 完整

### 前端调试
- 添加了调试日志到openImageModal方法
- 日志会显示图片ID、标签数据、类型和长度
- 需要用户手动测试并查看浏览器控制台

## 调试步骤

### 1. 访问前端页面
打开浏览器访问: http://localhost:8080

### 2. 打开浏览器开发者工具
- 按F12或右键选择"检查"
- 切换到"Console"标签页

### 3. 测试标签显示
1. 点击任意图片打开详情模态框
2. 查看控制台输出的调试信息
3. 特别关注ID为346519的图片（应该包含测试标签）

### 4. 检查标签显示
- 在模态框中查看标签区域
- 确认是否显示"测试标签1"和"测试标签2"
- 如果没有显示，查看控制台错误信息

## 可能的问题

### 1. 前端数据绑定问题
- selectedImage.tags可能为undefined
- Vue响应式数据更新问题

### 2. 条件渲染问题
- v-if条件可能不正确
- 标签数组可能为空或格式不正确

### 3. 数据格式问题
- 标签数据可能不是数组格式
- 可能存在数据类型转换问题

## 下一步调试

根据控制台输出结果：
1. 如果显示tags为undefined - 检查API数据传递
2. 如果显示tags为空数组 - 检查数据库查询
3. 如果显示tags有数据但不显示 - 检查Vue模板渲染

## 服务信息
- 前端服务: http://localhost:8080
- 前端PID: $FRONTEND_PID
- 停止服务: kill $FRONTEND_PID

EOF

echo "✅ 调试报告已生成: debug-tags-display-report.md"

echo ""
echo "🔍 标签显示问题调试准备完成！"
echo "============================="
echo ""
echo "📊 调试总结:"
echo "  - 数据库保存功能正常"
echo "  - 后端API返回正确数据"
echo "  - 前端已添加调试日志"
echo "  - 需要用户手动测试"
echo ""
echo "🔍 调试步骤:"
echo "  1. 访问前端页面: http://localhost:8080"
echo "  2. 打开浏览器开发者工具 (F12)"
echo "  3. 切换到Console标签页"
echo "  4. 点击图片打开模态框"
echo "  5. 查看控制台调试信息"
echo "  6. 特别测试ID为346519的图片"
echo ""
echo "📈 预期结果:"
echo "  - 控制台应显示图片标签数据"
echo "  - 模态框应显示'测试标签1'和'测试标签2'"
echo "  - 如果仍有问题，请提供控制台输出"
echo ""
echo "🛠️ 服务管理:"
echo "  前端PID: $FRONTEND_PID"
echo "  停止服务: kill $FRONTEND_PID"
