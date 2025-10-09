const mysql = require('mysql2/promise');

async function checkTags() {
  let connection;
  
  try {
    console.log('🔍 检查数据库中的标签...');
    
    connection = await mysql.createConnection({
      host: '49.235.98.5',
      port: 3306,
      user: 'Jason',
      password: 'Jason123456!',
      database: 'cardesignspace'
    });
    
    console.log('✅ 数据库连接成功');
    
    // 检查图片346519的标签
    const [rows] = await connection.execute(
      'SELECT id, tags, updatedAt FROM images WHERE id = 346519'
    );
    
    if (rows.length === 0) {
      console.log('❌ 未找到图片ID 346519');
      return;
    }
    
    const image = rows[0];
    console.log('📊 图片标签信息:', {
      id: image.id,
      tags: image.tags,
      updatedAt: image.updatedAt
    });
    
    // 检查最近更新的几张图片
    const [recentRows] = await connection.execute(
      'SELECT id, tags, updatedAt FROM images ORDER BY updatedAt DESC LIMIT 5'
    );
    
    console.log('📊 最近更新的图片:');
    recentRows.forEach((img, index) => {
      console.log(`  ${index + 1}. ID: ${img.id}, 标签: ${JSON.stringify(img.tags)}, 更新时间: ${img.updatedAt}`);
    });
    
  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 数据库连接已关闭');
    }
  }
}

checkTags();
