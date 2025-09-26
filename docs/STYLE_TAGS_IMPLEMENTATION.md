# CarDesignSpace 风格标签系统

## 概述
车系风格标签采用 **两层结构**：顶层区分 `外型风格` 与 `内饰风格`，底层由 29 个中英文对照标签组成。所有标签存储在 `models.styleTags`（JSON 数组）中，确保同一车型的所有图片共享一致的风格标记。

## 数据模型
- **数据库表**：`models`
- **字段**：`styleTags JSON DEFAULT '[]'`
- **约定**：数组内每个元素均为 `"中文名称 (English Name)"`，前端直接展示，无需额外字典。

## 标签清单
### 外型风格（17 项）
流线型 (Streamline)、泪滴型 (Tear-drop)、尾鳍设计 (Tailfin)、艺术装饰 (Art Deco)、肌肉车 (Muscle Car)、欧洲优雅风 (European Elegance)、楔形设计 (Wedge Shape)、方正功能主义 (Boxy Utilitarian)、新边缘设计 (New Edge)、有机设计 (Organic Design)、雕塑感曲面 (Sculptural Surfaces)、复古未来主义 (Retro-futurism)、纯净极简 (Pure Design / Minimalism)、越野风格 (Off-road)、低趴改装 (Lowrider)、未来主义 (Futurism)、太空时代 (Space Age)

### 内饰风格（12 项）
艺术装饰 (Art Deco)、镀铬风 (Chrome Accents)、怀旧复古 (Retro Classic)、运动座舱 (Sporty)、极简主义 (Minimalist)、高级简约风 (Premium Simplicity)、奢华定制 (Bespoke Luxury)、新豪华主义 (New Luxury)、太空舱设计 (Space Capsule)、波普艺术 (Pop Art)、家居化 (Homing)、科技感 (Tech-focused)

## 后端实现
- 入口：`backend/src/controllers/imageTagController.js`
- `getStyleTagOptions` 返回上述两层结构：
  ```javascript
  const styleTagOptions = {
    '外型风格': [...17 项...],
    '内饰风格': [...12 项...]
  }
  res.json({ status: 'success', data: styleTagOptions })
  ```
- `updateModelStyleTags` / `batchUpdateModelStyleTags` 直接写入数组；模型定义位于 `backend/src/models/mysql/Model.js`。

## 前端实现
- 入口页面：`frontend/src/views/ImageTagging.vue`
- 风格标签选择器通过遍历两层结构渲染：
  ```vue
  <div v-for="(tags, category) in styleTagOptions" :key="category">
    <h3>{{ category }}</h3>
    <el-tag
      v-for="tag in tags"
      :key="tag"
      :type="selectedStyleTags.includes(tag) ? 'success' : 'info'"
      @click="toggleStyleTag(tag)"
    >{{ tag }}</el-tag>
  </div>
  ```
- 选择状态保存在 `selectedStyleTags`，提交时调用：
  ```javascript
  await apiClient.put(`/image-tags/models/${model.id}/style-tags`, {
    styleTags: this.selectedStyleTags
  })
  ```
- 图片列表、详情及模态框均显示 `image.Model.styleTags`，前端限制主卡片中展示前 2 个，其余以 `+N` 形式折叠。

## 使用与测试
1. 启动后端 `npm run dev`、前端 `npm run serve`。
2. 访问 `/image-tagging`，选择任一图片点击“编辑风格”打开模态框。
3. 勾选外型/内饰标签并保存，确认 toast 成功提示且列表立即刷新。
4. 进入图片详情或图库页验证标签渲染（含折叠逻辑）。
5. Playwright 可在 `tests/e2e/image-variants.spec.ts` 基础上扩展风格标签断言。

## 现状与建议
- 功能已上线并通过手动排查，覆盖图片加载、标签编辑、批量更新等流程。
- 推荐在 PR 中记录执行的接口调用或批量脚本，保持标签数据一致性。
- 后续可考虑：
  - 新增标签使用统计 API
  - 引入虚拟滚动优化标签选择性能
  - 在 docs/fixes/style-tags-display.md 中跟踪显示层问题与回归用例
