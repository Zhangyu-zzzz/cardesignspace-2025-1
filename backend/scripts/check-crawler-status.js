#!/usr/bin/env node

/**
 * 检查爬虫系统运行状态
 * 使用: node scripts/check-crawler-status.js
 */

require('dotenv').config({ path: '../.env' });
const { MonitoredPage, CrawlHistory } = require('../src/models/mysql');
const { sequelize } = require('../src/config/mysql');

async function checkStatus() {
  try {
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功\n');

    // 检查监控页面
    const pages = await MonitoredPage.findAll({
      where: { enabled: true },
      order: [['id', 'ASC']]
    });

    console.log(`📋 监控页面状态 (共 ${pages.length} 个):\n`);
    
    for (const page of pages) {
      const lastCrawled = page.lastCrawledAt ? 
        new Date(page.lastCrawledAt).toLocaleString('zh-CN') : 
        '从未抓取';
      
      const nextCrawl = page.lastCrawledAt ? 
        new Date(new Date(page.lastCrawledAt).getTime() + page.interval * 1000).toLocaleString('zh-CN') :
        '立即';
      
      console.log(`  ID: ${page.id}`);
      console.log(`  名称: ${page.name}`);
      console.log(`  URL: ${page.url}`);
      console.log(`  状态: ${page.enabled ? '✅ 启用' : '❌ 禁用'}`);
      console.log(`  抓取间隔: ${page.interval}秒 (${page.interval / 3600}小时)`);
      console.log(`  最后抓取: ${lastCrawled}`);
      console.log(`  下次抓取: ${nextCrawl}`);
      
      // 获取最近的抓取历史
      const recentHistory = await CrawlHistory.findAll({
        where: { pageId: page.id },
        order: [['createdAt', 'DESC']],
        limit: 3
      });
      
      if (recentHistory.length > 0) {
        console.log(`  最近抓取记录:`);
        recentHistory.forEach(h => {
          const status = h.status === 'success' ? '✅' : 
                        h.status === 'failed' ? '❌' : '⏸️';
          console.log(`    ${status} ${new Date(h.createdAt).toLocaleString('zh-CN')} - 发现:${h.itemsFound} 上传:${h.itemsUploaded}`);
        });
      } else {
        console.log(`  抓取记录: 暂无`);
      }
      
      console.log('');
    }

    // 统计信息
    const totalHistory = await CrawlHistory.count();
    const successHistory = await CrawlHistory.count({ where: { status: 'success' } });
    const failedHistory = await CrawlHistory.count({ where: { status: 'failed' } });
    
    console.log('📊 总体统计:');
    console.log(`  总抓取次数: ${totalHistory}`);
    console.log(`  成功: ${successHistory}`);
    console.log(`  失败: ${failedHistory}`);
    console.log(`  无变化: ${totalHistory - successHistory - failedHistory}`);
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ 检查失败:', error.message);
    await sequelize.close();
    process.exit(1);
  }
}

checkStatus();




