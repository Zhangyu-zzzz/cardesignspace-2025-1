const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function runSqlFile(sqlFilePath) {
  const absPath = path.isAbsolute(sqlFilePath)
    ? sqlFilePath
    : path.join(__dirname, sqlFilePath);
  if (!fs.existsSync(absPath)) {
    throw new Error(`SQL 文件不存在: ${absPath}`);
  }

  const sqlContent = fs.readFileSync(absPath, 'utf8');

  // 粗粒度切分语句：按分号拆分，忽略注释与空行
  // 直接整体执行，开启 multipleStatements，避免复杂拆分带来的语法问题
  const statements = [sqlContent];

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true
  });

  try {
    console.log(`🔗 连接到 MySQL: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);

    for (let i = 0; i < statements.length; i += 1) {
      const sql = statements[i];
      if (!sql) continue;
      console.log(`➡️ 执行第 ${i + 1}/${statements.length} 条语句...`);
      try {
        await connection.query(sql);
      } catch (err) {
        console.error('❌ 语句执行失败:', err.message);
        console.error('SQL 片段:', sql.substring(0, 300));
        throw err;
      }
    }

    console.log('✅ 全部语句执行完毕');
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error('用法: node scripts/run-sql-file.js <path-to-sql>');
    process.exit(1);
  }
  runSqlFile(fileArg).catch((err) => {
    console.error('执行失败:', err);
    process.exit(1);
  });
}

module.exports = runSqlFile;
