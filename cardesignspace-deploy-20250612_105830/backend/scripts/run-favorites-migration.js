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
    connection = await sequelize.getConnection();
    console.log('✅ 数据库连接成功');

    // 读取迁移文件
    const migrationPath = path.join(__dirname, '../migrations/create-post-favorites-table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 开始执行收藏表迁移...');
    console.log('迁移内容:', migrationSQL.substring(0, 200) + '...');

    // 执行迁移
    await connection.execute(migrationSQL);
    
    console.log('✅ 收藏表创建成功！');
    
    // 检查表是否存在
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'post_favorites'"
    );
    
    if (tables.length > 0) {
      console.log('✅ 收藏表确认存在');
      
      // 查看表结构
      const [columns] = await connection.execute(
        "DESCRIBE post_favorites"
      );
      
      console.log('📋 表结构:');
      columns.forEach(col => {
        console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `KEY(${col.Key})` : ''}`);
      });
    } else {
      console.log('❌ 收藏表不存在，迁移可能失败');
    }

  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    if (error.sql) {
      console.error('SQL 语句:', error.sql);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 数据库连接已关闭');
    }
  }
}

// 运行迁移
console.log('🚀 开始数据库迁移（收藏表）...');
runMigration(); 