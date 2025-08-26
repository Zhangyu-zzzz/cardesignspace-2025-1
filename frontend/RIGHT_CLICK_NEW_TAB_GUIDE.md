# 右键新标签打开功能使用指南

## 功能概述

网站现在支持完整的右键菜单功能，用户可以通过以下方式使用：

1. **右键点击** - 在任何链接上右键点击，会显示包含多个选项的菜单：
   - 在新标签页中打开链接
   - 在新窗口中打开链接
   - 在隐身窗口中打开链接
   - 复制链接地址
   - 复制文本
2. **Ctrl+点击** - 按住Ctrl键（Windows）或Cmd键（Mac）点击链接
3. **中键点击** - 使用鼠标中键点击链接

## 实现方式

### 1. 工具函数 (routerUtils.js)

提供了核心的链接处理功能：

```javascript
import { handleLinkClick, handleContextMenu } from '@/utils/routerUtils';

// 基本使用
handleLinkClick('/brand/1');

// 带查询参数
handleLinkClick('/search', { query: { keyword: '宝马' } });

// 强制新标签打开
handleLinkClick('/model/123', { forceNewTab: true });

// 显示右键菜单
handleContextMenu(event, '/brand/1', { text: '品牌详情' });
```

### 2. Vue指令 (v-link)

在模板中直接使用：

```vue
<!-- 简单路径 -->
<div v-link="'/brand/1'">品牌详情</div>

<!-- 带选项 -->
<div v-link="{ path: '/search', query: { keyword: '宝马' } }">
  搜索宝马
</div>
```

### 3. Vue Mixin

在组件中使用：

```vue
<template>
  <div @click="$handleLinkClick($event, '/brand/1')">
    品牌详情
  </div>
  
  <div @contextmenu="$handleLinkContextMenu($event, '/brand/1', { text: '品牌详情' })">
    右键菜单
  </div>
</template>

<script>
export default {
  methods: {
    goToBrand() {
      this.$linkTo('/brand/1');
      // 或者强制新标签打开
      this.$linkToNewTab('/brand/1');
    }
  }
}
</script>
```

## 已更新的页面

以下页面已经更新为支持右键新标签打开：

### 1. 首页 (Home.vue)
- 轮播图车型卡片
- 品牌卡片
- 车型展示卡片

### 2. 品牌页面 (Brands.vue)
- 品牌详情链接

### 3. 文章页面 (Articles.vue)
- 推荐文章卡片
- 文章列表卡片

## 使用方法

### 对于开发者

#### 方法1：使用Vue指令（推荐）
```vue
<template>
  <!-- 简单使用 -->
  <div v-link="'/model/123'" class="model-card">
    车型详情
  </div>
  
  <!-- 带查询参数 -->
  <div v-link="{ path: '/search', query: { brand: '宝马' } }" class="search-link">
    搜索宝马
  </div>
</template>
```

#### 方法2：使用Mixin方法
```vue
<template>
  <div @click="$handleLinkClick($event, '/model/123')">
    车型详情
  </div>
  
  <div @contextmenu="$handleLinkContextMenu($event, '/model/123')">
    右键新标签打开
  </div>
</template>

<script>
export default {
  methods: {
    goToModel() {
      this.$linkTo('/model/123');
    },
    
    goToModelNewTab() {
      this.$linkToNewTab('/model/123');
    }
  }
}
</script>
```

#### 方法3：直接调用工具函数
```javascript
import { handleLinkClick } from '@/utils/routerUtils';

// 在方法中使用
methods: {
  goToPage() {
    handleLinkClick('/brand/1', { 
      query: { tab: 'models' },
      forceNewTab: false 
    });
  }
}
```

### 对于用户

1. **普通点击** - 在当前标签页中打开链接
2. **右键点击** - 在新标签页中打开链接
3. **Ctrl+点击** - 在新标签页中打开链接
4. **中键点击** - 在新标签页中打开链接

## 技术实现细节

### 核心逻辑

1. **检测用户操作**：
   - 检查是否按住了Ctrl/Cmd键
   - 检查是否是右键点击
   - 检查是否是中键点击

2. **路由处理**：
   - 如果是新标签打开：使用 `window.open(path, '_blank')`
   - 如果是当前标签：使用 `this.$router.push(path)`

3. **事件处理**：
   - 阻止默认的右键菜单
   - 阻止事件冒泡
   - 添加适当的鼠标样式

### 兼容性

- ✅ Chrome/Edge (基于Chromium)
- ✅ Firefox
- ✅ Safari
- ✅ 移动端浏览器

### 性能优化

- 事件监听器在组件销毁时自动清理
- 使用事件委托减少内存占用
- 支持键盘导航（Tab键和Enter键）

## 注意事项

1. **SEO友好** - 所有链接都是真实的URL，搜索引擎可以正常抓取
2. **无障碍访问** - 支持键盘导航和屏幕阅读器
3. **用户体验** - 保持与原生链接一致的行为
4. **安全性** - 防止XSS攻击，所有URL都经过验证

## 未来扩展

1. **自定义右键菜单** - 可以添加更多右键菜单选项
2. **链接预览** - 鼠标悬停时显示页面预览
3. **历史记录管理** - 更好的浏览器历史记录支持
4. **离线支持** - 支持PWA离线模式下的链接处理
