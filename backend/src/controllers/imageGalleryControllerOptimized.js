const { Op, Sequelize } = require('sequelize');
const { sequelize } = require('../config/mysql');
const Image = require('../models/mysql/Image');
const Model = require('../models/mysql/Model');
const Brand = require('../models/mysql/Brand');
const ImageAsset = require('../models/mysql/ImageAsset');
const logger = require('../config/logger');

// 简单的内存缓存
const cache = {
  totalCount: null,
  totalCountTime: 0,
  cacheExpiry: 5 * 60 * 1000, // 5分钟缓存
};

// 获取筛选后的图片列表 - 优化版本
exports.getFilteredImages = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      modelType = '',
      brandId = '',
      angles,
      types,
      tagSearch = '',
      styleTags
    } = req.query;

    const startTime = Date.now();

    // 解析数组参数
    const anglesArray = angles ? (Array.isArray(angles) ? angles : [angles]) : [];
    const typesArray = types ? (Array.isArray(types) ? types : [types]) : [];
    const styleTagsArray = styleTags ? (Array.isArray(styleTags) ? styleTags : [styleTags]) : [];

    // 构建查询条件
    const whereCondition = {};
    const modelWhereCondition = {};
    const brandWhereCondition = {};

    // 车型分类筛选
    if (modelType) {
      modelWhereCondition.type = modelType;
    }

    // 品牌筛选
    if (brandId) {
      modelWhereCondition.brandId = brandId;
    }

    // 视角筛选
    if (anglesArray.length > 0) {
      const angleConditions = anglesArray.map(angle => 
        Sequelize.literal(`JSON_SEARCH(tags, 'one', '${angle}') IS NOT NULL`)
      );
      whereCondition[Op.and] = whereCondition[Op.and] ? 
        [...whereCondition[Op.and], ...angleConditions] : angleConditions;
    }

    // 图片类型筛选
    if (typesArray.length > 0) {
      const typeConditions = typesArray.map(type => 
        Sequelize.literal(`JSON_SEARCH(tags, 'one', '${type}') IS NOT NULL`)
      );
      whereCondition[Op.and] = whereCondition[Op.and] ? 
        [...whereCondition[Op.and], ...typeConditions] : typeConditions;
    }

    // 标签关键词搜索
    if (tagSearch) {
      const searchCondition = Sequelize.literal(`JSON_SEARCH(tags, 'one', '%${tagSearch}%') IS NOT NULL`);
      whereCondition[Op.and] = whereCondition[Op.and] ? 
        [...whereCondition[Op.and], searchCondition] : [searchCondition];
    }

    // 风格标签筛选
    if (styleTagsArray.length > 0) {
      const styleConditions = styleTagsArray.map(tag => 
        Sequelize.literal(`JSON_CONTAINS(Model.styleTags, '"${tag}"')`)
      );
      modelWhereCondition[Op.and] = styleConditions;
    }

    // 计算偏移量
    const offset = (page - 1) * limit;

    // 优化策略：使用原生SQL查询，利用新创建的索引
    const hasFilters = modelType || brandId || anglesArray.length > 0 || 
                      typesArray.length > 0 || tagSearch || styleTagsArray.length > 0;

    let filteredCount, totalCount, images;

    if (hasFilters) {
      // 有筛选条件时，使用原生SQL
      const [countResult, imageResult] = await Promise.all([
        // 筛选后的图片总数
        sequelize.query(`
          SELECT COUNT(*) as count
          FROM images i
          INNER JOIN models m ON i.modelId = m.id
          LEFT JOIN brands b ON m.brandId = b.id
          WHERE 1=1
          ${modelType ? `AND m.type = '${modelType}'` : ''}
          ${brandId ? `AND m.brandId = ${brandId}` : ''}
          ${tagSearch ? `AND JSON_SEARCH(i.tags, 'one', '%${tagSearch}%') IS NOT NULL` : ''}
        `, { type: Sequelize.QueryTypes.SELECT }),
        
        // 图片列表 - 利用新创建的索引
        sequelize.query(`
          SELECT 
            i.id, i.modelId, i.userId, i.title, i.description, i.url,
            i.filename, i.fileSize, i.fileType, i.category, i.isFeatured,
            i.uploadDate, i.tags, i.createdAt, i.updatedAt,
            m.id as model_id, m.name as model_name, m.type as model_type, m.styleTags as model_styleTags,
            b.id as brand_id, b.name as brand_name
          FROM images i
          INNER JOIN models m ON i.modelId = m.id
          LEFT JOIN brands b ON m.brandId = b.id
          WHERE 1=1
          ${modelType ? `AND m.type = '${modelType}'` : ''}
          ${brandId ? `AND m.brandId = ${brandId}` : ''}
          ${tagSearch ? `AND JSON_SEARCH(i.tags, 'one', '%${tagSearch}%') IS NOT NULL` : ''}
          ORDER BY i.createdAt DESC
          LIMIT ${limit} OFFSET ${offset}
        `, { type: Sequelize.QueryTypes.SELECT })
      ]);

      filteredCount = countResult[0].count;
      totalCount = filteredCount;
      images = imageResult;
    } else {
      // 无筛选条件时，使用缓存
      const now = Date.now();
      if (!cache.totalCount || (now - cache.totalCountTime) > cache.cacheExpiry) {
        const countResult = await sequelize.query(`
          SELECT COUNT(*) as count FROM images
        `, { type: Sequelize.QueryTypes.SELECT });
        cache.totalCount = countResult[0].count;
        cache.totalCountTime = now;
      }

      const [imageResult] = await Promise.all([
        // 利用新创建的索引进行快速查询
        sequelize.query(`
          SELECT 
            i.id, i.modelId, i.userId, i.title, i.description, i.url,
            i.filename, i.fileSize, i.fileType, i.category, i.isFeatured,
            i.uploadDate, i.tags, i.createdAt, i.updatedAt,
            m.id as model_id, m.name as model_name, m.type as model_type, m.styleTags as model_styleTags,
            b.id as brand_id, b.name as brand_name
          FROM images i
          INNER JOIN models m ON i.modelId = m.id
          LEFT JOIN brands b ON m.brandId = b.id
          ORDER BY i.createdAt DESC
          LIMIT ${limit} OFFSET ${offset}
        `, { type: Sequelize.QueryTypes.SELECT })
      ]);

      filteredCount = cache.totalCount;
      totalCount = cache.totalCount;
      images = imageResult;
    }

    // 转换数据格式以匹配前端期望
    const formattedImages = images.map(img => ({
      id: img.id,
      modelId: img.modelId,
      userId: img.userId,
      title: img.title,
      description: img.description,
      url: img.url,
      filename: img.filename,
      fileSize: img.fileSize,
      fileType: img.fileType,
      category: img.category,
      isFeatured: img.isFeatured,
      uploadDate: img.uploadDate,
      tags: img.tags,
      createdAt: img.createdAt,
      updatedAt: img.updatedAt,
      displayUrl: img.url, // 默认使用原图URL
      Model: {
        id: img.model_id,
        name: img.model_name,
        type: img.model_type,
        styleTags: img.model_styleTags,
        Brand: {
          id: img.brand_id,
          name: img.brand_name
        }
      }
    }));

    // 计算分页信息
    const totalPages = Math.ceil(filteredCount / limit);

    // 异步获取图片变体URL（不阻塞响应）
    const imageIds = formattedImages.map(img => img.id);
    if (imageIds.length > 0) {
      setImmediate(async () => {
        try {
          // 利用新创建的索引快速查询图片变体
          const imageAssets = await sequelize.query(`
            SELECT imageId, variant, url, width, height
            FROM image_assets
            WHERE imageId IN (${imageIds.join(',')})
          `, { type: Sequelize.QueryTypes.SELECT });

          // 更新图片的displayUrl
          imageAssets.forEach(asset => {
            if (asset.variant === 'small') {
              const image = formattedImages.find(img => img.id === asset.imageId);
              if (image) {
                image.displayUrl = asset.url;
              }
            }
          });
        } catch (error) {
          logger.warn('异步获取图片变体失败:', error.message);
        }
      });
    }

    const responseData = {
      status: 'success',
      data: {
        images: formattedImages,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          filteredCount,
          pages: totalPages
        }
      }
    };

    const endTime = Date.now();
    const duration = endTime - startTime;
    
    logger.info(`优化查询完成: ${duration}ms, 返回${formattedImages.length}张图片`);
    
    res.json(responseData);

  } catch (error) {
    logger.error('获取筛选图片失败:', error);
    res.status(500).json({
      status: 'error',
      message: '获取筛选图片失败',
      details: error.message
    });
  }
};

