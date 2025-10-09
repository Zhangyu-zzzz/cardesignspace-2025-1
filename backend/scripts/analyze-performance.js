const { sequelize } = require('../src/config/mysql');
const { performance } = require('perf_hooks');

async function analyzePerformance() {
  try {
    await sequelize.authenticate();
    console.log('数据库连接成功，开始性能分析...');

    // 测试1: 基础图片查询
    console.log('\n📊 测试1: 基础图片查询');
    const start1 = performance.now();
    const result1 = await sequelize.query(`
      SELECT COUNT(*) as count FROM images
    `, { type: sequelize.QueryTypes.SELECT });
    const end1 = performance.now();
    console.log(`基础图片总数查询: ${(end1 - start1).toFixed(2)}ms, 结果: ${result1[0].count}`);

    // 测试2: 带JOIN的查询
    console.log('\n📊 测试2: 带JOIN的查询');
    const start2 = performance.now();
    const result2 = await sequelize.query(`
      SELECT COUNT(*) as count 
      FROM images i 
      INNER JOIN models m ON i.modelId = m.id 
      INNER JOIN brands b ON m.brandId = b.id
    `, { type: sequelize.QueryTypes.SELECT });
    const end2 = performance.now();
    console.log(`带JOIN的查询: ${(end2 - start2).toFixed(2)}ms, 结果: ${result2[0].count}`);

    // 测试3: 分页查询
    console.log('\n📊 测试3: 分页查询');
    const start3 = performance.now();
    const result3 = await sequelize.query(`
      SELECT i.id, i.url, i.filename, m.name as modelName, b.name as brandName
      FROM images i 
      INNER JOIN models m ON i.modelId = m.id 
      LEFT JOIN brands b ON m.brandId = b.id
      ORDER BY i.createdAt DESC 
      LIMIT 20
    `, { type: sequelize.QueryTypes.SELECT });
    const end3 = performance.now();
    console.log(`分页查询: ${(end3 - start3).toFixed(2)}ms, 结果: ${result3.length}条记录`);

    // 测试4: 图片变体查询
    console.log('\n📊 测试4: 图片变体查询');
    const imageIds = result3.map(r => r.id).slice(0, 5);
    const start4 = performance.now();
    const result4 = await sequelize.query(`
      SELECT imageId, variant, url 
      FROM image_assets 
      WHERE imageId IN (${imageIds.join(',')})
    `, { type: sequelize.QueryTypes.SELECT });
    const end4 = performance.now();
    console.log(`图片变体查询: ${(end4 - start4).toFixed(2)}ms, 结果: ${result4.length}条记录`);

    console.log('\n🎯 性能分析完成！');
    
  } catch (error) {
    console.error('性能分析失败:', error);
  } finally {
    await sequelize.close();
  }
}

analyzePerformance();
