const axios = require('axios');
const logger = require('../config/logger');

/**
 * 翻译服务 - 将英文内容翻译成中文
 */
class TranslationService {
  constructor() {
    // 使用免费的Google翻译API（无需API密钥）
    this.translateUrl = 'https://translate.googleapis.com/translate_a/single';
  }

  /**
   * 检测语言
   * @param {string} text - 文本内容
   * @returns {Promise<string>} 语言代码
   */
  async detectLanguage(text) {
    try {
      if (!text || text.trim().length === 0) {
        return 'zh';
      }

      // 简单检测：如果包含中文字符，认为是中文
      const chineseRegex = /[\u4e00-\u9fa5]/;
      if (chineseRegex.test(text)) {
        return 'zh';
      }

      // 否则认为是英文
      return 'en';
    } catch (error) {
      logger.error('检测语言失败:', error);
      return 'en';
    }
  }

  /**
   * 翻译文本
   * @param {string} text - 要翻译的文本
   * @param {string} from - 源语言（默认自动检测）
   * @param {string} to - 目标语言（默认中文）
   * @returns {Promise<string>} 翻译后的文本
   */
  async translate(text, from = 'auto', to = 'zh') {
    try {
      if (!text || text.trim().length === 0) {
        return text;
      }

      // 如果源语言是auto，先检测语言
      if (from === 'auto') {
        from = await this.detectLanguage(text);
      }

      // 如果已经是中文，直接返回
      if (from === 'zh' || from === 'zh-CN') {
        return text;
      }

      // 如果文本太长，截取前5000字符
      const textToTranslate = text.length > 5000 ? text.substring(0, 5000) : text;

      const response = await axios.get(this.translateUrl, {
        params: {
          client: 'gtx',
          sl: from,
          tl: to,
          dt: 't',
          q: textToTranslate
        },
        timeout: 10000
      });

      if (response.data && response.data[0] && response.data[0][0]) {
        const translated = response.data[0]
          .map(item => item[0])
          .filter(Boolean)
          .join('');

        logger.info(`翻译完成: ${text.substring(0, 50)}... -> ${translated.substring(0, 50)}...`);
        return translated || text;
      }

      return text;
    } catch (error) {
      logger.error('翻译失败:', error.message);
      // 翻译失败时返回原文
      return text;
    }
  }

  /**
   * 批量翻译
   * @param {Array<string>} texts - 要翻译的文本数组
   * @param {string} from - 源语言
   * @param {string} to - 目标语言
   * @returns {Promise<Array<string>>} 翻译后的文本数组
   */
  async translateBatch(texts, from = 'auto', to = 'zh') {
    try {
      const results = [];
      for (const text of texts) {
        const translated = await this.translate(text, from, to);
        results.push(translated);
        // 避免请求过快
        await this.sleep(200);
      }
      return results;
    } catch (error) {
      logger.error('批量翻译失败:', error);
      return texts;
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

module.exports = new TranslationService();




