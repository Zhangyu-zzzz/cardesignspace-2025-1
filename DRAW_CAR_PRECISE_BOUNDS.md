# 画个车 - 像素级精准边界检测优化

## 📋 概述

本次优化实现了**像素级精准的矩形边界检测**，替代了之前的圆形碰撞半径，使载具的边界更加精确，避免了"离页面边界很远就发生碰撞"的问题。

## 🎯 主要改进

### 1. 像素级边界扫描
- 逐像素扫描载具图像，找到实际绘制内容的精确边界
- 计算内容的实际宽高（contentWidth × contentHeight）
- 根据显示尺寸进行精确缩放

### 2. 矩形碰撞检测（AABB）
- **页面边界碰撞**：使用矩形的宽度和高度进行边界检测
- **载具间碰撞**：使用AABB（Axis-Aligned Bounding Box）算法
- **点击/悬停检测**：使用矩形范围而不是圆形半径

### 3. 精准的碰撞响应
- 根据重叠的方向（X轴或Y轴）确定碰撞法向
- 选择重叠较小的轴作为碰撞方向
- 更自然的分离和反弹效果

## 🔧 技术实现

### 核心方法

#### `refineBoundingBoxFromImage(vehicle)`
```javascript
// 像素级扫描，找到实际绘制内容的边界
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    // 检测非背景像素（alpha > 10 且非纯白）
    if (a > 10 && notWhite) {
      // 更新边界
    }
  }
}

// 计算精确的矩形边界
vehicle.boundingBox = {
  width: contentWidth * scale * 0.95,   // 略微缩小5%避免误判
  height: contentHeight * scale * 0.95
}
```

#### `handleCollisions()` - 矩形碰撞检测
```javascript
// AABB碰撞检测
const overlapX = halfWidth1 + halfWidth2 - Math.abs(dx)
const overlapY = halfHeight1 + halfHeight2 - Math.abs(dy)

// 两个方向都有重叠则发生碰撞
if (overlapX > 0 && overlapY > 0) {
  this.resolveRectCollision(v1, v2, dx, dy, overlapX, overlapY)
}
```

#### `resolveRectCollision()` - 矩形碰撞响应
```javascript
// 选择重叠较小的轴作为碰撞法向
if (overlapX < overlapY) {
  // X轴碰撞（左右）
  nx = dx > 0 ? 1 : -1
  overlap = overlapX
} else {
  // Y轴碰撞（上下）
  ny = dy > 0 ? 1 : -1
  overlap = overlapY
}
```

### 页面边界检测
```javascript
// 使用精确的矩形边界
const halfWidth = sprite.boundingBox.width / 2
const halfHeight = sprite.boundingBox.height / 2
const safeMargin = 2  // 极小的边距，贴合边界

// 左右边界
if (sprite.x - halfWidth < safeMargin) {
  sprite.x = safeMargin + halfWidth
  sprite.vx = Math.abs(sprite.vx) * 0.9
}
```

## 🎨 调试模式

### 启用方法
在车库界面按 **`D`** 键切换调试模式

### 调试显示
- **蓝色矩形框**：显示精确的碰撞边界
- **红色圆点**：显示载具的中心点

### 控制台输出
```
载具 闪电麦昆 的精确边界: 95x68px
调试边界显示: 已启用
```

## 📊 效果对比

| 特性 | 之前（圆形） | 现在（矩形） |
|------|-------------|-------------|
| 边界类型 | 圆形半径 | 精确矩形 |
| 精准度 | 较粗糙，边界偏大 | 像素级精准 |
| 页面边距 | 载具离边界较远就碰撞 | 紧贴边界，几乎无间隙 |
| 碰撞检测 | 圆形距离检测 | AABB矩形检测 |
| 视觉效果 | 不自然的空隙 | 自然贴合 |

## 🔍 关键优化点

### 1. 边距调整
- **之前**: `safeMargin = 5px`
- **现在**: `safeMargin = 2px`（更贴合边界）

### 2. 边界缩放
```javascript
width: contentWidth * scale * 0.95   // 略微缩小5%避免误判
height: contentHeight * scale * 0.95
```

### 3. 点击区域扩展
```javascript
const halfWidth = sprite.boundingBox.width / 2 + 5  // +5px 方便点击
const halfHeight = sprite.boundingBox.height / 2 + 5
```

## 🚀 性能考虑

1. **异步处理**: 像素扫描在图像加载后异步进行，不阻塞主线程
2. **一次计算**: 每个载具只在初始化时计算一次边界
3. **向后兼容**: 保留 `radius` 属性用于径向冲击等效果

## 📝 数据结构

```javascript
sprite = {
  // ... 其他属性
  boundingBox: {
    width: 95,   // 实际内容宽度（像素）
    height: 68   // 实际内容高度（像素）
  },
  radius: 58,    // 保留用于径向效果
  normRadius: 0.35
}
```

## 🎮 用户体验提升

1. ✅ 载具紧贴页面边界，无不自然的空隙
2. ✅ 碰撞更加真实，符合视觉预期
3. ✅ 点击和悬停检测更精准
4. ✅ 载具之间的碰撞更加合理

## 🐛 已解决的问题

- ✅ 载具离页面边界很远就发生碰撞
- ✅ 圆形边界对不规则载具不够精准
- ✅ 边界范围偏大，浪费显示空间
- ✅ 碰撞效果不够真实

## 🔮 未来改进方向

1. **旋转支持**: 如果需要载具旋转，可以实现OBB（Oriented Bounding Box）
2. **像素级碰撞**: 对于极端不规则形状，可以使用像素级碰撞掩码
3. **碰撞优化**: 使用空间分区（如四叉树）优化大量载具的碰撞检测

## 📅 更新日期

2025年11月3日

---

**注意**: 调试模式仅用于开发和验证，生产环境中无需启用。





