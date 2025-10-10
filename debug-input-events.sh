#!/bin/bash

# 调试输入框事件问题

set -e

echo "🔍 调试输入框事件问题..."
echo "====================="

cd /Users/zobot/Desktop/unsplash-crawler/test/auto-gallery

# 1. 检查修改状态
echo "1️⃣ 检查修改状态..."
if grep -q "keyupTest" frontend/src/views/ImageGallery.vue; then
    echo "✅ 输入框事件调试已添加"
else
    echo "❌ 输入框事件调试未添加"
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
cat > ../debug-input-events-report.md << EOF
# 输入框事件问题调试报告

## 调试时间
$(date)

## 问题描述
用户反馈输入框输入的标签不能保存，且没有看到addTag方法的调试日志，说明输入框的回车事件可能没有正确触发。

## 调试措施

### 1. 添加输入框事件监听
在输入框中添加了\`@keyup="keyupTest"\`事件监听，用于调试所有按键事件。

### 2. 添加keyupTest方法
\`\`\`javascript
keyupTest(event) {
  console.log('输入框按键事件:', {
    key: event.key,
    keyCode: event.keyCode,
    newTag: this.newTag,
    eventType: event.type
  })
}
\`\`\`

### 3. 调试信息说明
现在控制台会显示：
- \`输入框按键事件:\` - 显示每次按键的详细信息
- \`添加标签前:\` - 显示addTag方法被调用时的状态
- \`添加标签后:\` - 显示标签添加后的状态

## 测试步骤

### 1. 打开浏览器开发者工具
1. 访问前端页面: http://localhost:8080
2. 按F12打开开发者工具
3. 切换到Console标签页

### 2. 测试输入框事件
1. 点击任意图片打开详情模态框
2. 点击"编辑标签"按钮
3. 在输入框中输入任意字符（如"a"）
4. 查看控制台是否显示"输入框按键事件"
5. 按回车键
6. 查看控制台是否显示"添加标签前"等调试信息

### 3. 分析调试信息
根据控制台输出分析问题：

#### 如果看到"输入框按键事件"
说明输入框事件绑定正常，继续检查：
- 按回车时keyCode应该是13
- 按回车时应该看到"添加标签前"日志

#### 如果没有看到"输入框按键事件"
说明输入框事件绑定有问题，可能原因：
- 输入框没有获得焦点
- 事件绑定失败
- 输入框被其他元素遮挡

## 预期调试输出

### 正常情况
\`\`\`
输入框按键事件: {
  key: "a",
  keyCode: 65,
  newTag: "a",
  eventType: "keyup"
}
输入框按键事件: {
  key: "Enter",
  keyCode: 13,
  newTag: "测试标签",
  eventType: "keyup"
}
添加标签前: {
  newTag: "测试标签",
  currentTags: [...],
  tagsType: "object",
  tagsLength: ...
}
\`\`\`

### 异常情况
如果只看到按键事件，没有看到"添加标签前"，说明：
- 回车事件被触发了，但addTag方法没有被调用
- 可能是@keyup.enter修饰符的问题

## 可能的问题和解决方案

### 1. 事件修饰符问题
**问题**: @keyup.enter可能不工作
**解决**: 改为@keyup，在方法中检查keyCode

### 2. 输入框焦点问题
**问题**: 输入框没有获得焦点
**解决**: 确保输入框可以正常获得焦点

### 3. 事件冒泡问题
**问题**: 事件被其他元素拦截
**解决**: 检查事件冒泡和阻止默认行为

## 服务信息
- 前端服务: http://localhost:8080
- 前端PID: $FRONTEND_PID
- 停止服务: kill $FRONTEND_PID

EOF

echo "✅ 调试报告已生成: debug-input-events-report.md"

echo ""
echo "🔍 输入框事件问题调试准备完成！"
echo "============================="
echo ""
echo "📊 调试总结:"
echo "  - 添加了输入框按键事件监听"
echo "  - 可以调试所有按键事件"
echo "  - 可以确认回车事件是否被触发"
echo "  - 提供了完整的调试流程"
echo ""
echo "🔍 调试步骤:"
echo "  1. 访问前端页面: http://localhost:8080"
echo "  2. 打开浏览器开发者工具 (F12)"
echo "  3. 切换到Console标签页"
echo "  4. 点击图片打开详情模态框"
echo "  5. 点击'编辑标签'按钮"
echo "  6. 在输入框中输入任意字符"
echo "  7. 查看控制台是否显示'输入框按键事件'"
echo "  8. 按回车键，查看是否显示'添加标签前'"
echo ""
echo "📈 预期结果:"
echo "  - 每次按键都应显示'输入框按键事件'"
echo "  - 按回车时应显示'添加标签前'等调试信息"
echo "  - 如果仍有问题，请提供控制台输出"
echo ""
echo "🛠️ 服务管理:"
echo "  前端PID: $FRONTEND_PID"
echo "  停止服务: kill $FRONTEND_PID"