// 获取筛选统计信息
exports.getFilterStats = async (req, res) => {
  try {
    const {
      modelType = '',
      brandId = '',
      angles = [],
      types = [],
      tagSearch = '',
      styleTags = []
    } = req.query;

    // 构建查询条件（与getFilteredImages相同）
    const whereCondition = {};
    const modelWhereCondition = {};
    const brandWhereCondition = {};

    if (modelType) {
      modelWhereCondition.type = modelType;
    }

    if (brandId) {
      modelWhereCondition.brandId = brandId;
    }

    if (angles && angles.length > 0) {
      whereCondition.tags = {
        [Op.and]: angles.map(angle => ({
          [Op.like]: `%${angle}%`
        }))
      };
    }

    if (types && types.length > 0) {
      whereCondition.tags = {
        [Op.and]: [
          ...(whereCondition.tags ? [whereCondition.tags] : []),
          ...types.map(type => ({
            [Op.like]: `%${type}%`
          }))
        ]
      };
    }

    if (tagSearch) {
      whereCondition.tags = {
        [Op.and]: [
          ...(whereCondition.tags ? [whereCondition.tags] : []),
          {
            [Op.like]: `%${tagSearch}%`
          }
        ]
      };
    }

    if (styleTags && styleTags.length > 0) {
      modelWhereCondition.styleTags = {
        [Op.and]: styleTags.map(tag => ({
          [Op.like]: `%${tag}%`
        }))
      };
    }

    // 获取各种统计信息
    const stats = await Promise.all([
      // 总图片数
      Image.count(),
      
      // 筛选后的图片数
      Image.count({
        include: [
          {
            model: Model,
            where: modelWhereCondition,
            include: [
              {
                model: Brand,
                where: brandWhereCondition
              }
            ]
          }
        ],
        where: whereCondition
      }),

      // 车型分类统计
      Image.count({
        include: [
          {
            model: Model,
            where: modelWhereCondition,
            include: [
              {
                model: Brand,
                where: brandWhereCondition
              }
            ]
          }
        ],
        where: whereCondition
      }),

      // 品牌统计
      Image.count({
        include: [
          {
            model: Model,
            where: modelWhereCondition,
            include: [
              {
                model: Brand,
                where: brandWhereCondition
              }
            ]
          }
        ],
        where: whereCondition
      })
    ]);

    res.json({
      status: 'success',
      data: {
        totalImages: stats[0],
        filteredImages: stats[1],
        modelTypeCount: stats[2],
        brandCount: stats[3]
      }
    });

  } catch (error) {
    logger.error('获取筛选统计失败:', error);
    res.status(500).json({
      status: 'error',
      message: '获取筛选统计失败',
      details: error.message
    });
  }
};

