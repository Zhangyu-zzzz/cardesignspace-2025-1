const { sequelize } = require('../src/config/mysql');

async function addHatchbackType() {
  try {
    console.log('开始为 models 表添加 Hatchback 车型类型...');
    
    // 添加 Hatchback 到 ENUM 类型
    await sequelize.query(`
      ALTER TABLE models 
      MODIFY COLUMN type ENUM('轿车', 'SUV', 'MPV', 'WAGON', 'SHOOTINGBRAKE', '皮卡', '跑车', 'Hatchback', '其他') DEFAULT '其他'
    `);
    
    console.log('✅ models 表 Hatchback 车型类型添加成功！');
    console.log('\n支持的车型类型:');
    console.log('- 轿车');
    console.log('- SUV');
    console.log('- MPV');
    console.log('- WAGON');
    console.log('- SHOOTINGBRAKE');
    console.log('- 皮卡');
    console.log('- 跑车');
    console.log('- Hatchback (新增)');
    console.log('- 其他');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 添加 Hatchback 车型类型失败:', error);
    process.exit(1);
  }
}

addHatchbackType();

