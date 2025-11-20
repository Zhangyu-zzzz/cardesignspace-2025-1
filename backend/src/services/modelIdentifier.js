const { Brand, Model } = require('../models/mysql');
const { Op } = require('sequelize');
const logger = require('../config/logger');

/**
 * 车型识别器 - 从文字内容中识别车型信息
 */
class ModelIdentifier {
  constructor() {
    // 常见汽车品牌（中英文）
    this.brandPatterns = [
      { name: '宝马', patterns: [/宝马|BMW|bmw/i] },
      { name: '奔驰', patterns: [/奔驰|Mercedes|Benz|梅赛德斯/i] },
      { name: '奥迪', patterns: [/奥迪|Audi|audi/i] },
      { name: '大众', patterns: [/大众|Volkswagen|VW|vw/i] },
      { name: '丰田', patterns: [/丰田|Toyota|toyota/i] },
      { name: '本田', patterns: [/本田|Honda|honda/i] },
      { name: '日产', patterns: [/日产|Nissan|nissan/i] },
      { name: '福特', patterns: [/福特|Ford|ford/i] },
      { name: '通用', patterns: [/通用|GM|General Motors/i] },
      { name: '现代', patterns: [/现代|Hyundai|hyundai/i] },
      { name: '起亚', patterns: [/起亚|Kia|kia/i] },
      { name: '马自达', patterns: [/马自达|Mazda|mazda/i] },
      { name: '斯巴鲁', patterns: [/斯巴鲁|Subaru|subaru/i] },
      { name: '三菱', patterns: [/三菱|Mitsubishi|mitsubishi/i] },
      { name: '雷克萨斯', patterns: [/雷克萨斯|Lexus|lexus/i] },
      { name: '英菲尼迪', patterns: [/英菲尼迪|Infiniti|infiniti/i] },
      { name: '讴歌', patterns: [/讴歌|Acura|acura/i] },
      { name: '沃尔沃', patterns: [/沃尔沃|Volvo|volvo/i] },
      { name: '路虎', patterns: [/路虎|Land Rover|land rover/i] },
      { name: '捷豹', patterns: [/捷豹|Jaguar|jaguar/i] },
      { name: '保时捷', patterns: [/保时捷|Porsche|porsche/i] },
      { name: '法拉利', patterns: [/法拉利|Ferrari|ferrari/i] },
      { name: '兰博基尼', patterns: [/兰博基尼|Lamborghini|lamborghini/i] },
      { name: '玛莎拉蒂', patterns: [/玛莎拉蒂|Maserati|maserati/i] },
      { name: '特斯拉', patterns: [/特斯拉|Tesla|tesla/i] },
      { name: '比亚迪', patterns: [/比亚迪|BYD|byd/i] },
      { name: '吉利', patterns: [/吉利|Geely|geely/i] },
      { name: '长城', patterns: [/长城|Great Wall|GWM/i] },
      { name: '奇瑞', patterns: [/奇瑞|Chery|chery/i] },
      { name: '长安', patterns: [/长安|Changan|changan/i] }
    ];

    // 车型类型关键词
    this.typeKeywords = {
      '轿车': [/轿车|Sedan|sedan|三厢/i],
      'SUV': [/SUV|suv|运动型多用途车|越野车/i],
      'MPV': [/MPV|mpv|多用途车|商务车/i],
      '跑车': [/跑车|Sports Car|sports car|Coupe|coupe/i],
      '皮卡': [/皮卡|Pickup|pickup|皮卡车/i],
      'WAGON': [/旅行车|Wagon|wagon|旅行版/i],
      'SHOOTINGBRAKE': [/猎装|Shooting Brake|shooting brake/i],
      'Hatchback': [/掀背|Hatchback|hatchback|两厢/i]
    };
  }

  /**
   * 从文字中识别车型信息
   * @param {string} text - 文字内容
   * @param {string} title - 标题
   * @returns {Promise<object>} 识别结果
   */
  async identifyModel(text, title = '') {
    try {
      const fullText = (title + ' ' + text).toLowerCase();
      
      // 识别品牌
      const brand = await this.identifyBrand(fullText);
      
      // 识别车型名称
      const modelName = this.identifyModelName(fullText, title, brand);
      
      // 识别车型类型
      const type = this.identifyType(fullText);
      
      // 识别年份
      const year = this.identifyYear(fullText);
      
      // 识别价格
      const price = this.identifyPrice(fullText);

      logger.info(`车型识别结果: 品牌=${brand?.name || '未知'}, 车型=${modelName || '未知'}, 类型=${type || '未知'}`);

      return {
        brand,
        modelName,
        type,
        year,
        price,
        confidence: this.calculateConfidence(brand, modelName)
      };
    } catch (error) {
      logger.error('车型识别失败:', error);
      return {
        brand: null,
        modelName: null,
        type: null,
        year: null,
        price: null,
        confidence: 0
      };
    }
  }

