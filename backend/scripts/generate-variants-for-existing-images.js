const { sequelize } = require('../src/config/mysql');
const { Image, ImageAsset } = require('../src/models/mysql');
const { generateVariantsOnDemand } = require('../src/controllers/imageVariantController');
const logger = require('../src/config/logger');

// 配置参数
const BATCH_SIZE = 10; // 每批处理的图片数量
const DELAY_BETWEEN_BATCHES = 2000; // 批次间延迟（毫秒）
const MAX_CONCURRENT = 3; // 最大并发数

async function generateVariantsForExistingImages() {
  try {
    console.log('🚀 开始为现有图片生成变体...\n');

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

    // 2. 获取没有变体的图片
    const imagesWithoutVariants = await sequelize.query(`
      SELECT i.id, i.url, i.filename, i.fileSize
      FROM images i
      LEFT JOIN image_assets ia ON i.id = ia.imageId
      WHERE ia.imageId IS NULL
      ORDER BY i.id
      LIMIT 1000
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    console.log(`📋 找到 ${imagesWithoutVariants.length} 张需要生成变体的图片`);
    console.log(`⚙️  配置: 批次大小=${BATCH_SIZE}, 延迟=${DELAY_BETWEEN_BATCHES}ms, 最大并发=${MAX_CONCURRENT}\n`);

    // 3. 分批处理
    const results = {
      success: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    for (let i = 0; i < imagesWithoutVariants.length; i += BATCH_SIZE) {
      const batch = imagesWithoutVariants.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(imagesWithoutVariants.length / BATCH_SIZE);
      
      console.log(`📦 处理批次 ${batchNumber}/${totalBatches} (${batch.length} 张图片)...`);

      // 并发处理当前批次
      const batchPromises = batch.map(async (image, index) => {
        try {
          // 添加随机延迟避免过于频繁的请求
          await new Promise(resolve => setTimeout(resolve, index * 100));
          
          console.log(`   🔄 处理图片 ${image.id}: ${image.filename}`);
          
          const assets = await generateVariantsOnDemand(image.id, image.url);
          
          if (assets && Object.keys(assets).length > 0) {
            console.log(`   ✅ 图片 ${image.id} 变体生成成功: ${Object.keys(assets).join(', ')}`);
            results.success++;
          } else {
            console.log(`   ⚠️  图片 ${image.id} 变体生成失败`);
            results.failed++;
            results.errors.push({
              imageId: image.id,
              filename: image.filename,
              error: '变体生成失败'
            });
          }
        } catch (error) {
          console.log(`   ❌ 图片 ${image.id} 处理失败: ${error.message}`);
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

      // 批次间延迟
      if (i + BATCH_SIZE < imagesWithoutVariants.length) {
        console.log(`   ⏳ 等待 ${DELAY_BETWEEN_BATCHES}ms 后处理下一批次...\n`);
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }

    // 4. 输出结果统计
    console.log('\n🎉 批量生成变体完成！');
    console.log('\n📊 处理结果:');
    console.log(`   - 成功: ${results.success} 张`);
    console.log(`   - 失败: ${results.failed} 张`);
    console.log(`   - 跳过: ${results.skipped} 张`);
    console.log(`   - 成功率: ${((results.success / (results.success + results.failed)) * 100).toFixed(2)}%`);

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
const batchSize = args.find(arg => arg.startsWith('--batch-size='))?.split('=')[1];
const delay = args.find(arg => arg.startsWith('--delay='))?.split('=')[1];

if (batchSize) {
  BATCH_SIZE = parseInt(batchSize);
  console.log(`📝 使用自定义批次大小: ${BATCH_SIZE}`);
}

if (delay) {
  DELAY_BETWEEN_BATCHES = parseInt(delay);
  console.log(`📝 使用自定义延迟: ${DELAY_BETWEEN_BATCHES}ms`);
}

// 运行脚本
generateVariantsForExistingImages().then(() => {
  console.log('\n✅ 脚本执行完成！');
  process.exit(0);
}).catch(error => {
  console.error('脚本执行失败:', error);
  process.exit(1);
});
