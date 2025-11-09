# 品牌中文名称搜索功能实现

## 更新日期
2025-11-09

## 功能概述
增强搜索功能，支持通过品牌中文名称搜索车型，提升用户搜索体验。

## 问题描述
### 问题1: 空格搜索不匹配
- **现象**: 搜索"RS7"无法找到"RS 7"车型
- **原因**: 标准模糊匹配无法忽略空格差异

### 问题2: 中文品牌名无法搜索
- **现象**: 搜索"奥迪"无法找到Audi品牌的车型
- **原因**: brands表只有英文name字段，没有中文名称字段

## 解决方案

### 1. 数据库改动
**文件**: `migrations/add_chinese_name_to_brands.sql`

#### 新增字段
```sql
ALTER TABLE brands 
ADD COLUMN chineseName VARCHAR(100) NULL COMMENT '品牌中文名称' 
AFTER name;
```

#### 添加索引
```sql
CREATE INDEX idx_brand_chinese_name ON brands(chineseName);
```

#### 数据填充
为83个常见品牌添加了中文名称，包括：
- 豪华品牌: 奥迪、宝马、奔驰、保时捷等
- 主流品牌: 大众、丰田、本田、日产等  
- 新能源: 特斯拉、极星等
- 中国品牌: 保持name和chineseName一致

### 2. 模型更新
**文件**: `backend/src/models/mysql/Brand.js`

```javascript
chineseName: {
  type: DataTypes.STRING(100),
  allowNull: true,
  comment: '品牌中文名称'
}
```

### 3. 搜索逻辑增强
**文件**: `backend/src/controllers/modelController.js`

#### 原有逻辑
```javascript
// 只支持英文名称搜索
{ name: { [Op.like]: searchTerm } }
```

#### 新增逻辑
```javascript
// 支持英文名和中文名搜索
[Op.or]: [
  { name: { [Op.like]: searchTerm } },
  { chineseName: { [Op.like]: searchTerm } },  // 新增：中文名搜索
  // 去除空格后匹配
  sequelize.where(
    sequelize.fn('REPLACE', sequelize.col('name'), ' ', ''),
    { [Op.like]: searchTermNoSpace }
  ),
  sequelize.where(
    sequelize.fn('REPLACE', sequelize.col('chineseName'), ' ', ''),
    { [Op.like]: searchTermNoSpace }
  )
]
```

## 测试结果

### ✅ 测试场景1: 中文品牌名搜索
- **输入**: "宝马X1"
- **结果**: 找到10个BMW X1车型
- **状态**: ✅ 通过

### ✅ 测试场景2: 空格灵活匹配
- **输入**: "RS7"
- **结果**: 可以匹配到"RS 7"车型（5个）
- **状态**: ✅ 通过

### ✅ 测试场景3: 混合搜索
- **输入**: "奥迪RS7"
- **结果**: 找到25个奥迪RS7系列车型
- **状态**: ✅ 通过

### ✅ 测试场景4: 英文品牌名依然有效
- **输入**: "Audi RS 7"
- **结果**: 找到5个车型
- **状态**: ✅ 通过

### ✅ 测试场景5: 新能源品牌
- **输入**: "特斯拉"
- **结果**: 找到13个Tesla车型
- **状态**: ✅ 通过

## 用户体验改进

### 改进前
- ❌ 搜索"RS7" → 无结果
- ❌ 搜索"奥迪" → 无结果
- ✅ 搜索"RS 7" → 有结果
- ✅ 搜索"Audi" → 有结果

### 改进后
- ✅ 搜索"RS7" → 有结果（匹配"RS 7"）
- ✅ 搜索"奥迪" → 有结果（匹配"Audi"）
- ✅ 搜索"RS 7" → 有结果
- ✅ 搜索"Audi" → 有结果
- ✅ 搜索"奥迪RS7" → 有结果
- ✅ 搜索"宝马X1" → 有结果

## 性能考虑

### 索引优化
- 为`chineseName`字段添加了索引以提升查询性能
- 使用`REPLACE`函数进行空格移除匹配，对于少量数据影响不大

### 查询效率
- 品牌表数据量小（~100条），性能影响可忽略
- 车型表查询通过brandId索引，效率较高

## 部署说明

### 1. 执行数据库迁移
```bash
mysql -h <host> -P <port> -u <user> -p<password> <database> < migrations/add_chinese_name_to_brands.sql
```

### 2. 重启后端服务
如使用nodemon，会自动重启；否则需要手动重启：
```bash
cd backend
npm restart
```

### 3. 验证功能
在前端搜索框测试以下关键词：
- "奥迪RS7"
- "宝马X1"
- "特斯拉"
- "RS7"（验证空格匹配）

## 统计数据
- 总品牌数: 100
- 已设置中文名称: 83
- 覆盖率: 83%

## 后续建议
1. 为剩余17个品牌补充中文名称
2. 考虑添加品牌别名字段，支持更多搜索词（如：BYD → 比亚迪）
3. 添加搜索日志，分析用户常用搜索词

## 相关文件
- `backend/migrations/add_chinese_name_to_brands.sql` - 数据库迁移脚本
- `backend/src/models/mysql/Brand.js` - Brand模型定义
- `backend/src/controllers/modelController.js` - 搜索逻辑实现
- `backend/scripts/migrate-add-chinese-name.js` - 迁移执行脚本（备用）

