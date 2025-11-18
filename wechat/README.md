# CarDesignSpace 微信小程序

这是 CarDesignSpace 项目的微信小程序版本，包含完整的汽车设计展示平台功能。

## 项目结构

```
wechat/
├── app.js                 # 应用入口
├── app.json               # 全局配置
├── app.wxss               # 全局样式
├── project.config.json    # 项目配置
├── sitemap.json           # 站点地图
├── pages/                 # 页面目录
│   ├── home/              # 首页
│   ├── brands/            # 品牌列表
│   ├── brand-detail/      # 品牌详情
│   ├── models/            # 车型列表
│   ├── model-detail/      # 车型详情
│   ├── search/            # 搜索
│   ├── login/             # 登录
│   ├── register/          # 注册
│   ├── profile/           # 个人中心
│   ├── image-gallery/     # 图片画廊
│   ├── image-upload/      # 图片上传
│   ├── articles/          # 文章列表
│   ├── article-detail/    # 文章详情
│   ├── inspiration/       # 灵感
│   ├── forum/             # 论坛
│   ├── draw-car/          # 画了个车
│   └── about/             # 关于
└── utils/                 # 工具函数
    ├── api.js             # API服务
    └── util.js            # 工具函数
```

## 配置说明

### 1. 修改 API 地址

在 `app.js` 中修改 `apiBaseUrl`：

```javascript
apiBaseUrl: 'https://www.cardesignspace.com/api' // 根据实际情况修改
```

### 2. 配置 AppID

在 `project.config.json` 中修改 `appid`：

```json
{
  "appid": "your-appid"
}
```

## 功能特性

- ✅ 首页轮播和品牌展示
- ✅ 品牌列表和详情
- ✅ 车型列表和详情
- ✅ 图片浏览和预览
- ✅ 搜索功能
- ✅ 用户登录/注册
- ✅ 个人中心
- ✅ 图片上传
- ✅ 文章浏览
- ✅ 灵感图片
- ✅ 论坛功能
- ✅ 画了个车功能

## 使用说明

1. 使用微信开发者工具打开项目
2. 配置 AppID
3. 修改 API 地址
4. 编译运行

## 注意事项

- 需要配置合法的 AppID 才能运行
- API 地址需要支持跨域请求
- 图片上传功能需要后端支持
- 部分功能需要用户登录

## 开发建议

- 根据实际需求调整页面样式
- 优化图片加载性能
- 添加错误处理和加载状态
- 完善用户交互体验

