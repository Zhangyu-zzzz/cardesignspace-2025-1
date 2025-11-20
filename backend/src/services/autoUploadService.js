const axios = require('axios');
const FormData = require('form-data');
const { Brand, Model, Image, User } = require('../models/mysql');
const { Op } = require('sequelize');
const logger = require('../config/logger');
const jwt = require('jsonwebtoken');
const translationService = require('./translationService');
const sharp = require('sharp');

/**
 * 自动上传服务 - 自动创建车型和上传图片
 */
class AutoUploadService {
  constructor() {
    this.baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
    this.jwtSecret = process.env.JWT_SECRET;
  }

  /**
   * 获取系统用户（用于自动上传）
   * @returns {Promise<object>} 用户对象
   */
  async getSystemUser() {
    try {
      // 查找管理员或第一个活跃用户
      let user = await User.findOne({
        where: { role: 'admin', status: 'active' }
      });
      
      if (!user) {
        user = await User.findOne({
          where: { status: 'active' }
        });
      }
      
      if (!user) {
        throw new Error('没有找到可用的系统用户');
      }
      
      return user;
    } catch (error) {
      logger.error('获取系统用户失败:', error);
      throw error;
    }
  }

  /**
   * 生成JWT Token
   * @param {object} user - 用户对象
   * @returns {string} JWT Token
   */
  generateToken(user) {
    return jwt.sign(
      { userId: user.id, email: user.email },
      this.jwtSecret,
      { expiresIn: '7d' }
    );
  }

  /**
   * 确保品牌存在，如果不存在则创建
   * @param {string} brandName - 品牌名称
   * @returns {Promise<object>} 品牌对象
   */
  async ensureBrand(brandName) {
    try {
      if (!brandName) {
        throw new Error('品牌名称不能为空');
      }

      // 先查找现有品牌
      let brand = await Brand.findOne({
        where: {
          [Op.or]: [
            { name: { [Op.like]: `%${brandName}%` } },
            { chineseName: { [Op.like]: `%${brandName}%` } }
          ]
        }
      });

      if (brand) {
        return brand;
      }

      // 如果不存在，创建新品牌
      logger.info(`创建新品牌: ${brandName}`);
      brand = await Brand.create({
        name: brandName,
        chineseName: brandName,
        country: '未知',
        popular: false
      });

      return brand;
    } catch (error) {
      logger.error('确保品牌存在失败:', error);
      throw error;
    }
  }

  /**
   * 确保车型存在，如果不存在则创建
   * @param {object} modelInfo - 车型信息
   * @returns {Promise<object>} 车型对象
   */
  async ensureModel(modelInfo) {
    try {
      const { brandId, name, type, year, price, description } = modelInfo;

      if (!brandId || !name) {
        throw new Error('品牌ID和车型名称不能为空');
      }

      // 先查找现有车型
      let model = await Model.findOne({
        where: {
          brandId,
          name: { [Op.like]: `%${name}%` }
        }
      });

      if (model) {
        return model;
      }

      // 如果不存在，创建新车型
      logger.info(`创建新车型: ${name} (品牌ID: ${brandId})`);
      model = await Model.create({
        brandId,
        name,
        type: type || '其他',
        year: year || null,
        price: price || null,
        description: description || null,
        isActive: false
      });

      return model;
    } catch (error) {
      logger.error('确保车型存在失败:', error);
      throw error;
    }
  }

