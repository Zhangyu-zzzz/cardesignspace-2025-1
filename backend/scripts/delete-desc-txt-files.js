const { sequelize } = require('../src/config/mysql');
const { QueryTypes } = require('sequelize');

async function deleteDescTxtFiles() {
  try {
    console.log('开始删除desc.txt文件记录...');
    
    // 首先统计要删除的记录数量
    const countResult = await sequelize.query(
      'SELECT COUNT(*) as count FROM images WHERE filename LIKE "%desc.txt%" OR url LIKE "%desc.txt%"',
      { type: QueryTypes.SELECT }
    );
    
    const totalCount = countResult[0].count;
    console.log(`发现 ${totalCount} 个desc.txt文件记录需要删除`);
    
    if (totalCount === 0) {
      console.log('没有找到需要删除的desc.txt文件记录');
      await sequelize.close();
      return;
    }
    
    // 确认删除操作
    console.log('\n⚠️  警告：此操作将永久删除所有desc.txt文件记录！');
    console.log('这些记录包括：');
    console.log('- 文件名包含"desc.txt"的记录');
    console.log('- URL包含"desc.txt"的记录');
    
    // 显示一些示例记录
    const sampleRecords = await sequelize.query(
      'SELECT id, filename, url, title FROM images WHERE filename LIKE "%desc.txt%" OR url LIKE "%desc.txt%" LIMIT 5',
      { type: QueryTypes.SELECT }
    );
    
    console.log('\n示例记录：');
    sampleRecords.forEach(record => {
      console.log(`  ID: ${record.id}, 文件名: ${record.filename}, 标题: ${record.title}`);
    });
    
    // 执行删除操作
    console.log('\n开始执行删除操作...');
    
    const deleteResult = await sequelize.query(
      'DELETE FROM images WHERE filename LIKE "%desc.txt%" OR url LIKE "%desc.txt%"',
      { type: QueryTypes.DELETE }
    );
    
    console.log(`✅ 成功删除 ${totalCount} 个desc.txt文件记录`);
    
    // 验证删除结果
    const remainingCount = await sequelize.query(
      'SELECT COUNT(*) as count FROM images WHERE filename LIKE "%desc.txt%" OR url LIKE "%desc.txt%"',
      { type: QueryTypes.SELECT }
    );
    
    console.log(`验证：剩余desc.txt文件记录数量: ${remainingCount[0].count}`);
    
    if (remainingCount[0].count === 0) {
      console.log('🎉 所有desc.txt文件记录已成功删除！');
    } else {
      console.log('⚠️  仍有部分desc.txt文件记录未删除，请检查');
    }
    
    await sequelize.close();
    console.log('\n删除操作完成！');
    
  } catch (error) {
    console.error('❌ 删除操作失败:', error);
    await sequelize.close();
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  deleteDescTxtFiles();
}

module.exports = deleteDescTxtFiles;
