#!/usr/bin/env node

/**
 * 生成HTML页面查看抓取到的图片
 * 使用: node scripts/view-images-html.js [pageId]
 */

require('dotenv').config({ path: '../.env' });
const { MonitoredPage, CrawlHistory } = require('../src/models/mysql');
const { sequelize } = require('../src/config/mysql');
const crawlerService = require('../src/services/crawlerService');
const contentParser = require('../src/services/contentParser');
const fs = require('fs');
const path = require('path');

async function generateHTML() {
  try {
    const pageId = parseInt(process.argv[2]) || 1;
    
    await sequelize.authenticate();

    const page = await MonitoredPage.findByPk(pageId);
    if (!page) {
      console.error(`❌ 页面ID ${pageId} 不存在`);
      await sequelize.close();
      process.exit(1);
    }

    // 重新抓取获取最新图片
    console.log('🔄 抓取页面获取图片...');
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

    if (!parseResult.success || parseResult.images.length === 0) {
      console.log('❌ 没有找到图片');
      await sequelize.close();
      process.exit(0);
    }

    // 生成HTML
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>抓取到的图片 - ${page.name}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        h1 {
            color: #333;
            border-bottom: 3px solid #4CAF50;
            padding-bottom: 10px;
        }
        .info {
            background: white;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .image-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
        }
        .image-card {
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            transition: transform 0.2s;
        }
        .image-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .image-card img {
            width: 100%;
            height: 200px;
            object-fit: cover;
            cursor: pointer;
        }
        .image-card .info {
            padding: 15px;
            margin: 0;
        }
        .image-card .url {
            font-size: 12px;
            color: #666;
            word-break: break-all;
            margin-top: 10px;
        }
        .image-card .alt {
            font-weight: bold;
            color: #333;
            margin-bottom: 5px;
        }
        .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.9);
            cursor: pointer;
        }
        .modal-content {
            margin: auto;
            display: block;
            max-width: 90%;
            max-height: 90%;
            margin-top: 50px;
        }
        .close {
            position: absolute;
            top: 15px;
            right: 35px;
            color: #f1f1f1;
            font-size: 40px;
            font-weight: bold;
            cursor: pointer;
        }
        .stats {
            display: flex;
            gap: 20px;
            margin-top: 10px;
        }
        .stat {
            padding: 8px 15px;
            background: #4CAF50;
            color: white;
            border-radius: 4px;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <h1>🖼️ 抓取到的图片</h1>
    
    <div class="info">
        <h2>${page.name}</h2>
        <p><strong>URL:</strong> <a href="${page.url}" target="_blank">${page.url}</a></p>
        <p><strong>抓取时间:</strong> ${new Date().toLocaleString('zh-CN')}</p>
        <div class="stats">
            <div class="stat">发现图片: ${parseResult.images.length} 张</div>
        </div>
    </div>

    <div class="image-grid">
${parseResult.images.map((img, i) => `
        <div class="image-card">
            <img src="${img.url}" alt="${img.alt || ''}" onclick="openModal('${img.url}')" 
                 onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27200%27 height=%27200%27%3E%3Ctext x=%2750%25%27 y=%2750%25%27 text-anchor=%27middle%27 dy=%27.3em%27%3E图片加载失败%3C/text%3E%3C/svg%3E'">
            <div class="info">
                <div class="alt">${img.alt || '无标题'}</div>
                ${img.title ? `<div style="color: #666; font-size: 14px; margin-top: 5px;">${img.title}</div>` : ''}
                ${img.width ? `<div style="color: #999; font-size: 12px; margin-top: 5px;">尺寸: ${img.width}x${img.height || '?'}</div>` : ''}
                <div class="url">${img.url}</div>
            </div>
        </div>
`).join('')}
    </div>

    <div id="modal" class="modal" onclick="closeModal()">
        <span class="close">&times;</span>
        <img class="modal-content" id="modalImg">
    </div>

    <script>
        function openModal(url) {
            const modal = document.getElementById('modal');
            const modalImg = document.getElementById('modalImg');
            modal.style.display = 'block';
            modalImg.src = url;
        }

        function closeModal() {
            document.getElementById('modal').style.display = 'none';
        }

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeModal();
            }
        });
    </script>
</body>
</html>`;

    // 保存HTML文件
    const outputPath = path.join(__dirname, '../crawled-images.html');
    fs.writeFileSync(outputPath, html, 'utf8');
    
    console.log(`\n✅ HTML文件已生成！`);
    console.log(`📁 文件位置: ${outputPath}`);
    console.log(`🌐 在浏览器中打开: file://${outputPath}`);
    console.log(`\n📊 统计:`);
    console.log(`   发现图片: ${parseResult.images.length} 张`);
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ 生成失败:', error.message);
    console.error(error.stack);
    await sequelize.close();
    process.exit(1);
  }
}

generateHTML();




