const { Image, ImageAsset } = require('../models/mysql');
const { generateAndSaveAssets, selectBestVariant } = require('../services/assetService');
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

function getCacheKey(imageId) {
  return `image_${imageId}`;
}

function normalizeVariantInput(variant) {
  if (!variant || typeof variant !== 'string') {
    return '';
  }
  return variant.trim().toLowerCase();
}

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'y'].includes(normalized)) {
    return true;
  }
  if (['false', '0', 'no', 'n'].includes(normalized)) {
    return false;
  }

  return defaultValue;
}

function parseInteger(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const numeric = typeof value === 'number' ? value : parseInt(value, 10);
  return Number.isNaN(numeric) ? null : numeric;
}

function normalizeAssets(rawAssets) {
  if (!rawAssets) {
    return {};
  }

  if (Array.isArray(rawAssets)) {
    return rawAssets.reduce((acc, asset) => {
      if (!asset) return acc;
      const plain = typeof asset.get === 'function' ? asset.get({ plain: true }) : asset;
      if (!plain.variant) return acc;
      acc[plain.variant] = {
        url: plain.url,
        width: plain.width,
        height: plain.height,
        size: plain.size
      };
      return acc;
    }, {});
  }

  return Object.entries(rawAssets).reduce((acc, [variantKey, value]) => {
    if (!variantKey || !value) return acc;
    acc[variantKey] = typeof value === 'string'
      ? { url: value, width: null, height: null, size: null }
      : {
          url: value.url,
          width: value.width ?? null,
          height: value.height ?? null,
          size: value.size ?? null
        };
    return acc;
  }, {});
}

function getAssetUrl(entry) {
  if (!entry) return null;
  return typeof entry === 'string' ? entry : entry.url;
}

function flattenAssetsForResponse(assets) {
  if (!assets) {
    return {};
  }

  return Object.entries(assets).reduce((acc, [variant, entry]) => {
    const url = getAssetUrl(entry);
    if (url) {
      acc[variant] = url;
    }
    return acc;
  }, {});
}

function getVariantOrder(preferWebp, width) {
  let sizedOrder;

  if (width === null) {
    sizedOrder = ['medium', 'large', 'small', 'thumb'];
  } else if (width <= 360) {
    sizedOrder = ['thumb', 'small', 'medium', 'large'];
  } else if (width <= 900) {
    sizedOrder = ['small', 'medium', 'large', 'thumb'];
  } else if (width <= 1600) {
    sizedOrder = ['medium', 'large', 'small', 'thumb'];
  } else {
    sizedOrder = ['large', 'medium', 'small', 'thumb'];
  }

  return preferWebp ? ['webp', ...sizedOrder] : [...sizedOrder, 'webp'];
}

