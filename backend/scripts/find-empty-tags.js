#!/usr/bin/env node

/**
 * 查找空标签的图片
 */

const { sequelize } = require('../src/config/mysql');
const { Op } = require('sequelize');
const Image = require('../src/models/mysql/Image');

async function findEmptyTags() {
  try {
    console.log('🔍 查找空标签的图片...');
    
    // 查询所有图片
    const allImages = await Image.findAll({
      limit: 50,
      attributes: ['id', 'filename', 'tags']
    });
    
    console.log(`📊 总图片数: ${allImages.length}`);
    
    // 手动检查每张图片的标签
    const emptyImages = [];
    
    allImages.forEach(image => {
      const tags = image.tags;
      let isEmpty = false;
      
      if (!tags) {
        isEmpty = true;
      } else if (Array.isArray(tags) && tags.length === 0) {
        isEmpty = true;
      } else if (typeof tags === 'string' && (tags === '' || tags === '[]' || tags === '""')) {
        isEmpty = true;
      } else if (Array.isArray(tags) && tags.every(tag => !tag || tag === '')) {
        isEmpty = true;
      }
      
      if (isEmpty) {
        emptyImages.push(image);
        console.log(`❌ 图片 ${image.id}: ${image.filename} - 标签: ${JSON.stringify(tags)}`);
      } else {
        console.log(`✅ 图片 ${image.id}: ${image.filename} - 标签: ${JSON.stringify(tags)}`);
      }
    });
    
    console.log(`\n📊 空标签图片: ${emptyImages.length} 张`);
    
    if (emptyImages.length > 0) {
      console.log('\n🔧 需要处理的图片:');
      emptyImages.slice(0, 5).forEach(image => {
        console.log(`   - 图片 ${image.id}: ${image.filename}`);
      });
    }
    
  } catch (error) {
    console.error('❌ 查找失败:', error.message);
  } finally {
    await sequelize.close();
  }
}

findEmptyTags();




