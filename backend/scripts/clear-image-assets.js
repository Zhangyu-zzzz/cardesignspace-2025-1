#!/usr/bin/env node

/**
 * 清空cardesignspace数据库中image_assets表的所有数据
 */

const { sequelize } = require('../src/config/mysql');
const ImageAsset = require('../src/models/mysql/ImageAsset');

async function clearImageAssets() {
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
    
    // 查询当前数据量
    console.log('📊 查询当前数据量...');
    const count = await ImageAsset.count();
    console.log(`当前image_assets表中有 ${count} 条记录`);
    
    if (count === 0) {
      console.log('✅ 表中已无数据，无需清空');
      return;
    }
    
    // 确认操作
    console.log('⚠️  即将清空image_assets表的所有数据！');
    console.log('此操作不可逆，请确认是否继续...');
    
    // 执行清空操作
    console.log('🗑️  开始清空数据...');
    await ImageAsset.destroy({
      where: {},
      truncate: true
    });
    
    console.log('✅ image_assets表数据已清空');
    
    // 验证清空结果
    const newCount = await ImageAsset.count();
    console.log(`清空后记录数: ${newCount}`);
    
    if (newCount === 0) {
      console.log('✅ 数据清空成功！');
    } else {
      console.log('❌ 数据清空可能不完整');
    }
    
  } catch (error) {
    console.error('❌ 清空数据失败:', error.message);
    console.error('详细错误:', error);
  } finally {
    await sequelize.close();
    console.log('🔌 数据库连接已关闭');
  }
}

// 执行清空操作
clearImageAssets();

