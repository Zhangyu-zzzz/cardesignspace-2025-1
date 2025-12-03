const { Op } = require('sequelize');
const { Brand, Model, Image, ImageAsset } = require('../models/mysql');
const { searchByText, DEFAULT_COLLECTION } = require('../config/qdrant');
const logger = require('../config/logger');

/**
 * 智能搜索 - 混合搜索（关系数据库 + 向量数据库）
 * 策略：
 * 1. 解析查询，分离品牌信息（如 "bmw"）和描述性信息（如 "red"）
 * 2. 如果检测到品牌，先用 MySQL 筛选该品牌的所有图片 ID
 * 3. 在筛选出的图片中，使用向量搜索找到与描述性信息相似的图片
 * 4. 如果没有品牌，则直接进行向量搜索
 */
exports.smartSearch = async (req, res, next) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;

    if (!q || !q.trim()) {
      return res.status(400).json({
        status: 'error',
        message: '搜索查询不能为空'
      });
    }

    const query = q.trim();
    const startTime = Date.now();

    logger.info(`🔍 混合搜索请求: query="${query}", page=${page}, limit=${limit}`);

    // 步骤1: 解析查询，分离品牌信息和描述性信息
    const { brandInfo, descriptiveQuery } = await parseQuery(query);
    
    logger.info(`查询解析结果:`, {
      hasBrand: !!brandInfo,
      brandName: brandInfo?.name || '无',
      brandId: brandInfo?.id || '无',
      descriptiveQuery: descriptiveQuery || '无',
      originalQuery: query
    });

    // 步骤2: 如果检测到品牌，先用 MySQL 筛选该品牌的所有图片 ID
    let brandImageIds = [];
    if (brandInfo) {
      try {
        brandImageIds = await getBrandImageIds(brandInfo.id);
        logger.info(`品牌 "${brandInfo.name}" 筛选出 ${brandImageIds.length} 张图片`);
        
        if (brandImageIds.length === 0) {
          // 如果该品牌没有图片，直接返回空结果
          return res.json({
            status: 'success',
            data: {
              images: [],
              pagination: {
                total: 0,
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 20,
                pages: 0,
                hasMore: false
              },
              searchInfo: {
                query,
                brandInfo: { id: brandInfo.id, name: brandInfo.name },
                brandImageIdsCount: 0,
                vectorResultsCount: 0
              }
            }
          });
        }
      } catch (brandError) {
        logger.error('❌ 查询品牌图片失败:', brandError.message);
        // 如果品牌查询失败，继续使用向量搜索（不限制品牌）
        brandImageIds = [];
      }
    }

    // 步骤3: 如果查询包含中文，先翻译成英文
    const translateClient = require('../services/translateClient');
    const vectorQuery = descriptiveQuery || query; // 如果没有描述性信息，使用整个查询
    const translationResult = await translateClient.smartTranslate(vectorQuery);
    const finalVectorQuery = translationResult.translated; // 使用翻译后的查询
    
    if (translationResult.isTranslated) {
      logger.info(`🌐 查询已翻译: "${translationResult.original}" -> "${finalVectorQuery}"`);
    }
    
    // 步骤4: 执行向量搜索
    // 如果有品牌筛选，只在这些图片的向量中搜索；否则搜索全部
    let vectorResults = [];
    
    try {
      logger.info(`🚀 开始向量搜索: query="${finalVectorQuery}"${brandImageIds.length > 0 ? `, 限制在 ${brandImageIds.length} 张品牌图片中` : ''}`);
      
      // 获取足够多的结果用于分页
      // 统一返回100-500个结果（默认200个），支持更多翻页
      const searchLimit = Math.min(Math.max(parseInt(limit) * 10, 100), 500);
      
      // 如果有品牌筛选，传入图片 ID 列表作为 filter
      const searchOptions = {
        limit: searchLimit,
        score_threshold: 0.0,
        imageIds: brandImageIds.length > 0 ? brandImageIds : null // 传入图片 ID 列表
      };
      
      logger.info(`向量搜索参数: limit=${searchLimit}, score_threshold=0.0, hasBrandFilter=${brandImageIds.length > 0}`);
      
      const searchStartTime = Date.now();
      vectorResults = await searchByText(finalVectorQuery, searchOptions);
      const searchDuration = Date.now() - searchStartTime;
      
      logger.info(`✅ 向量搜索完成: "${finalVectorQuery}" 返回 ${vectorResults.length} 个结果 (耗时: ${searchDuration}ms)`);
      
      // 验证结果格式
      if (!Array.isArray(vectorResults)) {
        logger.error(`❌ 向量搜索结果格式错误: 期望数组，实际得到${typeof vectorResults}`);
        vectorResults = [];
      }
    } catch (vectorError) {
      logger.error('❌ 向量搜索异常:', vectorError.message);
      logger.error('错误堆栈:', vectorError.stack);
      vectorResults = [];
    }

    // 步骤5: 从向量结果中提取图片 ID
    const imageIds = extractImageIds(vectorResults);
    logger.info(`从向量结果中提取到 ${imageIds.length} 个唯一图片 ID`);

    // 步骤6: 从 MySQL 获取完整图片信息
    let images = [];
    if (imageIds.length > 0) {
      try {
        // 限制查询数量，避免 SQL 查询过大
        const maxQueryLimit = Math.min(imageIds.length, 500);
        const queryImageIds = imageIds.slice(0, maxQueryLimit);
        
        logger.info(`准备查询 ${queryImageIds.length} 个图片的详细信息`);
        
        // 构建查询条件：如果有品牌筛选，添加品牌过滤
        const imageWhere = {
          id: { [Op.in]: queryImageIds }
        };
        
        const modelInclude = {
          model: Model,
          required: false,
          include: [
            {
              model: Brand,
              required: false,
              attributes: ['id', 'name', 'chineseName', 'logo']
            }
          ]
        };
        
        // 如果有品牌筛选，添加品牌过滤条件（后置过滤，确保即使 Qdrant filter 失效也能过滤）
        if (brandInfo && brandImageIds.length > 0) {
          modelInclude.where = {
            brandId: brandInfo.id,
            isActive: true
          };
          modelInclude.required = true; // 必须匹配品牌
          logger.info(`🔍 应用后置品牌过滤: 只返回品牌 "${brandInfo.name}" 的图片`);
        }
        
        const dbImages = await Image.findAll({
          where: imageWhere,
          include: [
            modelInclude,
            {
              model: ImageAsset,
              as: 'Assets',
              required: false,
              attributes: ['variant', 'url', 'width', 'height', 'size']
            }
          ],
          attributes: ['id', 'url', 'title', 'description', 'modelId', 'createdAt'], // 只查询需要的字段
          raw: false,
          nest: true
        });
        
        // 创建 ID 到相似度分数的映射（用于排序）
        const scoreMap = new Map();
        vectorResults.forEach(result => {
          const imageId = result.payload?.image_id || result.payload?.imageId || result.id;
          if (imageId && result.score !== undefined) {
            const id = typeof imageId === 'string' ? parseInt(imageId) : imageId;
            if (!isNaN(id) && id > 0) {
              scoreMap.set(id, result.score);
            }
          }
        });
        
        // 格式化图片数据
        images = dbImages.map(img => {
          const data = img.toJSON();
          const assetsMap = Array.isArray(data.Assets)
            ? data.Assets.reduce((acc, a) => {
                acc[a.variant] = a.url;
                return acc;
              }, {})
            : {};
          
          const modelData = data.Model || {};
          const score = scoreMap.get(img.id) || 0;
          
          return {
            ...data,
            bestUrl: chooseBestUrl(assetsMap, true) || data.url,
            model: modelData,
            brand: modelData.Brand,
            vectorScore: score, // 保存相似度分数用于排序
            source: 'hybrid'
          };
        });
        
        // 后置品牌过滤：如果检测到品牌但 Qdrant filter 可能失效，再次过滤
        // 这是最后一道防线，确保只返回指定品牌的图片
        if (brandInfo) {
          const beforeFilterCount = images.length;
          images = images.filter(img => {
            const imgBrand = img.brand;
            if (!imgBrand) {
              logger.debug(`图片 ${img.id} 没有品牌信息，过滤掉`);
              return false;
            }
            // 检查品牌 ID 或名称是否匹配（支持中英文名称匹配）
            const brandMatch = imgBrand.id === brandInfo.id || 
                               imgBrand.name?.toLowerCase() === brandInfo.name.toLowerCase() ||
                               (brandInfo.chineseName && imgBrand.chineseName && 
                                imgBrand.chineseName === brandInfo.chineseName);
            
            if (!brandMatch) {
              logger.debug(`图片 ${img.id} 品牌不匹配: ${imgBrand.name} (${imgBrand.chineseName || '无'}) != ${brandInfo.name} (${brandInfo.chineseName || '无'})`);
            }
            return brandMatch;
          });
          const afterFilterCount = images.length;
          if (beforeFilterCount !== afterFilterCount) {
            logger.info(`🔍 后置品牌过滤: ${beforeFilterCount} -> ${afterFilterCount} (过滤掉 ${beforeFilterCount - afterFilterCount} 张其他品牌图片)`);
          } else if (beforeFilterCount > 0) {
            logger.info(`✅ 后置品牌过滤: 所有 ${beforeFilterCount} 张图片都是品牌 "${brandInfo.name}" 的`);
          }
        } else {
          // 如果品牌检测失败，尝试从查询中再次提取品牌信息（可能是映射表的问题）
          // 这是一个备用方案，确保即使第一次检测失败，也能在结果中过滤
          logger.warn(`⚠️  品牌检测失败，但尝试在结果中查找可能的品牌匹配`);
          const queryLower = query.toLowerCase();
          const queryWords = queryLower.split(/[,\s]+/).filter(w => w.length > 0);
          
          // 检查查询中是否包含映射表中的关键词
          for (const queryWord of queryWords) {
            const mapping = BRAND_NAME_MAPPING[queryWord];
            if (mapping) {
              logger.info(`在查询中发现可能的品牌关键词: "${queryWord}" -> ${JSON.stringify(mapping)}`);
              // 在结果中查找匹配的品牌
              const matchedBrands = new Set();
              images.forEach(img => {
                const imgBrand = img.brand;
                if (imgBrand && imgBrand.chineseName) {
                  for (const keyword of mapping) {
                    if (imgBrand.chineseName.includes(keyword)) {
                      matchedBrands.add(imgBrand.id);
                    }
                  }
                }
              });
              
              // 如果找到了匹配的品牌，只保留这些品牌的图片
              if (matchedBrands.size > 0) {
                const beforeFilterCount = images.length;
                images = images.filter(img => {
                  const imgBrand = img.brand;
                  return imgBrand && matchedBrands.has(imgBrand.id);
                });
                const afterFilterCount = images.length;
                logger.info(`🔍 备用品牌过滤: ${beforeFilterCount} -> ${afterFilterCount} (基于关键词 "${queryWord}")`);
                break; // 只处理第一个匹配的关键词
              }
            }
          }
        }
        
        // 按相似度分数降序排序（分数越高越相似）
        images.sort((a, b) => (b.vectorScore || 0) - (a.vectorScore || 0));
        
        logger.info(`成功获取 ${images.length} 个图片的详细信息`);
      } catch (dbError) {
        logger.error('❌ 查询图片详细信息失败:', dbError.message);
        logger.error('数据库查询错误堆栈:', dbError.stack);
        images = [];
      }
    }

    // 步骤7: 分页处理（支持无限滚动）
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const pageOffset = (pageNum - 1) * limitNum;
    const totalCount = images.length;
    
    // 返回当前页的结果
    const paginatedResults = images.slice(pageOffset, pageOffset + limitNum);
    const hasMore = pageOffset + limitNum < totalCount;

    const duration = Date.now() - startTime;
    logger.info(`✅ 搜索完成: 耗时=${duration}ms, 品牌筛选=${brandImageIds.length}, 向量结果=${vectorResults.length}, 图片=${images.length}, 返回=${paginatedResults.length}, 还有更多=${hasMore}`);

    res.json({
      status: 'success',
      data: {
        images: paginatedResults,
        pagination: {
          total: totalCount,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(totalCount / limitNum),
          hasMore: hasMore
        },
        searchInfo: {
          query,
          originalQuery: translationResult.original,
          translatedQuery: translationResult.isTranslated ? translationResult.translated : null,
          isTranslated: translationResult.isTranslated,
          brandInfo: brandInfo ? { id: brandInfo.id, name: brandInfo.name } : null,
          brandImageIdsCount: brandImageIds.length,
          vectorResultsCount: vectorResults.length
        }
      }
    });
  } catch (error) {
    logger.error('❌ 智能搜索失败:', error.message);
    logger.error('错误堆栈:', error.stack);
    logger.error('错误详情:', {
      message: error.message,
      name: error.name,
      query: req.query.q,
      page: req.query.page,
      limit: req.query.limit,
      stack: error.stack?.split('\n').slice(0, 10).join('\n')
    });
    
    // 返回详细的错误信息（开发环境）
    const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
    res.status(500).json({
      status: 'error',
      message: '搜索失败',
      error: isDev ? error.message : '服务器内部错误',
      stack: isDev ? error.stack?.split('\n').slice(0, 20).join('\n') : undefined,
      details: isDev ? {
        name: error.name,
        query: req.query.q,
        page: req.query.page,
        limit: req.query.limit
      } : undefined
    });
  }
};

