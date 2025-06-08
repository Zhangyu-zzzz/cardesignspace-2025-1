const { sequelize } = require('../src/config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('开始创建用户活动表...');
    
    // 读取SQL文件
    const sqlPath = path.join(__dirname, '../migrations/create-user-activities.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // 执行SQL
    await sequelize.query(sql);
    
    console.log('用户活动表创建成功！');
    
    // 测试连接
    await sequelize.authenticate();
    console.log('数据库连接正常');
    
  } catch (error) {
    console.error('迁移失败:', error);
  } finally {
    await sequelize.close();
  }
}

runMigration(); 