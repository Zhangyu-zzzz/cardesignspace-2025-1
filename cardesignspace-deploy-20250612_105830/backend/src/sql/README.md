# 中国自主汽车品牌SQL数据导入指南

本目录包含用于导入中国自主汽车品牌数据的SQL脚本。

## 文件说明

1. `insert_chinese_brands.sql` - 包含中国汽车自主品牌的完整数据，根据品牌集团和类型分类整理
2. `sync_image_paths.sql` - 用于同步和更新品牌Logo图片的COS存储桶路径

## 使用方法

### 导入品牌数据

1. 登录MySQL数据库
   ```bash
   mysql -u username -p
   ```

2. 选择要使用的数据库
   ```sql
   USE auto_gallery_db;
   ```

3. 执行导入脚本
   ```sql
   SOURCE /path/to/insert_chinese_brands.sql
   ```

### 同步图片路径

1. 在执行前，请先将`sync_image_paths.sql`中的COS存储桶域名替换为您的实际域名

2. 执行同步脚本
   ```sql
   SOURCE /path/to/sync_image_paths.sql
   ```

## 注意事项

- 执行脚本前请先备份数据库
- 确保所有品牌Logo已上传到对应的COS存储桶中
- 品牌数据已按照重要性设置了displayOrder优先级
- 主流品牌已设置popular=TRUE，以便在首页展示

## 品牌分类

SQL文件中的品牌按以下类别组织：

1. 中央国企品牌
   - 一汽集团旗下品牌
   - 东风汽车旗下品牌
   - 长安汽车旗下品牌

2. 地方国企品牌
   - 上汽集团旗下品牌
   - 广汽集团旗下品牌
   - 北汽集团旗下品牌
   - 奇瑞汽车旗下品牌
   - 江淮汽车旗下品牌

3. 民营及独立品牌
   - 比亚迪旗下品牌
   - 吉利控股旗下品牌
   - 长城汽车旗下品牌
   - 赛力斯集团旗下品牌

4. 新兴电动车品牌
   - 蔚来、小鹏、理想等 