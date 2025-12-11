#!/usr/bin/env node
/**
 * 检查向量数据库的变化和新增向量信息
 * 
 * 用法:
 *   node scripts/check_vector_database.js [options]
 * 
 * 选项:
 *   --days <number>     检查最近N天的变化（默认：7）
 *   --all               显示所有向量信息
 *   --compare           对比MySQL和Qdrant，找出未向量化的图片
 * 
 * 示例:
 *   # 检查最近7天的变化
 *   node scripts/check_vector_database.js
 * 
 *   # 检查最近30天的变化
 *   node scripts/check_vector_database.js --days 30
 * 
 *   # 对比MySQL和Qdrant，找出未向量化的图片
 *   node scripts/check_vector_database.js --compare
 */

const { qdrantClient, DEFAULT_COLLECTION, getCollectionInfo } = require('../src/config/qdrant');
const { Image, Model, Brand } = require('../src/models/mysql');
const logger = require('../src/config/logger');
const { Op } = require('sequelize');

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    days: 7,
    all: false,
    compare: false
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--days' && args[i + 1]) {
      options.days = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--all') {
      options.all = true;
    } else if (args[i] === '--compare') {
      options.compare = true;
    }
  }

  return options;
}

/**
 * 获取Qdrant集合中的所有向量点
 */
async function getAllVectors(collectionName = DEFAULT_COLLECTION) {
  try {
    logger.info(`📊 开始获取集合 ${collectionName} 中的所有向量...`);
    
    const allPoints = [];
    let offset = null;
    const limit = 100; // 每次获取100个点
    
    while (true) {
      const scrollParams = {
        limit,
        with_payload: true,
        with_vector: false // 不需要向量数据，只需要ID和payload
      };
      
      if (offset) {
        scrollParams.offset = offset;
      }
      
      const result = await qdrantClient.scroll(collectionName, scrollParams);
      
      if (!result.points || result.points.length === 0) {
        break;
      }
      
      allPoints.push(...result.points);
      
      // 检查是否还有更多数据
      if (!result.next_page_offset) {
        break;
      }
      
      offset = result.next_page_offset;
      
      // 显示进度
      if (allPoints.length % 500 === 0) {
        logger.info(`已获取 ${allPoints.length} 个向量点...`);
      }
    }
    
    logger.info(`✅ 共获取 ${allPoints.length} 个向量点`);
    return allPoints;
  } catch (error) {
    logger.error(`❌ 获取向量失败:`, error.message);
    throw error;
  }
}

/**
 * 分析向量数据库的变化
 */
async function analyzeVectorChanges(options) {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('🔍 向量数据库变化检查');
    console.log('='.repeat(60) + '\n');

    // 1. 获取集合信息
    console.log('📋 步骤1: 获取集合信息...');
    const collectionInfo = await getCollectionInfo(DEFAULT_COLLECTION);
    if (!collectionInfo) {
      console.error('❌ 集合不存在或无法连接');
      return;
    }

    console.log(`✅ 集合名称: ${DEFAULT_COLLECTION}`);
    console.log(`   向量数量: ${collectionInfo.points_count || 0}`);
    console.log(`   向量维度: ${collectionInfo.config?.params?.vectors?.size || '未知'}`);
    console.log('');

    // 2. 获取所有向量点
    console.log('📋 步骤2: 获取所有向量点...');
    const allVectors = await getAllVectors(DEFAULT_COLLECTION);
    
    if (allVectors.length === 0) {
      console.log('⚠️  向量数据库为空，没有向量数据');
      return;
    }

    // 3. 提取图片ID和更新时间
    const vectorData = allVectors.map(point => ({
      imageId: point.id,
      updatedAt: point.payload?.updated_at || null,
      uploadDate: point.payload?.upload_date || null,
      title: point.payload?.title || '',
      modelName: point.payload?.model_name || '',
      brandName: point.payload?.brand_name || ''
    }));

    // 4. 按时间排序
    const sortedVectors = vectorData.sort((a, b) => {
      const dateA = a.updatedAt ? new Date(a.updatedAt) : new Date(0);
      const dateB = b.updatedAt ? new Date(b.updatedAt) : new Date(0);
      return dateB - dateA; // 最新的在前
    });

    // 5. 分析最近的变化
    if (!options.all) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - options.days);
      
      const recentVectors = sortedVectors.filter(v => {
        if (!v.updatedAt) return false;
        return new Date(v.updatedAt) >= cutoffDate;
      });

      console.log(`\n📊 最近 ${options.days} 天的向量变化:`);
      console.log(`   新增/更新向量: ${recentVectors.length} 个\n`);

      if (recentVectors.length > 0) {
        console.log('最近向量化的图片:');
        console.log('-'.repeat(60));
        recentVectors.slice(0, 20).forEach((v, index) => {
          const date = v.updatedAt ? new Date(v.updatedAt).toLocaleString('zh-CN') : '未知';
          console.log(`${index + 1}. 图片ID: ${v.imageId}`);
          console.log(`   标题: ${v.title || '无'}`);
          console.log(`   品牌: ${v.brandName || '无'} | 车型: ${v.modelName || '无'}`);
          console.log(`   更新时间: ${date}`);
          console.log('');
        });

        if (recentVectors.length > 20) {
          console.log(`... 还有 ${recentVectors.length - 20} 个向量未显示\n`);
        }
      } else {
        console.log('⚠️  最近没有新增或更新的向量\n');
      }
    } else {
      console.log(`\n📊 所有向量信息 (共 ${sortedVectors.length} 个):\n`);
      sortedVectors.slice(0, 50).forEach((v, index) => {
        const date = v.updatedAt ? new Date(v.updatedAt).toLocaleString('zh-CN') : '未知';
        console.log(`${index + 1}. 图片ID: ${v.imageId} | 更新时间: ${date}`);
      });
      if (sortedVectors.length > 50) {
        console.log(`... 还有 ${sortedVectors.length - 50} 个向量未显示\n`);
      }
    }

    // 6. 统计信息
    console.log('\n📈 统计信息:');
    console.log(`   总向量数: ${sortedVectors.length}`);
    console.log(`   有更新时间的向量: ${sortedVectors.filter(v => v.updatedAt).length}`);
    console.log(`   有上传日期的向量: ${sortedVectors.filter(v => v.uploadDate).length}`);

    // 7. 对比MySQL和Qdrant（如果启用）
    if (options.compare) {
      await compareMySQLAndQdrant(vectorData);
    }

  } catch (error) {
    logger.error('❌ 分析失败:', error);
    console.error('错误:', error.message);
  }
}

