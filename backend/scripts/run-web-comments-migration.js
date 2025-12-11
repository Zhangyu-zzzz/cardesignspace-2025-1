const Sequelize = require('sequelize');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306', 10),
    dialect: 'mysql',
    logging: console.log,
  }
);

async function main() {
  try {
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');
    
    const migrationPath = path.join(__dirname, '../migrations/create_web_comments_table.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🚀 开始执行 web-comments 表迁移...');
    await sequelize.query(sql);
    console.log('✅ web-comments 表迁移完成');
    
    // 验证表是否创建成功
    const [tables] = await sequelize.query("SHOW TABLES LIKE 'web-comments'");
    if (tables.length > 0) {
      console.log('✅ 表 web-comments 已成功创建');
      
      // 查看表结构
      const [columns] = await sequelize.query("DESCRIBE `web-comments`");
      console.log('📋 表结构:');
      columns.forEach(col => {
        console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `KEY(${col.Key})` : ''}`);
      });
    } else {
      console.log('❌ 表 web-comments 不存在，迁移可能失败');
    }
    
  } catch (e) {
    console.error('❌ 迁移失败:', e.message);
    if (e.sql) console.error('SQL:', e.sql);
    console.error('完整错误:', e);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('🔌 数据库连接已关闭');
  }
}

if (require.main === module) {
  main();
}

module.exports = main;

