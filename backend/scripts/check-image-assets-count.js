#!/usr/bin/env node

/**
 * 检查image_assets表的详细记录数
 */

const { sequelize } = require('../src/config/mysql');

async function checkImageAssetsCount() {
  try {
    console.log('🔌 连接数据库...');
    
    // 测试连接
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');
    
    // 检查表是否存在
    console.log('📋 检查image_assets表...');
    const [results] = await sequelize.query("SHOW TABLES LIKE 'image_assets'");
    
    if (results.length === 0) {
      console.log('❌ image_assets表不存在');
      return;
    }
    
    console.log('✅ image_assets表存在');
    
    // 使用原生SQL查询记录数
    console.log('📊 使用原生SQL查询记录数...');
    const [countResult] = await sequelize.query("SELECT COUNT(*) as total FROM image_assets");
    const totalCount = countResult[0].total;
    
    console.log(`📈 image_assets表总记录数: ${totalCount.toLocaleString()}`);
    
    // 按变体类型统计
    console.log('\n📊 按变体类型统计:');
    const [variantStats] = await sequelize.query(`
      SELECT variant, COUNT(*) as count 
      FROM image_assets 
      GROUP BY variant 
      ORDER BY count DESC
    `);
    
    variantStats.forEach(stat => {
      console.log(`  ${stat.variant}: ${stat.count.toLocaleString()} 条记录`);
    });
    
    // 检查是否有数据
    if (totalCount > 0) {
      console.log('\n📋 样本数据:');
      const [sampleData] = await sequelize.query(`
        SELECT id, imageId, variant, url, width, height, size, createdAt 
        FROM image_assets 
        ORDER BY id 
        LIMIT 5
      `);
      
      sampleData.forEach(row => {
        console.log(`  ID: ${row.id}, 图片ID: ${row.imageId}, 变体: ${row.variant}, 尺寸: ${row.width}x${row.height}`);
      });
    }
    
  } catch (error) {
    console.error('❌ 查询失败:', error.message);
    console.error('详细错误:', error);
  } finally {
    await sequelize.close();
    console.log('🔌 数据库连接已关闭');
  }
}

// 执行查询
checkImageAssetsCount();

