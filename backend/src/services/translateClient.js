/**
 * 翻译服务客户端
 * 将中文查询翻译成英文，以便更好地匹配英文CLIP模型
 */
const axios = require('axios');
const logger = require('../config/logger');

// 翻译服务配置
// 使用多个翻译服务作为备选，提高成功率
const TRANSLATE_SERVICES = [
  {
    name: 'Google Translate (免费)',
    url: 'https://translate.googleapis.com/translate_a/single',
    timeout: 5000  // 增加到5秒，确保翻译完成
  },
  {
    name: 'MyMemory Translate',
    url: 'https://api.mymemory.translated.net/get',
    timeout: 5000  // 增加到5秒，确保翻译完成
  }
];

// 简单的翻译缓存（内存缓存）
const translationCache = new Map();
const CACHE_MAX_SIZE = 1000;

/**
 * 检测文本是否包含中文字符
 * @param {string} text - 要检测的文本
 * @returns {boolean} 是否包含中文
 */
function containsChinese(text) {
  if (!text) return false;
  // 匹配中文字符（包括中文标点）
  const chineseRegex = /[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/;
  return chineseRegex.test(text);
}

/**
 * 使用 Google Translate API 翻译
 */
async function translateWithGoogle(text) {
  const service = TRANSLATE_SERVICES[0];
  try {
    const response = await axios.get(service.url, {
      params: {
        client: 'gtx',
        sl: 'zh-CN',
        tl: 'en',
        dt: 't',
        q: text.trim()
      },
      timeout: service.timeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (response.data && Array.isArray(response.data) && response.data[0] && Array.isArray(response.data[0])) {
      const translatedText = response.data[0]
        .map(item => item[0])
        .filter(Boolean)
        .join(' ')
        .trim();

      if (translatedText) {
        return translatedText;
      }
    }
    return null;
  } catch (error) {
    logger.debug(`Google Translate 失败: ${error.message}`);
    return null;
  }
}

/**
 * 使用 MyMemory Translate API 翻译
 */
async function translateWithMyMemory(text) {
  const service = TRANSLATE_SERVICES[1];
  try {
    const response = await axios.get(service.url, {
      params: {
        q: text.trim(),
        langpair: 'zh|en'
      },
      timeout: service.timeout
    });

    if (response.data && response.data.responseData && response.data.responseData.translatedText) {
      return response.data.responseData.translatedText.trim();
    }
    return null;
  } catch (error) {
    logger.debug(`MyMemory Translate 失败: ${error.message}`);
    return null;
  }
}

/**
 * 将中文文本翻译成英文
 * @param {string} text - 要翻译的中文文本
 * @returns {Promise<string>} 翻译后的英文文本
 */
async function translateToEnglish(text) {
  try {
    if (!text || !text.trim()) {
      return text;
    }

    // 如果文本不包含中文，直接返回
    if (!containsChinese(text)) {
      logger.debug(`文本不包含中文，跳过翻译: "${text}"`);
      return text;
    }

    logger.info(`🌐 开始翻译: "${text}" -> 英文`);

    // 尝试多个翻译服务，按顺序尝试
    let translatedText = null;
    
    // 尝试 Google Translate
    translatedText = await translateWithGoogle(text);
    if (translatedText) {
      logger.info(`✅ 翻译成功 (Google): "${text}" -> "${translatedText}"`);
      return translatedText;
    }

    // 如果 Google 失败，尝试 MyMemory
    translatedText = await translateWithMyMemory(text);
    if (translatedText) {
      logger.info(`✅ 翻译成功 (MyMemory): "${text}" -> "${translatedText}"`);
      return translatedText;
    }

    // 所有翻译服务都失败，返回原文
    logger.warn(`⚠️  所有翻译服务都失败，使用原文进行搜索: "${text}"`);
    return text;
  } catch (error) {
    logger.error(`❌ 翻译异常: ${error.message}`);
    logger.warn(`⚠️  翻译异常，使用原文进行搜索: "${text}"`);
    return text;
  }
}

/**
 * 智能翻译：如果查询包含中文，翻译成英文；否则返回原文
 * @param {string} query - 查询文本
 * @returns {Promise<{original: string, translated: string, isTranslated: boolean}>}
 */
async function smartTranslate(query) {
  if (!query || !query.trim()) {
    return {
      original: query,
      translated: query,
      isTranslated: false
    };
  }

  const originalQuery = query.trim();
  const hasChinese = containsChinese(originalQuery);

  if (!hasChinese) {
    return {
      original: originalQuery,
      translated: originalQuery,
      isTranslated: false
    };
  }

  // 检查缓存
  if (translationCache.has(originalQuery)) {
    const cached = translationCache.get(originalQuery);
    logger.info(`📦 使用翻译缓存: "${originalQuery}" -> "${cached}"`);
    return {
      original: originalQuery,
      translated: cached,
      isTranslated: true
    };
  }

  // 包含中文，进行翻译（带超时保护）
  try {
    const translated = await Promise.race([
      translateToEnglish(originalQuery),
      new Promise((_, reject) => setTimeout(() => reject(new Error('翻译超时，请稍后重试')), 9000)) // 9秒超时，确保有足够时间完成翻译
    ]);
    
    // 只缓存成功的翻译（翻译结果不包含中文）
    const translationSuccessful = translated && !containsChinese(translated);
    
    if (translationSuccessful) {
      // 保存到缓存
      if (translationCache.size >= CACHE_MAX_SIZE) {
        const firstKey = translationCache.keys().next().value;
        translationCache.delete(firstKey);
      }
      translationCache.set(originalQuery, translated);
      logger.info(`✅ 翻译成功并缓存: "${originalQuery}" -> "${translated}"`);
    } else {
      logger.warn(`⚠️ 翻译失败（结果仍包含中文），不缓存: "${originalQuery}" -> "${translated}"`);
    }
    
    return {
      original: originalQuery,
      translated: translated,
      isTranslated: translationSuccessful
    };
  } catch (error) {
    // 翻译失败或超时，使用原文
    logger.warn(`⚠️ 翻译超时或失败，使用原文: ${error.message}`);
    return {
      original: originalQuery,
      translated: originalQuery,
      isTranslated: false
    };
  }
}

module.exports = {
  containsChinese,
  translateToEnglish,
  smartTranslate
};

