const mysql = require('mysql2/promise');
require('dotenv').config();

const BASIC_TAGS = [
  ['外观', 'category'],
  ['内饰', 'category'],
  ['细节', 'category'],
  ['正面', 'angle'],
  ['侧面', 'angle'],
  ['尾部', 'angle'],
  ['三四侧', 'angle'],
  ['工作室', 'scene'],
  ['道路', 'scene'],
  ['城市', 'scene'],
  ['自然', 'scene'],
];

(async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  try {
    console.log('🔗 连接到 MySQL 初始化基础标签...');

    for (const [name, category] of BASIC_TAGS) {
      await connection.query(
        'INSERT INTO tags (name, category, type, popularity, status, createdAt, updatedAt) VALUES (?, ?, "system", 0, "active", NOW(), NOW()) ON DUPLICATE KEY UPDATE updatedAt = VALUES(updatedAt)',
        [name, category]
      );
    }

    console.log('✅ 基础标签初始化完成');
  } catch (err) {
    console.error('❌ 基础标签初始化失败:', err.message);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
})();
