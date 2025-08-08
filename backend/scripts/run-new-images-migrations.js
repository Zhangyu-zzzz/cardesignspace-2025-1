const { Sequelize } = require('sequelize');
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
    const migrationPath = path.join(__dirname, '../migrations/2025-08-08-new-images-tables.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    console.log('🚀 开始执行新表迁移...');
    await sequelize.query(sql);
    console.log('✅ 新表迁移完成');
  } catch (e) {
    console.error('❌ 迁移失败:', e.message);
    if (e.sql) console.error('SQL:', e.sql);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  main();
}


