const { Op, Sequelize } = require('sequelize');
const { sequelize } = require('../config/mysql');
const Image = require('../models/mysql/Image');
const Model = require('../models/mysql/Model');
const Brand = require('../models/mysql/Brand');
const logger = require('../config/logger');

// 获取筛选后的图片列表
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
      whereCondition[Op.and] = anglesArray.map(angle => 
        Sequelize.literal(`JSON_CONTAINS(tags, '"${angle}"')`)
      );
    }

    // 图片类型筛选
    if (typesArray.length > 0) {
      const typeConditions = typesArray.map(type => 
        Sequelize.literal(`JSON_CONTAINS(tags, '"${type}"')`)
      );
      if (whereCondition[Op.and]) {
        whereCondition[Op.and].push(...typeConditions);
      } else {
        whereCondition[Op.and] = typeConditions;
      }
    }

    // 标签关键词搜索
    if (tagSearch) {
      const searchCondition = Sequelize.literal(`JSON_SEARCH(tags, 'one', '%${tagSearch}%') IS NOT NULL`);
      if (whereCondition[Op.and]) {
        whereCondition[Op.and].push(searchCondition);
      } else {
        whereCondition[Op.and] = [searchCondition];
      }
    }

    // 风格标签筛选
    if (styleTagsArray.length > 0) {
      modelWhereCondition[Op.and] = styleTagsArray.map(tag => 
        Sequelize.literal(`JSON_CONTAINS(Model.styleTags, '"${tag}"')`)
      );
    }

    // 计算偏移量
    const offset = (page - 1) * limit;

    // 查询图片总数
    const totalCount = await Image.count({
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
    });

    // 查询筛选后的图片总数
    const filteredCount = await Image.count({
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
    });

    // 查询图片列表
    const images = await Image.findAll({
      where: whereCondition,
      include: [
        {
          model: Model,
          where: modelWhereCondition,
          include: [
            {
              model: Brand,
              attributes: ['id', 'name']
            }
          ],
          attributes: ['id', 'name', 'type', 'styleTags']
        }
      ],
      attributes: [
        'id', 'modelId', 'userId', 'title', 'description', 'url', 
        'filename', 'fileSize', 'fileType', 'category', 'isFeatured', 
        'uploadDate', 'tags', 'createdAt', 'updatedAt'
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: offset
    });

    // 计算分页信息
    const totalPages = Math.ceil(filteredCount / limit);

    res.json({
      status: 'success',
      data: {
        images,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          filteredCount,
          pages: totalPages
        }
      }
    });

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

    // 查询所有图片的标签
    const images = await Image.findAll({
      attributes: ['tags'],
      where: {
        tags: {
          [Op.ne]: null,
          [Op.ne]: '[]',
          [Op.ne]: []
        }
      }
    });

    // 统计标签出现次数
    const tagCounts = {};
    images.forEach(image => {
      if (Array.isArray(image.tags)) {
        image.tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });

    // 排序并返回热门标签
    const popularTags = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, parseInt(limit));

    res.json({
      status: 'success',
      data: popularTags
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
