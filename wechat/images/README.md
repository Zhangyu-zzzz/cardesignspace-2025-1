# TabBar 图标说明

## 需要的图标文件

微信小程序的 tabBar 需要以下图标文件（建议尺寸：81px × 81px）：

1. **home.png** - 首页未选中图标
2. **home-active.png** - 首页选中图标
3. **brand.png** - 品牌未选中图标
4. **brand-active.png** - 品牌选中图标
5. **image.png** - 图片未选中图标
6. **image-active.png** - 图片选中图标
7. **profile.png** - 我的未选中图标
8. **profile-active.png** - 我的选中图标

## 图标要求

- 尺寸：建议 81px × 81px（最小 40px × 40px）
- 格式：PNG（支持透明背景）
- 颜色：
  - 未选中状态：灰色 (#999999)
  - 选中状态：红色 (#e03426)

## 快速解决方案

### 方案1：使用在线图标生成工具
1. 访问 https://www.iconfont.cn/ 或 https://iconify.design/
2. 搜索对应的图标（如：home, brand, image, user）
3. 下载 PNG 格式，尺寸设置为 81px × 81px
4. 分别导出选中和未选中两种颜色版本

### 方案2：使用微信小程序官方图标
1. 访问微信小程序官方设计资源
2. 下载标准图标库
3. 根据需求调整颜色

### 方案3：临时禁用 TabBar
如果暂时不需要底部导航栏，可以在 `app.json` 中注释掉 `tabBar` 配置。

## 图标命名规范

所有图标文件应放在 `images/` 目录下，文件名必须与 `app.json` 中配置的路径完全一致。

