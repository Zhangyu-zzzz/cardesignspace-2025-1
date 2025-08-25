const { sequelize } = require('../src/config/mysql');

async function addTagsToImages() {
  try {
    console.log('开始为 images 表添加 tags 字段...');
    
    // 添加 tags 字段
    await sequelize.query(`
      ALTER TABLE images 
      ADD COLUMN tags JSON DEFAULT ('[]') COMMENT '图片标签数组'
    `);
    
    console.log('✅ images 表 tags 字段添加成功！');
    console.log('\n字段说明：');
    console.log('- tags: JSON类型，存储图片标签数组，默认为空数组');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 添加 tags 字段失败:', error);
    process.exit(1);
  }
}

addTagsToImages();
