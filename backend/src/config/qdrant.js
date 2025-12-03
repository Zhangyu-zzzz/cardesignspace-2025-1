const { QdrantClient } = require('@qdrant/js-client-rest');
const logger = require('./logger');

// Qdrant连接配置
const qdrantConfig = {
  url: process.env.QDRANT_URL || 'http://49.235.98.5:6333',
  apiKey: process.env.QDRANT_API_KEY || null
};

// 创建Qdrant客户端（添加超时配置）
const qdrantClient = new QdrantClient({
  url: qdrantConfig.url,
  apiKey: qdrantConfig.apiKey,
  timeout: 10000 // 10秒超时
});

// 默认集合名称
const DEFAULT_COLLECTION = process.env.QDRANT_COLLECTION || 'car_images';

/**
 * 测试Qdrant连接
 */
async function testQdrantConnection() {
  try {
    const result = await qdrantClient.getCollections();
    const collections = result.collections || [];
    logger.info('Qdrant连接成功', { collections: collections.map(c => c.name) });
    return true;
  } catch (error) {
    logger.error('Qdrant连接失败:', error.message);
    return false;
  }
}

/**
 * 获取集合信息
 */
async function getCollectionInfo(collectionName = DEFAULT_COLLECTION) {
  try {
    const info = await qdrantClient.getCollection(collectionName);
    return info;
  } catch (error) {
    logger.error(`获取集合 ${collectionName} 信息失败:`, error.message);
    // 如果集合不存在，返回null而不是抛出错误
    if (error.message && error.message.includes('doesn\'t exist')) {
      return null;
    }
    throw error;
  }
}

/**
 * 向量搜索
 * @param {Array<number>} queryVector - 查询向量
 * @param {Object} options - 搜索选项
 * @param {number} options.limit - 返回结果数量
 * @param {number} options.score_threshold - 相似度阈值
 * @param {Object} options.filter - 过滤条件
 * @param {string} collectionName - 集合名称
 */
async function searchVectors(queryVector, options = {}, collectionName = DEFAULT_COLLECTION) {
  try {
    const {
      limit = 10,
      score_threshold = 0.0,
      filter = null,
      imageIds = null // 新增：图片 ID 列表，用于过滤
    } = options;

    // 构建搜索参数
    // @qdrant/js-client-rest v1.9.0的search方法签名：search(collectionName, { vector, limit, score_threshold, ... })
    const searchParams = {
      vector: queryVector,
      limit,
      score_threshold,
      with_payload: true,
      with_vector: false
    };

    // 如果传入了图片 ID 列表，构建 filter
    if (imageIds && Array.isArray(imageIds) && imageIds.length > 0) {
      // Qdrant filter 格式：根据 image_id 字段过滤
      // 注意：Qdrant JS 客户端使用 Filter 对象，需要匹配 payload 中的字段
      // 如果 imageIds 数量很大，可能需要分批处理，但这里先尝试全部传入
      try {
        // Qdrant filter 格式：根据 image_id 字段过滤
        // 根据 @qdrant/js-client-rest 文档，filter 格式为：
        // { must: [{ key: 'field', match: { any: [values] } }] }
        const limitedImageIds = imageIds.slice(0, 1000); // 限制最多 1000 个 ID，避免 filter 过大
        
        searchParams.filter = {
          must: [
            {
              key: 'image_id',
              match: {
                any: limitedImageIds
              }
            }
          ]
        };
        logger.info(`🔍 应用图片 ID 过滤: ${limitedImageIds.length} 个 ID (总共 ${imageIds.length} 个)`);
        logger.debug(`Filter 结构:`, JSON.stringify(searchParams.filter, null, 2));
      } catch (filterError) {
        logger.error('构建 filter 失败:', filterError.message);
        logger.error('Filter 错误堆栈:', filterError.stack);
        // 如果构建 filter 失败，不应用过滤，搜索全部
        logger.warn('⚠️  filter 构建失败，将搜索全部图片');
      }
    } else if (filter) {
      // 如果传入了自定义 filter，使用它
      searchParams.filter = filter;
    }

    logger.info(`🔍 执行Qdrant搜索: collection=${collectionName}, limit=${limit}, threshold=${score_threshold}, vectorLength=${queryVector.length}`);
    logger.info(`搜索参数详情:`, JSON.stringify({
      limit: searchParams.limit,
      score_threshold: searchParams.score_threshold,
      with_payload: searchParams.with_payload,
      hasFilter: !!searchParams.filter,
      vectorType: Array.isArray(queryVector) ? 'array' : typeof queryVector,
      vectorLength: queryVector?.length
    }));
    
    // @qdrant/js-client-rest的search方法：search(collectionName, searchParams)
    const results = await qdrantClient.search(collectionName, searchParams);
    
    logger.info(`📊 Qdrant搜索完成: 返回 ${results?.length || 0} 个结果`);
    logger.info(`结果类型: ${Array.isArray(results) ? 'array' : typeof results}`);
    
    // 调试：记录返回结果的结构
    if (results && Array.isArray(results) && results.length > 0) {
      logger.info(`✅ Qdrant搜索返回 ${results.length} 个结果`);
      const firstResult = results[0];
      logger.info(`第一个结果结构:`, {
        id: firstResult.id,
        idType: typeof firstResult.id,
        score: firstResult.score,
        hasPayload: !!firstResult.payload,
        payloadKeys: firstResult.payload ? Object.keys(firstResult.payload) : [],
        payloadImageId: firstResult.payload?.image_id || firstResult.payload?.imageId || '未找到'
      });
    } else {
      logger.warn(`⚠️  Qdrant搜索返回空结果 (阈值: ${score_threshold}, 限制: ${limit})`);
      logger.warn(`结果详情:`, {
        isNull: results === null,
        isUndefined: results === undefined,
        isArray: Array.isArray(results),
        type: typeof results,
        length: results?.length
      });
    }
    
    // 确保返回数组
    if (!results) {
      logger.warn('Qdrant搜索返回null或undefined，返回空数组');
      return [];
    }
    
    return Array.isArray(results) ? results : [];
  } catch (error) {
    logger.error('❌ 向量搜索失败:', error.message);
    logger.error('错误堆栈:', error.stack);
    logger.error('搜索参数:', {
      collectionName,
      vectorLength: queryVector?.length,
      limit: options.limit,
      score_threshold: options.score_threshold,
      hasFilter: !!options.filter
    });
    throw error;
  }
}

