/**
 * 搜索功能数据表安装脚本
 * 自动创建 search_history 和 search_stats 表
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || '49.235.98.5',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'Jason',
  password: process.env.DB_PASSWORD || 'Jason123456!',
  database: process.env.DB_NAME || 'cardesignspace',
  charset: 'utf8mb4'
};

async function installSearchTables() {
  let connection;
  
  try {
    console.log('🔌 正在连接数据库...');
    console.log(`   主机: ${dbConfig.host}`);
    console.log(`   数据库: ${dbConfig.database}`);
    
    // 创建数据库连接
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ 数据库连接成功！\n');
    
    // 读取SQL文件
    const sqlFilePath = path.join(__dirname, '../src/sql/create_search_history.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // 分割SQL语句（按分号和DELIMITER）
    const statements = sqlContent
      .split(/DELIMITER\s+\/\/|DELIMITER\s+;/g)
      .map(block => block.trim())
      .filter(block => block.length > 0);
    
    console.log('📝 开始创建数据表...\n');
    
    // 1. 创建 search_history 表
    console.log('1️⃣  创建 search_history 表...');
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS \`search_history\` (
          \`id\` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
          \`user_id\` INT NULL COMMENT '用户ID（如果已登录）',
          \`session_id\` VARCHAR(255) NULL COMMENT '会话ID（未登录用户识别）',
          \`query\` VARCHAR(500) NOT NULL COMMENT '搜索关键词',
          \`translated_query\` VARCHAR(500) NULL COMMENT '翻译后的查询',
          \`brand_id\` INT NULL COMMENT '识别到的品牌ID',
          \`results_count\` INT DEFAULT 0 COMMENT '返回结果数量',
          \`search_type\` ENUM('smart', 'normal', 'tag') DEFAULT 'smart' COMMENT '搜索类型',
          \`ip_address\` VARCHAR(45) NULL COMMENT 'IP地址',
          \`user_agent\` VARCHAR(500) NULL COMMENT '用户代理',
          \`referrer\` VARCHAR(500) NULL COMMENT '来源页面',
          \`device_type\` VARCHAR(50) NULL COMMENT '设备类型',
          \`search_duration_ms\` INT NULL COMMENT '搜索耗时（毫秒）',
          \`is_successful\` BOOLEAN DEFAULT TRUE COMMENT '搜索是否成功',
          \`error_message\` TEXT NULL COMMENT '错误信息',
          \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '搜索时间',
          PRIMARY KEY (\`id\`),
          INDEX \`idx_user_id\` (\`user_id\`),
          INDEX \`idx_session_id\` (\`session_id\`),
          INDEX \`idx_query\` (\`query\`(191)),
          INDEX \`idx_brand_id\` (\`brand_id\`),
          INDEX \`idx_search_type\` (\`search_type\`),
          INDEX \`idx_created_at\` (\`created_at\`),
          INDEX \`idx_ip_address\` (\`ip_address\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='搜索历史记录表'
      `);
      console.log('   ✅ search_history 表创建成功');
    } catch (error) {
      if (error.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('   ℹ️  search_history 表已存在');
      } else {
        throw error;
      }
    }
    
    // 2. 创建 search_stats 表
    console.log('2️⃣  创建 search_stats 表...');
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS \`search_stats\` (
          \`id\` INT NOT NULL AUTO_INCREMENT,
          \`query\` VARCHAR(255) NOT NULL COMMENT '搜索关键词',
          \`count\` INT NOT NULL DEFAULT 1 COMMENT '搜索次数',
          \`last_searched_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '最后搜索时间',
          \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`unique_query\` (\`query\`),
          KEY \`idx_count\` (\`count\`),
          KEY \`idx_last_searched_at\` (\`last_searched_at\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='搜索统计表'
      `);
      console.log('   ✅ search_stats 表创建成功');
    } catch (error) {
      if (error.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('   ℹ️  search_stats 表已存在');
      } else {
        throw error;
      }
    }
    
    // 3. 创建视图
    console.log('3️⃣  创建分析视图...');
    try {
      await connection.query(`
        CREATE OR REPLACE VIEW \`v_popular_searches_30d\` AS
        SELECT 
          query,
          COUNT(*) as search_count,
          COUNT(DISTINCT user_id) as unique_users,
          MAX(created_at) as last_searched,
          AVG(results_count) as avg_results,
          SUM(CASE WHEN is_successful = 1 THEN 1 ELSE 0 END) as successful_searches
        FROM search_history
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY query
        ORDER BY search_count DESC
        LIMIT 100
      `);
      console.log('   ✅ v_popular_searches_30d 视图创建成功');
    } catch (error) {
      console.log('   ⚠️  视图创建失败（可能不支持），跳过...');
    }
    
    console.log('\n🎉 搜索功能表安装完成！\n');
    
    // 验证安装
    console.log('🔍 验证安装结果...\n');
    
    const [tables] = await connection.query(`
      SELECT TABLE_NAME, TABLE_ROWS, CREATE_TIME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME IN ('search_history', 'search_stats')
      ORDER BY TABLE_NAME
    `, [dbConfig.database]);
    
    console.log('📊 已创建的表:');
    tables.forEach(table => {
      console.log(`   ✓ ${table.TABLE_NAME} (${table.TABLE_ROWS} 行)`);
    });
    
    const [views] = await connection.query(`
      SELECT TABLE_NAME 
      FROM information_schema.VIEWS 
      WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME LIKE 'v_%search%'
      ORDER BY TABLE_NAME
    `, [dbConfig.database]);
    
    if (views.length > 0) {
      console.log('\n📊 已创建的视图:');
      views.forEach(view => {
        console.log(`   ✓ ${view.TABLE_NAME}`);
      });
    }
    
    // 插入测试数据
    console.log('\n🧪 插入测试数据...');
    await connection.query(`
      INSERT IGNORE INTO search_stats (query, count) 
      VALUES 
        ('红色跑车', 5),
        ('奔驰SUV', 8),
        ('蓝色轿车', 3),
        ('BMW概念车', 12)
    `);
    console.log('✅ 测试数据已插入\n');
    
    console.log('✨ 所有操作完成！可以开始使用搜索统计功能了。\n');
    
  } catch (error) {
    console.error('\n❌ 安装失败:', error.message);
    console.error('详细错误:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 数据库连接已关闭');
    }
  }
}

// 执行安装
installSearchTables().catch(error => {
  console.error('💥 脚本执行失败:', error);
  process.exit(1);
});

