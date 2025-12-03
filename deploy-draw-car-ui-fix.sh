#!/bin/bash

# 画个车 UI 修复部署脚本
# 修复：1.画布变形 2.白色背景 3.UI布局 4.设计统一

set -e

echo "🚀 开始部署画个车UI修复..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 服务器信息
SERVER="root@49.235.98.5"
PROJECT_DIR="/opt/auto-gallery"

echo ""
echo "📋 修复内容："
echo "  ✅ 修复画布变形问题（使用笔画数据）"
echo "  ✅ 修复白色背景突兀问题（改用透明背景）"
echo "  ✅ 优化车库UI布局（两行布局）"
echo "  ✅ 统一设计风格（颜色、间距、圆角）"
echo ""

# 1. 执行数据库迁移
echo "📊 步骤 1: 执行数据库迁移..."
echo "${YELLOW}添加 drawingData 字段到 vehicles 表...${NC}"

scp backend/migrations/add_drawing_data_to_vehicles.sql $SERVER:$PROJECT_DIR/backend/migrations/

ssh $SERVER << 'ENDSSH'
cd /opt/auto-gallery
mysql -u root -p"$(cat ~/.mysql_password 2>/dev/null || echo 'your_password')" auto_gallery < backend/migrations/add_drawing_data_to_vehicles.sql
echo "✅ 数据库迁移完成"
ENDSSH

# 2. 上传前端文件
echo ""
echo "📤 步骤 2: 上传前端文件..."
scp frontend/src/views/DrawCar.vue $SERVER:$PROJECT_DIR/frontend/src/views/

# 3. 上传后端文件
echo ""
echo "📤 步骤 3: 上传后端文件..."
scp backend/src/models/mysql/Vehicle.js $SERVER:$PROJECT_DIR/backend/src/models/mysql/
scp backend/src/controllers/vehicleController.js $SERVER:$PROJECT_DIR/backend/src/controllers/

# 4. 重新构建前端
echo ""
echo "🔨 步骤 4: 重新构建前端..."
ssh $SERVER << 'ENDSSH'
cd /opt/auto-gallery/frontend
echo "安装依赖（如果需要）..."
# npm install

echo "构建前端..."
npm run build

echo "✅ 前端构建完成"
ENDSSH

# 5. 重启后端服务
echo ""
echo "🔄 步骤 5: 重启后端服务..."
ssh $SERVER << 'ENDSSH'
cd /opt/auto-gallery/backend
pm2 restart auto-gallery-backend
echo "✅ 后端服务已重启"
ENDSSH

# 6. 验证部署
echo ""
echo "🔍 步骤 6: 验证部署..."
ssh $SERVER << 'ENDSSH'
# 检查进程状态
pm2 list | grep auto-gallery

# 检查数据库字段
mysql -u root -p"$(cat ~/.mysql_password 2>/dev/null || echo 'your_password')" auto_gallery -e "DESCRIBE vehicles;" | grep drawingData

echo "✅ 部署验证完成"
ENDSSH

echo ""
echo "${GREEN}========================================${NC}"
echo "${GREEN}🎉 部署完成！${NC}"
echo "${GREEN}========================================${NC}"
echo ""
echo "📝 修复内容："
echo "  1. ✅ 画布变形问题 - 使用笔画数据重绘"
echo "  2. ✅ 白色背景问题 - 改用透明背景"
echo "  3. ✅ UI布局优化 - 两行清晰布局"
echo "  4. ✅ 设计风格统一 - 主题色和间距"
echo ""
echo "🌐 访问地址："
echo "  生产环境: https://www.cardesignspace.com/draw-car"
echo ""
echo "🧪 测试建议："
echo "  1. 画一个图案，查看车库中是否保持原样"
echo "  2. 确认载具没有白色背景"
echo "  3. 确认车库header布局清晰"
echo "  4. 对比网站其他页面，确认风格统一"
echo ""
echo "📚 相关文档："
echo "  - DRAW_CAR_UI_FIX_REPORT.md - 详细修复报告"
echo "  - backend/migrations/add_drawing_data_to_vehicles.sql - 数据库迁移脚本"
echo ""
echo "${YELLOW}⚠️  注意事项：${NC}"
echo "  - 新创建的载具将使用笔画数据（不变形）"
echo "  - 旧载具仍使用图片显示（兼容性降级）"
echo "  - 建议清除浏览器缓存后测试"
echo ""











