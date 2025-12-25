/**
 * 自动向量化服务
 * 当图片上传到MySQL后，自动将其向量化并存入Qdrant
 */
const logger = require('../config/logger');
const imageVectorizeService = require('./imageVectorizeService');
const { upsertImageVector } = require('../config/qdrant');
const { Image, Model, Brand } = require('../models/mysql');

/**
 * 为单张图片生成向量并存入Qdrant
 * @param {number} imageId - 图片ID
 * @param {string} imageUrl - 图片URL（可选，如果不提供则从数据库查询）
 * @returns {Promise<Object>} 向量化结果
 */
async function vectorizeAndUpsertImage(imageId, imageUrl = null) {
  try {
    logger.info(`🚀 开始自动向量化: imageId=${imageId}`);

    // 如果没有提供图片URL，从数据库查询
    if (!imageUrl) {
      const image = await Image.findByPk(imageId, {
        include: [
          {
            model: Model,
            required: false,
            include: [
              {
                model: Brand,
                required: false,
                attributes: ['id', 'name', 'chineseName']
              }
            ]
          }
        ]
      });

      if (!image) {
        throw new Error(`图片不存在: imageId=${imageId}`);
      }

      imageUrl = image.url;

      // 构建payload（包含图片的元数据，用于过滤和展示）
      const payload = {
        image_id: imageId,
        title: image.title || '',
        description: image.description || '',
        category: image.category || '',
        model_id: image.modelId || null,
        model_name: image.Model?.name || '',
        brand_id: image.Model?.Brand?.id || null,
        brand_name: image.Model?.Brand?.name || '',
        brand_chinese_name: image.Model?.Brand?.chineseName || '',
        upload_date: image.uploadDate ? image.uploadDate.toISOString() : null
      };

      // 1. 向量化图片
      logger.info(`📸 开始向量化图片: ${imageUrl}`);
      const vector = await imageVectorizeService.encodeImage(imageUrl);

      // 2. 存入Qdrant
      logger.info(`💾 存入向量数据库: imageId=${imageId}`);
      const result = await upsertImageVector(imageId, vector, payload);

      logger.info(`✅ 图片自动向量化成功: imageId=${imageId}`);
      
      return {
        success: true,
        imageId,
        vectorized: true,
        upserted: result.success
      };
    } else {
      // 如果提供了图片URL，直接使用（适用于上传时立即调用的场景）
      logger.info(`📸 开始向量化图片: ${imageUrl}`);
      const vector = await imageVectorizeService.encodeImage(imageUrl);

      logger.info(`💾 存入向量数据库: imageId=${imageId}`);
      const result = await upsertImageVector(imageId, vector, {
        image_id: imageId
      });

      logger.info(`✅ 图片自动向量化成功: imageId=${imageId}`);
      
      return {
        success: true,
        imageId,
        vectorized: true,
        upserted: result.success
      };
    }
  } catch (error) {
    logger.error(`❌ 图片自动向量化失败 (imageId=${imageId}):`, error.message);
    
    // 不抛出错误，避免影响主流程
    return {
      success: false,
      imageId,
      error: error.message
    };
  }
}

/**
 * 异步触发图片向量化（不阻塞主流程）
 * @param {number} imageId - 图片ID
 * @param {string} imageUrl - 图片URL
 */
function triggerAsyncVectorization(imageId, imageUrl) {
  // 使用setTimeout将任务放到下一个事件循环，避免阻塞当前请求
  setTimeout(async () => {
    try {
      await vectorizeAndUpsertImage(imageId, imageUrl);
    } catch (error) {
      logger.error(`异步向量化失败 (imageId=${imageId}):`, error.message);
    }
  }, 0);

  logger.info(`⏰ 已触发异步向量化任务: imageId=${imageId}`);
}

/**
 * 批量向量化图片
 * @param {Array<number>} imageIds - 图片ID数组
 * @returns {Promise<Object>} 批量处理结果
 */
async function batchVectorizeImages(imageIds) {
  if (!Array.isArray(imageIds) || imageIds.length === 0) {
    throw new Error('图片ID数组不能为空');
  }

  logger.info(`📦 开始批量向量化: ${imageIds.length}张图片`);

  const results = {
    total: imageIds.length,
    success: 0,
    failed: 0,
    errors: []
  };

  for (const imageId of imageIds) {
    try {
      const result = await vectorizeAndUpsertImage(imageId);
      if (result.success) {
        results.success++;
      } else {
        results.failed++;
        results.errors.push({
          imageId,
          error: result.error
        });
      }
    } catch (error) {
      results.failed++;
      results.errors.push({
        imageId,
        error: error.message
      });
    }
  }

  logger.info(`✅ 批量向量化完成: 成功${results.success}/${results.total}`);

  return results;
}

/**
 * 检查向量化服务是否可用
 * @returns {Promise<boolean>}
 */
async function isVectorizeServiceAvailable() {
  try {
    const isAvailable = await imageVectorizeService.checkServiceHealth();
    return isAvailable;
  } catch (error) {
    logger.error('检查向量化服务失败:', error.message);
    return false;
  }
}

module.exports = {
  vectorizeAndUpsertImage,
  triggerAsyncVectorization,
  batchVectorizeImages,
  isVectorizeServiceAvailable
};