function resolveBestVariantSelection(assets, requestedVariant, preferWebp, fallbackUrl, targetWidth) {
  const normalizedAssets = normalizeAssets(assets);

  if (Object.keys(normalizedAssets).length === 0) {
    return {
      bestUrl: fallbackUrl,
      selectedVariant: 'original',
      assets: normalizedAssets
    };
  }

  if (requestedVariant && normalizedAssets[requestedVariant]) {
    return {
      bestUrl: getAssetUrl(normalizedAssets[requestedVariant]) || fallbackUrl,
      selectedVariant: requestedVariant,
      assets: normalizedAssets
    };
  }

  const order = getVariantOrder(preferWebp, targetWidth);
  for (const variant of order) {
    const entry = normalizedAssets[variant];
    const url = getAssetUrl(entry);
    if (url) {
      return {
        bestUrl: url,
        selectedVariant: variant,
        assets: normalizedAssets
      };
    }
  }

  const { variant, url } = selectBestVariant(normalizedAssets, preferWebp);
  if (variant && url) {
    return {
      bestUrl: url,
      selectedVariant: variant,
      assets: normalizedAssets
    };
  }

  return {
    bestUrl: fallbackUrl,
    selectedVariant: 'original',
    assets: normalizedAssets
  };
}

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

    const normalizedVariant = normalizeVariantInput(variant);
    const preferWebpFlag = parseBoolean(preferWebp, true);
    const requestedWidth = parseInteger(width);
    const requestedHeight = parseInteger(height);
    const targetWidth = requestedWidth ?? requestedHeight;
    const cacheKey = getCacheKey(imageId);
    const cached = cache.get(cacheKey);

    // 使用缓存数据（如果存在且未过期）
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      logger.info(`使用缓存数据 (imageId: ${imageId})`);
      
      const {
        assets: normalizedAssets,
        bestUrl,
        selectedVariant
      } = resolveBestVariantSelection(
        cached.assets,
        normalizedVariant,
        preferWebpFlag,
        cached.originalUrl,
        targetWidth
      );

      if (normalizedAssets !== cached.assets) {
        cached.assets = normalizedAssets;
      }

      const flatAssets = flattenAssetsForResponse(cached.assets);

      return res.json({
        success: true,
        data: {
          imageId: cached.imageId,
          originalUrl: cached.originalUrl,
          bestUrl,
          availableVariants: Object.keys(flatAssets),
          assets: flatAssets,
          assetDetails: cached.assets,
          selectedVariant,
          cached: true
        }
      });
    }

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

    let {
      assets,
      bestUrl,
      selectedVariant
    } = resolveBestVariantSelection(
      image.Assets,
      normalizedVariant,
      preferWebpFlag,
      image.url,
      targetWidth
    );

    // 只有在没有缓存时才检查变体文件是否存在
    let assetsToRegenerate = [];
    if (!cached) {
      assetsToRegenerate = await checkAndRegenerateMissingAssets(assets, imageId, image.url);
    }
    
    if (Object.keys(assets).length === 0 || assetsToRegenerate.length > 0) {
      try {
        logger.info(`图片 ${imageId} 没有变体或存在缺失变体，尝试按需生成...`);
        const generatedAssets = await generateVariantsOnDemand(imageId, image.url);

        if (generatedAssets && Object.keys(generatedAssets).length > 0) {
          const updatedImage = await Image.findByPk(imageId, {
            include: [{
              model: ImageAsset,
              as: 'Assets',
              attributes: ['variant', 'url', 'width', 'height', 'size']
            }]
          });

          ({ assets, bestUrl, selectedVariant } = resolveBestVariantSelection(
            updatedImage.Assets,
            normalizedVariant,
            preferWebpFlag,
            image.url,
            targetWidth
          ));
        }
      } catch (error) {
        logger.error(`按需生成变体失败 (imageId: ${imageId}):`, error);
      }
    }

    const numericImageId = parseInt(imageId, 10);
    const flatAssets = flattenAssetsForResponse(assets);
    const availableVariants = Object.keys(flatAssets);

    const responseData = {
      success: true,
      data: {
        imageId: Number.isNaN(numericImageId) ? imageId : numericImageId,
        originalUrl: image.url,
        bestUrl,
        availableVariants,
        assets: flatAssets,
        assetDetails: assets,
        selectedVariant
      }
    };

    if (Object.keys(assets).length > 0) {
      cache.set(cacheKey, {
        imageId: responseData.data.imageId,
        originalUrl: image.url,
        assets,
        timestamp: Date.now()
      });
    }

    return res.json(responseData);

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

    const variants = normalizeAssets(image.Assets);

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
      preferWebp = true,
      width,
      height
    } = req.query;

    const normalizedVariant = normalizeVariantInput(variant);
    const preferWebpFlag = parseBoolean(preferWebp, true);
    const requestedWidth = parseInteger(width);
    const requestedHeight = parseInteger(height);
    const targetWidth = requestedWidth ?? requestedHeight;

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
      const {
        assets,
        bestUrl,
        selectedVariant
      } = resolveBestVariantSelection(
        image.Assets,
        normalizedVariant,
        preferWebpFlag,
        image.url,
        targetWidth
      );

      const flatAssets = flattenAssetsForResponse(assets);

      acc[image.id] = {
        originalUrl: image.url,
        bestUrl,
        availableVariants: Object.keys(flatAssets),
        assets: flatAssets,
        assetDetails: assets,
        selectedVariant
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
 * 检查变体文件是否存在，返回需要重新生成的变体列表
 * @param {Object} assets - 变体资产对象
 * @param {number} imageId - 图片ID
 * @param {string} originalUrl - 原始图片URL
 * @returns {Promise<Array>} 需要重新生成的变体列表
 */
async function checkAndRegenerateMissingAssets(assets, imageId, originalUrl) {
  const missingVariants = [];
  
  logger.info(`检查图片 ${imageId} 的变体文件存在性...`);
  
  if (!assets || Object.keys(assets).length === 0) {
    logger.info(`图片 ${imageId} 没有变体记录，需要生成所有变体`);
    return ['thumb', 'small', 'medium', 'large', 'webp']; // 所有变体都需要生成
  }
  
  // 检查每个变体文件是否存在
  for (const [variant, asset] of Object.entries(assets)) {
    const url = getAssetUrl(asset);
    if (url) {
      try {
        logger.info(`检查变体文件: ${variant} - ${url}`);
        const response = await axios.head(url, { timeout: 5000 });
        if (response.status !== 200) {
          logger.warn(`变体文件不存在: ${variant} - ${url} (状态码: ${response.status})`);
          missingVariants.push(variant);
        } else {
          logger.info(`变体文件存在: ${variant}`);
        }
      } catch (error) {
        logger.warn(`检查变体文件失败: ${variant} - ${url}`, error.message);
        missingVariants.push(variant);
      }
    }
  }
  
  logger.info(`图片 ${imageId} 缺失的变体: ${missingVariants.join(', ')}`);
  return missingVariants;
}

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
