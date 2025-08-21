const mysql = require('mysql2/promise');

// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'cardesignspace',
  port: process.env.DB_PORT || 3306,
  charset: 'utf8mb4'
};

async function createInspirationFavoritesTable() {
  let connection;
  
  try {
    console.log('连接到数据库...');
    connection = await mysql.createConnection(dbConfig);
    
    console.log('创建灵感图片收藏表...');
    
    // 创建灵感图片收藏表
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS inspiration_favorites (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        image_id VARCHAR(255) NOT NULL,
        image_url TEXT NOT NULL,
        filename VARCHAR(255) NOT NULL,
        tags JSON,
        likes INT DEFAULT 0,
        source_link TEXT,
        timestamp INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_image_id (image_id),
        INDEX idx_created_at (created_at),
        UNIQUE KEY unique_user_image (user_id, image_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    
    await connection.execute(createTableSQL);
    console.log('✅ 灵感图片收藏表创建成功');
    
    // 检查表结构
    const [tableInfo] = await connection.execute('DESCRIBE inspiration_favorites');
    console.log('📋 表结构:');
    tableInfo.forEach(field => {
      console.log(`  - ${field.Field}: ${field.Type} ${field.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${field.Key ? `(${field.Key})` : ''}`);
    });
    
  } catch (error) {
    console.error('❌ 创建表失败:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('数据库连接已关闭');
    }
  }
}

// 运行脚本
if (require.main === module) {
  createInspirationFavoritesTable()
    .then(() => {
      console.log('🎉 迁移完成');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 迁移失败:', error);
      process.exit(1);
    });
}

module.exports = createInspirationFavoritesTable;
