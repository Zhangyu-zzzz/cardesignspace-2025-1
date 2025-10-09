const { sequelize } = require('../src/config/mysql');
const { performance } = require('perf_hooks');

async function analyzeDatabasePerformance() {
  try {
    await sequelize.authenticate();
    console.log('🔍 开始数据库性能分析...\n');

    // 1. 分析表结构
    console.log('📊 1. 表结构分析');
    const tables = await sequelize.query(`
      SELECT 
        TABLE_NAME,
        TABLE_ROWS,
        DATA_LENGTH,
        INDEX_LENGTH,
        (DATA_LENGTH + INDEX_LENGTH) as TOTAL_SIZE
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN ('images', 'models', 'brands', 'image_assets')
      ORDER BY TABLE_ROWS DESC
    `, { type: sequelize.QueryTypes.SELECT });

    tables.forEach(table => {
      console.log(`  ${table.TABLE_NAME}: ${table.TABLE_ROWS} 行, ${(table.TOTAL_SIZE / 1024 / 1024).toFixed(2)}MB`);
    });

    // 2. 分析索引情况
    console.log('\n📊 2. 索引分析');
    const indexes = await sequelize.query(`
      SELECT 
        TABLE_NAME,
        INDEX_NAME,
        COLUMN_NAME,
        NON_UNIQUE,
        CARDINALITY
      FROM information_schema.STATISTICS 
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN ('images', 'models', 'brands', 'image_assets')
      ORDER BY TABLE_NAME, INDEX_NAME
    `, { type: sequelize.QueryTypes.SELECT });

    const indexMap = {};
    indexes.forEach(idx => {
      if (!indexMap[idx.TABLE_NAME]) indexMap[idx.TABLE_NAME] = [];
      indexMap[idx.TABLE_NAME].push(`${idx.INDEX_NAME}(${idx.COLUMN_NAME})`);
    });

    Object.keys(indexMap).forEach(table => {
      console.log(`  ${table}: ${indexMap[table].join(', ')}`);
    });

    // 3. 分析查询性能
    console.log('\n📊 3. 查询性能分析');
    
    // 测试基础查询
    const start1 = performance.now();
    const countResult = await sequelize.query(`SELECT COUNT(*) as count FROM images`, { type: sequelize.QueryTypes.SELECT });
    const end1 = performance.now();
    console.log(`  基础COUNT查询: ${(end1 - start1).toFixed(2)}ms (${countResult[0].count} 条记录)`);

    // 测试JOIN查询
    const start2 = performance.now();
    const joinResult = await sequelize.query(`
      SELECT COUNT(*) as count 
      FROM images i 
      INNER JOIN models m ON i.modelId = m.id 
      LEFT JOIN brands b ON m.brandId = b.id
    `, { type: sequelize.QueryTypes.SELECT });
    const end2 = performance.now();
    console.log(`  JOIN查询: ${(end2 - start2).toFixed(2)}ms (${joinResult[0].count} 条记录)`);

    // 测试排序查询（这是主要瓶颈）
    const start3 = performance.now();
    const sortResult = await sequelize.query(`
      SELECT i.id, i.createdAt
      FROM images i 
      INNER JOIN models m ON i.modelId = m.id 
      LEFT JOIN brands b ON m.brandId = b.id
      ORDER BY i.createdAt DESC 
      LIMIT 20
    `, { type: sequelize.QueryTypes.SELECT });
    const end3 = performance.now();
    console.log(`  排序查询: ${(end3 - start3).toFixed(2)}ms (返回 ${sortResult.length} 条记录)`);

    // 4. 分析慢查询
    console.log('\n📊 4. 慢查询分析');
    const slowQueries = await sequelize.query(`
      SELECT 
        sql_text,
        exec_count,
        avg_timer_wait/1000000000 as avg_time_seconds,
        sum_timer_wait/1000000000 as total_time_seconds
      FROM performance_schema.events_statements_summary_by_digest 
      WHERE sql_text LIKE '%images%' 
      AND avg_timer_wait > 1000000000
      ORDER BY avg_timer_wait DESC 
      LIMIT 5
    `, { type: sequelize.QueryTypes.SELECT });

    if (slowQueries.length > 0) {
      slowQueries.forEach(query => {
        console.log(`  平均时间: ${query.avg_time_seconds.toFixed(2)}s, 执行次数: ${query.exec_count}`);
        console.log(`  SQL: ${query.sql_text.substring(0, 100)}...`);
      });
    } else {
      console.log('  未发现明显的慢查询');
    }

    // 5. 建议优化方案
    console.log('\n💡 5. 优化建议');
    console.log('  基于分析结果，建议以下优化措施：');
    console.log('  1. 创建 images.createdAt 索引（排序优化）');
    console.log('  2. 创建 images.modelId 索引（JOIN优化）');
    console.log('  3. 创建 models.brandId 索引（JOIN优化）');
    console.log('  4. 考虑使用游标分页替代 OFFSET');
    console.log('  5. 实现查询结果缓存');

  } catch (error) {
    console.error('分析失败:', error.message);
  } finally {
    await sequelize.close();
  }
}

analyzeDatabasePerformance();
