#!/bin/bash

# 修复回车键问题

set -e

echo "🔧 修复回车键问题..."
echo "=================="

cd /Users/zobot/Desktop/unsplash-crawler/test/auto-gallery

# 1. 检查修改状态
echo "1️⃣ 检查修改状态..."
if grep -q "检测到回车键，调用addTag方法" frontend/src/views/ImageGallery.vue; then
    echo "✅ 回车键修复已添加"
else
    echo "❌ 回车键修复未添加"
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
cat > ../fix-enter-key-issue-report.md << EOF
# 回车键问题修复报告

## 修复时间
$(date)

## 问题分析
从用户提供的控制台日志发现：

### 1. 输入框事件正常工作
- 每次按键都触发了\`keyupTest\`方法
- 事件绑定没有问题

### 2. v-model绑定问题
- 输入"touden"时，\`newTag\`显示为空字符串\`''\`
- 只有最后一个字符时，\`newTag\`才显示正确值
- 说明\`v-model="newTag"\`的绑定有时序问题

### 3. 回车事件未触发
- 没有看到"添加标签前"日志
- 说明\`@keyup.enter\`事件没有正确触发

## 修复方案

### 1. 在keyupTest中处理回车事件
\`\`\`javascript
keyupTest(event) {
  console.log('输入框按键事件:', {
    key: event.key,
    keyCode: event.keyCode,
    newTag: this.newTag,
    eventType: event.type,
    targetValue: event.target.value  // 添加实际输入值
  })
  
  // 如果是回车键，直接调用addTag
  if (event.key === 'Enter' || event.keyCode === 13) {
    console.log('检测到回车键，调用addTag方法')
    this.addTag()
  }
}
\`\`\`

### 2. 移除@keyup.enter绑定
- 移除了\`@keyup.enter="addTag"\`绑定
- 统一在\`keyupTest\`中处理所有按键事件

### 3. 添加targetValue调试
- 添加\`event.target.value\`来查看实际的输入值
- 帮助诊断v-model绑定问题

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
   - \`newTag\`可能显示为空或延迟更新

### 3. 回车键测试
1. 输入完成后按回车键
2. 查看控制台输出：
   - 应该看到"检测到回车键，调用addTag方法"
   - 应该看到"添加标签前"等调试信息
   - 标签应该被添加到列表中

## 预期结果

### 正常情况
\`\`\`
输入框按键事件: {
  key: "测",
  keyCode: 27979,
  newTag: "",
  eventType: "keyup",
  targetValue: "测"
}
输入框按键事件: {
  key: "Enter",
  keyCode: 13,
  newTag: "测试标签",
  eventType: "keyup",
  targetValue: "测试标签"
}
检测到回车键，调用addTag方法
添加标签前: {
  newTag: "测试标签",
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

echo "✅ 修复报告已生成: fix-enter-key-issue-report.md"

echo ""
echo "🔧 回车键问题修复完成！"
echo "====================="
echo ""
echo "📊 修复总结:"
echo "  - 在keyupTest中直接处理回车事件"
echo "  - 移除了有问题的@keyup.enter绑定"
echo "  - 添加了targetValue调试信息"
echo "  - 统一了按键事件处理逻辑"
echo ""
echo "🔍 测试步骤:"
echo "  1. 访问前端页面: http://localhost:8080"
echo "  2. 打开浏览器开发者工具 (F12)"
echo "  3. 点击图片打开详情模态框"
echo "  4. 点击'编辑标签'按钮"
echo "  5. 在输入框中输入任意标签"
echo "  6. 按回车键"
echo "  7. 查看控制台是否显示'检测到回车键，调用addTag方法'"
echo ""
echo "📈 预期结果:"
echo "  - 应该看到'检测到回车键，调用addTag方法'"
echo "  - 应该看到'添加标签前'等调试信息"
echo "  - 标签应该被成功添加到列表中"
echo ""
echo "🛠️ 服务管理:"
echo "  前端PID: $FRONTEND_PID"
echo "  停止服务: kill $FRONTEND_PID"