/**
 * 文本查询 - 使用CLIP模型将文本转换为向量，然后进行向量相似度搜索
 */
async function searchByText(queryText, options = {}, collectionName = DEFAULT_COLLECTION) {
  try {
    if (!queryText || !queryText.trim()) {
      return [];
    }

    // 尝试使用CLIP服务进行文本向量化
    let queryVector = null;
    try {
      logger.info(`📝 开始文本向量化: "${queryText}"`);
      // 优先使用集成版CLIP服务（直接调用Python），如果失败则回退到HTTP服务
      let useIntegrated = true;
      
      try {
        // 尝试使用集成版（直接调用Python脚本）
        const integratedClient = require('../services/clip_vectorize_service');
        queryVector = await integratedClient.encodeText(queryText);
        logger.info(`✅ 使用集成版CLIP服务完成向量化`);
      } catch (integratedError) {
        // 检查是否是依赖缺失错误（应该回退到HTTP服务）
        const isDepsMissing = integratedError.message === 'CLIP_PYTHON_DEPS_MISSING' || 
                              integratedError.message.includes('CLIP_PYTHON_DEPS_MISSING');
        
        if (isDepsMissing) {
          logger.warn(`⚠️  Python依赖缺失，回退到HTTP CLIP服务`);
        } else {
          logger.warn(`集成版CLIP服务失败: ${integratedError.message}，尝试使用HTTP服务`);
        }
        
        useIntegrated = false;
        
        // 回退到HTTP服务
        try {
          const httpClient = require('../services/clip_vectorize_client');
          queryVector = await httpClient.encodeText(queryText);
          logger.info(`✅ 使用HTTP CLIP服务完成向量化`);
        } catch (httpError) {
          logger.error(`HTTP CLIP服务也失败: ${httpError.message}`);
          
          // 如果HTTP服务也失败，尝试使用payload过滤作为最后备选
          logger.warn(`⚠️  所有CLIP服务都失败，尝试使用payload过滤搜索`);
          return await searchByTextFallback(queryText, options, collectionName);
        }
      }
      
      // 验证向量格式
      if (!Array.isArray(queryVector)) {
        throw new Error(`向量格式错误: 期望数组，实际得到${typeof queryVector}`);
      }
      if (queryVector.length !== 512) {
        throw new Error(`向量维度错误: 期望512维，实际${queryVector.length}维`);
      }
      
      logger.info(`✅ 文本向量化成功: "${queryText}" -> ${queryVector.length}维向量 (使用${useIntegrated ? '集成版' : 'HTTP服务'})`);
    } catch (clipError) {
      logger.error(`❌ CLIP向量化失败: ${clipError.message}`);
      logger.error(`错误堆栈:`, clipError.stack);
      // 如果所有CLIP服务都失败，回退到payload过滤
      logger.warn(`⚠️  所有CLIP服务都失败，使用payload过滤搜索`);
      return await searchByTextFallback(queryText, options, collectionName);
    }

    // 使用向量进行相似度搜索
    // 参考daydayup-1项目：使用score_threshold=0.0，不限制阈值，让Qdrant返回top_k个最相似的结果
    // 这样可以确保总是有结果返回，然后通过limit控制数量
    const scoreThreshold = options.score_threshold !== undefined ? options.score_threshold : 0.0;
    
    // 确保limit足够大，获取足够的结果
    const searchLimit = options.limit || 50; // 默认50个，参考daydayup-1
    
    // 传递 imageIds 参数（如果存在）
    const searchOptions = {
      ...options,
      limit: searchLimit,
      score_threshold: scoreThreshold
    };
    
    // 如果 options 中有 imageIds，传递给 searchVectors
    if (options.imageIds) {
      searchOptions.imageIds = options.imageIds;
    }
    
    const results = await searchVectors(queryVector, searchOptions, collectionName);

    logger.info(`✅ 向量搜索 "${queryText}" 返回 ${results.length} 个结果 (阈值: ${scoreThreshold}, 限制: ${searchLimit})`);
    
    // 确保返回数组
    if (!Array.isArray(results)) {
      logger.warn(`⚠️  向量搜索返回非数组类型: ${typeof results}`);
      return [];
    }
    
    return results;
  } catch (error) {
    logger.error('❌ 文本搜索失败:', error.message);
    logger.error('错误堆栈:', error.stack);
    logger.error('搜索参数:', {
      queryText,
      options,
      collectionName
    });
    
    // 如果向量搜索失败，尝试回退到payload过滤
    try {
      logger.info('尝试回退到payload过滤搜索...');
      return await searchByTextFallback(queryText, options, collectionName);
    } catch (fallbackError) {
      logger.error('❌ 回退搜索也失败:', fallbackError.message);
      logger.error('回退搜索错误堆栈:', fallbackError.stack);
      return [];
    }
  }
}

