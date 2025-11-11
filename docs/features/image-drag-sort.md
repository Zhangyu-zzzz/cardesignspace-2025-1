# 图片拖拽排序功能

## 功能说明

在车辆详情页面（ModelDetail.vue）中实现了图片拖拽排序功能，用户可以通过拖拽图片来调整图片在页面中的显示顺序。

## 实现内容

### 1. 数据库模型更新

在 `Image` 模型中添加了 `sortOrder` 字段：
- 类型：INTEGER
- 默认值：0
- 用途：存储图片的排序顺序

### 2. 后端API

#### 新增接口：`POST /api/images/update-order`

**请求体：**
```json
{
  "modelId": 1,
  "imageOrders": [
    { "id": 1, "sortOrder": 0 },
    { "id": 2, "sortOrder": 1 },
    { "id": 3, "sortOrder": 2 }
  ]
}
```

**功能：**
- 批量更新指定车型的图片顺序
- 验证所有图片都属于该车型
- 需要用户登录认证

#### 查询接口更新

`GET /api/images/model/:modelId` 接口已更新，现在会按 `sortOrder` 字段排序返回图片。

### 3. 前端实现

#### 使用的库
- `sortablejs` - 拖拽排序库

#### 主要功能
1. **拖拽排序**：用户可以通过拖拽图片卡片来调整顺序
2. **自动保存**：拖拽完成后自动保存新的顺序到服务器
3. **视觉反馈**：
   - 拖拽时显示半透明占位符
   - 被拖拽的图片会放大并显示阴影
   - 鼠标悬停时显示移动光标

#### 关键代码位置
- `frontend/src/views/ModelDetail.vue` - 主实现文件
- `frontend/src/services/api.js` - API调用方法

## 数据库迁移

✅ **迁移已完成** - `sortOrder` 字段已成功添加到 `images` 表

### 迁移脚本

已创建自动化迁移脚本，可以随时运行：

```bash
cd backend
npm run db:add-sortOrder
```

### 迁移内容

1. **添加字段**：`sortOrder INT DEFAULT 0` - 排序顺序字段
2. **创建索引**：`idx_images_sortOrder` - 提高查询性能

### 手动执行SQL（如果需要）

```sql
-- 添加字段
ALTER TABLE `images` 
ADD COLUMN `sortOrder` INT DEFAULT 0 
COMMENT '排序顺序，用于图片在页面中的显示顺序' 
AFTER `tags`;

-- 创建索引
CREATE INDEX `idx_images_sortOrder` 
ON `images` (`sortOrder`);
```

## 使用说明

1. 打开车辆详情页面
2. 在图片网格中，将鼠标悬停在任意图片上
3. 按住鼠标左键并拖拽图片到目标位置
4. 释放鼠标，图片会自动保存新的顺序
5. 页面会显示"图片顺序已保存"的提示

## 注意事项

1. **权限要求**：只有登录用户才能保存图片顺序
2. **点击冲突**：拖拽时会暂时禁用点击事件，避免误触发图片查看器
3. **排序优先级**：
   - 精选图片优先显示
   - 然后按 `sortOrder` 排序
   - 最后按创建时间和ID排序

## 技术细节

### 拖拽配置
- 动画时长：150ms
- 使用HTML5原生拖拽
- 拖拽阈值：65%

### 样式类
- `.sortable-ghost` - 拖拽占位符样式
- `.sortable-chosen` - 被选中拖拽的图片样式
- `.sortable-drag` - 正在拖拽的图片样式

## 后续优化建议

1. 添加拖拽手柄图标，更明确地提示用户可以拖拽
2. 支持批量选择图片进行排序
3. 添加撤销/重做功能
4. 显示排序序号标签

