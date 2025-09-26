const sharp = require('sharp');
const { uploadToCOS, deleteFromCOS } = require('../config/cos');
const { sequelize } = require('../config/mysql');
const logger = require('../config/logger');

// 图片变体配置
const VARIANT_CONFIGS = {
  thumb: {
    width: 150,
    height: 100,
    quality: 80,
    format: 'jpeg',
    suffix: '_thumb'
  },
  small: {
    width: 300,
    height: 200,
    quality: 85,
    format: 'jpeg',
    suffix: '_small'
  },
  medium: {
    width: 600,
    height: 400,
    quality: 90,
    format: 'jpeg',
    suffix: '_medium'
  },
  large: {
    width: 1200,
    height: 800,
    quality: 95,
    format: 'jpeg',
    suffix: '_large'
  },
  webp: {
    width: 600,
    height: 400,
    quality: 85,
    format: 'webp',
    suffix: '_webp'
  }
};

/**
 * 生成图片变体
 * @param {Buffer} imageBuffer - 原始图片缓冲区
 * @param {string} originalUrl - 原始图片URL
 * @param {number} imageId - 图片ID
 * @param {string} filename - 文件名
 * @returns {Promise<Object>} 变体生成结果
 */
async function generateImageVariants(imageBuffer, originalUrl, imageId, filename) {
  const results = {};
  const errors = [];

  try {
    // 获取原始图片信息
    const imageInfo = await sharp(imageBuffer).metadata();
    logger.info(`开始为图片 ${imageId} 生成变体，原始尺寸: ${imageInfo.width}x${imageInfo.height}`);

    // 生成各种变体
    for (const [variantName, config] of Object.entries(VARIANT_CONFIGS)) {
      try {
        const variantResult = await generateSingleVariant(
          imageBuffer,
          originalUrl,
          imageId,
          filename,
          variantName,
          config,
          imageInfo
        );
        
        if (variantResult.success) {
          results[variantName] = variantResult;
        } else {
          errors.push({ variant: variantName, error: variantResult.error });
        }
      } catch (error) {
        logger.error(`生成变体 ${variantName} 失败:`, error);
        errors.push({ variant: variantName, error: error.message });
      }
    }

    // 保存变体信息到数据库
    if (Object.keys(results).length > 0) {
      await saveVariantsToDatabase(imageId, results);
    }

    return {
      success: Object.keys(results).length > 0,
      variants: results,
      errors: errors,
      totalVariants: Object.keys(results).length
    };

  } catch (error) {
    logger.error(`生成图片变体失败 (imageId: ${imageId}):`, error);
    throw error;
  }
}

/**
 * 生成单个变体
 * @param {Buffer} imageBuffer - 原始图片缓冲区
 * @param {string} originalUrl - 原始图片URL
 * @param {number} imageId - 图片ID
 * @param {string} filename - 文件名
 * @param {string} variantName - 变体名称
 * @param {Object} config - 变体配置
 * @param {Object} imageInfo - 原始图片信息
 * @returns {Promise<Object>} 变体生成结果
 */
async function generateSingleVariant(imageBuffer, originalUrl, imageId, filename, variantName, config, imageInfo) {
  try {
    // 计算目标尺寸（保持宽高比）
    const { targetWidth, targetHeight } = calculateTargetDimensions(
      imageInfo.width,
      imageInfo.height,
      config.width,
      config.height
    );

    // 生成变体图片
    const variantBuffer = await sharp(imageBuffer)
      .resize(targetWidth, targetHeight, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: config.quality })
      .toBuffer();

    // 生成变体文件名
    const baseName = filename.replace(/\.[^/.]+$/, '');
    const extension = config.format === 'webp' ? 'webp' : 'jpg';
    const variantFilename = `${baseName}${config.suffix}.${extension}`;

    // 生成COS存储路径
    const cosKey = generateVariantCosKey(originalUrl, variantFilename);

    // 上传到COS
    const cosResult = await uploadToCOS(variantBuffer, cosKey, `image/${config.format}`);

    // 获取变体图片信息
    const variantInfo = await sharp(variantBuffer).metadata();

    return {
      success: true,
      variant: variantName,
      url: cosResult.url,
      cosKey: cosKey,
      width: variantInfo.width,
      height: variantInfo.height,
      size: variantBuffer.length,
      format: config.format,
      quality: config.quality
    };

  } catch (error) {
    logger.error(`生成变体 ${variantName} 失败:`, error);
    return {
      success: false,
      variant: variantName,
      error: error.message
    };
  }
}

/**
 * 计算目标尺寸（保持宽高比）
 * @param {number} originalWidth - 原始宽度
 * @param {number} originalHeight - 原始高度
 * @param {number} maxWidth - 最大宽度
 * @param {number} maxHeight - 最大高度
 * @returns {Object} 目标尺寸
 */
function calculateTargetDimensions(originalWidth, originalHeight, maxWidth, maxHeight) {
  const aspectRatio = originalWidth / originalHeight;
  
  let targetWidth = maxWidth;
  let targetHeight = maxHeight;

  // 如果原图比目标尺寸小，不放大
  if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
    return { targetWidth: originalWidth, targetHeight: originalHeight };
  }

  // 根据宽高比计算目标尺寸
  if (aspectRatio > maxWidth / maxHeight) {
    // 宽图，以宽度为准
    targetHeight = Math.round(maxWidth / aspectRatio);
  } else {
    // 高图，以高度为准
    targetWidth = Math.round(maxHeight * aspectRatio);
  }

  return { targetWidth, targetHeight };
}

/**
 * 生成变体COS存储键
 * @param {string} originalUrl - 原始图片URL
 * @param {string} variantFilename - 变体文件名
 * @returns {string} COS存储键
 */
