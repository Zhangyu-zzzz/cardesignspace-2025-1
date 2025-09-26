const { Image, ImageAsset } = require('../models/mysql');
const { chooseBestUrl, generateAndSaveAssets } = require('../services/assetService');
const { sequelize } = require('../config/mysql');
const logger = require('../config/logger');
const axios = require('axios');
const sharp = require('sharp');

// 简单的内存缓存，避免重复查询
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

// 清理过期缓存
function cleanExpiredCache() {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      cache.delete(key);
    }
  }
}

// 定期清理缓存（每10分钟）
setInterval(cleanExpiredCache, 10 * 60 * 1000);

/**
 * 获取图片的最佳变体URL
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.getBestImageUrl = async (req, res) => {
  try {
    const { imageId } = req.params;
    const { 
      variant = 'webp', 
      width = 600, 
      height = 400,
      preferWebp = true 
    } = req.query;

    if (!imageId) {
      return res.status(400).json({
        success: false,
        message: '图片ID不能为空'
      });
    }

    // 检查缓存
    const cacheKey = `image_${imageId}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      logger.info(`使用缓存数据 (imageId: ${imageId})`);
      return res.json(cached.data);
    }

    // 查询图片信息
    const image = await Image.findByPk(imageId, {
      include: [{
        model: ImageAsset,
        as: 'Assets',
        attributes: ['variant', 'url', 'width', 'height', 'size']
      }]
    });

    if (!image) {
      return res.status(404).json({
        success: false,
        message: '图片不存在'
      });
    }

    // 构建变体URL映射（优化：使用reduce提高性能）
    const assets = image.Assets?.reduce((acc, asset) => {
      acc[asset.variant] = asset.url;
      return acc;
    }, {}) || {};

    // 选择最佳URL
    let bestUrl = image.url; // 默认使用原图
    
    if (Object.keys(assets).length > 0) {
      // 根据请求参数选择变体
      if (variant && assets[variant]) {
        bestUrl = assets[variant];
      } else {
        // 使用智能选择逻辑
        bestUrl = chooseBestUrl(assets, preferWebp === 'true');
      }
    } else {
      // 如果没有变体，尝试按需生成
      try {
        logger.info(`图片 ${imageId} 没有变体，尝试按需生成...`);
        const generatedAssets = await generateVariantsOnDemand(imageId, image.url);
        
        if (generatedAssets && Object.keys(generatedAssets).length > 0) {
          // 重新查询变体信息
          const updatedImage = await Image.findByPk(imageId, {
            include: [{
              model: ImageAsset,
              as: 'Assets',
              attributes: ['variant', 'url', 'width', 'height', 'size']
            }]
          });
          
          // 重新构建变体URL映射（优化：使用reduce提高性能）
          const updatedAssets = updatedImage.Assets?.reduce((acc, asset) => {
            acc[asset.variant] = asset.url;
            return acc;
          }, {}) || {};
          
          // 选择最佳URL
          if (variant && updatedAssets[variant]) {
            bestUrl = updatedAssets[variant];
          } else {
            bestUrl = chooseBestUrl(updatedAssets, preferWebp === 'true') || image.url;
          }
          
          assets = updatedAssets;
        }
      } catch (error) {
        logger.error(`按需生成变体失败 (imageId: ${imageId}):`, error);
        // 继续使用原图
      }
    }

    const responseData = {
      success: true,
      data: {
        imageId: parseInt(imageId),
        originalUrl: image.url,
        bestUrl: bestUrl,
        availableVariants: Object.keys(assets),
        assets: assets,
        selectedVariant: variant
      }
    };

    // 缓存结果（只有在有变体时才缓存，避免缓存按需生成的结果）
    if (Object.keys(assets).length > 0) {
      cache.set(cacheKey, {
        data: responseData,
        timestamp: Date.now()
      });
    }

    res.json(responseData);

  } catch (error) {
    logger.error('获取最佳图片URL失败:', error);
    res.status(500).json({
      success: false,
      message: '获取图片URL失败',
      error: error.message
    });
  }
};

/**
 * 获取图片的所有变体信息
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.getImageVariants = async (req, res) => {
  try {
    const { imageId } = req.params;

    if (!imageId) {
      return res.status(400).json({
        success: false,
        message: '图片ID不能为空'
      });
    }

    // 查询图片和变体信息
    const image = await Image.findByPk(imageId, {
      include: [{
        model: ImageAsset,
        as: 'Assets',
        attributes: ['variant', 'url', 'width', 'height', 'size']
      }]
    });

    if (!image) {
      return res.status(404).json({
        success: false,
        message: '图片不存在'
      });
    }

    // 格式化变体信息（优化：使用reduce提高性能）
    const variants = image.Assets?.reduce((acc, asset) => {
      acc[asset.variant] = {
        url: asset.url,
        width: asset.width,
        height: asset.height,
        size: asset.size
      };
      return acc;
    }, {}) || {};

    res.json({
      success: true,
      data: {
        imageId: parseInt(imageId),
        originalUrl: image.url,
        variants: variants,
        totalVariants: Object.keys(variants).length
      }
    });

  } catch (error) {
    logger.error('获取图片变体信息失败:', error);
    res.status(500).json({
      success: false,
      message: '获取图片变体信息失败',
      error: error.message
    });
  }
};

/**
 * 批量获取图片的最佳URL
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.getBatchImageUrls = async (req, res) => {
  try {
    const { imageIds } = req.body;
    const { 
      variant = 'webp', 
      preferWebp = true 
    } = req.query;

    if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '图片ID列表不能为空'
      });
    }

    if (imageIds.length > 50) {
      return res.status(400).json({
        success: false,
        message: '单次请求最多支持50张图片'
      });
    }

    // 批量查询图片和变体信息
    const images = await Image.findAll({
      where: {
        id: imageIds
      },
      include: [{
        model: ImageAsset,
        as: 'Assets',
        attributes: ['variant', 'url', 'width', 'height', 'size']
      }]
    });

    // 构建结果（优化：使用reduce提高性能）
    const results = images.reduce((acc, image) => {
      const assets = image.Assets?.reduce((assetAcc, asset) => {
        assetAcc[asset.variant] = asset.url;
        return assetAcc;
      }, {}) || {};

      let bestUrl = image.url; // 默认使用原图
      if (Object.keys(assets).length > 0) {
        if (variant && assets[variant]) {
          bestUrl = assets[variant];
        } else {
          bestUrl = chooseBestUrl(assets, preferWebp === 'true');
        }
      }

      acc[image.id] = {
        originalUrl: image.url,
        bestUrl: bestUrl,
        availableVariants: Object.keys(assets),
        assets: assets
      };
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        results: results,
        totalImages: images.length,
        requestedImages: imageIds.length
      }
    });

  } catch (error) {
    logger.error('批量获取图片URL失败:', error);
    res.status(500).json({
      success: false,
      message: '批量获取图片URL失败',
      error: error.message
    });
  }
};

/**
 * 获取图片变体统计信息
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.getVariantStats = async (req, res) => {
  try {
    // 查询变体统计
    const stats = await sequelize.query(`
      SELECT 
        variant,
        COUNT(*) as count,
        AVG(size) as avgSize,
        MIN(size) as minSize,
        MAX(size) as maxSize,
        AVG(width) as avgWidth,
        AVG(height) as avgHeight
      FROM image_assets
      GROUP BY variant
      ORDER BY variant
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    // 查询总图片数
    const totalImages = await Image.count();

    // 查询有变体的图片数
    const imagesWithVariants = await sequelize.query(`
      SELECT COUNT(DISTINCT imageId) as count
      FROM image_assets
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: {
        totalImages: totalImages,
        imagesWithVariants: imagesWithVariants[0]?.count || 0,
        variantStats: stats,
        coverageRate: totalImages > 0 ? 
          ((imagesWithVariants[0]?.count || 0) / totalImages * 100).toFixed(2) + '%' : '0%'
      }
    });

  } catch (error) {
    logger.error('获取变体统计信息失败:', error);
    res.status(500).json({
      success: false,
      message: '获取变体统计信息失败',
      error: error.message
    });
  }
};

/**
 * 按需生成图片变体
 * @param {number} imageId - 图片ID
 * @param {string} originalUrl - 原始图片URL
 * @returns {Promise<Object>} 生成的变体结果
 */
