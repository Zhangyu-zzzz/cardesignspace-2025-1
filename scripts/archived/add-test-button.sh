#!/bin/bash

# 添加测试按钮

set -e

echo "🔧 添加测试按钮..."
echo "================="

cd /Users/zobot/Desktop/unsplash-crawler/test/auto-gallery

# 1. 检查修改状态
echo "1️⃣ 检查修改状态..."
if grep -q "测试添加标签" frontend/src/views/ImageGallery.vue; then
    echo "✅ 测试按钮已添加"
else
    echo "❌ 测试按钮未添加"
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

# 4. 生成测试报告
echo ""
echo "4️⃣ 生成测试报告..."
cat > ../add-test-button-report.md << EOF
# 测试按钮添加报告

## 添加时间
$(date)

## 问题分析
从用户提供的控制台日志发现：

### 1. 用户没有按回车键
- 用户输入完"头灯"后，直接点击了"保存标签"按钮
- 没有看到"检测到回车键，调用addTag方法"的日志
- 保存的是原始标签\`['外饰']\`，而不是新输入的"头灯"

### 2. 需要验证输入框功能
- 添加了"测试添加标签"按钮
- 可以直接测试输入框的值获取和标签添加功能

## 添加的功能

### 1. 测试按钮
在输入框旁边添加了"测试添加标签"按钮：
\`\`\`html
<button @click="testAddTag" class="test-add-btn">
  测试添加标签
</button>
\`\`\`

### 2. 测试方法
\`\`\`javascript
testAddTag() {
  console.log('测试添加标签按钮被点击')
  if (this.$refs.tagInput) {
    const tagValue = this.$refs.tagInput.value.trim()
    console.log('从输入框获取的值:', tagValue)
    if (tagValue && this.selectedImage) {
      this.addTagFromValue(tagValue)
    } else {
      console.log('输入框为空或没有选中图片')
    }
  } else {
    console.log('输入框引用不存在')
  }
}
\`\`\`

## 测试步骤

### 1. 基本功能测试
1. 访问前端页面: http://localhost:8080
2. 打开浏览器开发者工具 (F12)
3. 切换到Console标签页
4. 点击图片打开详情模态框
5. 点击"编辑标签"按钮

### 2. 测试按钮测试
1. 在输入框中输入"测试标签"
2. 点击"测试添加标签"按钮
3. 查看控制台输出：
   - 应该看到"测试添加标签按钮被点击"
   - 应该看到"从输入框获取的值: 测试标签"
   - 应该看到"addTagFromValue被调用"
   - 标签应该被添加到列表中

### 3. 回车键测试
1. 在输入框中输入"回车测试"
2. 按回车键
3. 查看控制台输出：
   - 应该看到"检测到回车键，调用addTag方法"
   - 应该看到"从event.target.value获取标签值: 回车测试"
   - 标签应该被添加到列表中

## 预期结果

### 测试按钮点击
\`\`\`
测试添加标签按钮被点击
从输入框获取的值: 测试标签
addTagFromValue被调用: {
  tagValue: "测试标签",
  currentTags: [...],
  tagsType: "object",
  tagsLength: ...
}
\`\`\`

### 回车键测试
\`\`\`
输入框按键事件: {
  key: "Enter",
  keyCode: 13,
  newTag: "",
  eventType: "keyup",
  targetValue: "回车测试"
}
检测到回车键，调用addTag方法
从event.target.value获取标签值: 回车测试
addTagFromValue被调用: {
  tagValue: "回车测试",
  currentTags: [...],
  tagsType: "object",
  tagsLength: ...
}
\`\`\`

## 服务信息
- 前端服务: http://localhost:8080
- 前端PID: $FRONTEND_PID
- 停止服务: kill $FRONTEND_PID

EOF

echo "✅ 测试报告已生成: add-test-button-report.md"

echo ""
echo "🔧 测试按钮添加完成！"
echo "==================="
echo ""
echo "📊 添加总结:"
echo "  - 添加了'测试添加标签'按钮"
echo "  - 可以直接测试输入框功能"
echo "  - 提供了两种测试方式：按钮点击和回车键"
echo ""
echo "🔍 测试步骤:"
echo "  1. 访问前端页面: http://localhost:8080"
echo "  2. 打开浏览器开发者工具 (F12)"
echo "  3. 点击图片打开详情模态框"
echo "  4. 点击'编辑标签'按钮"
echo "  5. 在输入框中输入任意标签"
echo "  6. 点击'测试添加标签'按钮或按回车键"
echo ""
echo "📈 预期结果:"
echo "  - 测试按钮：应该看到'测试添加标签按钮被点击'"
echo "  - 回车键：应该看到'检测到回车键，调用addTag方法'"
echo "  - 标签应该被成功添加到列表中"
echo ""
echo "🛠️ 服务管理:"
echo "  前端PID: $FRONTEND_PID"
echo "  停止服务: kill $FRONTEND_PID"
