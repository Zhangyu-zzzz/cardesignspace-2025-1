const Sequelize = require('sequelize');
const fs = require('fs');
const path = require('path');

// 加载环境变量
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    dialect: 'mysql',
    logging: console.log
  }
);

async function addCoverUrlField() {
  try {
    // 测试数据库连接
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');

    // 检查字段是否已存在
    const [columns] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = '${process.env.DB_NAME}' 
      AND TABLE_NAME = 'models' 
      AND COLUMN_NAME = 'coverUrl'
    `);

    if (columns.length > 0) {
      console.log('✅ coverUrl 字段已存在，跳过添加');
      return;
    }

    // 添加字段
    await sequelize.query(`
      ALTER TABLE \`models\` 
      ADD COLUMN \`coverUrl\` VARCHAR(500) NULL 
      COMMENT '车型封面图URL，用于车型卡片展示'
      AFTER \`viewCount\`
    `);

    console.log('✅ 成功添加 coverUrl 字段到 models 表');
  } catch (error) {
    console.error('❌ 添加字段失败:', error.message);
    // 如果是字段已存在的错误，忽略
    if (error.message.includes('Duplicate column name')) {
      console.log('✅ coverUrl 字段已存在，跳过添加');
    } else {
      throw error;
    }
  } finally {
    await sequelize.close();
  }
}

addCoverUrlField()
  .then(() => {
    console.log('✅ 迁移完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 迁移失败:', error);
    process.exit(1);
  });






