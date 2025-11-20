const cron = require('node-cron');
const { MonitoredPage, CrawlHistory } = require('../models/mysql');
const crawlerService = require('./crawlerService');
const contentParser = require('./contentParser');
const modelIdentifier = require('./modelIdentifier');
const autoUploadService = require('./autoUploadService');
const translationService = require('./translationService');
const articleCrawlerService = require('./articleCrawlerService');
const logger = require('../config/logger');

/**
 * 定时任务调度器 - 定期执行爬虫任务
 */
class SchedulerService {
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
  }

  /**
   * 启动调度器
   */
  async start() {
    if (this.isRunning) {
      logger.warn('调度器已经在运行中');
      return;
    }

    this.isRunning = true;
    logger.info('🚀 启动爬虫调度器...');

    // 加载所有启用的监控页面
    await this.loadMonitoredPages();

    // 每10分钟检查一次是否有需要执行的任务（对于更新较慢的网站，不需要每分钟检查）
    cron.schedule('*/10 * * * *', async () => {
      await this.checkAndRunTasks();
    });

    logger.info('✅ 爬虫调度器已启动');
  }

  /**
   * 停止调度器
   */
  stop() {
    this.isRunning = false;
    this.jobs.forEach((job, pageId) => {
      job.destroy();
      logger.info(`停止任务: 页面ID ${pageId}`);
    });
    this.jobs.clear();
    logger.info('⏹️  爬虫调度器已停止');
  }

  /**
   * 加载所有启用的监控页面
   */
  async loadMonitoredPages() {
    try {
      const pages = await MonitoredPage.findAll({
        where: { enabled: true }
      });

      logger.info(`加载了 ${pages.length} 个监控页面`);

      for (const page of pages) {
        await this.schedulePage(page);
      }
    } catch (error) {
      logger.error('加载监控页面失败:', error);
    }
  }

  /**
   * 为页面创建定时任务
   * @param {object} page - 监控页面对象
   */
  async schedulePage(page) {
    try {
      // 如果已有任务，先停止
      if (this.jobs.has(page.id)) {
        this.jobs.get(page.id).destroy();
      }

      // 计算cron表达式（基于interval秒数）
      const cronExpression = this.intervalToCron(page.interval);

      // 创建定时任务
      const job = cron.schedule(cronExpression, async () => {
        await this.crawlPage(page);
      }, {
        scheduled: true,
        timezone: 'Asia/Shanghai'
      });

      this.jobs.set(page.id, job);
      logger.info(`已为页面 "${page.name}" 创建定时任务 (间隔: ${page.interval}秒)`);
    } catch (error) {
      logger.error(`为页面创建定时任务失败: ${page.name}`, error);
    }
  }

  /**
   * 将间隔秒数转换为cron表达式
   * @param {number} intervalSeconds - 间隔秒数
   * @returns {string} cron表达式
   */
  intervalToCron(intervalSeconds) {
    if (intervalSeconds < 60) {
      // 小于60秒，每分钟执行
      return '* * * * *';
    } else if (intervalSeconds < 3600) {
      // 小于1小时，按分钟执行
      const minutes = Math.floor(intervalSeconds / 60);
      return `*/${minutes} * * * *`;
    } else if (intervalSeconds < 86400) {
      // 小于1天，按小时执行
      const hours = Math.floor(intervalSeconds / 3600);
      return `0 */${hours} * * *`;
    } else {
      // 大于等于1天，每天执行
      const days = Math.floor(intervalSeconds / 86400);
      return `0 0 */${days} * *`;
    }
  }

  /**
   * 检查并执行任务
   */
  async checkAndRunTasks() {
    try {
      // 确保数据库连接正常
      const { sequelize } = require('../config/mysql');
      await sequelize.authenticate();
      
      const pages = await MonitoredPage.findAll({
        where: { enabled: true }
      });

      for (const page of pages) {
        const now = new Date();
        const lastCrawled = page.lastCrawledAt ? new Date(page.lastCrawledAt) : null;
        
        // 检查是否需要抓取
        if (!lastCrawled || (now - lastCrawled) >= page.interval * 1000) {
          await this.crawlPage(page);
        }
      }
    } catch (error) {
      logger.error('检查任务失败:', error);
    }
  }

  /**
   * 抓取单个页面
   * @param {object} page - 监控页面对象
   */
  async crawlPage(page) {
    let history = null;
    const startTime = new Date();

    try {
      logger.info(`开始抓取页面: ${page.name} (${page.url})`);

      // 创建抓取历史记录
      history = await CrawlHistory.create({
        pageId: page.id,
        status: 'success',
        itemsFound: 0,
        itemsUploaded: 0
      });

      // 1. 判断是列表页还是详情页
      const isListPage = page.url.includes('/category/') || 
                         page.url.includes('/news/') && !page.url.match(/\/news\/\d+/);
      
      let parseResult;
      let crawlResult;

      if (isListPage) {
        // 列表页：先抓取文章链接，再进入详情页
        logger.info(`检测到列表页，将进入文章详情页抓取高清图片`);
        
        const articleResult = await articleCrawlerService.crawlArticlesFromList(
          page.url,
          {
            articleSelector: page.articleSelector || page.selector || 'a[href*="/news/"]',
            maxArticles: 10, // 最多抓取10篇文章
            imageSelector: page.imageSelector || 'img',
            textSelector: page.textSelector || 'body',
            titleSelector: 'title, h1, .article-title',
            ...(page.config || {})
          }
        );

        if (!articleResult.success) {
          throw new Error(articleResult.error || '抓取文章失败');
        }

        // 合并所有文章的图片和内容
        const allImages = articleResult.images || [];
        const allText = articleResult.articles.map(a => a.text).join(' ');
        const allTitles = articleResult.articles.map(a => a.title).join(' ');
        const allDescriptions = articleResult.articles.map(a => a.description).filter(Boolean).join(' ');

        parseResult = {
          success: true,
          title: allTitles,
          description: allDescriptions,
          text: allText,
          images: allImages,
          articles: articleResult.articles
        };

        // 使用所有文章的文本计算哈希
        crawlResult = {
          success: true,
          contentHash: crawlerService.calculateHash(allText),
          url: page.url
        };
      } else {
        // 详情页：直接抓取
        crawlResult = await crawlerService.crawlPage(page.url, page.config || {});
        
        if (!crawlResult.success) {
          throw new Error(crawlResult.error || '抓取失败');
        }

        // 2. 检查内容是否有更新
        if (page.lastContentHash && 
            !crawlerService.hasContentChanged(crawlResult.contentHash, page.lastContentHash)) {
          logger.info(`页面内容未更新: ${page.name}`);
          
          await history.update({
            status: 'no_change',
            contentHash: crawlResult.contentHash
          });
          
          await page.update({
            lastCrawledAt: startTime
          });
          
          return;
        }

        // 3. 解析内容
        parseResult = await contentParser.parseContent(
          crawlResult.$,
          {
            textSelector: page.textSelector,
            imageSelector: page.imageSelector,
            titleSelector: page.selector
          },
          crawlResult.url
        );

        if (!parseResult.success) {
          throw new Error(parseResult.error || '解析失败');
        }
      }

      // 4. 识别车型信息
      const identifyResult = await modelIdentifier.identifyModel(
        parseResult.text,
        parseResult.title
      );

      // 5. 翻译内容为中文
      let translatedDescription = parseResult.description || parseResult.text.substring(0, 500);
      if (translatedDescription) {
        translatedDescription = await translationService.translate(translatedDescription);
      }
      
      let translatedTitle = parseResult.title || '';
      if (translatedTitle) {
        translatedTitle = await translationService.translate(translatedTitle);
      }

      // 6. 保存图片信息到metadata（无论是否上传）
      await history.update({
        itemsFound: parseResult.images.length,
        itemsUploaded: 0,
        contentHash: crawlResult.contentHash,
        metadata: {
          identified: identifyResult,
          images: parseResult.images.map(img => ({
            url: img.url,
            alt: img.alt,
            title: img.title,
            width: img.width,
            height: img.height,
            articleUrl: img.articleUrl || null,
            articleTitle: img.articleTitle || null
          })),
          title: parseResult.title,
          description: parseResult.description,
          articles: parseResult.articles || null
        }
      });

      // 7. 如果置信度足够高且车型名称有效，自动上传
      if (identifyResult.confidence >= 0.5 && identifyResult.brand && identifyResult.modelName) {
        // 验证车型名称是否有效（不是纯数字或太短）
        const isValidModelName = identifyResult.modelName && 
                                  identifyResult.modelName.length >= 2 && 
                                  !(/^\d+$/.test(identifyResult.modelName) && identifyResult.modelName.length <= 2);
        
        if (!isValidModelName) {
          logger.warn(`车型名称无效，跳过上传: ${identifyResult.modelName}`);
          await history.update({
            metadata: {
              ...history.metadata,
              reason: 'invalid_model_name',
              modelName: identifyResult.modelName
            }
          });
          return;
        }

        const brandName = identifyResult.brand.name || identifyResult.brand.chineseName;
        
        const uploadResult = await autoUploadService.uploadContent({
          brandName,
          modelName: identifyResult.modelName,
          type: identifyResult.type,
          year: identifyResult.year,
          price: identifyResult.price,
          description: translatedDescription,
          images: parseResult.images.slice(0, 10), // 最多上传10张图片
          title: translatedTitle
        });

        if (uploadResult.success) {
          await history.update({
            itemsFound: parseResult.images.length,
            itemsUploaded: uploadResult.uploadedImages.length,
            contentHash: crawlResult.contentHash,
            metadata: {
              identified: identifyResult,
              uploaded: uploadResult,
              images: parseResult.images.map(img => ({
                url: img.url,
                alt: img.alt,
                title: img.title,
                width: img.width,
                height: img.height,
                articleUrl: img.articleUrl || null,
                articleTitle: img.articleTitle || null
              }))
            }
          });

          logger.info(`✅ 页面抓取并上传成功: ${page.name}, 上传了 ${uploadResult.uploadedImages.length} 张图片`);
        } else {
          logger.warn(`⚠️  页面抓取成功但上传失败: ${page.name}, 错误: ${uploadResult.error}`);
          
          await history.update({
            itemsFound: parseResult.images.length,
            itemsUploaded: 0,
            contentHash: crawlResult.contentHash,
            errorMessage: uploadResult.error,
            metadata: {
              identified: identifyResult
            }
          });
        }
      } else {
        logger.info(`页面内容识别置信度较低: ${page.name}, 置信度: ${identifyResult.confidence}`);
        
        await history.update({
          itemsFound: parseResult.images.length,
          itemsUploaded: 0,
          contentHash: crawlResult.contentHash,
          metadata: {
            identified: identifyResult,
            reason: 'confidence_too_low'
          }
        });
      }

      // 6. 更新页面信息
      await page.update({
        lastCrawledAt: startTime,
        lastContentHash: crawlResult.contentHash
      });

    } catch (error) {
      logger.error(`抓取页面失败: ${page.name}`, error);
      
      if (history) {
        await history.update({
          status: 'failed',
          errorMessage: error.message
        });
      }
    }
  }

  /**
   * 手动触发抓取
   * @param {number} pageId - 页面ID
   */
  async triggerCrawl(pageId) {
    try {
      const page = await MonitoredPage.findByPk(pageId);
      if (!page) {
        throw new Error('页面不存在');
      }

      await this.crawlPage(page);
      return { success: true };
    } catch (error) {
      logger.error(`手动触发抓取失败: ${pageId}`, error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new SchedulerService();

