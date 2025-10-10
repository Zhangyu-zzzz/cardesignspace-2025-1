#!/bin/bash

# 修复v-model绑定问题

set -e

echo "🔧 修复v-model绑定问题..."
echo "======================="

cd /Users/zobot/Desktop/unsplash-crawler/test/auto-gallery

# 1. 检查修改状态
echo "1️⃣ 检查修改状态..."
if grep -q "addTagFromValue" frontend/src/views/ImageGallery.vue; then
    echo "✅ v-model修复已添加"
else
    echo "❌ v-model修复未添加"
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

# 4. 生成修复报告
echo ""
echo "4️⃣ 生成修复报告..."
cat > ../fix-vmodel-issue-report.md << EOF
# v-model绑定问题修复报告

## 修复时间
$(date)

## 问题分析
从用户提供的控制台日志发现：

### 1. v-model绑定失效
- \`newTag\`始终为空字符串\`''\`
- \`targetValue\`显示正确的输入内容
- 说明\`v-model="newTag"\`绑定有问题

### 2. 回车键检测正常
- 输入框事件正常工作
- 但回车键检测没有触发

### 3. 直接触发保存
- 看到"保存标签请求"，说明某个地方直接调用了保存
- 而不是先添加标签再保存

## 修复方案

### 1. 绕过v-model问题
由于\`v-model\`绑定失效，直接从\`event.target.value\`获取输入值：

\`\`\`javascript
keyupTest(event) {
  // 如果是回车键，直接从event.target.value获取值
  if (event.key === 'Enter' || event.keyCode === 13) {
    console.log('检测到回车键，调用addTag方法')
    const tagValue = event.target.value.trim()
    if (tagValue && this.selectedImage) {
      console.log('从event.target.value获取标签值:', tagValue)
      this.addTagFromValue(tagValue)
    }
  }
}
\`\`\`

### 2. 创建新的添加标签方法
\`\`\`javascript
addTagFromValue(tagValue) {
  console.log('addTagFromValue被调用:', {
    tagValue: tagValue,
    currentTags: this.selectedImage.tags,
    tagsType: typeof this.selectedImage.tags,
    tagsLength: this.selectedImage.tags ? this.selectedImage.tags.length : 'undefined'
  })
  
  if (!this.selectedImage.tags.includes(tagValue)) {
    const newTags = [...this.selectedImage.tags, tagValue]
    
    // 使用Vue.set来确保响应式更新
    this.$set(this.selectedImage, 'tags', newTags)
    
    // 清空输入框
    this.newTag = ''
    if (this.$refs.tagInput) {
      this.$refs.tagInput.value = ''
    }
  }
}
\`\`\`

### 3. 手动清空输入框
由于\`v-model\`有问题，手动清空输入框：
- 设置\`this.newTag = ''\`
- 设置\`this.$refs.tagInput.value = ''\`

## 测试步骤

### 1. 基本功能测试
1. 访问前端页面: http://localhost:8080
2. 打开浏览器开发者工具 (F12)
3. 切换到Console标签页
4. 点击图片打开详情模态框
5. 点击"编辑标签"按钮

### 2. 输入框测试
1. 在输入框中输入"测试标签"
2. 查看控制台输出：
   - 应该看到每次按键的"输入框按键事件"
   - \`targetValue\`应该显示实际输入的内容
   - \`newTag\`可能仍然显示为空

### 3. 回车键测试
1. 输入完成后按回车键
2. 查看控制台输出：
   - 应该看到"检测到回车键，调用addTag方法"
   - 应该看到"从event.target.value获取标签值: 测试标签"
   - 应该看到"addTagFromValue被调用"
   - 应该看到"添加标签后"等调试信息
   - 标签应该被添加到列表中

## 预期结果

### 正常情况
\`\`\`
输入框按键事件: {
  key: "Enter",
  keyCode: 13,
  newTag: "",
  eventType: "keyup",
  targetValue: "测试标签"
}
检测到回车键，调用addTag方法
从event.target.value获取标签值: 测试标签
addTagFromValue被调用: {
  tagValue: "测试标签",
  currentTags: [...],
  tagsType: "object",
  tagsLength: ...
}
添加标签后: {
  newTags: [...],
  newTagsType: "object",
  newTagsLength: ...
}
\`\`\`

## 服务信息
- 前端服务: http://localhost:8080
- 前端PID: $FRONTEND_PID
- 停止服务: kill $FRONTEND_PID

EOF

echo "✅ 修复报告已生成: fix-vmodel-issue-report.md"

echo ""
echo "🔧 v-model绑定问题修复完成！"
echo "=========================="
echo ""
echo "📊 修复总结:"
echo "  - 绕过v-model绑定问题"
echo "  - 直接从event.target.value获取输入值"
echo "  - 创建新的addTagFromValue方法"
echo "  - 手动清空输入框"
echo ""
echo "🔍 测试步骤:"
echo "  1. 访问前端页面: http://localhost:8080"
echo "  2. 打开浏览器开发者工具 (F12)"
echo "  3. 点击图片打开详情模态框"
echo "  4. 点击'编辑标签'按钮"
echo "  5. 在输入框中输入任意标签"
echo "  6. 按回车键"
echo "  7. 查看控制台是否显示'从event.target.value获取标签值'"
echo ""
echo "📈 预期结果:"
echo "  - 应该看到'检测到回车键，调用addTag方法'"
echo "  - 应该看到'从event.target.value获取标签值'"
echo "  - 应该看到'addTagFromValue被调用'"
echo "  - 标签应该被成功添加到列表中"
echo ""
echo "🛠️ 服务管理:"
echo "  前端PID: $FRONTEND_PID"
echo "  停止服务: kill $FRONTEND_PID"
