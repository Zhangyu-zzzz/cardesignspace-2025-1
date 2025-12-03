#!/usr/bin/env node

/**
 * 查看抓取到的图片
 * 使用: node scripts/view-crawled-images.js [pageId]
 */

require('dotenv').config({ path: '../.env' });
const { MonitoredPage, CrawlHistory } = require('../src/models/mysql');
const { sequelize } = require('../src/config/mysql');
const crawlerService = require('../src/services/crawlerService');
const contentParser = require('../src/services/contentParser');

async function viewImages() {
  try {
    const pageId = parseInt(process.argv[2]) || 1;
    
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功\n');

    const page = await MonitoredPage.findByPk(pageId);
    if (!page) {
      console.error(`❌ 页面ID ${pageId} 不存在`);
      await sequelize.close();
      process.exit(1);
    }

    console.log(`📋 监控页面: ${page.name}`);
    console.log(`   URL: ${page.url}\n`);

    // 获取最近的抓取历史
    const history = await CrawlHistory.findOne({
      where: { pageId },
      order: [['createdAt', 'DESC']]
    });

    if (!history) {
      console.log('❌ 还没有抓取记录');
      await sequelize.close();
      process.exit(0);
    }

    console.log(`📅 最近抓取: ${new Date(history.createdAt).toLocaleString('zh-CN')}`);
    console.log(`   状态: ${history.status}`);
    console.log(`   发现图片: ${history.itemsFound} 张`);
    console.log(`   上传图片: ${history.itemsUploaded} 张\n`);

    // 如果metadata中有图片信息，直接显示
    if (history.metadata && history.metadata.images) {
      console.log('🖼️  发现的图片:');
      history.metadata.images.forEach((img, i) => {
        console.log(`\n  ${i + 1}. ${img.url}`);
        if (img.alt) console.log(`     Alt: ${img.alt}`);
        if (img.title) console.log(`     Title: ${img.title}`);
        if (img.width) console.log(`     尺寸: ${img.width}x${img.height || '?'}`);
      });
    } else {
      // 重新抓取并显示图片
      console.log('🔄 重新抓取页面以获取图片列表...\n');
      
      const crawlResult = await crawlerService.crawlPage(page.url, page.config || {});
      if (!crawlResult.success) {
        console.error('❌ 抓取失败:', crawlResult.error);
        await sequelize.close();
        process.exit(1);
      }

      const parseResult = await contentParser.parseContent(
        crawlResult.$,
        {
          textSelector: page.textSelector,
          imageSelector: page.imageSelector,
          titleSelector: page.selector
        },
        crawlResult.url
      );

      if (parseResult.success && parseResult.images.length > 0) {
        console.log(`🖼️  发现 ${parseResult.images.length} 张图片:\n`);
        parseResult.images.forEach((img, i) => {
          console.log(`  ${i + 1}. ${img.url}`);
          if (img.alt) console.log(`     Alt: ${img.alt}`);
          if (img.title) console.log(`     Title: ${img.title}`);
          if (img.width) console.log(`     尺寸: ${img.width}x${img.height || '?'}`);
        });
      } else {
        console.log('❌ 没有找到图片');
      }
    }

    // 显示识别结果
    if (history.metadata && history.metadata.identified) {
      const identified = history.metadata.identified;
      console.log('\n🔍 识别结果:');
      console.log(`   置信度: ${(identified.confidence * 100).toFixed(1)}%`);
      console.log(`   品牌: ${identified.brand?.name || identified.brand || '未识别'}`);
      console.log(`   车型: ${identified.modelName || '未识别'}`);
      console.log(`   类型: ${identified.type || '未识别'}`);
      console.log(`   年份: ${identified.year || '未识别'}`);
      
      if (identified.confidence < 0.5) {
        console.log('\n⚠️  置信度低于0.5，因此没有自动上传');
      }
    }

    // 显示上传结果
    if (history.metadata && history.metadata.uploaded) {
      const uploaded = history.metadata.uploaded;
      console.log('\n📤 上传结果:');
      if (uploaded.uploadedImages && uploaded.uploadedImages.length > 0) {
        console.log(`   ✅ 成功上传 ${uploaded.uploadedImages.length} 张:`);
        uploaded.uploadedImages.forEach((img, i) => {
          console.log(`      ${i + 1}. ${img.url}`);
        });
      }
      if (uploaded.failedImages && uploaded.failedImages.length > 0) {
        console.log(`   ❌ 失败 ${uploaded.failedImages.length} 张:`);
        uploaded.failedImages.forEach((img, i) => {
          console.log(`      ${i + 1}. ${img.url}`);
          console.log(`         原因: ${img.error}`);
        });
      }
    }

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ 查看失败:', error.message);
    console.error(error.stack);
    await sequelize.close();
    process.exit(1);
  }
}

viewImages();






