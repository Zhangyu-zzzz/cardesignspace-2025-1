const mysql = require('mysql2/promise');
const { performance } = require('perf_hooks');

// 数据库配置
const dbConfig = {
  host: '49.235.98.5',
  port: 3306,
  user: 'Jason',
  password: 'Jason123456!',
  database: 'cardesignspace',
  charset: 'utf8mb4'
};

async function optimizeDatabasePerformance() {
  let connection;
  
  try {
    console.log('🔍 开始数据库性能分析和优化...\n');
    
    // 连接数据库
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ 数据库连接成功\n');

    // 1. 分析表结构和数据量
    console.log('📊 1. 表结构分析');
    const [tables] = await connection.execute(`
      SELECT 
        TABLE_NAME,
        TABLE_ROWS,
        DATA_LENGTH,
        INDEX_LENGTH,
        (DATA_LENGTH + INDEX_LENGTH) as TOTAL_SIZE
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = 'cardesignspace'
      AND TABLE_NAME IN ('images', 'models', 'brands', 'image_assets')
      ORDER BY TABLE_ROWS DESC
    `);

    tables.forEach(table => {
      console.log(`  ${table.TABLE_NAME}: ${table.TABLE_ROWS} 行, ${(table.TOTAL_SIZE / 1024 / 1024).toFixed(2)}MB`);
    });

    // 2. 分析现有索引
    console.log('\n📊 2. 现有索引分析');
    const [indexes] = await connection.execute(`
      SELECT 
        TABLE_NAME,
        INDEX_NAME,
        COLUMN_NAME,
        NON_UNIQUE,
        CARDINALITY
      FROM information_schema.STATISTICS 
      WHERE TABLE_SCHEMA = 'cardesignspace'
      AND TABLE_NAME IN ('images', 'models', 'brands', 'image_assets')
      ORDER BY TABLE_NAME, INDEX_NAME
    `);

    const indexMap = {};
    indexes.forEach(idx => {
      if (!indexMap[idx.TABLE_NAME]) indexMap[idx.TABLE_NAME] = [];
      indexMap[idx.TABLE_NAME].push(`${idx.INDEX_NAME}(${idx.COLUMN_NAME})`);
    });

    Object.keys(indexMap).forEach(table => {
      console.log(`  ${table}: ${indexMap[table].join(', ')}`);
    });

    // 3. 测试当前查询性能
    console.log('\n📊 3. 当前查询性能测试');
    
    // 测试基础查询
    const start1 = performance.now();
    const [countResult] = await connection.execute(`SELECT COUNT(*) as count FROM images`);
    const end1 = performance.now();
    console.log(`  基础COUNT查询: ${(end1 - start1).toFixed(2)}ms (${countResult[0].count} 条记录)`);

    // 测试JOIN查询
    const start2 = performance.now();
    const [joinResult] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM images i 
      INNER JOIN models m ON i.modelId = m.id 
      LEFT JOIN brands b ON m.brandId = b.id
    `);
    const end2 = performance.now();
    console.log(`  JOIN查询: ${(end2 - start2).toFixed(2)}ms (${joinResult[0].count} 条记录)`);

    // 测试排序查询（主要瓶颈）
    const start3 = performance.now();
    const [sortResult] = await connection.execute(`
      SELECT i.id, i.createdAt, m.name as modelName, b.name as brandName
      FROM images i 
      INNER JOIN models m ON i.modelId = m.id 
      LEFT JOIN brands b ON m.brandId = b.id
      ORDER BY i.createdAt DESC 
      LIMIT 20
    `);
    const end3 = performance.now();
    console.log(`  排序查询: ${(end3 - start3).toFixed(2)}ms (返回 ${sortResult.length} 条记录)`);

    // 4. 创建性能优化索引
    console.log('\n🚀 4. 创建性能优化索引');
    
    const indexesToCreate = [
      {
        name: 'idx_images_createdAt',
        table: 'images',
        columns: 'createdAt DESC',
        description: '优化按创建时间排序的查询'
      },
      {
        name: 'idx_images_modelId',
        table: 'images',
        columns: 'modelId',
        description: '优化JOIN查询'
      },
      {
        name: 'idx_models_brandId',
        table: 'models',
        columns: 'brandId',
        description: '优化JOIN查询'
      },
      {
        name: 'idx_models_type',
        table: 'models',
        columns: 'type',
        description: '优化按类型筛选的查询'
      },
      {
        name: 'idx_image_assets_imageId',
        table: 'image_assets',
        columns: 'imageId',
        description: '优化图片变体查询'
      },
      {
        name: 'idx_images_model_created',
        table: 'images',
        columns: 'modelId, createdAt DESC',
        description: '复合索引优化常见查询'
      }
    ];

    for (const index of indexesToCreate) {
      try {
        // 检查索引是否已存在
        const [existingIndexes] = await connection.execute(`
          SELECT COUNT(*) as count 
          FROM information_schema.STATISTICS 
          WHERE TABLE_SCHEMA = 'cardesignspace' 
          AND TABLE_NAME = ? 
          AND INDEX_NAME = ?
        `, [index.table, index.name]);

        if (existingIndexes[0].count > 0) {
          console.log(`  ✅ ${index.name} 已存在`);
          continue;
        }

        // 创建索引
        const startTime = performance.now();
        await connection.execute(`
          CREATE INDEX ${index.name} ON ${index.table} (${index.columns})
        `);
        const endTime = performance.now();
        
        console.log(`  ✅ 创建 ${index.name}: ${(endTime - startTime).toFixed(2)}ms - ${index.description}`);
        
      } catch (error) {
        console.log(`  ❌ 创建 ${index.name} 失败: ${error.message}`);
      }
    }

    // 5. 测试优化后的性能
    console.log('\n📊 5. 优化后性能测试');
    
    // 重新测试排序查询
    const start4 = performance.now();
    const [optimizedResult] = await connection.execute(`
      SELECT i.id, i.createdAt, m.name as modelName, b.name as brandName
      FROM images i 
      INNER JOIN models m ON i.modelId = m.id 
      LEFT JOIN brands b ON m.brandId = b.id
      ORDER BY i.createdAt DESC 
      LIMIT 20
    `);
    const end4 = performance.now();
    console.log(`  优化后排序查询: ${(end4 - start4).toFixed(2)}ms (返回 ${optimizedResult.length} 条记录)`);

    // 测试分页查询
    const start5 = performance.now();
    const [pageResult] = await connection.execute(`
      SELECT i.id, i.createdAt, m.name as modelName, b.name as brandName
      FROM images i 
      INNER JOIN models m ON i.modelId = m.id 
      LEFT JOIN brands b ON m.brandId = b.id
      ORDER BY i.createdAt DESC 
      LIMIT 20 OFFSET 20
    `);
    const end5 = performance.now();
    console.log(`  分页查询: ${(end5 - start5).toFixed(2)}ms (返回 ${pageResult.length} 条记录)`);

    // 6. 生成优化报告
    console.log('\n📋 6. 优化报告');
    const performanceImprovement = ((end3 - start3) - (end4 - start4)) / (end3 - start3) * 100;
    console.log(`  优化前查询时间: ${(end3 - start3).toFixed(2)}ms`);
    console.log(`  优化后查询时间: ${(end4 - start4).toFixed(2)}ms`);
    console.log(`  性能提升: ${performanceImprovement.toFixed(1)}%`);

    console.log('\n🎉 数据库性能优化完成！');
    console.log('\n💡 后续建议:');
    console.log('  1. 实现查询结果缓存');
    console.log('  2. 考虑使用游标分页');
    console.log('  3. 添加Redis缓存层');
    console.log('  4. 监控慢查询日志');

  } catch (error) {
    console.error('❌ 优化失败:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

optimizeDatabasePerformance();
