#!/bin/bash

# 添加调试提示

set -e

echo "🔧 添加调试提示..."
echo "================="

cd /Users/zobot/Desktop/unsplash-crawler/test/auto-gallery

# 1. 检查修改状态
echo "1️⃣ 检查修改状态..."
if grep -q "检测到回车键！" frontend/src/views/ImageGallery.vue; then
    echo "✅ 调试提示已添加"
else
    echo "❌ 调试提示未添加"
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
cat > ../add-debug-hints-report.md << EOF
# 调试提示添加报告

## 添加时间
$(date)

## 问题分析
用户反馈输入框中输入的标签还是没有保存下来，从控制台日志发现：

### 1. 保存的是空数组
- \`tags: Array(0)\` 和 \`更新后的标签: []\`
- 没有看到标签添加的日志
- 直接触发了保存，而没有先添加标签

### 2. 操作流程问题
用户直接点击了"保存标签"按钮，而没有先按回车键添加标签到列表中。

## 添加的改进

### 1. 用户提示
在输入框下方添加了操作提示：
\`\`\`html
<div class="tag-hint">
  💡 提示：输入标签后按回车键添加到列表中，然后点击"保存标签"
</div>
\`\`\`

### 2. 详细调试日志
在\`keyupTest\`方法中添加了详细日志：
\`\`\`javascript
keyupTest(event) {
  if (event.key === 'Enter' || event.keyCode === 13) {
    console.log('检测到回车键！')
    const tagValue = event.target.value.trim()
    console.log('从输入框获取的值:', tagValue)
    if (tagValue && this.selectedImage) {
      console.log('准备添加标签:', tagValue)
      this.addTagFromValue(tagValue)
    } else {
      console.log('无法添加标签:', {
        tagValue: tagValue,
        hasSelectedImage: !!this.selectedImage
      })
    }
  }
}
\`\`\`

### 3. 标签添加调试
在\`addTagFromValue\`方法中添加了详细日志：
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
    console.log('添加标签后:', {
      newTags: newTags,
      newTagsType: typeof newTags,
      newTagsLength: newTags.length
    })
    
    this.$set(this.selectedImage, 'tags', newTags)
    
    console.log('赋值后检查:', {
      selectedImageTags: this.selectedImage.tags,
      selectedImageTagsType: typeof this.selectedImage.tags,
      selectedImageTagsLength: this.selectedImage.tags ? this.selectedImage.tags.length : 'undefined'
    })
    
    console.log('标签添加成功！')
  } else {
    console.log('标签已存在，跳过添加')
  }
}
\`\`\`

## 正确的操作流程

### 1. 添加标签
1. 在输入框中输入标签（如"测试标签"）
2. **按回车键**将标签添加到列表中
3. 查看控制台是否显示"检测到回车键！"等日志
4. 查看标签是否出现在列表中

### 2. 保存标签
1. 确认标签已添加到列表中
2. 点击"保存标签"按钮
3. 查看控制台是否显示保存成功的消息

## 测试步骤

### 1. 基本功能测试
1. 访问前端页面: http://localhost:8080
2. 打开浏览器开发者工具 (F12)
3. 切换到Console标签页
4. 点击图片打开详情模态框
5. 点击"编辑标签"按钮

### 2. 标签添加测试
1. 在输入框中输入"测试标签"
2. **按回车键**（不要直接点击保存按钮）
3. 查看控制台输出：
   - 应该看到"检测到回车键！"
   - 应该看到"从输入框获取的值: 测试标签"
   - 应该看到"准备添加标签: 测试标签"
   - 应该看到"addTagFromValue被调用"
   - 应该看到"标签添加成功！"
4. 查看标签是否出现在列表中

### 3. 标签保存测试
1. 确认标签已添加到列表中
2. 点击"保存标签"按钮
3. 查看控制台输出：
   - 应该看到"保存标签请求: {imageId: ..., tags: Array(1)}"
   - 应该看到"标签保存成功，更新后的标签: ['测试标签']"

## 预期结果

### 正常情况
\`\`\`
检测到回车键！
从输入框获取的值: 测试标签
准备添加标签: 测试标签
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
赋值后检查: {
  selectedImageTags: [...],
  selectedImageTagsType: "object",
  selectedImageTagsLength: ...
}
标签添加成功！
\`\`\`

## 服务信息
- 前端服务: http://localhost:8080
- 前端PID: $FRONTEND_PID
- 停止服务: kill $FRONTEND_PID

EOF

echo "✅ 调试报告已生成: add-debug-hints-report.md"

echo ""
echo "🔧 调试提示添加完成！"
echo "==================="
echo ""
echo "📊 添加总结:"
echo "  - 添加了用户操作提示"
echo "  - 添加了详细的调试日志"
echo "  - 明确了正确的操作流程"
echo ""
echo "🔍 正确操作流程:"
echo "  1. 在输入框中输入标签"
echo "  2. 按回车键将标签添加到列表中"
echo "  3. 点击'保存标签'按钮保存修改"
echo ""
echo "📈 测试步骤:"
echo "  1. 访问前端页面: http://localhost:8080"
echo "  2. 打开浏览器开发者工具 (F12)"
echo "  3. 点击图片打开详情模态框"
echo "  4. 点击'编辑标签'按钮"
echo "  5. 在输入框中输入'测试标签'"
echo "  6. 按回车键（重要！）"
echo "  7. 查看控制台是否显示'检测到回车键！'"
echo "  8. 点击'保存标签'按钮"
echo ""
echo "🛠️ 服务管理:"
echo "  前端PID: $FRONTEND_PID"
echo "  停止服务: kill $FRONTEND_PID"
