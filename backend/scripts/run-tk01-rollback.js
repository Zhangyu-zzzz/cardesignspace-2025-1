const path = require('path');
const runSqlFile = require('./run-sql-file');

(async () => {
  const rollbackPath = path.join(__dirname, '../src/sql/tk01_rollback.sql');
  console.log('↩️ 开始执行 TK01 回滚:', rollbackPath);
  await runSqlFile(rollbackPath);
})();
