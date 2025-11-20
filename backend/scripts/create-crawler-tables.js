#!/usr/bin/env node

/**
 * 创建爬虫相关的数据库表
 * 运行: node scripts/create-crawler-tables.js
 */

require('dotenv').config({ path: '../.env' });
const { sequelize } = require('../src/config/mysql');

async function createTables() {
  try {
    console.log('开始创建爬虫相关表...');

    // 创建监控页面表
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS monitored_pages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        url VARCHAR(500) NOT NULL COMMENT '监控的网页URL',
        name VARCHAR(200) NOT NULL COMMENT '网页名称/描述',
        selector TEXT COMMENT '内容选择器（CSS选择器或XPath）',
        imageSelector TEXT COMMENT '图片选择器',
        textSelector TEXT COMMENT '文字内容选择器',
        enabled BOOLEAN DEFAULT TRUE COMMENT '是否启用监控',
        \`interval\` INT DEFAULT 3600 COMMENT '抓取间隔（秒）',
        lastCrawledAt DATETIME COMMENT '最后抓取时间',
        lastContentHash VARCHAR(64) COMMENT '最后内容哈希值（用于检测更新）',
        config JSON COMMENT '额外配置（headers, cookies等）',
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_enabled (enabled),
        INDEX idx_url (url)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='监控页面表';
    `);

    // 创建抓取历史表
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS crawl_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        pageId INT NOT NULL COMMENT '监控页面ID',
        status ENUM('success', 'failed', 'no_change') DEFAULT 'success' COMMENT '抓取状态',
        itemsFound INT DEFAULT 0 COMMENT '发现的新内容数量',
        itemsUploaded INT DEFAULT 0 COMMENT '成功上传的数量',
        errorMessage TEXT COMMENT '错误信息',
        contentHash VARCHAR(64) COMMENT '内容哈希值',
        metadata JSON COMMENT '额外元数据',
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_pageId (pageId),
        INDEX idx_status (status),
        INDEX idx_createdAt (createdAt),
        FOREIGN KEY (pageId) REFERENCES monitored_pages(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='抓取历史表';
    `);

    console.log('✅ 爬虫相关表创建成功！');
    process.exit(0);
  } catch (error) {
    console.error('❌ 创建表失败:', error);
    process.exit(1);
  }
}

createTables();

