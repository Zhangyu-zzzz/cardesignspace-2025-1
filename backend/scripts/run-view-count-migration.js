const path = require('path');
const runSqlFile = require('./run-sql-file');

(async () => {
  try {
    const migrationPath = path.join(__dirname, '../migrations/add_view_count_to_models.sql');
    console.log('🚀 开始执行 viewCount 字段迁移...');
    console.log('📄 迁移文件:', migrationPath);
    await runSqlFile(migrationPath);
    console.log('✅ viewCount 字段迁移完成！');
    console.log('\n📝 下一步：');
    console.log('   1. 重启后端服务以使模型更改生效');
    console.log('   2. 访问任意车型详情页面测试访问计数功能');
  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    process.exit(1);
  }
})();