function generateVariantCosKey(originalUrl, variantFilename) {
  // 从原始URL提取路径信息
  const urlParts = originalUrl.split('/');
  const lastPart = urlParts[urlParts.length - 1];
  
  // 构建变体路径
  const variantPath = originalUrl.replace(lastPart, `variants/${variantFilename}`);
  
  // 提取COS键（去掉域名部分）
  const cosKey = variantPath.replace(/^https?:\/\/[^\/]+/, '');
  
  return cosKey.startsWith('/') ? cosKey.substring(1) : cosKey;
}

/**
 * 保存变体信息到数据库
 * @param {number} imageId - 图片ID
 * @param {Object} variants - 变体结果
 */
async function saveVariantsToDatabase(imageId, variants) {
  try {
    // 删除旧的变体记录
    await sequelize.query(
      'DELETE FROM image_assets WHERE imageId = ?',
      { replacements: [imageId] }
    );

    // 插入新的变体记录
    for (const [variantName, variantData] of Object.entries(variants)) {
      if (variantData.success) {
        await sequelize.query(`
          INSERT INTO image_assets (imageId, variant, url, width, height, size, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, {
          replacements: [
            imageId,
            variantName,
            variantData.url,
            variantData.width,
            variantData.height,
            variantData.size
          ]
        });
      }
    }

    logger.info(`图片 ${imageId} 的变体信息已保存到数据库，共 ${Object.keys(variants).length} 个变体`);

  } catch (error) {
    logger.error(`保存变体信息到数据库失败 (imageId: ${imageId}):`, error);
    throw error;
  }
}

/**
 * 获取图片的最佳变体URL
 * @param {number} imageId - 图片ID
 * @param {string} preferredVariant - 首选变体类型
 * @param {number} maxWidth - 最大宽度
 * @param {number} maxHeight - 最大高度
 * @returns {Promise<string>} 最佳变体URL
 */
async function getBestVariantUrl(imageId, preferredVariant = 'webp', maxWidth = 600, maxHeight = 400) {
  try {
    // 查询变体信息
    const variants = await sequelize.query(`
      SELECT variant, url, width, height, size
      FROM image_assets
      WHERE imageId = ?
      ORDER BY 
        CASE variant
          WHEN ? THEN 1
          WHEN 'webp' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'small' THEN 4
          WHEN 'thumb' THEN 5
          WHEN 'large' THEN 6
          ELSE 7
        END
    `, {
      replacements: [imageId, preferredVariant],
      type: sequelize.QueryTypes.SELECT
    });

    if (variants.length === 0) {
      // 如果没有变体，返回原图
      const originalImage = await sequelize.query(`
        SELECT url FROM images WHERE id = ?
      `, {
        replacements: [imageId],
        type: sequelize.QueryTypes.SELECT
      });
      
      return originalImage[0]?.url || '';
    }

    // 选择最适合的变体
    for (const variant of variants) {
      if (variant.width <= maxWidth && variant.height <= maxHeight) {
        return variant.url;
      }
    }

    // 如果没有合适的变体，返回第一个
    return variants[0].url;

  } catch (error) {
    logger.error(`获取最佳变体URL失败 (imageId: ${imageId}):`, error);
    return '';
  }
}

/**
 * 删除图片的所有变体
 * @param {number} imageId - 图片ID
 */
async function deleteImageVariants(imageId) {
  try {
    // 获取所有变体URL
    const variants = await sequelize.query(`
      SELECT url FROM image_assets WHERE imageId = ?
    `, {
      replacements: [imageId],
      type: sequelize.QueryTypes.SELECT
    });

    // 从COS删除变体文件
    for (const variant of variants) {
      try {
        await deleteFromCOS(variant.url);
      } catch (error) {
        logger.warn(`删除COS变体文件失败: ${variant.url}`, error);
      }
    }

    // 从数据库删除变体记录
    await sequelize.query(
      'DELETE FROM image_assets WHERE imageId = ?',
      { replacements: [imageId] }
    );

    logger.info(`图片 ${imageId} 的所有变体已删除`);

  } catch (error) {
    logger.error(`删除图片变体失败 (imageId: ${imageId}):`, error);
    throw error;
  }
}

/**
 * 批量生成现有图片的变体
 * @param {number} limit - 每次处理的图片数量
 * @param {number} offset - 偏移量
 */
async function batchGenerateVariants(limit = 10, offset = 0) {
  try {
    // 获取没有变体的图片
    const images = await sequelize.query(`
      SELECT i.id, i.url, i.filename
      FROM images i
      LEFT JOIN image_assets ia ON i.id = ia.imageId
      WHERE ia.imageId IS NULL
      LIMIT ? OFFSET ?
    `, {
      replacements: [limit, offset],
      type: sequelize.QueryTypes.SELECT
    });

    logger.info(`开始批量生成变体，处理 ${images.length} 张图片`);

    const results = [];
    for (const image of images) {
      try {
        // 这里需要从COS下载原图，然后生成变体
        // 由于需要下载原图，这个功能需要额外的实现
        logger.info(`跳过图片 ${image.id}，需要实现原图下载功能`);
        results.push({ imageId: image.id, status: 'skipped' });
      } catch (error) {
        logger.error(`处理图片 ${image.id} 失败:`, error);
        results.push({ imageId: image.id, status: 'error', error: error.message });
      }
    }

    return results;

  } catch (error) {
    logger.error('批量生成变体失败:', error);
    throw error;
  }
}

module.exports = {
  generateImageVariants,
  getBestVariantUrl,
  deleteImageVariants,
  batchGenerateVariants,
  VARIANT_CONFIGS
};
