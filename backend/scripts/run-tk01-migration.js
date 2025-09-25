const path = require('path');
const runSqlFile = require('./run-sql-file');

(async () => {
  const ddlPath = path.join(__dirname, '../src/sql/tk01_ddl.sql');
  console.log('🚀 开始执行 TK01 迁移:', ddlPath);
  await runSqlFile(ddlPath);
})();