/**
 * 文本搜索回退方案 - 使用payload过滤
 */
async function searchByTextFallback(queryText, options = {}, collectionName = DEFAULT_COLLECTION) {
  try {
    const searchTerms = queryText.toLowerCase().split(/\s+/).filter(t => t.length > 0);
    
    // 构建过滤条件：搜索payload中的文本字段
    const filter = {
      should: [
        {
          key: 'description',
          match: {
            text: queryText
          }
        },
        ...searchTerms.map(term => ({
          key: 'tags',
          match: {
            any: [term]
          }
        }))
      ],
      min_should: 1
    };

    // 获取集合信息以确定向量维度
    let vectorDimension = 512;
    try {
      const collectionInfo = await getCollectionInfo(collectionName);
      if (collectionInfo && collectionInfo.config && collectionInfo.config.params) {
        const vectorsConfig = collectionInfo.config.params.vectors;
        if (vectorsConfig && vectorsConfig.size) {
          vectorDimension = vectorsConfig.size;
        }
      }
    } catch (err) {
      logger.warn(`无法获取集合信息，使用默认向量维度 ${vectorDimension}`);
    }

    // 使用零向量进行搜索（仅依赖payload过滤）
    const dummyVector = new Array(vectorDimension).fill(0);
    
    const results = await searchVectors(dummyVector, {
      ...options,
      filter,
      score_threshold: 0.0
    }, collectionName);

    logger.info(`文本搜索（回退方案） "${queryText}" 返回 ${results.length} 个结果`);
    return results;
  } catch (error) {
    logger.error('回退搜索失败:', error.message);
    return [];
  }
}

/**
 * 使用向量进行搜索（需要先提供向量化的查询向量）
 * @param {Array<number>} queryVector - 已向量化的查询向量
 * @param {Object} options - 搜索选项
 * @param {string} collectionName - 集合名称
 */
async function searchByVector(queryVector, options = {}, collectionName = DEFAULT_COLLECTION) {
  try {
    return await searchVectors(queryVector, options, collectionName);
  } catch (error) {
    logger.error('向量搜索失败:', error.message);
    throw error;
  }
}

module.exports = {
  qdrantClient,
  DEFAULT_COLLECTION,
  testQdrantConnection,
  getCollectionInfo,
  searchVectors,
  searchByText,
  searchByVector
};

