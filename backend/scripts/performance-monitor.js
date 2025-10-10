const mysql = require('mysql2/promise');
const { performance } = require('perf_hooks');

// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'cardesignspace',
  port: process.env.DB_PORT || 3306,
  charset: 'utf8mb4'
};

async function monitorPerformance() {
  let connection;
  
  try {
    console.log('🔗 连接到数据库...');
    connection = await mysql.createConnection(dbConfig);
    
    console.log('📊 开始性能监控测试...\n');
    
    // 测试1: 基础图片查询性能
    console.log('1️⃣ 测试基础图片查询性能...');
    const start1 = performance.now();
    
    const [images] = await connection.execute(`
      SELECT i.id, i.url, i.filename, i.tags, i.createdAt,
             m.name as model_name, m.type as model_type,
             b.name as brand_name
      FROM images i
      LEFT JOIN models m ON i.modelId = m.id
      LEFT JOIN brands b ON m.brandId = b.id
      ORDER BY i.createdAt DESC
      LIMIT 20
    `);
    
    const end1 = performance.now();
    console.log(`✅ 基础查询完成: ${images.length} 条记录, 耗时: ${(end1 - start1).toFixed(2)}ms`);
    
    // 测试2: 带筛选的图片查询性能
    console.log('\n2️⃣ 测试带筛选的图片查询性能...');
    const start2 = performance.now();
    
    const [filteredImages] = await connection.execute(`
      SELECT i.id, i.url, i.filename, i.tags, i.createdAt,
             m.name as model_name, m.type as model_type,
             b.name as brand_name
      FROM images i
      LEFT JOIN models m ON i.modelId = m.id
      LEFT JOIN brands b ON m.brandId = b.id
      WHERE m.type = 'SUV'
        AND JSON_CONTAINS(i.tags, '"正前"')
      ORDER BY i.createdAt DESC
      LIMIT 20
    `);
    
    const end2 = performance.now();
    console.log(`✅ 筛选查询完成: ${filteredImages.length} 条记录, 耗时: ${(end2 - start2).toFixed(2)}ms`);
    
    // 测试3: 图片变体查询性能
    console.log('\n3️⃣ 测试图片变体查询性能...');
    const start3 = performance.now();
    
    const imageIds = images.slice(0, 10).map(img => img.id);
    const [variants] = await connection.execute(`
      SELECT imageId, variant, url, width, height
      FROM image_assets
      WHERE imageId IN (${imageIds.join(',')})
    `);
    
    const end3 = performance.now();
    console.log(`✅ 变体查询完成: ${variants.length} 条记录, 耗时: ${(end3 - start3).toFixed(2)}ms`);
    
    // 测试4: 热门标签查询性能
    console.log('\n4️⃣ 测试热门标签查询性能...');
    const start4 = performance.now();
    
    const [tagStats] = await connection.execute(`
      SELECT 
        JSON_UNQUOTE(JSON_EXTRACT(tags, CONCAT('$[', numbers.n, ']'))) as tag,
        COUNT(*) as count
      FROM images i
      CROSS JOIN (
        SELECT 0 as n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
        UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9
      ) numbers
      WHERE JSON_EXTRACT(i.tags, CONCAT('$[', numbers.n, ']')) IS NOT NULL
        AND i.tags IS NOT NULL
        AND i.tags != '[]'
      GROUP BY tag
      ORDER BY count DESC
      LIMIT 15
    `);
    
    const end4 = performance.now();
    console.log(`✅ 标签统计完成: ${tagStats.length} 条记录, 耗时: ${(end4 - start4).toFixed(2)}ms`);
    
    // 测试5: 数据库连接池性能
    console.log('\n5️⃣ 测试数据库连接池性能...');
    const start5 = performance.now();
    
    const concurrentPromises = Array.from({ length: 10 }, () => 
      connection.execute('SELECT COUNT(*) as count FROM images')
    );
    
    await Promise.all(concurrentPromises);
    const end5 = performance.now();
    console.log(`✅ 并发查询完成: 10个并发请求, 耗时: ${(end5 - start5).toFixed(2)}ms`);
    
    // 性能分析报告
    console.log('\n📈 性能分析报告:');
    console.log('='.repeat(50));
    
    const baseQueryTime = end1 - start1;
    const filteredQueryTime = end2 - start2;
    const variantQueryTime = end3 - start3;
    const tagQueryTime = end4 - start4;
    const concurrentQueryTime = end5 - start5;
    
    console.log(`基础查询性能: ${baseQueryTime.toFixed(2)}ms (${images.length} 条记录)`);
    console.log(`筛选查询性能: ${filteredQueryTime.toFixed(2)}ms (${filteredImages.length} 条记录)`);
    console.log(`变体查询性能: ${variantQueryTime.toFixed(2)}ms (${variants.length} 条记录)`);
    console.log(`标签统计性能: ${tagQueryTime.toFixed(2)}ms (${tagStats.length} 条记录)`);
    console.log(`并发查询性能: ${concurrentQueryTime.toFixed(2)}ms (10个并发请求)`);
    
    // 性能评估
    console.log('\n🎯 性能评估:');
    if (baseQueryTime < 100) {
      console.log('✅ 基础查询性能: 优秀 (< 100ms)');
    } else if (baseQueryTime < 300) {
      console.log('⚠️  基础查询性能: 良好 (100-300ms)');
    } else {
      console.log('❌ 基础查询性能: 需要优化 (> 300ms)');
    }
    
    if (filteredQueryTime < 200) {
      console.log('✅ 筛选查询性能: 优秀 (< 200ms)');
    } else if (filteredQueryTime < 500) {
      console.log('⚠️  筛选查询性能: 良好 (200-500ms)');
    } else {
      console.log('❌ 筛选查询性能: 需要优化 (> 500ms)');
    }
    
    if (variantQueryTime < 50) {
      console.log('✅ 变体查询性能: 优秀 (< 50ms)');
    } else if (variantQueryTime < 100) {
      console.log('⚠️  变体查询性能: 良好 (50-100ms)');
    } else {
      console.log('❌ 变体查询性能: 需要优化 (> 100ms)');
    }
    
    // 优化建议
    console.log('\n💡 优化建议:');
    if (baseQueryTime > 100) {
      console.log('- 考虑为images表添加更多索引');
    }
    if (filteredQueryTime > 200) {
      console.log('- 优化JSON字段查询，考虑使用虚拟列和全文索引');
    }
    if (variantQueryTime > 50) {
      console.log('- 优化image_assets表的索引结构');
    }
    if (tagQueryTime > 300) {
      console.log('- 考虑创建标签统计表，避免实时计算');
    }
    
    console.log('\n🎉 性能监控完成！');
    
  } catch (error) {
    console.error('❌ 性能监控失败:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 数据库连接已关闭');
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  monitorPerformance();
}

module.exports = { monitorPerformance };
