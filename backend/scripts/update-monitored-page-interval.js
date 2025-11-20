#!/usr/bin/env node

/**
 * 更新监控页面的抓取间隔
 * 使用: node scripts/update-monitored-page-interval.js [pageId] [intervalSeconds]
 */

require('dotenv').config({ path: '../.env' });
const { MonitoredPage } = require('../src/models/mysql');
const { sequelize } = require('../src/config/mysql');

async function updateInterval() {
  try {
    const pageId = process.argv[2] || 1;
    const interval = parseInt(process.argv[3]) || 21600; // 默认6小时

    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');

    const page = await MonitoredPage.findByPk(pageId);
    if (!page) {
      console.error(`❌ 页面ID ${pageId} 不存在`);
      process.exit(1);
    }

    await page.update({ interval });
    
    console.log('\n✅ 更新成功！');
    console.log(`  页面: ${page.name}`);
    console.log(`  新间隔: ${interval}秒 (${interval / 3600}小时)`);
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ 更新失败:', error.message);
    await sequelize.close();
    process.exit(1);
  }
}

updateInterval();


