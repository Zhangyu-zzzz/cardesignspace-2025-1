#!/usr/bin/env node
/**
 * 批量向量化历史图片脚本
 * 
 * 用法:
 *   node scripts/vectorize_existing_images.js [options]
 * 
 * 选项:
 *   --limit <number>     限制处理的图片数量（默认：无限制）
 *   --offset <number>    跳过前N条记录（默认：0）
 *   --batch <number>     批次大小（默认：10）
 *   --delay <number>     批次间延迟时间（毫秒，默认：1000）
 *   --image-id <id>      只处理指定ID的图片
 *   --brand-id <id>      只处理指定品牌的图片
 *   --model-id <id>      只处理指定车型的图片
 *   --dry-run            模拟运行，不实际向量化
 * 
 * 示例:
 *   # 向量化所有图片
 *   node scripts/vectorize_existing_images.js
 * 
 *   # 只向量化前100张图片，每批10张
 *   node scripts/vectorize_existing_images.js --limit 100 --batch 10
 * 
 *   # 向量化指定车型的图片
 *   node scripts/vectorize_existing_images.js --model-id 123
 * 
 *   # 模拟运行（不实际向量化）
 *   node scripts/vectorize_existing_images.js --dry-run --limit 10
 */

const { Image, Model, Brand } = require('../src/models/mysql');
const { vectorizeAndUpsertImage } = require('../src/services/autoVectorizeService');
const logger = require('../src/config/logger');
const { Op } = require('sequelize');

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    limit: null,
    offset: 0,
    batch: 10,
    delay: 1000,
    imageId: null,
    brandId: null,
    modelId: null,
    dryRun: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--limit':
        options.limit = parseInt(nextArg);
        i++;
        break;
      case '--offset':
        options.offset = parseInt(nextArg);
        i++;
        break;
      case '--batch':
        options.batch = parseInt(nextArg);
        i++;
        break;
      case '--delay':
        options.delay = parseInt(nextArg);
        i++;
        break;
      case '--image-id':
        options.imageId = parseInt(nextArg);
        i++;
        break;
      case '--brand-id':
        options.brandId = parseInt(nextArg);
        i++;
        break;
      case '--model-id':
        options.modelId = parseInt(nextArg);
        i++;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--help':
      case '-h':
        console.log(`
批量向量化历史图片脚本

用法:
  node scripts/vectorize_existing_images.js [options]

选项:
  --limit <number>     限制处理的图片数量（默认：无限制）
  --offset <number>    跳过前N条记录（默认：0）
  --batch <number>     批次大小（默认：10）
  --delay <number>     批次间延迟时间（毫秒，默认：1000）
  --image-id <id>      只处理指定ID的图片
  --brand-id <id>      只处理指定品牌的图片
  --model-id <id>      只处理指定车型的图片
  --dry-run            模拟运行，不实际向量化
  --help, -h           显示帮助信息

示例:
  # 向量化所有图片
  node scripts/vectorize_existing_images.js

  # 只向量化前100张图片，每批10张
  node scripts/vectorize_existing_images.js --limit 100 --batch 10

  # 向量化指定车型的图片
  node scripts/vectorize_existing_images.js --model-id 123

  # 模拟运行（不实际向量化）
  node scripts/vectorize_existing_images.js --dry-run --limit 10
        `);
        process.exit(0);
        break;
    }
  }

  return options;
}

