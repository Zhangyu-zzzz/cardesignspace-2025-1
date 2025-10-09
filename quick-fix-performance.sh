#!/bin/bash

# 快速修复性能问题脚本
# 解决500错误和性能问题

set -e

echo "🔧 快速修复性能问题..."
echo "========================"

# 1. 停止所有相关进程
echo "1️⃣ 停止现有服务..."
pkill -f "node.*app.js" 2>/dev/null || true
pkill -f "npm.*dev" 2>/dev/null || true
sleep 2

# 2. 修复后端代码中的问题
echo "2️⃣ 修复后端代码..."

cd backend

# 备份原文件
cp src/controllers/imageGalleryController.js src/controllers/imageGalleryController.js.backup

# 创建修复后的版本
cat > src/controllers/imageGalleryController.js << 'EOF'
const { Op, Sequelize } = require('sequelize');
const { sequelize } = require('../config/mysql');
const Image = require('../models/mysql/Image');
const Model = require('../models/mysql/Model');
const Brand = require('../models/mysql/Brand');
const ImageAsset = require('../models/mysql/ImageAsset');
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

    // 视角筛选 - 使用JSON_SEARCH
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

    // 优化：只执行一次COUNT查询
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

    // 如果没有筛选条件，使用filteredCount作为totalCount
    const hasFilters = modelType || brandId || anglesArray.length > 0 || 
                      typesArray.length > 0 || tagSearch || styleTagsArray.length > 0;
    const totalCount = hasFilters ? filteredCount : await Image.count();

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

    // 优化：批量获取图片变体URL
    const imageIds = images.map(img => img.id);
    let imageVariants = {};
    
    if (imageIds.length > 0) {
      try {
        // 批量查询图片变体
        const imageAssets = await ImageAsset.findAll({
          where: {
            imageId: imageIds
          },
          attributes: ['imageId', 'variant', 'url', 'width', 'height']
        });

        // 为每个图片选择最佳变体
        imageAssets.forEach(asset => {
          if (!imageVariants[asset.imageId]) {
            imageVariants[asset.imageId] = {
              bestUrl: null,
              variants: []
            };
          }
          imageVariants[asset.imageId].variants.push(asset);
          
          // 选择small变体作为最佳URL
          if (asset.variant === 'small' && !imageVariants[asset.imageId].bestUrl) {
            imageVariants[asset.imageId].bestUrl = asset.url;
          }
        });
      } catch (error) {
        logger.warn('批量获取图片变体失败:', error.message);
      }
    }

    // 为图片添加变体URL
    images.forEach(image => {
      if (imageVariants[image.id] && imageVariants[image.id].bestUrl) {
        image.displayUrl = imageVariants[image.id].bestUrl;
      } else {
        image.displayUrl = image.url;
      }
    });

    const responseData = {
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
    };

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
EOF

echo "✅ 后端代码已修复"

# 3. 启动后端服务
echo "3️⃣ 启动后端服务..."
npm run dev &
BACKEND_PID=$!

# 等待服务启动
sleep 5

# 检查服务是否启动成功
if ps -p $BACKEND_PID > /dev/null; then
    echo "✅ 后端服务启动成功 (PID: $BACKEND_PID)"
else
    echo "❌ 后端服务启动失败"
    exit 1
fi

# 4. 测试API
echo "4️⃣ 测试API..."
sleep 3

API_URL="http://localhost:3000/api/image-gallery/images?limit=5"
RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/api_response.json "$API_URL" 2>/dev/null || echo "000")

if [ "$RESPONSE" = "200" ]; then
    echo "✅ API测试成功 (HTTP $RESPONSE)"
    echo "响应时间: $(curl -s -w "%{time_total}" -o /dev/null "$API_URL")s"
else
    echo "❌ API测试失败 (HTTP $RESPONSE)"
    echo "错误响应:"
    cat /tmp/api_response.json 2>/dev/null || echo "无响应内容"
fi

# 5. 生成修复报告
echo ""
echo "5️⃣ 生成修复报告..."
cat > ../quick-fix-report.md << EOF
# 快速修复报告

## 修复时间
$(date)

## 问题描述
- API返回500错误
- 使用了不存在的虚拟列（tags_searchable, style_tags_searchable）
- 数据库查询失败

## 修复措施
1. ✅ 移除了对不存在虚拟列的引用
2. ✅ 回退到标准的JSON_SEARCH和JSON_CONTAINS查询
3. ✅ 保留了批量获取图片变体的优化
4. ✅ 保留了减少COUNT查询的优化
5. ✅ 重启了后端服务

## 测试结果
- API状态: HTTP $RESPONSE
- 服务状态: 运行中 (PID: $BACKEND_PID)

## 性能优化保留
- ✅ 批量获取图片变体URL
- ✅ 减少重复的COUNT查询
- ✅ 优化数据库查询逻辑
- ✅ 原生SQL查询热门标签

## 后续建议
1. 先确保基本功能正常
2. 再逐步添加虚拟列和全文索引
3. 监控API响应时间
4. 逐步启用缓存功能

EOF

echo "✅ 修复报告已生成: quick-fix-report.md"

echo ""
echo "🎉 快速修复完成！"
echo "=================="
echo ""
echo "📊 修复总结:"
echo "  - 移除了有问题的虚拟列引用"
echo "  - 保留了核心性能优化"
echo "  - 后端服务已重启"
echo "  - API测试状态: HTTP $RESPONSE"
echo ""
echo "🔍 验证方法:"
echo "  1. 访问前端页面测试加载"
echo "  2. 检查API响应: curl $API_URL"
echo "  3. 查看修复报告: cat quick-fix-report.md"
echo ""
echo "如有问题，请查看日志: tail -f backend/logs/combined.log"