  /**
   * 下载图片并检查是否符合高清要求
   * @param {string} imageUrl - 图片URL
   * @param {number} minSizeMB - 最小文件大小（MB），默认1.2MB
   * @param {number} minWidth - 最小宽度（像素），默认1200（根据用户要求）
   * @param {object} options - 额外选项（如Referer）
   * @returns {Promise<object>} 图片信息 {buffer, width, height, size}
   */
  async downloadImage(imageUrl, minSizeMB = 1.2, minWidth = 1200, options = {}) {
    try {
      const referer = options.referer || options.articleUrl || null;
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
          ...(referer ? { 'Referer': referer } : {})
        }
      });

      const buffer = Buffer.from(response.data);
      const sizeMB = buffer.length / (1024 * 1024);

      // 检查文件大小
      if (sizeMB < minSizeMB) {
        logger.warn(`图片太小: ${imageUrl}, 大小: ${sizeMB.toFixed(2)}MB, 要求: ${minSizeMB}MB`);
        // 尝试获取图片尺寸
        try {
          const metadata = await sharp(buffer).metadata();
          const width = metadata.width || 0;
          const height = metadata.height || 0;
          
          // 如果分辨率足够高，即使文件小也接受
          if (width >= minWidth || height >= minWidth) {
            logger.info(`图片分辨率符合要求: ${width}x${height}`);
            return { buffer, width, height, size: buffer.length, isValid: true };
          }
        } catch (e) {
          // 无法读取元数据
        }
        
        return { buffer, width: null, height: null, size: buffer.length, isValid: false };
      }

      // 获取图片尺寸
      let width = null;
      let height = null;
      try {
        const metadata = await sharp(buffer).metadata();
        width = metadata.width;
        height = metadata.height;
      } catch (e) {
        logger.warn(`无法读取图片元数据: ${imageUrl}`);
      }

      return { buffer, width, height, size: buffer.length, isValid: true };
    } catch (error) {
      logger.error(`下载图片失败: ${imageUrl}`, error.message);
      throw error;
    }
  }

  /**
   * 上传图片到系统
   * @param {object} imageInfo - 图片信息
   * @returns {Promise<object>} 上传结果
   */
  async uploadImage(imageInfo) {
    try {
      const { modelId, imageUrl, imageBuffer, title, description, userId, articleUrl, referer, source } = imageInfo;

      if (!modelId || (!imageUrl && !imageBuffer)) {
        throw new Error('车型ID和图片URL或Buffer不能为空');
      }

      // 如果已经有buffer，直接使用；否则下载
      let buffer = imageBuffer;
      if (!buffer) {
        logger.info(`下载图片: ${imageUrl}`);
        const imageInfo = await this.downloadImage(imageUrl, 1.2, 1200, {
          referer: referer || articleUrl || source
        });
        if (!imageInfo.isValid) {
          throw new Error('图片不符合高清要求');
        }
        buffer = imageInfo.buffer;
      }
      
      // 从URL获取文件名，如果没有URL则从buffer检测
      let filename = 'image.jpg';
      let mimeType = 'image/jpeg';
      
      if (imageUrl) {
        try {
          filename = new URL(imageUrl).pathname.split('/').pop() || 'image.jpg';
          mimeType = this.getMimeTypeFromUrl(imageUrl) || 'image/jpeg';
        } catch (e) {
          // URL解析失败，使用默认值
        }
      } else if (buffer) {
        // 从buffer检测MIME类型
        try {
          const metadata = await sharp(buffer).metadata();
          if (metadata.format) {
            mimeType = `image/${metadata.format}`;
            filename = `image.${metadata.format}`;
          }
        } catch (e) {
          // 无法检测，使用默认值
        }
      }

      // 获取系统用户
      const user = userId ? await User.findByPk(userId) : await this.getSystemUser();
      if (!user) {
        throw new Error('无法获取系统用户');
      }

      // 生成Token
      const token = this.generateToken(user);

      // 创建FormData
      const formData = new FormData();
      formData.append('image', imageBuffer, {
        filename,
        contentType: mimeType
      });
      formData.append('modelId', modelId);
      formData.append('title', title || '');
      formData.append('description', description || '');
      formData.append('category', 'general');

      // 调用上传API
      const response = await axios.post(
        `${this.baseUrl}/api/upload/single`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'Authorization': `Bearer ${token}`
          },
          timeout: 60000
        }
      );

      if (response.data.status === 'success') {
        logger.info(`图片上传成功: ${title || filename}`);
        return {
          success: true,
          data: response.data.data
        };
      } else {
        throw new Error(response.data.message || '上传失败');
      }
    } catch (error) {
      logger.error('上传图片失败:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 从URL获取MIME类型
   * @param {string} url - 图片URL
   * @returns {string} MIME类型
   */
  getMimeTypeFromUrl(url) {
    const ext = url.split('.').pop().toLowerCase();
    const mimeTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'bmp': 'image/bmp'
    };
    return mimeTypes[ext] || 'image/jpeg';
  }

  /**
   * 批量上传内容
   * @param {object} contentData - 内容数据
   * @returns {Promise<object>} 上传结果
   */
  async uploadContent(contentData) {
    try {
      const {
        brandName,
        modelName,
        type,
        year,
        price,
        description,
        images,
        title,
        userId
      } = contentData;

      const results = {
        brand: null,
        model: null,
        uploadedImages: [],
        failedImages: []
      };

      // 1. 确保品牌存在
      if (brandName) {
        results.brand = await this.ensureBrand(brandName);
      } else {
        throw new Error('品牌名称不能为空');
      }

      // 2. 确保车型存在（使用新格式：年份+品牌+车型名）
      if (modelName && results.brand) {
        // 构建车型名称：年份+品牌+车型名
        const brandName = results.brand.chineseName || results.brand.name;
        let finalModelName = modelName;
        
        if (year) {
          finalModelName = `${year} ${brandName} ${modelName}`;
        } else {
          finalModelName = `${brandName} ${modelName}`;
        }
        
        results.model = await this.ensureModel({
          brandId: results.brand.id,
          name: finalModelName,
          type,
          year,
          price,
          description
        });
      } else {
        throw new Error('车型名称不能为空');
      }

      // 3. 翻译描述为中文
      let translatedDescription = description || '';
      if (description) {
        translatedDescription = await translationService.translate(description);
      }
      
      // 翻译标题为中文
      let translatedTitle = title || '';
      if (title) {
        translatedTitle = await translationService.translate(title);
      }

      // 4. 上传图片（只上传高清图片）
      if (images && images.length > 0 && results.model) {
        for (let i = 0; i < images.length; i++) {
          const image = images[i];
          try {
            // 检查图片是否符合高清要求（至少1200px）
            const imageInfo = await this.downloadImage(image.url, 1.2, 1200, {
              referer: image.articleUrl || image.source
            });
            
            if (!imageInfo.isValid) {
              logger.warn(`跳过非高清图片: ${image.url}, 尺寸: ${imageInfo.width}x${imageInfo.height}, 大小: ${(imageInfo.size / 1024 / 1024).toFixed(2)}MB`);
              results.failedImages.push({
                url: image.url,
                error: `图片不符合高清要求（至少1.2MB或1200px宽度），实际: ${imageInfo.width || '未知'}x${imageInfo.height || '未知'}`
              });
              continue;
            }

            // 翻译图片标题和描述
            let imageTitle = image.alt || translatedTitle || `${results.model.name} - 图片${i + 1}`;
            if (image.alt) {
              imageTitle = await translationService.translate(image.alt);
            }
            
            let imageDesc = image.title || translatedDescription || '';
            if (image.title) {
              imageDesc = await translationService.translate(image.title);
            }

            const uploadResult = await this.uploadImage({
              modelId: results.model.id,
              imageUrl: image.url,
              imageBuffer: imageInfo.buffer,
              title: imageTitle,
              description: imageDesc,
              userId,
              articleUrl: image.articleUrl || image.articleURL || image.source,
              source: image.source
            });

            if (uploadResult.success) {
              results.uploadedImages.push({
                url: image.url,
                result: uploadResult.data
              });
            } else {
              results.failedImages.push({
                url: image.url,
                error: uploadResult.error
              });
            }

            // 避免请求过快
            await this.sleep(1000);
          } catch (error) {
            logger.error(`上传图片失败: ${image.url}`, error);
            results.failedImages.push({
              url: image.url,
              error: error.message
            });
          }
        }
      }

      logger.info(`内容上传完成: 品牌=${results.brand?.name || brandName}, 车型=${results.model?.name || modelName}, 成功=${results.uploadedImages.length}, 失败=${results.failedImages.length}`);

      return {
        success: true,
        ...results
      };
    } catch (error) {
      logger.error('上传内容失败:', error);
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

module.exports = new AutoUploadService();

