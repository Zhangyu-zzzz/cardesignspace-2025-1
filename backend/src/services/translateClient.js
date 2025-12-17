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
      throw new Error('翻译文本为空');
    }

    // 如果文本不包含中文，直接返回
    if (!containsChinese(text)) {
      logger.debug(`文本不包含中文，跳过翻译: "${text}"`);
      return text;
    }

    logger.info(`🌐 开始翻译: "${text}" -> 英文`);

    // 尝试多个翻译服务，按顺序尝试
    let translatedText = null;
    
    // ⭐ 尝试 Google Translate（第一优先）
    try {
      translatedText = await translateWithGoogle(text);
      if (translatedText && !containsChinese(translatedText)) {
        logger.info(`✅ 翻译成功 (Google): "${text}" -> "${translatedText}"`);
        return translatedText;
      } else if (translatedText && containsChinese(translatedText)) {
        logger.warn(`⚠️  Google翻译结果仍包含中文: "${translatedText}"，尝试下一个服务`);
        translatedText = null;
      }
    } catch (googleError) {
      logger.debug(`Google Translate 异常: ${googleError.message}`);
    }

    // ⭐ 如果 Google 失败，尝试 MyMemory（第二优先）
    try {
      translatedText = await translateWithMyMemory(text);
      if (translatedText && !containsChinese(translatedText)) {
        logger.info(`✅ 翻译成功 (MyMemory): "${text}" -> "${translatedText}"`);
        return translatedText;
      } else if (translatedText && containsChinese(translatedText)) {
        logger.warn(`⚠️  MyMemory翻译结果仍包含中文: "${translatedText}"`);
        translatedText = null;
      }
    } catch (myMemoryError) {
      logger.debug(`MyMemory Translate 异常: ${myMemoryError.message}`);
    }

    // ⭐ 所有翻译服务都失败，抛出错误（不再返回原文）
    logger.error(`❌ 所有翻译服务都失败，无法翻译: "${text}"`);
    throw new Error('翻译失败：所有翻译服务不可用，请使用英文进行搜索或稍后重试');
  } catch (error) {
    // ⭐ 翻译异常，向上抛出错误（不再返回原文）
    logger.error(`❌ 翻译异常: ${error.message}`);
    throw error;
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

  // ⭐ 包含中文，必须翻译完成（带超时保护）
  try {
    const translated = await Promise.race([
      translateToEnglish(originalQuery),
      new Promise((_, reject) => setTimeout(() => reject(new Error('翻译超时（10秒），请使用英文进行搜索或稍后重试')), 10000)) // ⭐ 增加到10秒超时
    ]);
    
    // ⭐ 严格验证翻译结果：必须不包含中文
    const translationSuccessful = translated && 
                                  translated.trim().length > 0 && 
                                  !containsChinese(translated);
    
    if (!translationSuccessful) {
      // ⭐ 翻译失败，抛出错误（不返回原文）
      logger.error(`❌ 翻译验证失败: "${originalQuery}" -> "${translated}"`);
      throw new Error('翻译结果无效（仍包含中文或为空），请使用英文进行搜索');
    }
    
    // ⭐ 翻译成功，保存到缓存
    if (translationCache.size >= CACHE_MAX_SIZE) {
      const firstKey = translationCache.keys().next().value;
      translationCache.delete(firstKey);
    }
    translationCache.set(originalQuery, translated);
    logger.info(`✅ 翻译完成并验证通过: "${originalQuery}" -> "${translated}"`);
    
    return {
      original: originalQuery,
      translated: translated,
      isTranslated: true  // ⭐ 只有成功才返回 true
    };
  } catch (error) {
    // ⭐ 翻译失败或超时，向上抛出错误（不再返回原文）
    logger.error(`❌ 翻译失败: ${error.message}`);
    throw error;  // ⭐ 抛出错误，阻止继续搜索
  }
}

module.exports = {
  containsChinese,
  translateToEnglish,
  smartTranslate
};

