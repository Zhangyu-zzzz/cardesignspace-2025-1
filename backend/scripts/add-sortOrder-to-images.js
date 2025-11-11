const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');

// 加载环境变量
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,  // 数据库名
  process.env.DB_USER,  // 用户名
  process.env.DB_PASSWORD, // 密码
  {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    dialect: 'mysql',
    logging: (msg) => console.log(msg),
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

async function runMigration() {
  try {
    // 测试数据库连接
    console.log('🔌 正在连接数据库...');
    console.log(`   主机: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
    console.log(`   数据库: ${process.env.DB_NAME}`);
    console.log(`   用户: ${process.env.DB_USER}`);
    
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功\n');

    console.log('📄 开始执行迁移: 添加 sortOrder 字段到 images 表\n');

    // 检查字段是否已存在
    const [columns] = await sequelize.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'images'
        AND COLUMN_NAME = 'sortOrder'
    `);

    if (columns.length > 0) {
      console.log('ℹ️  sortOrder 字段已存在，跳过添加字段步骤');
    } else {
      console.log('➕ 正在添加 sortOrder 字段...');
      // 添加字段
      await sequelize.query(`
        ALTER TABLE \`images\` 
        ADD COLUMN \`sortOrder\` INT DEFAULT 0 
        COMMENT '排序顺序，用于图片在页面中的显示顺序' 
        AFTER \`tags\`
      `);
      console.log('✅ sortOrder 字段添加成功');
    }

    // 检查索引是否已存在
    const [indexes] = await sequelize.query(`
      SELECT INDEX_NAME
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'images'
        AND INDEX_NAME = 'idx_images_sortOrder'
    `);

    if (indexes.length > 0) {
      console.log('ℹ️  idx_images_sortOrder 索引已存在，跳过创建索引步骤');
    } else {
      console.log('➕ 正在创建索引 idx_images_sortOrder...');
      // 创建索引
      await sequelize.query(`
        CREATE INDEX \`idx_images_sortOrder\` 
        ON \`images\` (\`sortOrder\`)
      `);
      console.log('✅ 索引创建成功');
    }

    console.log('✅ 迁移执行完成！\n');

    // 验证字段是否添加成功
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE, COLUMN_DEFAULT, COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'images'
        AND COLUMN_NAME = 'sortOrder'
    `);

    if (results.length > 0) {
      console.log('✅ 验证成功: sortOrder 字段已添加到 images 表');
      console.log('   字段信息:', results[0]);
    } else {
      console.warn('⚠️  警告: 无法验证 sortOrder 字段是否添加成功');
    }

    // 检查索引
    const [indexResults] = await sequelize.query(`
      SELECT INDEX_NAME, COLUMN_NAME
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'images'
        AND INDEX_NAME = 'idx_images_sortOrder'
    `);

    if (indexResults.length > 0) {
      console.log('✅ 索引已创建: idx_images_sortOrder');
    }

    console.log('\n🎉 迁移完成！图片拖拽排序功能已准备就绪。');

  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    if (error.sql) {
      console.error('SQL:', error.sql);
    }
    console.error('详细错误:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('\n🔌 数据库连接已关闭');
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };

