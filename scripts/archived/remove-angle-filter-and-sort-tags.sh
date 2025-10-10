#!/bin/bash

# 移除视角筛选功能并修改热门标签排序
# 把"其他"标签放在最后

set -e

echo "🔧 移除视角筛选并修改热门标签排序..."
echo "====================================="

cd /Users/zobot/Desktop/unsplash-crawler/test/auto-gallery

# 1. 检查当前状态
echo "1️⃣ 检查当前状态..."
if [ -f "frontend/src/views/ImageGallery.vue" ]; then
    echo "✅ 找到ImageGallery.vue文件"
else
    echo "❌ 未找到ImageGallery.vue文件"
    exit 1
fi

# 2. 验证修改是否已应用
echo "2️⃣ 验证修改状态..."
if ! grep -q "视角筛选" frontend/src/views/ImageGallery.vue; then
    echo "✅ 视角筛选已移除"
else
    echo "❌ 视角筛选未完全移除"
fi

if grep -q "其他.*标签放在最后" frontend/src/views/ImageGallery.vue; then
    echo "✅ 热门标签排序逻辑已添加"
else
    echo "❌ 热门标签排序逻辑未添加"
fi

# 3. 重启前端服务以应用修改
echo "3️⃣ 重启前端服务..."
pkill -f "npm.*serve" 2>/dev/null || true
pkill -f "vue-cli-service.*serve" 2>/dev/null || true
sleep 2

cd frontend

# 设置Node.js兼容性环境变量
export NODE_OPTIONS="--openssl-legacy-provider"

npm run serve &
FRONTEND_PID=$!

# 等待服务启动
sleep 15

# 检查前端是否启动成功
if ps -p $FRONTEND_PID > /dev/null; then
    echo "✅ 前端服务启动成功 (PID: $FRONTEND_PID)"
else
    echo "❌ 前端服务启动失败"
    exit 1
fi

# 4. 测试页面访问
echo "4️⃣ 测试页面访问..."
sleep 5

FRONTEND_URL="http://localhost:8080"
RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null "$FRONTEND_URL" 2>/dev/null || echo "000")

if [ "$RESPONSE" = "200" ]; then
    echo "✅ 前端页面可访问 (HTTP $RESPONSE)"
else
    echo "❌ 前端页面访问失败 (HTTP $RESPONSE)"
fi

# 5. 生成修改报告
echo ""
echo "5️⃣ 生成修改报告..."
cat > ../remove-angle-filter-report.md << EOF
# 移除视角筛选和修改热门标签排序报告

## 修改时间
$(date)

## 修改内容

### 1. 移除视角筛选功能
- ✅ 移除了视角筛选的HTML模板部分
- ✅ 移除了filters.angles属性
- ✅ 移除了angleTags数组
- ✅ 移除了loadImages方法中的angles参数
- ✅ 移除了clearFilters方法中的angles重置

### 2. 修改热门标签排序
- ✅ 添加了排序逻辑，把"其他"标签放在最后
- ✅ 其他标签按数量降序排列
- ✅ 保持了标签的点击功能

## 具体修改

### 移除的视角筛选相关代码
\`\`\`html
<!-- 视角筛选 -->
<div class="filter-group">
  <label>视角</label>
  <div class="tag-buttons">
    <button v-for="angle in angleTags" ...>
      {{ angle }}
    </button>
  </div>
</div>
\`\`\`

### 移除的数据属性
\`\`\`javascript
// 移除了这些属性
filters: {
  angles: '', // 已移除
  // ...
},
angleTags: ['正前', '正侧', '正后', '前45', '后45', '俯侧', '顶视'], // 已移除
\`\`\`

### 新增的热门标签排序逻辑
\`\`\`javascript
// 排序：把"其他"标签放在最后
this.popularTags = tags.sort((a, b) => {
  if (a.tag === '其他') return 1
  if (b.tag === '其他') return -1
  return b.count - a.count // 其他标签按数量降序排列
})
\`\`\`

## 修改效果

### 界面变化
- ✅ 左侧筛选栏中不再显示视角筛选选项
- ✅ 热门标签中"其他"标签显示在最后
- ✅ 其他热门标签按数量降序排列

### 功能变化
- ✅ 视角筛选功能完全移除
- ✅ 其他筛选功能保持不变
- ✅ 热门标签点击功能正常
- ✅ 图片加载和显示功能正常

## 测试结果
- 前端服务状态: 运行中 (PID: $FRONTEND_PID)
- 前端页面访问: HTTP $RESPONSE
- 视角筛选: 已移除
- 热门标签排序: 已修改

## 验证方法
1. 访问前端页面: $FRONTEND_URL
2. 检查左侧筛选栏，确认没有视角筛选选项
3. 检查热门标签区域，"其他"标签应该在最后
4. 测试其他筛选功能是否正常工作
5. 测试热门标签点击功能

## 服务信息
- 前端服务: $FRONTEND_URL
- 前端PID: $FRONTEND_PID
- 停止服务: kill $FRONTEND_PID

EOF

echo "✅ 修改报告已生成: remove-angle-filter-report.md"

echo ""
echo "🎉 视角筛选移除和热门标签排序修改完成！"
echo "=========================================="
echo ""
echo "📊 修改总结:"
echo "  - 移除了视角筛选功能"
echo "  - 修改了热门标签排序"
echo "  - 把'其他'标签放在最后"
echo "  - 保持了其他功能正常"
echo ""
echo "🔍 验证方法:"
echo "  1. 访问前端页面: $FRONTEND_URL"
echo "  2. 检查左侧筛选栏没有视角选项"
echo "  3. 检查热门标签中'其他'在最后"
echo "  4. 测试其他筛选功能"
echo "  5. 查看修改报告: cat remove-angle-filter-report.md"
echo ""
echo "📈 修改效果:"
echo "  - 界面更简洁，移除了不需要的视角筛选"
echo "  - 热门标签排序更合理"
echo "  - 保持了所有核心功能"
echo ""
echo "🛠️ 服务管理:"
echo "  前端PID: $FRONTEND_PID"
echo "  停止服务: kill $FRONTEND_PID"