/**
 * 对比MySQL和Qdrant，找出未向量化的图片
 */
async function compareMySQLAndQdrant(vectorData) {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('🔍 对比MySQL和Qdrant数据库');
    console.log('='.repeat(60) + '\n');

    // 获取MySQL中的所有图片
    console.log('📋 获取MySQL中的所有图片...');
    const allImages = await Image.findAll({
      attributes: ['id', 'title', 'uploadDate'],
      order: [['uploadDate', 'DESC']]
    });

    console.log(`✅ MySQL中共有 ${allImages.length} 张图片\n`);

    // 获取Qdrant中的图片ID集合
    const vectorImageIds = new Set(vectorData.map(v => v.imageId));

    // 找出未向量化的图片
    const unvectorizedImages = allImages.filter(img => !vectorImageIds.has(img.id));

    console.log('📊 对比结果:');
    console.log(`   MySQL图片总数: ${allImages.length}`);
    console.log(`   Qdrant向量总数: ${vectorImageIds.size}`);
    console.log(`   未向量化的图片: ${unvectorizedImages.length}\n`);

    if (unvectorizedImages.length > 0) {
      console.log('⚠️  未向量化的图片列表 (最近20张):');
      console.log('-'.repeat(60));
      unvectorizedImages.slice(0, 20).forEach((img, index) => {
        const date = img.uploadDate ? new Date(img.uploadDate).toLocaleString('zh-CN') : '未知';
        console.log(`${index + 1}. 图片ID: ${img.id} | 标题: ${img.title || '无'} | 上传时间: ${date}`);
      });
      if (unvectorizedImages.length > 20) {
        console.log(`... 还有 ${unvectorizedImages.length - 20} 张图片未向量化\n`);
      }
    } else {
      console.log('✅ 所有图片都已向量化！\n');
    }

    // 找出Qdrant中有但MySQL中没有的向量（可能是数据不一致）
    const mysqlImageIds = new Set(allImages.map(img => img.id));
    const orphanVectors = vectorData.filter(v => !mysqlImageIds.has(v.imageId));

    if (orphanVectors.length > 0) {
      console.log(`⚠️  发现 ${orphanVectors.length} 个孤立向量（Qdrant中有但MySQL中不存在）:`);
      orphanVectors.slice(0, 10).forEach((v, index) => {
        console.log(`${index + 1}. 向量ID: ${v.imageId}`);
      });
      if (orphanVectors.length > 10) {
        console.log(`... 还有 ${orphanVectors.length - 10} 个孤立向量\n`);
      }
    }

  } catch (error) {
    logger.error('❌ 对比失败:', error);
    console.error('错误:', error.message);
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    const options = parseArgs();
    
    // 测试Qdrant连接
    console.log('🔌 测试Qdrant连接...');
    const collections = await qdrantClient.getCollections();
    console.log(`✅ Qdrant连接成功，集合列表: ${collections.collections.map(c => c.name).join(', ')}\n`);

    // 执行分析
    await analyzeVectorChanges(options);

    console.log('\n' + '='.repeat(60));
    console.log('✅ 检查完成');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    logger.error('❌ 脚本执行失败:', error);
    console.error('错误:', error.message);
    process.exit(1);
  }
}

// 运行脚本
if (require.main === module) {
  main();
}

module.exports = {
  getAllVectors,
  analyzeVectorChanges,
  compareMySQLAndQdrant
};

