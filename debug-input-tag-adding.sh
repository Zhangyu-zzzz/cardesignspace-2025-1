#!/bin/bash

# 调试输入框标签添加问题

set -e

echo "🔍 调试输入框标签添加问题..."
echo "=========================="

cd /Users/zobot/Desktop/unsplash-crawler/test/auto-gallery

# 1. 检查修改状态
echo "1️⃣ 检查修改状态..."
if grep -q "添加标签前:" frontend/src/views/ImageGallery.vue; then
    echo "✅ 调试日志已添加"
else
    echo "❌ 调试日志未添加"
fi

if grep -q "this.\$set" frontend/src/views/ImageGallery.vue; then
    echo "✅ Vue.set方法已添加"
else
    echo "❌ Vue.set方法未添加"
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
cat > ../debug-input-tag-adding-report.md << EOF
# 输入框标签添加问题调试报告

## 调试时间
$(date)

## 问题描述
用户反馈输入框输入的标签仍然不能保存成功。

## 调试措施

### 1. 添加详细调试日志
在\`addTag\`方法中添加了详细的调试信息：
- 添加标签前的状态
- 添加标签后的状态
- 赋值后的检查
- 失败情况的日志

### 2. 使用Vue.set方法
将直接赋值改为使用\`this.\$set\`方法：
\`\`\`javascript
// 修改前
this.selectedImage.tags = newTags

// 修改后
this.\$set(this.selectedImage, 'tags', newTags)
\`\`\`

### 3. 调试信息说明
控制台会显示以下信息：
- \`添加标签前:\` - 显示当前状态
- \`添加标签后:\` - 显示新数组状态
- \`赋值后检查:\` - 显示赋值后的状态
- \`添加标签失败:\` - 显示失败原因

## 测试步骤

### 1. 打开浏览器开发者工具
1. 访问前端页面: http://localhost:8080
2. 按F12打开开发者工具
3. 切换到Console标签页

### 2. 测试输入框标签添加
1. 点击任意图片打开详情模态框
2. 点击"编辑标签"按钮
3. 在输入框中输入新标签（如"测试输入标签"）
4. 按回车键添加标签
5. 查看控制台输出的调试信息

### 3. 分析调试信息
根据控制台输出分析问题：
- 如果显示"添加标签失败" - 检查输入和selectedImage状态
- 如果显示"标签已存在" - 标签重复，这是正常的
- 如果显示正常流程但UI不更新 - 可能是Vue响应式问题

## 可能的问题和解决方案

### 1. Vue响应式问题
**问题**: Vue 2的响应式系统可能无法检测到数组变化
**解决**: 使用\`this.\$set\`方法强制更新

### 2. 数据格式问题
**问题**: tags字段可能不是数组格式
**解决**: 检查数据类型和格式

### 3. 时机问题
**问题**: 在错误的时机调用addTag方法
**解决**: 检查事件绑定和调用时机

### 4. 作用域问题
**问题**: this指向不正确
**解决**: 检查方法绑定和作用域

## 预期调试输出

### 正常情况
\`\`\`
添加标签前: {
  newTag: "测试输入标签",
  currentTags: ["现有标签1", "现有标签2"],
  tagsType: "object",
  tagsLength: 2
}
添加标签后: {
  newTags: ["现有标签1", "现有标签2", "测试输入标签"],
  newTagsType: "object",
  newTagsLength: 3
}
赋值后检查: {
  selectedImageTags: ["现有标签1", "现有标签2", "测试输入标签"],
  selectedImageTagsType: "object",
  selectedImageTagsLength: 3
}
\`\`\`

### 异常情况
\`\`\`
添加标签失败: {
  newTag: "",
  hasSelectedImage: true,
  newTagTrimmed: ""
}
\`\`\`

## 服务信息
- 前端服务: http://localhost:8080
- 前端PID: $FRONTEND_PID
- 停止服务: kill $FRONTEND_PID

EOF

echo "✅ 调试报告已生成: debug-input-tag-adding-report.md"

echo ""
echo "🔍 输入框标签添加问题调试准备完成！"
echo "================================="
echo ""
echo "📊 调试总结:"
echo "  - 添加了详细的调试日志"
echo "  - 使用Vue.set方法确保响应式更新"
echo "  - 提供了完整的调试流程"
echo "  - 分析了可能的问题和解决方案"
echo ""
echo "🔍 调试步骤:"
echo "  1. 访问前端页面: http://localhost:8080"
echo "  2. 打开浏览器开发者工具 (F12)"
echo "  3. 切换到Console标签页"
echo "  4. 点击图片打开详情模态框"
echo "  5. 点击'编辑标签'按钮"
echo "  6. 在输入框中输入新标签并按回车"
echo "  7. 查看控制台调试信息"
echo ""
echo "📈 预期结果:"
echo "  - 控制台应显示详细的调试信息"
echo "  - 标签应该能正常添加到UI中"
echo "  - 如果仍有问题，请提供控制台输出"
echo ""
echo "🛠️ 服务管理:"
echo "  前端PID: $FRONTEND_PID"
echo "  停止服务: kill $FRONTEND_PID"