/**
 * 解析查询，分离品牌信息和描述性信息
 * 例如："red, bmw" -> { brandInfo: {id, name}, descriptiveQuery: "red" }
 */
async function parseQuery(query) {
  try {
    // 先尝试从查询中提取品牌信息
    const brandInfo = await extractBrandFromQuery(query);
    
    // 如果检测到品牌，尝试从查询中移除品牌名称，得到描述性查询
    let descriptiveQuery = query;
    if (brandInfo) {
      // 移除品牌名称（不区分大小写）
      const brandNameRegex = new RegExp(brandInfo.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      descriptiveQuery = query.replace(brandNameRegex, '').trim();
      
      // 移除品牌中文名称（如果存在）
      if (brandInfo.chineseName) {
        const brandChineseNameRegex = new RegExp(brandInfo.chineseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        descriptiveQuery = descriptiveQuery.replace(brandChineseNameRegex, '').trim();
      }
      
      // 移除映射表中的关键词（如 "mg" -> "名爵"）
      const queryLower = query.toLowerCase();
      for (const [key, keywords] of Object.entries(BRAND_NAME_MAPPING)) {
        if (queryLower.includes(key.toLowerCase())) {
          for (const keyword of keywords) {
            if (descriptiveQuery.includes(keyword)) {
              descriptiveQuery = descriptiveQuery.replace(new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '').trim();
            }
          }
        }
      }
      
      // 清理多余的逗号和空格
      descriptiveQuery = descriptiveQuery.replace(/[,，\s]+/g, ' ').trim();
      
      // 如果移除品牌后没有剩余内容，使用整个查询作为描述性查询
      if (!descriptiveQuery) {
        descriptiveQuery = query;
      }
      
      logger.debug(`描述性查询提取: "${query}" -> "${descriptiveQuery}"`);
    }
    
    return {
      brandInfo: brandInfo || null,
      descriptiveQuery: descriptiveQuery || query
    };
  } catch (error) {
    logger.error('解析查询失败:', error.message);
    // 如果解析失败，返回整个查询作为描述性查询
    return {
      brandInfo: null,
      descriptiveQuery: query
    };
  }
}

/**
 * 品牌名称映射表：英文缩写/别名 -> 中文名称关键词
 * 用于处理中国品牌只有中文名称的情况（如 "MG" -> "名爵"）
 */
const BRAND_NAME_MAPPING = {
  'mg': ['名爵', '上汽名爵', 'mg'],
  'mg名爵': ['名爵', '上汽名爵'],
  '上汽名爵': ['名爵', 'mg'],
  '名爵': ['mg', '上汽名爵'],
  // 可以继续添加其他映射
  'byd': ['比亚迪', 'byd'],
  '比亚迪': ['byd'],
  'geely': ['吉利', 'geely'],
  '吉利': ['geely'],
  'great wall': ['长城', '哈弗'],
  '长城': ['great wall', '哈弗'],
  'haval': ['哈弗', 'haval'],
  '哈弗': ['haval', '长城'],
  'chery': ['奇瑞', 'chery'],
  '奇瑞': ['chery'],
  'gac': ['广汽', 'gac'],
  '广汽': ['gac'],
  'saic': ['上汽', 'saic'],
  '上汽': ['saic']
};

/**
 * 从查询中提取品牌信息
 * 支持中英文混合匹配，包括中国品牌只有中文名称的情况
 */
async function extractBrandFromQuery(query) {
  try {
    // 查询所有品牌（不过滤isActive，因为Brand表可能没有这个字段）
    const brands = await Brand.findAll({
      attributes: ['id', 'name', 'chineseName']
    });
    
    // 在查询文本中查找品牌名称（不区分大小写）
    const queryLower = query.toLowerCase();
    // 将查询按逗号、空格分割成单词列表，方便匹配
    const queryWords = queryLower.split(/[,\s]+/).filter(w => w.length > 0);
    
    // 步骤1: 优先检查中文品牌名称（直接字符串包含匹配，不依赖空格分词）
    for (const brand of brands) {
      const brandChineseName = brand.chineseName || '';
      
      // 如果品牌有中文名称，检查是否在查询中（中文不需要单词边界）
      if (brandChineseName && query.includes(brandChineseName)) {
        logger.info(`✅ 检测到品牌（中文匹配）: ${brand.name} (${brandChineseName})`);
        return {
          id: brand.id,
          name: brand.name,
          chineseName: brand.chineseName
        };
      }
    }
    
    // 步骤2: 检查英文品牌名称
    for (const brand of brands) {
      const brandNameLower = brand.name.toLowerCase();
      
      // 检查是否在查询单词列表中（完全匹配）
      if (queryWords.includes(brandNameLower)) {
        logger.info(`✅ 检测到品牌（英文完全匹配）: ${brand.name} (${brand.chineseName || '无中文名'})`);
        return {
          id: brand.id,
          name: brand.name,
          chineseName: brand.chineseName
        };
      }
      
      // 使用单词边界匹配英文品牌名（确保是完整单词）
      const brandNameRegex = new RegExp(`\\b${brandNameLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (brandNameRegex.test(query)) {
        logger.info(`✅ 检测到品牌（英文正则匹配）: ${brand.name} (${brand.chineseName || '无中文名'})`);
        return {
          id: brand.id,
          name: brand.name,
          chineseName: brand.chineseName
        };
      }
    }
    
    // 步骤2: 尝试通过品牌名称映射表匹配（处理中国品牌只有中文名称的情况）
    for (const queryWord of queryWords) {
      const mapping = BRAND_NAME_MAPPING[queryWord];
      if (mapping) {
        logger.debug(`找到映射: "${queryWord}" -> ${JSON.stringify(mapping)}`);
        // 在品牌列表中查找匹配的中文名称
        for (const brand of brands) {
          const brandChineseName = brand.chineseName || '';
          const brandNameLower = brand.name.toLowerCase();
          
          // 检查品牌的中文名称或英文名称是否在映射的关键词列表中
          for (const keyword of mapping) {
            if (brandChineseName.includes(keyword) || 
                brandNameLower.includes(keyword.toLowerCase())) {
              logger.info(`✅ 检测到品牌（映射匹配）: ${brand.name} (${brand.chineseName || '无中文名'}) <- "${queryWord}"`);
              return {
                id: brand.id,
                name: brand.name,
                chineseName: brand.chineseName
              };
            }
          }
        }
      }
    }
    
    // 步骤3: 如果精确匹配失败，尝试部分匹配（用于处理 "mg"、"bmw" 这样的缩写）
    // 优先匹配较短的品牌名称（如 "MG" 比 "BMW" 短，更容易被误匹配）
    const sortedBrands = [...brands].sort((a, b) => a.name.length - b.name.length);
    
    for (const brand of sortedBrands) {
      const brandNameLower = brand.name.toLowerCase();
      const brandChineseName = brand.chineseName || '';
      
      // 对于短品牌名（如 "MG"），需要确保是完整的单词或品牌名的开头
      if (brandNameLower.length <= 5) {
        // 短品牌名：检查是否作为完整单词出现
        const shortBrandRegex = new RegExp(`\\b${brandNameLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (shortBrandRegex.test(query)) {
          logger.info(`✅ 检测到品牌（短名称匹配）: ${brand.name} (${brand.chineseName || '无中文名'})`);
          return {
            id: brand.id,
            name: brand.name,
            chineseName: brand.chineseName
          };
        }
      }
      
      // 长品牌名或中文名：部分匹配
      if (queryLower.includes(brandNameLower) || 
          (brandChineseName && query.includes(brandChineseName))) {
        logger.info(`✅ 检测到品牌（部分匹配）: ${brand.name} (${brand.chineseName || '无中文名'})`);
        return {
          id: brand.id,
          name: brand.name,
          chineseName: brand.chineseName
        };
      }
    }
    
    // 步骤4: 反向匹配 - 如果查询包含中文关键词，检查是否有品牌的中文名称包含这些关键词
    // 例如：查询 "mg" -> 检查是否有品牌的中文名称包含 "名爵"
    for (const queryWord of queryWords) {
      // 如果查询词是短词（可能是英文缩写），尝试在品牌中文名称中查找
      if (queryWord.length <= 5 && /^[a-z]+$/.test(queryWord)) {
        // 检查是否有品牌的中文名称包含这个英文缩写对应的中文关键词
        for (const brand of brands) {
          const brandChineseName = brand.chineseName || '';
          if (brandChineseName) {
            // 尝试通过映射表查找对应的中文关键词
            const mapping = BRAND_NAME_MAPPING[queryWord];
            if (mapping) {
              for (const keyword of mapping) {
                if (brandChineseName.includes(keyword)) {
                  logger.info(`✅ 检测到品牌（反向映射匹配）: ${brand.name} (${brand.chineseName}) <- "${queryWord}"`);
                  return {
                    id: brand.id,
                    name: brand.name,
                    chineseName: brand.chineseName
                  };
                }
              }
            }
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    logger.error('提取品牌信息失败:', error.message);
    return null;
  }
}

/**
 * 获取品牌的所有图片 ID
 */
async function getBrandImageIds(brandId) {
  try {
    const images = await Image.findAll({
      attributes: ['id'],
      include: [
        {
          model: Model,
          required: true,
          where: {
            brandId: brandId,
            isActive: true
          }
        }
      ],
      limit: 10000 // 设置一个合理的上限
    });
    
    return images.map(img => img.id);
  } catch (error) {
    logger.error('获取品牌图片 ID 失败:', error.message);
    throw error;
  }
}

/**
 * 从向量搜索结果中提取图片 ID
 */
function extractImageIds(vectorResults) {
  const imageIds = new Set();
  
  for (const result of vectorResults) {
    let imageId = null;
    
    // 尝试多种可能的字段名（根据参考项目，payload 中使用的是 image_id）
    if (result.payload) {
      imageId = result.payload.image_id ||  // 参考项目使用的字段名
                result.payload.imageId || 
                result.payload.id;
    }
    
    // 如果 payload 中没有，尝试使用 result 的 id 字段（Qdrant 的 point ID 通常就是 imageId）
    if (!imageId && result.id !== undefined && result.id !== null) {
      imageId = result.id;
    }
    
    if (imageId) {
      // 处理字符串和数字格式的 ID
      const id = typeof imageId === 'string' ? parseInt(imageId) : imageId;
      if (!isNaN(id) && id > 0) {
        imageIds.add(id);
      } else {
        logger.debug(`跳过无效的图片 ID: ${imageId} (解析后: ${id})`);
      }
    } else {
      // 记录没有 ID 的结果（用于调试）
      logger.warn(`向量结果缺少图片 ID:`, {
        resultId: result.id,
        hasPayload: !!result.payload,
        payloadKeys: result.payload ? Object.keys(result.payload) : [],
        fullResult: JSON.stringify(result).substring(0, 200) // 只记录前 200 字符
      });
    }
  }
  
  return Array.from(imageIds);
}

/**
 * 选择最佳图片 URL（优先 webp，回退 jpeg）
 */
function chooseBestUrl(assetsMap, preferWebp = true) {
  if (preferWebp && assetsMap.webp) {
    return assetsMap.webp;
  }
  if (assetsMap.jpeg) {
    return assetsMap.jpeg;
  }
  if (assetsMap.medium) {
    return assetsMap.medium;
  }
  if (assetsMap.thumbnail) {
    return assetsMap.thumbnail;
  }
  return null;
}