async function generateVariantsOnDemand(imageId, originalUrl) {
  try {
    logger.info(`开始按需生成图片变体 (imageId: ${imageId})`);
    
    // 从COS下载原图
    const imageBuffer = await downloadImageFromCOS(originalUrl);
    if (!imageBuffer) {
      throw new Error('无法下载原图');
    }
    
    // 获取图片信息
    const imageInfo = await sharp(imageBuffer).metadata();
    logger.info(`原图信息: ${imageInfo.width}x${imageInfo.height}, ${imageInfo.format}`);
    
    // 生成COS存储键（从URL中提取）
    const cosKey = extractCosKeyFromUrl(originalUrl);
    if (!cosKey) {
      throw new Error('无法提取COS存储键');
    }
    
    // 生成变体
    const assets = await generateAndSaveAssets({
      imageId: imageId,
      originalBuffer: imageBuffer,
      originalKey: cosKey,
      originalContentType: `image/${imageInfo.format}`
    });
    
    logger.info(`按需生成变体成功 (imageId: ${imageId}):`, Object.keys(assets));
    return assets;
    
  } catch (error) {
    logger.error(`按需生成变体失败 (imageId: ${imageId}):`, error);
    return null;
  }
}

/**
 * 从COS下载图片
 * @param {string} imageUrl - 图片URL
 * @returns {Promise<Buffer>} 图片缓冲区
 */
async function downloadImageFromCOS(imageUrl) {
  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000, // 30秒超时
      headers: {
        'User-Agent': 'CarDesignSpace-VariantGenerator/1.0'
      }
    });
    
    return Buffer.from(response.data);
  } catch (error) {
    logger.error(`下载图片失败: ${imageUrl}`, error);
    return null;
  }
}

/**
 * 从URL中提取COS存储键
 * @param {string} url - 图片URL
 * @returns {string} COS存储键
 */
function extractCosKeyFromUrl(url) {
  try {
    // 解析URL，提取路径部分
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    
    // 去掉开头的斜杠
    return pathname.startsWith('/') ? pathname.substring(1) : pathname;
  } catch (error) {
    logger.error(`提取COS存储键失败: ${url}`, error);
    return null;
  }
}

module.exports = {
  getBestImageUrl: exports.getBestImageUrl,
  getImageVariants: exports.getImageVariants,
  getBatchImageUrls: exports.getBatchImageUrls,
  getVariantStats: exports.getVariantStats,
  generateVariantsOnDemand
};
