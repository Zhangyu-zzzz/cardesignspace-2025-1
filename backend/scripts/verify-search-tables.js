/**
 * 验证搜索功能表是否正确安装
 */

const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || '49.235.98.5',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'Jason',
  password: process.env.DB_PASSWORD || 'Jason123456!',
  database: process.env.DB_NAME || 'cardesignspace'
};

async function verifyTables() {
  let connection;
  
  try {
    console.log('🔌 连接数据库...\n');
    connection = await mysql.createConnection(dbConfig);
    
    // 1. 检查表结构
    console.log('📊 数据表信息:\n');
    const [tables] = await connection.query(`
      SELECT 
        TABLE_NAME, 
        TABLE_ROWS,
        CREATE_TIME,
        TABLE_COMMENT
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME IN ('search_history', 'search_stats')
    `, [dbConfig.database]);
    
    console.table(tables);
    
    // 2. 查看 search_stats 数据
    console.log('\n📈 search_stats 测试数据:\n');
    const [stats] = await connection.query('SELECT * FROM search_stats ORDER BY count DESC');
    console.table(stats);
    
    // 3. 查看 search_history 数据
    console.log('\n📜 search_history 记录数:\n');
    const [historyCount] = await connection.query('SELECT COUNT(*) as count FROM search_history');
    console.log(`   总记录数: ${historyCount[0].count}\n`);
    
    if (historyCount[0].count > 0) {
      const [recentHistory] = await connection.query(`
        SELECT 
          id, query, search_type, results_count, 
          is_successful, created_at 
        FROM search_history 
        ORDER BY created_at DESC 
        LIMIT 10
      `);
      console.log('   最近10条记录:');
      console.table(recentHistory);
    }
    
    // 4. 检查视图
    console.log('\n👁️  数据视图:\n');
    const [views] = await connection.query(`
      SELECT TABLE_NAME 
      FROM information_schema.VIEWS 
      WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME LIKE 'v_%search%'
    `, [dbConfig.database]);
    
    if (views.length > 0) {
      views.forEach(view => console.log(`   ✓ ${view.TABLE_NAME}`));
    } else {
      console.log('   ℹ️  未创建视图');
    }
    
    console.log('\n✅ 验证完成！搜索功能表运行正常。\n');
    
  } catch (error) {
    console.error('\n❌ 验证失败:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

verifyTables();





