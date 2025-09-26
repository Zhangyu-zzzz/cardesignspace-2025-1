const { sequelize } = require('../src/config/mysql');
const { ImageAsset } = require('../src/models/mysql');

async function setupImageVariants() {
  try {
    console.log('开始设置图片变体系统...');
    
    // 创建 image_assets 表
    await ImageAsset.sync({ force: false });
    console.log('✅ image_assets 表已创建/更新');
    
    // 检查表结构
    const tableInfo = await sequelize.query(`
      DESCRIBE image_assets
    `, {
      type: sequelize.QueryTypes.SELECT
    });
    
    console.log('\n📋 image_assets 表结构:');
    tableInfo.forEach(column => {
      console.log(`- ${column.Field}: ${column.Type} ${column.Null === 'NO' ? '(NOT NULL)' : '(NULL)'} ${column.Key ? `[${column.Key}]` : ''}`);
    });
    
    // 检查现有数据
    const variantStats = await sequelize.query(`
      SELECT 
        variant,
        COUNT(*) as count,
        AVG(size) as avgSize,
        MIN(size) as minSize,
        MAX(size) as maxSize
      FROM image_assets
      GROUP BY variant
      ORDER BY variant
    `, {
      type: sequelize.QueryTypes.SELECT
    });
    
    if (variantStats.length > 0) {
      console.log('\n📊 现有变体统计:');
      variantStats.forEach(stat => {
        console.log(`- ${stat.variant}: ${stat.count} 个变体, 平均大小: ${Math.round(stat.avgSize / 1024)}KB`);
      });
    } else {
      console.log('\n📊 暂无变体数据');
    }
    
    // 检查图片总数
    const totalImages = await sequelize.query(`
      SELECT COUNT(*) as count FROM images
    `, {
      type: sequelize.QueryTypes.SELECT
    });
    
    console.log(`\n📈 总图片数: ${totalImages[0].count}`);
    
    console.log('\n✅ 图片变体系统设置完成！');
    console.log('\n🚀 可用的API端点:');
    console.log('- GET /api/image-variants/best/:imageId - 获取最佳变体URL');
    console.log('- GET /api/image-variants/variants/:imageId - 获取所有变体信息');
    console.log('- POST /api/image-variants/batch - 批量获取变体URL');
    console.log('- GET /api/image-variants/stats - 获取变体统计信息');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 设置图片变体系统失败:', error);
    process.exit(1);
  }
}

setupImageVariants();