// 延迟函数
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 主函数
async function main() {
  const options = parseArgs();

  console.log('===================================');
  console.log('批量向量化历史图片脚本');
  console.log('===================================');
  console.log('配置:', JSON.stringify(options, null, 2));
  console.log('===================================\n');

  if (options.dryRun) {
    console.log('⚠️  模拟运行模式，不会实际向量化图片\n');
  }

  try {
    // 构建查询条件
    const where = {};
    
    if (options.imageId) {
      where.id = options.imageId;
    }
    
    if (options.modelId) {
      where.modelId = options.modelId;
    }

    // 如果指定了品牌ID，需要先查询该品牌下的所有车型
    let modelIds = null;
    if (options.brandId) {
      const models = await Model.findAll({
        where: { brandId: options.brandId },
        attributes: ['id']
      });
      modelIds = models.map(m => m.id);
      
      if (modelIds.length === 0) {
        console.error(`❌ 品牌ID ${options.brandId} 下没有找到车型`);
        process.exit(1);
      }
      
      where.modelId = { [Op.in]: modelIds };
      console.log(`🔍 品牌ID ${options.brandId} 下有 ${modelIds.length} 个车型`);
    }

    // 查询图片总数
    const totalCount = await Image.count({ where });
    console.log(`📊 共找到 ${totalCount} 张图片需要处理\n`);

    if (totalCount === 0) {
      console.log('没有图片需要处理');
      process.exit(0);
    }

    // 计算实际处理数量
    const processCount = options.limit ? Math.min(options.limit, totalCount) : totalCount;
    console.log(`📝 将处理 ${processCount} 张图片`);
    console.log(`📦 批次大小: ${options.batch}`);
    console.log(`⏱️  批次间延迟: ${options.delay}ms\n`);

    // 统计信息
    const stats = {
      total: processCount,
      processed: 0,
      success: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    // 分批处理
    let offset = options.offset;
    const limit = options.batch;
    let batchNumber = 1;

    while (stats.processed < processCount) {
      const currentBatchSize = Math.min(limit, processCount - stats.processed);
      
      console.log(`\n--- 批次 ${batchNumber} (${stats.processed + 1}-${stats.processed + currentBatchSize}/${processCount}) ---`);

      // 查询当前批次的图片
      const images = await Image.findAll({
        where,
        offset,
        limit: currentBatchSize,
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
        ],
        order: [['id', 'ASC']]
      });

      if (images.length === 0) {
        console.log('没有更多图片');
        break;
      }

      // 处理每张图片
      for (const image of images) {
        const imageInfo = `ID:${image.id}, 车型:${image.Model?.name || '未知'}`;
        
        try {
          if (options.dryRun) {
            console.log(`[模拟] 向量化图片 ${imageInfo}`);
            stats.skipped++;
          } else {
            console.log(`🖼️  处理: ${imageInfo}`);
            
            const result = await vectorizeAndUpsertImage(image.id);
            
            if (result.success) {
              console.log(`  ✅ 成功`);
              stats.success++;
            } else {
              console.log(`  ❌ 失败: ${result.error}`);
              stats.failed++;
              stats.errors.push({
                imageId: image.id,
                error: result.error
              });
            }
          }
          
          stats.processed++;
          
        } catch (error) {
          console.log(`  ❌ 异常: ${error.message}`);
          stats.failed++;
          stats.errors.push({
            imageId: image.id,
            error: error.message
          });
          stats.processed++;
        }
      }

      offset += currentBatchSize;
      batchNumber++;

      // 批次间延迟（除了最后一批）
      if (stats.processed < processCount && options.delay > 0) {
        console.log(`⏳ 等待 ${options.delay}ms...`);
        await sleep(options.delay);
      }
    }

    // 输出统计信息
    console.log('\n===================================');
    console.log('处理完成');
    console.log('===================================');
    console.log(`总计: ${stats.total}`);
    console.log(`已处理: ${stats.processed}`);
    console.log(`成功: ${stats.success}`);
    console.log(`失败: ${stats.failed}`);
    if (options.dryRun) {
      console.log(`跳过（模拟运行）: ${stats.skipped}`);
    }
    console.log('===================================');

    if (stats.errors.length > 0) {
      console.log('\n失败的图片:');
      stats.errors.forEach((err, idx) => {
        console.log(`${idx + 1}. 图片ID ${err.imageId}: ${err.error}`);
      });
    }

    console.log('\n✅ 脚本执行完成');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ 脚本执行失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { main };




