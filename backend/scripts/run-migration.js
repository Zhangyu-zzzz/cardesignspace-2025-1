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
    port: parseInt(process.env.DB_PORT),
    dialect: 'mysql',
    logging: console.log
  }
);

async function runMigration() {
  let connection;
  
  try {
    // 创建数据库连接
    connection = await sequelize.authenticate();
    console.log('✅ 数据库连接成功');

    // 读取迁移文件
    const migrationPath = path.join(__dirname, '../migrations/create-notifications-table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 开始执行迁移...');
    console.log('迁移内容:', migrationSQL.substring(0, 200) + '...');

    // 执行迁移
    await connection.query(migrationSQL);
    
    console.log('✅ 通知表创建成功！');
    
    // 检查表是否存在
    const [tables] = await connection.query(
      "SHOW TABLES LIKE 'notifications'"
    );
    
    if (tables.length > 0) {
      console.log('✅ 通知表确认存在');
      
      // 查看表结构
      const [columns] = await connection.query(
        "DESCRIBE notifications"
      );
      
      console.log('📋 表结构:');
      columns.forEach(col => {
        console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `KEY(${col.Key})` : ''}`);
      });
    } else {
      console.log('❌ 通知表不存在，迁移可能失败');
    }

  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    if (error.sql) {
      console.error('SQL 语句:', error.sql);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.close();
      console.log('🔌 数据库连接已关闭');
    }
  }
}

// 运行迁移
console.log('🚀 开始数据库迁移...');
runMigration(); 