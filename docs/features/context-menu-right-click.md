# 右键导航与上下文菜单体系

CarDesignSpace 前端实现了一套统一的右键与上下文菜单能力，用于解决 SPA 场景下无法在新标签打开、图片直接下载等问题。该体系由三部分组成：链接右键支持、通用上下文菜单、图片专用菜单。

## 链接右键与新标签支持
- 核心工具位于 `frontend/src/utils/routerUtils.js`，提供 `handleLinkClick`、`createLinkElement`、`addLinkToElement` 与 `getFullUrl` 等函数，统一处理 Ctrl/Cmd、鼠标中键、右键等导航动作。
- 全局指令 `v-link` (`frontend/src/utils/linkDirective.js`) 和混入 (`frontend/src/utils/linkMixin.js`) 注册于 `frontend/src/main.js`，使组件可通过 `$linkTo`、`$linkToNewTab`、`$handleLinkContextMenu` 等方法调用。
- 典型用法：
  ```vue
  <div v-link="'/brand/1'">品牌详情</div>
  <div @contextmenu="$handleLinkContextMenu($event, '/search', { query: { keyword: '宝马' } })">
    右键新标签搜索
  </div>
  ```
- 已覆盖页面：`Home.vue`、`Brands.vue`、`Articles.vue` 及 `/test-links` 演示页，满足普通点击、右键、新标签、中键与键盘无障碍导航。

## 通用自定义上下文菜单
- `frontend/src/utils/contextMenu.js` 实现通用菜单渲染与定位，自动处理视口边界、键盘导航、事件清理。
- 默认提供“在新标签页/新窗口打开”“复制链接”“复制文本”等操作，同时允许自定义菜单项：
  ```js
  $handleLinkContextMenu(event, '/articles', {
    text: '文章列表',
    menuItems: [
      { id: 'new-tab', label: '在新标签页中打开', action: 'new-tab' },
      { id: 'custom', label: '自定义操作', handler: (path, text) => this.$message.success(text) }
    ]
  })
  ```
- 相关示例集中在 `frontend/src/views/TestLinks.vue`，所有使用 `$handleLinkContextMenu` 的页面均自动继承新行为。

## 图片上下文菜单
- `frontend/src/utils/imageContextMenu.js` 针对图片场景封装菜单逻辑，提供“在新标签页中查看”“下载图片”“复制图片地址/内容”等操作，并允许扩展。
- 图片查看页面 `frontend/src/views/ImageViewer.vue` 支持缩放、旋转、拖拽、快捷键和响应式布局，解决浏览器直接下载图片的问题。
- 在车型详情与图片查看器组件中统一调用：
  ```vue
  <img :src="imageUrl" @contextmenu="imageContextMenu.show($event, imageUrl, { title: imageTitle })" />
  ```
- 专用测试入口：`frontend/src/views/TestImageContextMenu.vue`。

## 关联文件总览
```
frontend/src/
├── utils/
│   ├── routerUtils.js
│   ├── linkDirective.js
│   ├── linkMixin.js
│   ├── contextMenu.js
│   └── imageContextMenu.js
├── views/
│   ├── Home.vue
│   ├── Brands.vue
│   ├── Articles.vue
│   ├── TestLinks.vue
│   ├── TestImageContextMenu.vue
│   └── ImageViewer.vue
└── router/index.js
```

## 测试指引
1. 运行 `npm run serve` 访问 `/test-links` 验证链接类操作。
2. 访问 `/test-image-context-menu` 检查图片菜单项与图片查看器。
3. 在车型详情页验证真实数据下的菜单可用性，并确认复制类操作在主要浏览器下兼容。
