const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
  });
  try {
    console.log('🔗 连接到 MySQL 进行精选回灌...');

    const [res] = await connection.query(`
      INSERT INTO image_curation (image_id, is_curated, curation_score, curator, reason, valid_until, created_at, updated_at)
      SELECT id AS image_id, 1 AS is_curated, 50 AS curation_score, 'migration' AS curator,
             'migrated from images.isFeatured' AS reason, NULL AS valid_until, NOW(), NOW()
      FROM images
      WHERE isFeatured = 1
      ON DUPLICATE KEY UPDATE
        is_curated = VALUES(is_curated),
        curation_score = GREATEST(image_curation.curation_score, VALUES(curation_score)),
        updated_at = VALUES(updated_at);
    `);

    console.log('✅ 精选回灌完成');
  } catch (err) {
    console.error('❌ 精选回灌失败:', err.message);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
})();
