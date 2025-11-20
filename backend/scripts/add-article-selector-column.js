#!/usr/bin/env node

/**
 * 添加articleSelector字段到monitored_pages表
 */

require('dotenv').config({ path: '../.env' });
const { sequelize } = require('../src/config/mysql');

async function addColumn() {
  try {
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');

    // 检查字段是否存在
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'monitored_pages' 
      AND COLUMN_NAME = 'articleSelector'
    `);

    if (results.length === 0) {
      // 添加articleSelector字段
      await sequelize.query(`
        ALTER TABLE monitored_pages 
        ADD COLUMN articleSelector TEXT COMMENT '文章链接选择器（用于列表页）'
      `);
      console.log('✅ articleSelector字段已添加');
    } else {
      console.log('✅ articleSelector字段已存在');
    }
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ 添加字段失败:', error.message);
    await sequelize.close();
    process.exit(1);
  }
}

addColumn();