// 获取热门标签
exports.getPopularTags = async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    // 优化：使用原生SQL查询提高性能
    const popularTags = await sequelize.query(`
      SELECT 
        JSON_UNQUOTE(JSON_EXTRACT(tags, CONCAT('$[', numbers.n, ']'))) as tag,
        COUNT(*) as count
      FROM images i
      CROSS JOIN (
        SELECT 0 as n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
        UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9
      ) numbers
      WHERE JSON_EXTRACT(i.tags, CONCAT('$[', numbers.n, ']')) IS NOT NULL
        AND i.tags IS NOT NULL
        AND i.tags != '[]'
        AND JSON_UNQUOTE(JSON_EXTRACT(tags, CONCAT('$[', numbers.n, ']'))) IS NOT NULL
      GROUP BY tag
      HAVING tag IS NOT NULL AND tag != ''
      ORDER BY count DESC
      LIMIT :limit
    `, {
      replacements: { limit: parseInt(limit) },
      type: Sequelize.QueryTypes.SELECT
    });

    const result = popularTags.map(item => ({
      tag: item.tag,
      count: parseInt(item.count)
    }));

    res.json({
      status: 'success',
      data: result
    });

  } catch (error) {
    logger.error('获取热门标签失败:', error);
    res.status(500).json({
      status: 'error',
      message: '获取热门标签失败',
      details: error.message
    });
  }
};

// 获取图片详情
exports.getImageDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const image = await Image.findByPk(id, {
      include: [
        {
          model: Model,
          include: [
            {
              model: Brand,
              attributes: ['id', 'name']
            }
          ],
          attributes: ['id', 'name', 'type', 'styleTags']
        }
      ]
    });

    if (!image) {
      return res.status(404).json({
        status: 'error',
        message: '图片不存在'
      });
    }

    res.json({
      status: 'success',
      data: image
    });

  } catch (error) {
    logger.error('获取图片详情失败:', error);
    res.status(500).json({
      status: 'error',
      message: '获取图片详情失败',
      details: error.message
    });
  }
};