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
  try {
    // 测试数据库连接
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');

    // 组装迁移 SQL：优先执行 image_assets（若文件存在），并追加 image_curation 表 DDL
    const migrations = [];
    const imageAssetsPath = path.join(__dirname, './create-image-assets-table.sql');
    if (fs.existsSync(imageAssetsPath)) {
      const migrationSQL = fs.readFileSync(imageAssetsPath, 'utf8');
      migrations.push(migrationSQL);
    }

    // image_curation DDL（幂等）
    migrations.push(`
CREATE TABLE IF NOT EXISTS image_curation (
  id INT AUTO_INCREMENT PRIMARY KEY,
  imageId INT NOT NULL UNIQUE,
  isCurated TINYINT(1) DEFAULT 0,
  curationScore FLOAT DEFAULT 0,
  curator VARCHAR(255) NULL,
  reason TEXT NULL,
  validUntil DATETIME NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_image_curation_imageId (imageId),
  INDEX idx_image_curation_isCurated (isCurated),
  INDEX idx_image_curation_score (curationScore),
  INDEX idx_image_curation_validUntil (validUntil)
);
    `.trim());

    console.log('📄 开始执行迁移...');
    for (const sql of migrations) {
      console.log('执行SQL片段:', sql.substring(0, 120) + '...');
      await sequelize.query(sql);
    }

    console.log('✅ 迁移执行完成！');

    // 检查 image_assets 表是否存在
    const [tables] = await sequelize.query(
      "SHOW TABLES LIKE 'image_assets'"
    );
    
    if (tables.length > 0) {
      console.log('✅ image_assets 表确认存在');
      
      // 查看表结构
      const [columns] = await sequelize.query(
        "DESCRIBE image_assets"
      );
      
      console.log('📋 表结构:');
      columns.forEach(col => {
        console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `KEY(${col.Key})` : ''}`);
      });
    } else {
      console.log('❌ image_assets 表不存在，迁移可能失败');
    }

    // 检查 image_curation 表
    const [ic] = await sequelize.query(
      "SHOW TABLES LIKE 'image_curation'"
    );
    if (ic.length > 0) {
      console.log('✅ image_curation 表确认存在');
      const [columns2] = await sequelize.query(
        "DESCRIBE image_curation"
      );
      console.log('📋 image_curation 表结构:');
      columns2.forEach(col => {
        console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `KEY(${col.Key})` : ''}`);
      });
    } else {
      console.log('❌ image_curation 表不存在，迁移可能失败');
    }

  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    if (error.sql) {
      console.error('SQL 语句:', error.sql);
    }
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('�� 数据库连接已关闭');
  }
}

// 运行迁移
console.log('🚀 开始数据库迁移...');
runMigration(); 