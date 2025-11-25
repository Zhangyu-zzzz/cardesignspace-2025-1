const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');
const logger = require('../config/logger');

/**
 * 爬虫服务 - 负责抓取网页内容
 */
class CrawlerService {
  /**
   * 抓取网页内容
   * @param {string} url - 目标URL
   * @param {object} config - 配置选项
   * @returns {Promise<object>} 抓取结果
   */
  async crawlPage(url, config = {}) {
    try {
      const {
        headers = {},
        timeout = 30000,
        userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      } = config;

      logger.info(`开始抓取网页: ${url}`);

      const response = await axios.get(url, {
        headers: {
          'User-Agent': userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          ...headers
        },
        timeout,
        maxRedirects: 5,
        validateStatus: (status) => status < 500
      });

      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = response.data;
      const $ = cheerio.load(html);
      
      // 计算内容哈希
      const contentHash = this.calculateHash(html);

      logger.info(`网页抓取成功: ${url}, 内容大小: ${html.length} 字节`);

      return {
        success: true,
        html,
        $,
        contentHash,
        url: response.request.res.responseUrl || url,
        statusCode: response.status
      };
    } catch (error) {
      logger.error(`抓取网页失败: ${url}`, error.message);
      return {
        success: false,
        error: error.message,
        url
      };
    }
  }

  /**
   * 计算内容哈希值
   * @param {string} content - 内容
   * @returns {string} 哈希值
   */
  calculateHash(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * 检查内容是否有更新
   * @param {string} newHash - 新的哈希值
   * @param {string} oldHash - 旧的哈希值
   * @returns {boolean} 是否有更新
   */
  hasContentChanged(newHash, oldHash) {
    return newHash !== oldHash;
  }
}

module.exports = new CrawlerService();




