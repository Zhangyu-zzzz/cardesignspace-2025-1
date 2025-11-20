#!/usr/bin/env node

/**
 * 添加监控页面
 * 使用: node scripts/add-monitored-page.js
 */

require('dotenv').config({ path: '../.env' });
const { MonitoredPage } = require('../src/models/mysql');
const { sequelize } = require('../src/config/mysql');

async function addPage() {
  try {
    // 测试数据库连接
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');

    // 创建监控页面
    const page = await MonitoredPage.create({
      url: 'https://www.motor1.com/news/category/concept-car/',
      name: 'Motor1 - 概念车新闻',
      selector: '.article-item, .news-item, article', // 文章容器选择器
      imageSelector: 'img', // 图片选择器
      textSelector: '.article-content, .news-content, .entry-content', // 文字内容选择器
      interval: 21600, // 每6小时抓取一次（适合更新较慢的网站）
      enabled: true,
      config: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7'
        }
      }
    });

    console.log('\n✅ 监控页面创建成功！');
    console.log('\n页面信息:');
    console.log(`  ID: ${page.id}`);
    console.log(`  名称: ${page.name}`);
    console.log(`  URL: ${page.url}`);
    console.log(`  抓取间隔: ${page.interval}秒 (${page.interval / 60}分钟)`);
    console.log(`  状态: ${page.enabled ? '启用' : '禁用'}`);
    console.log('\n💡 提示:');
    console.log('  - 系统会在服务启动时自动开始监控');
    console.log('  - 可以通过 API 手动触发抓取: POST /api/crawler/pages/' + page.id + '/trigger');
    console.log('  - 查看抓取历史: GET /api/crawler/history?pageId=' + page.id);
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ 创建失败:', error.message);
    if (error.name === 'SequelizeUniqueConstraintError') {
      console.error('   提示: 该URL可能已经存在，请检查数据库');
    }
    await sequelize.close();
    process.exit(1);
  }
}

addPage();

