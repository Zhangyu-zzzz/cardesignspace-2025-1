const logger = require('../config/logger');

/**
 * 内容解析器 - 从HTML中提取文字和图片
 */
class ContentParser {
  constructor() {
    // 支持的高清图片域名规则
    this.highResDomains = [
      {
        hostIncludes: 'motor1.com',
        pattern: /\/s\d+\//,
        replacement: '/s0/'
      }
    ];
  }

  /**
   * 将图片URL升级为高清版本
   * @param {string} url - 原始URL
   * @returns {string} 高清URL
   */
  upgradeToHighRes(url) {
    if (!url) return url;
    try {
      const parsed = new URL(url);
      for (const rule of this.highResDomains) {
        if (parsed.hostname.includes(rule.hostIncludes) && rule.pattern.test(parsed.pathname)) {
          parsed.pathname = parsed.pathname.replace(rule.pattern, rule.replacement);
          return parsed.toString();
        }
      }
      return url;
    } catch (err) {
      return url;
    }
  }

  /**
   * 提取文章链接
   * @param {object} $ - Cheerio实例
   * @param {string} baseUrl - 基础URL
   * @param {string} articleSelector - 文章链接选择器
   * @returns {Array} 文章URL数组
   */
  extractArticleLinks($, baseUrl = '', articleSelector = 'a[href*="/news/"], a[href*="/article/"], .article-link, .news-link') {
    try {
      const links = [];
      const seen = new Set();
      
      $(articleSelector).each((i, elem) => {
        let href = $(elem).attr('href');
        if (!href) return;
        
        // 处理相对路径
        if (href.startsWith('//')) {
          href = 'https:' + href;
        } else if (href.startsWith('/')) {
          if (baseUrl) {
            const urlObj = new URL(baseUrl);
            href = urlObj.origin + href;
          }
        } else if (!href.startsWith('http')) {
          if (baseUrl) {
            href = new URL(href, baseUrl).href;
          }
        }
        
        // 过滤无效链接
        if (href && !seen.has(href) && this.isValidArticleUrl(href)) {
          seen.add(href);
          links.push({
            url: href,
            title: $(elem).text().trim() || $(elem).attr('title') || ''
          });
        }
      });
      
      return links;
    } catch (error) {
      logger.error('提取文章链接失败:', error);
      return [];
    }
  }

  /**
   * 验证是否是有效的文章URL
   * @param {string} url - URL
   * @returns {boolean} 是否有效
   */
  isValidArticleUrl(url) {
    if (!url || url.length < 10) return false;
    
    // 排除常见的不需要的链接
    const excludePatterns = [
      /\/category\//i,
      /\/tag\//i,
      /\/author\//i,
      /\/page\//i,
      /\/search\//i,
      /^#/,
      /^javascript:/i,
      /mailto:/i,
      /tel:/i
    ];
    
    for (const pattern of excludePatterns) {
      if (pattern.test(url)) return false;
    }
    
    // 应该包含文章相关的路径
    const articlePatterns = [
      /\/news\//i,
      /\/article\//i,
      /\/post\//i,
      /\/story\//i
    ];
    
    return articlePatterns.some(pattern => pattern.test(url));
  }

