const mysql = require('mysql2/promise');
require('dotenv').config();

// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST || '49.235.98.5',
  user: process.env.DB_USER || 'Jason',
  password: process.env.DB_PASSWORD || 'Jason123456!',
  database: process.env.DB_NAME || 'cardesignspace',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  charset: 'utf8mb4'
};

async function fixSearchStatsData() {
  let connection;
  
  try {
    console.log('🔗 连接到数据库...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ 数据库连接成功\n');
    
    // 1. 检查表是否存在
    console.log('1️⃣ 检查 search_stats 表...');
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'search_stats'"
    );
    
    if (tables.length === 0) {
      console.log('❌ search_stats 表不存在，请先执行迁移脚本');
      console.log('   执行: mysql < backend/migrations/create_search_tables.sql');
      process.exit(1);
    }
    console.log('✅ search_stats 表存在\n');
    
    // 2. 检查表中是否有数据
    console.log('2️⃣ 检查表中数据...');
    const [countResult] = await connection.execute(
      "SELECT COUNT(*) as count FROM search_stats"
    );
    const recordCount = countResult[0].count;
    console.log(`   当前记录数: ${recordCount}\n`);
    
    // 3. 如果有数据，显示现有数据
    if (recordCount > 0) {
      console.log('3️⃣ 现有数据:');
      const [existingData] = await connection.execute(
        "SELECT query, count, last_searched_at FROM search_stats ORDER BY count DESC LIMIT 10"
      );
      existingData.forEach(row => {
        console.log(`   - ${row.query}: ${row.count} 次 (最后搜索: ${row.last_searched_at})`);
      });
      console.log('');
    }
    
    // 4. 插入或更新测试数据
    console.log('4️⃣ 插入/更新测试数据...');
    const testData = [
      { query: 'BMW概念车', count: 14 },
      { query: '奔驰SUV', count: 9 },
      { query: '红色跑车', count: 5 },
      { query: '蓝色轿车', count: 3 },
      { query: '竞速', count: 2 }
    ];
    
    for (const item of testData) {
      const [existing] = await connection.execute(
        "SELECT id, count FROM search_stats WHERE query = ?",
        [item.query]
      );
      
      if (existing.length > 0) {
        // 更新现有记录，确保 count 不为 0
        const newCount = Math.max(existing[0].count, item.count);
        await connection.execute(
          "UPDATE search_stats SET count = ?, last_searched_at = NOW() WHERE query = ?",
          [newCount, item.query]
        );
        console.log(`   ✅ 更新: ${item.query} -> ${newCount} 次`);
      } else {
        // 插入新记录
        await connection.execute(
          "INSERT INTO search_stats (query, count, last_searched_at) VALUES (?, ?, NOW())",
          [item.query, item.count]
        );
        console.log(`   ✅ 插入: ${item.query} -> ${item.count} 次`);
      }
    }
    
    console.log('\n5️⃣ 验证数据...');
    const [finalData] = await connection.execute(
      "SELECT query, count, last_searched_at FROM search_stats ORDER BY count DESC LIMIT 10"
    );
    
    console.log('\n📊 最终热门搜索数据:');
    finalData.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.query}: ${row.count} 次`);
    });
    
    console.log('\n✅ 数据修复完成！');
    console.log('\n💡 提示:');
    console.log('   - 如果服务器端仍显示 count 为 0，请检查:');
    console.log('     1. 后端服务是否正常运行');
    console.log('     2. API 路由是否正确配置');
    console.log('     3. 浏览器控制台是否有错误');
    console.log('     4. 清除浏览器缓存后重试');
    
  } catch (error) {
    console.error('\n❌ 修复失败:', error.message);
    console.error('详细错误:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

// 执行修复
console.log('🚀 开始修复搜索统计数据...\n');
fixSearchStatsData();

