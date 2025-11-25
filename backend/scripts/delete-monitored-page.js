#!/usr/bin/env node

/**
 * 删除监控页面
 * 使用: node scripts/delete-monitored-page.js [pageId]
 */

require('dotenv').config({ path: '../.env' });
const { MonitoredPage } = require('../src/models/mysql');
const { sequelize } = require('../src/config/mysql');

async function deletePage() {
  try {
    const pageId = parseInt(process.argv[2]);
    
    if (!pageId) {
      console.error('❌ 请提供页面ID');
      console.log('使用: node scripts/delete-monitored-page.js [pageId]');
      process.exit(1);
    }

    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');

    const page = await MonitoredPage.findByPk(pageId);
    if (!page) {
      console.error(`❌ 页面ID ${pageId} 不存在`);
      await sequelize.close();
      process.exit(1);
    }

    console.log(`\n找到监控页面:`);
    console.log(`  ID: ${page.id}`);
    console.log(`  名称: ${page.name}`);
    console.log(`  URL: ${page.url}`);
    console.log(`  间隔: ${page.interval}秒`);

    await page.destroy();
    
    console.log('\n✅ 删除成功！');
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ 删除失败:', error.message);
    await sequelize.close();
    process.exit(1);
  }
}

deletePage();




