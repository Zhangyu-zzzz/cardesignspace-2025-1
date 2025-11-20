const crawlerService = require('./crawlerService');
const contentParser = require('./contentParser');
const logger = require('../config/logger');

/**
 * 文章爬虫服务 - 从列表页抓取文章链接，然后进入详情页提取高清图片
 */
class ArticleCrawlerService {
  /**
   * 从列表页抓取文章并提取高清图片
   * @param {string} listUrl - 列表页URL
   * @param {object} config - 配置选项
   * @returns {Promise<object>} 抓取结果
   */
  async crawlArticlesFromList(listUrl, config = {}) {
    try {
      const {
        articleSelector = 'a[href*="/news/"], a[href*="/article/"], .article-link, .news-link',
        maxArticles = 10, // 最多抓取的文章数
        imageSelector = 'img',
        textSelector = 'body',
        titleSelector = 'title, h1, .title'
      } = config;

      logger.info(`开始从列表页抓取文章: ${listUrl}`);

      // 1. 抓取列表页
      const listResult = await crawlerService.crawlPage(listUrl, config);
      if (!listResult.success) {
        throw new Error(listResult.error || '抓取列表页失败');
      }

      // 2. 提取文章链接
      const rawLinks = contentParser.extractArticleLinks(
        listResult.$,
        listUrl,
        articleSelector
      );

      const articleLinks = [];
      const seen = new Set();
      for (const link of rawLinks) {
        if (!link.url) continue;
        const normalized = link.url.split('#')[0];
        if (seen.has(normalized)) continue;
        seen.add(normalized);
        articleLinks.push({
          url: normalized,
          title: link.title
        });
      }

      logger.info(`找到 ${articleLinks.length} 个文章链接，将抓取前 ${Math.min(maxArticles, articleLinks.length)} 个`);

      const allArticles = [];
      const combinedTexts = [];
      const errors = [];

      // 3. 逐个抓取文章详情页
      for (let i = 0; i < Math.min(maxArticles, articleLinks.length); i++) {
        const articleLink = articleLinks[i];
        try {
          logger.info(`[${i + 1}/${Math.min(maxArticles, articleLinks.length)}] 抓取文章: ${articleLink.title || articleLink.url}`);

          // 抓取文章详情页
          const articleResult = await crawlerService.crawlPage(articleLink.url, config);
          if (!articleResult.success) {
            errors.push({ url: articleLink.url, error: articleResult.error });
            continue;
          }

          // 解析文章内容
          const parseResult = await contentParser.parseContent(
            articleResult.$,
            {
              textSelector,
              imageSelector,
              titleSelector
            },
            articleResult.url
          );

          if (parseResult.success) {
            // 只保留高清图片（至少1200px）
            const highResImages = parseResult.images
              .map(img => ({
                ...img,
                articleUrl: articleLink.url
              }))
              .filter(img => {
              // 如果图片有宽度信息，检查是否>=1200
              if (img.width && img.width >= 1200) return true;
              // 如果没有宽度信息，先保留，后续下载时再检查
              return true;
            });

            allArticles.push({
              url: articleLink.url,
              title: parseResult.title || articleLink.title,
              description: parseResult.description,
              text: parseResult.text,
              images: highResImages
            });

            combinedTexts.push(parseResult.text.substring(0, 2000));

            logger.info(`  文章解析完成: 标题=${parseResult.title}, 高清图片=${highResImages.length}张`);
          }

          // 避免请求过快
          await this.sleep(2000);
        } catch (error) {
          logger.error(`抓取文章失败: ${articleLink.url}`, error.message);
          errors.push({ url: articleLink.url, error: error.message });
        }
      }

      logger.info(`文章抓取完成: 成功=${allArticles.length}, 失败=${errors.length}`);

      return {
        success: true,
        articles: allArticles,
        combinedText: combinedTexts.join('\\n\\n'),
        errors,
        totalArticles: articleLinks.length,
        crawledArticles: allArticles.length
      };
    } catch (error) {
      logger.error('从列表页抓取文章失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 休眠函数
   * @param {number} ms - 毫秒数
   * @returns {Promise}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new ArticleCrawlerService();

