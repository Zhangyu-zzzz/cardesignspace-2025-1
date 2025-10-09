#!/usr/bin/env node

/**
 * 检查cardesignspace数据库中所有表的数据量
 */

const { sequelize } = require('../src/config/mysql');

async function checkAllTables() {
  try {
    console.log('🔌 连接数据库...');
    
    // 测试连接
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');
    
    // 获取所有表名
    console.log('📋 获取所有表...');
    const [tables] = await sequelize.query("SHOW TABLES");
    
    console.log(`\n📊 数据库表统计 (共 ${tables.length} 个表):`);
    console.log('=' * 50);
    
    for (const table of tables) {
      const tableName = Object.values(table)[0];
      
      try {
        const [countResult] = await sequelize.query(`SELECT COUNT(*) as count FROM \`${tableName}\``);
        const count = countResult[0].count;
        
        console.log(`${tableName.padEnd(30)} : ${count.toLocaleString().padStart(10)} 条记录`);
        
        // 如果是image_assets表，显示详细信息
        if (tableName === 'image_assets' && count > 0) {
          const [variantStats] = await sequelize.query(`
            SELECT variant, COUNT(*) as count 
            FROM image_assets 
            GROUP BY variant 
            ORDER BY count DESC
          `);
          
          console.log('    变体类型统计:');
          variantStats.forEach(stat => {
            console.log(`      ${stat.variant}: ${stat.count.toLocaleString()} 条`);
          });
        }
        
      } catch (error) {
        console.log(`${tableName.padEnd(30)} : 查询失败 - ${error.message}`);
      }
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
checkAllTables();