  /**
   * 识别品牌
   * @param {string} text - 文字内容
   * @returns {Promise<object|null>} 品牌信息
   */
  async identifyBrand(text) {
    try {
      // 先通过关键词匹配
      for (const brandInfo of this.brandPatterns) {
        for (const pattern of brandInfo.patterns) {
          if (pattern.test(text)) {
            // 尝试从数据库查找品牌
            const brand = await Brand.findOne({
              where: {
                [Op.or]: [
                  { name: { [Op.like]: `%${brandInfo.name}%` } },
                  { chineseName: { [Op.like]: `%${brandInfo.name}%` } }
                ]
              }
            });
            
            if (brand) {
              return brand;
            }
            
            // 如果数据库中没有，返回识别到的品牌名称
            return { name: brandInfo.name, id: null };
          }
        }
      }
      
      return null;
    } catch (error) {
      logger.error('识别品牌失败:', error);
      return null;
    }
  }

  /**
   * 识别车型名称
   * @param {string} text - 文字内容
   * @param {string} title - 标题
   * @param {object} brand - 品牌信息
   * @returns {string|null} 车型名称
   */
  identifyModelName(text, title, brand) {
    try {
      // 常见车型名称模式（改进版，避免识别到无意义的数字）
      const modelPatterns = [
        // 中文车型名（优先，如：卡罗拉、雅阁、思域等）
        /\b([\u4e00-\u9fa5]{2,6}(?:型|款|版)?)\b/g,
        // 英文车型名（如：Corolla、Camry、Civic、Model等）
        /\b([A-Z][a-z]{3,15})\b/g,
        // 数字+字母组合（如：3系、A4、C200等，但排除纯数字）
        /\b([A-Z]\d+[A-Z]?|[A-Z]{2,}\d+)\b/gi,
        // 带单位的数字（如：3系、5系）
        /\b(\d+系)\b/gi
      ];

      // 优先从标题中提取
      const searchText = title || text;
      
      // 排除的无意义词汇
      const excludeWords = ['the', 'and', 'for', 'with', 'from', 'this', 'that', 'new', 'old', 
                            'concept', 'car', 'vehicle', 'auto', 'motor', 'show', 'reveals',
                            'unveils', 'debuts', 'looks', 'ready', 'production'];
      
      for (const pattern of modelPatterns) {
        const matches = searchText.match(pattern);
        if (matches && matches.length > 0) {
          // 过滤掉常见的非车型词汇和无意义的纯数字
          const filtered = matches.filter(m => {
            const lower = m.toLowerCase();
            // 排除常见词汇
            if (excludeWords.includes(lower)) return false;
            // 排除纯数字（除非是"X系"格式）
            if (/^\d+$/.test(m) && m.length <= 2) return false;
            // 排除太短的词
            if (m.length < 2) return false;
            return true;
          });
          
          if (filtered.length > 0) {
            const modelName = filtered[0].trim();
            // 再次验证：如果是纯数字且长度<=2，跳过
            if (/^\d+$/.test(modelName) && modelName.length <= 2) {
              continue;
            }
            return modelName;
          }
        }
      }
      
      return null;
    } catch (error) {
      logger.error('识别车型名称失败:', error);
      return null;
    }
  }

  /**
   * 识别车型类型
   * @param {string} text - 文字内容
   * @returns {string|null} 车型类型
   */
  identifyType(text) {
    for (const [type, patterns] of Object.entries(this.typeKeywords)) {
      for (const pattern of patterns) {
        if (pattern.test(text)) {
          return type;
        }
      }
    }
    return null;
  }

  /**
   * 识别年份
   * @param {string} text - 文字内容
   * @returns {number|null} 年份
   */
  identifyYear(text) {
    // 匹配4位数字年份（2000-2099）
    const yearMatch = text.match(/\b(20\d{2})\b/);
    if (yearMatch) {
      const year = parseInt(yearMatch[1]);
      if (year >= 2000 && year <= new Date().getFullYear() + 1) {
        return year;
      }
    }
    return null;
  }

  /**
   * 识别价格
   * @param {string} text - 文字内容
   * @returns {number|null} 价格（元）
   */
  identifyPrice(text) {
    // 匹配价格模式：如 "20万"、"30.5万"、"200000元"、"25.8万元" 等
    const pricePatterns = [
      /(\d+\.?\d*)\s*万\s*元?/,
      /(\d+\.?\d*)\s*万元/,
      /价格[：:]\s*(\d+\.?\d*)\s*万/,
      /售价[：:]\s*(\d+\.?\d*)\s*万/,
      /(\d{4,7})\s*元/
    ];

    for (const pattern of pricePatterns) {
      const match = text.match(pattern);
      if (match) {
        let price = parseFloat(match[1]);
        // 如果是"万"单位，转换为元
        if (pattern.source.includes('万')) {
          price = price * 10000;
        }
        if (price > 0 && price < 100000000) { // 合理价格范围
          return price;
        }
      }
    }
    return null;
  }

  /**
   * 计算识别置信度
   * @param {object} brand - 品牌信息
   * @param {string} modelName - 车型名称
   * @returns {number} 置信度（0-1）
   */
  calculateConfidence(brand, modelName) {
    let confidence = 0;
    
    if (brand && brand.id) {
      confidence += 0.4; // 品牌在数据库中
    } else if (brand) {
      confidence += 0.2; // 品牌识别到但不在数据库
    }
    
    if (modelName) {
      confidence += 0.4;
    }
    
    if (brand && modelName) {
      confidence += 0.2; // 品牌和车型都识别到
    }
    
    return Math.min(confidence, 1.0);
  }
}

module.exports = new ModelIdentifier();

