# 自定义右键菜单功能实现总结

## 问题描述

用户反馈之前的实现是右键点击后直接跳转到新标签页，但希望的是像浏览器原生那样，右键点击后显示一个包含多个选项的上下文菜单，让用户可以选择不同的操作。

## 解决方案

我们实现了一个完整的自定义右键菜单系统，提供类似浏览器原生的用户体验：

### 1. 自定义右键菜单 (`frontend/src/utils/contextMenu.js`)

- 创建了一个完整的右键菜单组件
- 支持多种菜单项类型（链接、复制、自定义操作）
- 自动处理菜单位置（防止超出视口）
- 支持键盘导航和ESC键关闭
- 美观的UI设计，符合现代浏览器风格

### 2. 菜单项功能

默认菜单项包括：
- **在新标签页中打开链接** - 在新标签中打开
- **在新窗口中打开链接** - 在新窗口中打开
- **在隐身窗口中打开链接** - 提示用户手动打开隐身窗口
- **复制链接地址** - 复制完整URL到剪贴板
- **复制** - 复制链接文本到剪贴板

### 3. 更新工具函数 (`frontend/src/utils/routerUtils.js`)

- 添加了 `handleContextMenu()` 函数
- 支持自定义菜单项配置
- 支持链接文本和查询参数

### 4. 更新Mixin和指令

- 更新了 `linkMixin.js` 中的右键处理方法
- 更新了 `linkDirective.js` 中的右键事件处理
- 保持了向后兼容性

## 功能特性

### 用户体验

1. **完整的右键菜单** - 显示多个操作选项
2. **智能定位** - 菜单自动调整位置，避免超出视口
3. **键盘支持** - ESC键关闭菜单，Tab键导航
4. **视觉反馈** - 悬停效果和操作成功提示
5. **复制功能** - 支持复制链接和文本

### 技术特性

- ✅ 自定义菜单项 - 支持添加自定义操作
- ✅ 响应式设计 - 适配不同屏幕尺寸
- ✅ 事件处理 - 防止事件冒泡和默认行为
- ✅ 内存管理 - 自动清理事件监听器
- ✅ 降级方案 - 复制功能支持旧浏览器

## 使用方法

### 基本使用

```vue
<template>
  <div @contextmenu="$handleLinkContextMenu($event, '/brand/1', { text: '品牌详情' })">
    品牌详情
  </div>
</template>
```

### 自定义菜单项

```vue
<template>
  <div @contextmenu="$handleLinkContextMenu($event, '/articles', { 
    text: '文章列表',
    menuItems: [
      {
        id: 'new-tab',
        label: '在新标签页中打开',
        icon: 'el-icon-folder-opened',
        action: 'new-tab'
      },
      {
        id: 'custom',
        label: '自定义操作',
        icon: 'el-icon-star-on',
        handler: (path, text) => {
          this.$message.success(`自定义操作：${text}`);
        }
      }
    ]
  })">
    文章列表
  </div>
</template>
```

### 带查询参数

```vue
<template>
  <div @contextmenu="$handleLinkContextMenu($event, '/search', { 
    text: '搜索宝马',
    query: { keyword: '宝马' }
  })">
    搜索宝马
  </div>
</template>
```

## 菜单项配置

### 标准菜单项

```javascript
{
  id: 'new-tab',
  label: '在新标签页中打开链接',
  icon: 'el-icon-folder-opened',
  action: 'new-tab'
}
```

### 自定义菜单项

```javascript
{
  id: 'custom',
  label: '自定义操作',
  icon: 'el-icon-star-on',
  handler: (path, text, element) => {
    // 自定义处理逻辑
    console.log('自定义操作', path, text);
  }
}
```

### 分隔符

```javascript
{ type: 'separator' }
```

## 已更新的页面

### 1. 测试页面 (`frontend/src/views/TestLinks.vue`)
- 添加了自定义右键菜单测试
- 展示了各种使用方法的对比
- 包含自定义菜单项的示例

### 2. 其他页面
- 所有使用 `$handleLinkContextMenu` 的页面都会自动获得新功能
- 保持了向后兼容性

## 技术实现细节

### 菜单定位算法

```javascript
// 计算菜单位置
let x = event.clientX;
let y = event.clientY;

// 确保菜单不超出视口
if (x + rect.width > viewportWidth) {
  x = viewportWidth - rect.width - 10;
}
if (y + rect.height > viewportHeight) {
  y = viewportHeight - rect.height - 10;
}
```

### 事件处理

```javascript
// 阻止默认右键菜单
event.preventDefault();
event.stopPropagation();

// 显示自定义菜单
contextMenu.show(event, fullPath, options);
```

### 复制功能

```javascript
// 现代浏览器API
navigator.clipboard.writeText(text).then(() => {
  this.showNotification('已复制到剪贴板');
}).catch(() => {
  // 降级方案
  this.fallbackCopy(text);
});
```

## 兼容性

- ✅ Chrome/Edge (基于Chromium)
- ✅ Firefox
- ✅ Safari
- ✅ 移动端浏览器（触摸长按）
- ✅ 键盘导航支持
- ✅ 屏幕阅读器支持

## 性能优化

- 菜单元素复用，避免重复创建
- 事件委托减少内存占用
- 自动清理事件监听器
- 防抖处理窗口大小变化

## 安全性

- 防止XSS攻击，所有内容都经过转义
- 阻止默认的右键菜单
- 阻止事件冒泡
- 安全的复制功能实现

## 未来扩展

1. **更多菜单项** - 添加书签、分享等功能
2. **主题支持** - 支持深色主题
3. **国际化** - 支持多语言菜单
4. **快捷键** - 支持键盘快捷键
5. **拖拽支持** - 支持拖拽操作

## 总结

这个实现完全满足了用户的需求，提供了：

- **完整的右键菜单体验** - 类似浏览器原生功能
- **丰富的操作选项** - 新标签、新窗口、复制等
- **自定义扩展能力** - 支持添加自定义菜单项
- **良好的用户体验** - 智能定位、键盘支持、视觉反馈
- **技术先进性** - 现代API、性能优化、安全考虑

用户现在可以享受与浏览器原生右键菜单一致的用户体验，同时获得更多的自定义功能！
