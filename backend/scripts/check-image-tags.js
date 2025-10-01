#!/usr/bin/env node

/**
 * 检查图片标签情况
 */

const { sequelize } = require('../src/config/mysql');
const { Op } = require('sequelize');
const Image = require('../src/models/mysql/Image');

async function checkImageTags() {
  try {
    console.log('🔍 检查图片标签情况...');
    
    // 查询所有图片
    const allImages = await Image.findAll({
      limit: 20,
      attributes: ['id', 'filename', 'tags']
    });
    
    console.log(`📊 总图片数: ${allImages.length}`);
    
    // 统计标签情况
    let withTags = 0;
    let withoutTags = 0;
    let emptyTags = 0;
    
    allImages.forEach(image => {
      if (image.tags && Array.isArray(image.tags) && image.tags.length > 0) {
        withTags++;
        console.log(`✅ 图片 ${image.id}: ${image.tags.join(', ')}`);
      } else if (!image.tags || image.tags === null) {
        withoutTags++;
        console.log(`❌ 图片 ${image.id}: 无标签`);
      } else {
        emptyTags++;
        console.log(`⚠️ 图片 ${image.id}: 空标签`);
      }
    });
    
    console.log(`\n📊 标签统计:`);
    console.log(`   - 有标签: ${withTags} 张`);
    console.log(`   - 无标签: ${withoutTags} 张`);
    console.log(`   - 空标签: ${emptyTags} 张`);
    
    // 查询需要处理的图片
    const needProcessing = await Image.findAll({
      where: {
        [Op.or]: [
          { tags: null },
          { tags: [] },
          { tags: '' }
        ]
      },
      limit: 5,
      attributes: ['id', 'filename', 'tags']
    });
    
    console.log(`\n🔧 需要处理的图片: ${needProcessing.length} 张`);
    needProcessing.forEach(image => {
      console.log(`   - 图片 ${image.id}: ${image.filename}`);
    });
    
  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkImageTags();