  /**
   * 解析网页内容
   * @param {object} $ - Cheerio实例
   * @param {object} selectors - 选择器配置
   * @param {string} baseUrl - 基础URL
   * @returns {Promise<object>} 解析结果
   */
  async parseContent($, selectors = {}, baseUrl = '') {
    try {
      const {
        textSelector = 'body',
        imageSelector = 'img',
        titleSelector = 'title, h1, .title',
        descriptionSelector = 'meta[name="description"], .description, .summary'
      } = selectors;

      // 提取文字内容
      const textContent = this.extractText($, textSelector);
      
      // 提取标题
      const title = this.extractTitle($, titleSelector);
      
      // 提取描述
      const description = this.extractDescription($, descriptionSelector);
      
      // 提取图片
      const images = this.extractImages($, imageSelector, baseUrl);

      logger.info(`内容解析完成: 标题=${title}, 图片数=${images.length}, 文字长度=${textContent.length}`);

      return {
        success: true,
        title,
        description,
        text: textContent,
        images,
        rawText: textContent
      };
    } catch (error) {
      logger.error('内容解析失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 提取文字内容
   * @param {object} $ - Cheerio实例
   * @param {string} selector - 选择器
   * @returns {string} 文字内容
   */
  extractText($, selector) {
    try {
      // 移除script和style标签
      $('script, style, noscript').remove();
      
      let text = '';
      if (selector && selector !== 'body') {
        $(selector).each((i, elem) => {
          text += $(elem).text() + ' ';
        });
      } else {
        text = $('body').text();
      }
      
      // 清理文字：移除多余空格和换行
      return text.replace(/\s+/g, ' ').trim();
    } catch (error) {
      logger.error('提取文字失败:', error);
      return '';
    }
  }

  /**
   * 提取标题
   * @param {object} $ - Cheerio实例
   * @param {string} selector - 选择器
   * @returns {string} 标题
   */
  extractTitle($, selector) {
    try {
      // 尝试多个选择器
      const selectors = selector.split(',').map(s => s.trim());
      
      for (const sel of selectors) {
        const title = $(sel).first().text().trim();
        if (title) return title;
      }
      
      // 如果没有找到，使用默认选择器
      return $('title').text().trim() || $('h1').first().text().trim() || '';
    } catch (error) {
      logger.error('提取标题失败:', error);
      return '';
    }
  }

  /**
   * 提取描述
   * @param {object} $ - Cheerio实例
   * @param {string} selector - 选择器
   * @returns {string} 描述
   */
  extractDescription($, selector) {
    try {
      const selectors = selector.split(',').map(s => s.trim());
      
      for (const sel of selectors) {
        let desc = '';
        if (sel.includes('meta')) {
          desc = $(sel).attr('content') || '';
        } else {
          desc = $(sel).first().text().trim();
        }
        if (desc) return desc;
      }
      
      return $('meta[name="description"]').attr('content') || '';
    } catch (error) {
      logger.error('提取描述失败:', error);
      return '';
    }
  }

  /**
   * 提取图片
   * @param {object} $ - Cheerio实例
   * @param {string} selector - 选择器
   * @param {string} baseUrl - 基础URL（用于处理相对路径）
   * @returns {Array} 图片URL数组
   */
  extractImages($, selector, baseUrl = '') {
    try {
      const images = [];
      const seen = new Set();

      // Motor1: 解析 LightGallery 节点（.lg-object 或 data-lg-src）
      $('.lg-object, [data-lg-src], [data-src-download], [data-download-url]').each((i, elem) => {
        const hdUrl = $(elem).attr('data-lg-src') ||
                      $(elem).attr('data-download-url') ||
                      $(elem).attr('data-src-download') ||
                      $(elem).attr('data-src') ||
                      $(elem).attr('src');
        if (!hdUrl) return;
        const normalized = this.normalizeImageUrl(hdUrl, baseUrl);
        if (!normalized) return;
        if (this.isValidImageUrl(normalized) && !seen.has(normalized)) {
          seen.add(normalized);
          images.push({
            url: this.upgradeToHighRes(normalized),
            alt: $(elem).attr('alt') || '',
            title: $(elem).attr('title') || '',
            width: null,
            height: null,
            originalUrl: normalized,
            source: normalized,
            articleUrl: baseUrl || null
          });
        }
      });

      // Motor1: 解析 script 中的 galleryItems JSON
      $('script').each((i, elem) => {
        const scriptContent = $(elem).html() || '';
        if (!scriptContent) return;
        const galleryMatch = scriptContent.match(/galleryItems\s*=\s*(\[[\s\S]*?\])/);
        const nuxtMatch = scriptContent.match(/"galleryItems":(\[[\s\S]*?\])/);
        const matches = [galleryMatch, nuxtMatch].filter(Boolean);
        for (const match of matches) {
          try {
            const json = JSON.parse(match[1]);
            json.forEach(item => {
              const hdUrl = item.downloadUrl || item.src || item.url;
              if (!hdUrl) return;
              const normalized = this.normalizeImageUrl(hdUrl, baseUrl);
              if (!normalized) return;
              if (this.isValidImageUrl(normalized) && !seen.has(normalized)) {
                seen.add(normalized);
                images.push({
                  url: this.upgradeToHighRes(normalized),
                  alt: item.alt || '',
                  title: item.title || '',
                  width: item.width || null,
                  height: item.height || null,
                  originalUrl: normalized,
                  source: normalized,
                  articleUrl: baseUrl || null
                });
              }
            });
          } catch (err) {
            // JSON 解析失败忽略
          }
        }
      });
      
      $(selector).each((i, elem) => {
        // 优先获取高清图片URL（常见的高清图片属性）
        const srcset = $(elem).attr('srcset');
        const srcsetUrl = srcset ? srcset.split(',')[0].trim().split(' ')[0] : null;
        
        let imgUrl = $(elem).attr('data-src-full') || 
                     $(elem).attr('data-full') || 
                     $(elem).attr('data-original') ||
                     $(elem).attr('data-hd-src') ||
                     $(elem).attr('data-high-res') ||
                     srcsetUrl ||
                     $(elem).attr('src') || 
                     $(elem).attr('data-src') || 
                     $(elem).attr('data-lazy-src');
        
        if (!imgUrl) return;
        
        // 处理srcset（可能包含多个分辨率）
        if (imgUrl.includes(',')) {
          // 取最大的分辨率
          const srcset = $(elem).attr('srcset');
          if (srcset) {
            const sources = srcset.split(',').map(s => s.trim());
            // 找到最大的分辨率（通常是最后一个或包含w或x的）
            const highRes = sources.find(s => s.includes('1920w') || s.includes('2048w') || s.includes('2x')) || 
                           sources[sources.length - 1];
            if (highRes) {
              imgUrl = highRes.split(' ')[0];
            }
          }
        }
        
        // 处理相对路径
        imgUrl = this.normalizeImageUrl(imgUrl, baseUrl);
        if (!imgUrl) return;
        
        // 尝试获取图片尺寸信息
        const width = $(elem).attr('width') || $(elem).attr('data-width');
        const height = $(elem).attr('height') || $(elem).attr('data-height');
        
        // 过滤无效图片
        if (this.isValidImageUrl(imgUrl) && !seen.has(imgUrl)) {
          seen.add(imgUrl);
          
          // 尝试从srcset中获取更高分辨率的图片
          let highResUrl = imgUrl;
          const srcset = $(elem).attr('srcset');
          if (srcset) {
            const sources = srcset.split(',').map(s => s.trim());
            // 找到最高分辨率的（至少1200px）
            const highResSource = sources
              .map(s => {
                const parts = s.trim().split(' ');
                const url = parts[0];
                const size = parts[1] ? parseInt(parts[1].replace(/[wx]/g, '')) : 0;
                return { url, size };
              })
              .filter(s => s.size >= 1200)
              .sort((a, b) => b.size - a.size)[0];
            
            if (highResSource) {
              // 处理相对路径
              if (highResSource.url.startsWith('//')) {
                highResUrl = 'https:' + highResSource.url;
              } else if (highResSource.url.startsWith('/')) {
                if (baseUrl) {
                  const urlObj = new URL(baseUrl);
                  highResUrl = urlObj.origin + highResSource.url;
                } else {
                  highResUrl = highResSource.url;
                }
              } else if (!highResSource.url.startsWith('http')) {
                if (baseUrl) {
                  highResUrl = new URL(highResSource.url, baseUrl).href;
                } else {
                  highResUrl = highResSource.url;
                }
              } else {
                highResUrl = highResSource.url;
              }
            }
          }
          
          const upgradedUrl = this.upgradeToHighRes(highResUrl);
          images.push({
            url: upgradedUrl,
            alt: $(elem).attr('alt') || '',
            title: $(elem).attr('title') || '',
            width: width ? parseInt(width) : null,
            height: height ? parseInt(height) : null,
            originalUrl: upgradedUrl !== imgUrl ? imgUrl : null,
            source: imgUrl,
            articleUrl: baseUrl || null
          });
        }
      });
      
      return images;
    } catch (error) {
      logger.error('提取图片失败:', error);
      return [];
    }
  }

  normalizeImageUrl(url, baseUrl = '') {
    if (!url) return null;
    let imgUrl = url.trim();
    if (imgUrl.startsWith('//')) {
      imgUrl = 'https:' + imgUrl;
    } else if (imgUrl.startsWith('/')) {
      if (baseUrl) {
        try {
          const urlObj = new URL(baseUrl);
          imgUrl = urlObj.origin + imgUrl;
        } catch (err) {
          return null;
        }
      }
    } else if (!imgUrl.startsWith('http')) {
      if (baseUrl) {
        try {
          imgUrl = new URL(imgUrl, baseUrl).href;
        } catch (err) {
          return null;
        }
      } else {
        return null;
      }
    }
    return imgUrl;
  }

  /**
   * 验证图片URL是否有效
   * @param {string} url - 图片URL
   * @returns {boolean} 是否有效
   */
  isValidImageUrl(url) {
    if (!url || url.length < 10) return false;
    
    // 排除常见的不需要的图片
    const excludePatterns = [
      /logo/i,
      /icon/i,
      /avatar/i,
      /\.svg$/i,
      /\.gif$/i,
      /pixel/i,
      /tracker/i,
      /analytics/i,
      /1x1/i,
      /spacer/i
    ];
    
    for (const pattern of excludePatterns) {
      if (pattern.test(url)) return false;
    }
    
    // 检查是否是图片扩展名
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.bmp'];
    const hasImageExtension = imageExtensions.some(ext => url.toLowerCase().includes(ext));
    
    // 或者包含图片相关的路径
    const imagePaths = ['/image', '/img', '/photo', '/picture', '/pic'];
    const hasImagePath = imagePaths.some(path => url.toLowerCase().includes(path));
    
    return hasImageExtension || hasImagePath;
  }
}

module.exports = new ContentParser();

