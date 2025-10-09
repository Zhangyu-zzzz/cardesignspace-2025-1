const { sequelize } = require('../src/config/mysql');
const { Image, ImageAsset } = require('../src/models/mysql');
const { generateVariantsOnDemand } = require('../src/controllers/imageVariantController');
const logger = require('../src/config/logger');

// 配置参数
let BATCH_SIZE = 50; // 增加批次大小
let DELAY_BETWEEN_BATCHES = 1000; // 减少延迟
let MAX_CONCURRENT = 5; // 增加并发数
let MAX_IMAGES = 10000; // 限制处理数量，避免一次性处理太多

async function batchGenerateThumbnails() {
  try {
    console.log('🚀 开始批量生成缩略图变体...\n');

    // 1. 统计信息
    const totalImages = await Image.count();
    const imagesWithVariants = await ImageAsset.count({
      distinct: true,
      col: 'imageId'
    });
    
    console.log('📊 当前状态:');
    console.log(`   - 总图片数: ${totalImages.toLocaleString()}`);
    console.log(`   - 已有变体的图片数: ${imagesWithVariants.toLocaleString()}`);
    console.log(`   - 需要生成变体的图片数: ${(totalImages - imagesWithVariants).toLocaleString()}`);
    console.log(`   - 当前覆盖率: ${((imagesWithVariants / totalImages) * 100).toFixed(2)}%\n`);

    if (imagesWithVariants >= totalImages) {
      console.log('✅ 所有图片都已生成变体，无需处理！');
      return;
    }

    // 2. 获取没有变体的图片（限制数量）
    const imagesWithoutVariants = await sequelize.query(`
      SELECT i.id, i.url, i.filename, i.fileSize
      FROM images i
      LEFT JOIN image_assets ia ON i.id = ia.imageId
      WHERE ia.imageId IS NULL
      ORDER BY i.id
      LIMIT ${MAX_IMAGES}
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    console.log(`📋 找到 ${imagesWithoutVariants.length} 张需要生成变体的图片（限制处理前${MAX_IMAGES}张）`);
    console.log(`⚙️  配置: 批次大小=${BATCH_SIZE}, 延迟=${DELAY_BETWEEN_BATCHES}ms, 最大并发=${MAX_CONCURRENT}\n`);

    // 3. 分批处理
    const results = {
      success: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    const startTime = Date.now();

    for (let i = 0; i < imagesWithoutVariants.length; i += BATCH_SIZE) {
      const batch = imagesWithoutVariants.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(imagesWithoutVariants.length / BATCH_SIZE);
      
      console.log(`📦 处理批次 ${batchNumber}/${totalBatches} (${batch.length} 张图片)...`);

      // 并发处理当前批次
      const batchPromises = batch.map(async (image, index) => {
        try {
          // 添加随机延迟避免过于频繁的请求
          await new Promise(resolve => setTimeout(resolve, index * 50));
          
          const assets = await generateVariantsOnDemand(image.id, image.url);
          
          if (assets && Object.keys(assets).length > 0) {
            results.success++;
            if (results.success % 100 === 0) {
              console.log(`   ✅ 已成功处理 ${results.success} 张图片`);
            }
          } else {
            results.failed++;
            results.errors.push({
              imageId: image.id,
              filename: image.filename,
              error: '变体生成失败'
            });
          }
        } catch (error) {
          results.failed++;
          results.errors.push({
            imageId: image.id,
            filename: image.filename,
            error: error.message
          });
        }
      });

      // 等待当前批次完成
      await Promise.all(batchPromises);

      // 显示进度
      const processed = Math.min(i + BATCH_SIZE, imagesWithoutVariants.length);
      const progress = ((processed / imagesWithoutVariants.length) * 100).toFixed(1);
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = processed / elapsed;
      const eta = (imagesWithoutVariants.length - processed) / rate;
      
      console.log(`   📈 进度: ${processed}/${imagesWithoutVariants.length} (${progress}%) - 速度: ${rate.toFixed(1)}张/秒 - 预计剩余: ${Math.round(eta)}秒`);

      // 批次间延迟
      if (i + BATCH_SIZE < imagesWithoutVariants.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }

    // 4. 输出结果统计
    const totalTime = (Date.now() - startTime) / 1000;
    console.log('\n🎉 批量生成变体完成！');
    console.log(`⏱️  总耗时: ${totalTime.toFixed(1)}秒`);
    console.log(`📊 处理结果:`);
    console.log(`   - 成功: ${results.success} 张`);
    console.log(`   - 失败: ${results.failed} 张`);
    console.log(`   - 跳过: ${results.skipped} 张`);
    console.log(`   - 成功率: ${((results.success / (results.success + results.failed)) * 100).toFixed(2)}%`);
    console.log(`   - 处理速度: ${(results.success / totalTime).toFixed(1)}张/秒`);

    if (results.errors.length > 0) {
      console.log('\n❌ 失败详情:');
      results.errors.slice(0, 10).forEach(error => {
        console.log(`   - 图片 ${error.imageId} (${error.filename}): ${error.error}`);
      });
      if (results.errors.length > 10) {
        console.log(`   ... 还有 ${results.errors.length - 10} 个错误`);
      }
    }

    // 5. 更新后的统计信息
    const newImagesWithVariants = await ImageAsset.count({
      distinct: true,
      col: 'imageId'
    });
    
    console.log('\n📈 更新后的状态:');
    console.log(`   - 总图片数: ${totalImages.toLocaleString()}`);
    console.log(`   - 已有变体的图片数: ${newImagesWithVariants.toLocaleString()}`);
    console.log(`   - 覆盖率: ${((newImagesWithVariants / totalImages) * 100).toFixed(2)}%`);
    console.log(`   - 新增变体: ${(newImagesWithVariants - imagesWithVariants).toLocaleString()} 张`);

  } catch (error) {
    console.error('❌ 批量生成变体失败:', error);
    process.exit(1);
  }
}

// 添加命令行参数支持
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log('批量生成图片变体脚本');
  console.log('用法: node batch-generate-thumbnails.js [选项]');
  console.log('选项:');
  console.log('  --help, -h     显示帮助信息');
  console.log('  --limit N      限制处理图片数量 (默认: 10000)');
  console.log('  --batch N      批次大小 (默认: 50)');
  console.log('  --concurrent N 最大并发数 (默认: 5)');
  process.exit(0);
}

// 解析命令行参数
const limitIndex = args.indexOf('--limit');
if (limitIndex !== -1 && args[limitIndex + 1]) {
  MAX_IMAGES = parseInt(args[limitIndex + 1]);
}

const batchIndex = args.indexOf('--batch');
if (batchIndex !== -1 && args[batchIndex + 1]) {
  BATCH_SIZE = parseInt(args[batchIndex + 1]);
}

const concurrentIndex = args.indexOf('--concurrent');
if (concurrentIndex !== -1 && args[concurrentIndex + 1]) {
  MAX_CONCURRENT = parseInt(args[concurrentIndex + 1]);
}

batchGenerateThumbnails();
