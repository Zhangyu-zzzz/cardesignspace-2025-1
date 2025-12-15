#!/usr/bin/env node
/**
 * 向量化功能测试脚本
 * 用于快速验证自动向量化功能是否正常工作
 */

const logger = require('../src/config/logger');
const { Image, Model, Brand } = require('../src/models/mysql');
const { vectorizeAndUpsertImage } = require('../src/services/autoVectorizeService');
const { isVectorizeServiceAvailable } = require('../src/services/autoVectorizeService');
const { testQdrantConnection, getCollectionInfo } = require('../src/config/qdrant');

async function testEnvironment() {
  console.log('\n=== 环境检查 ===\n');

  // 1. 检查Qdrant连接
  console.log('1. 检查Qdrant连接...');
  try {
    const qdrantOk = await testQdrantConnection();
    if (qdrantOk) {
      console.log('   ✅ Qdrant连接正常');
      
      // 获取集合信息
      const collectionInfo = await getCollectionInfo();
      if (collectionInfo) {
        console.log(`   ℹ️  集合信息: ${collectionInfo.points_count || 0} 个向量点`);
      }
    } else {
      console.log('   ❌ Qdrant连接失败');
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Qdrant连接失败: ${error.message}`);
    return false;
  }

  // 2. 检查向量化服务
  console.log('\n2. 检查向量化服务...');
  try {
    const serviceOk = await isVectorizeServiceAvailable();
    if (serviceOk) {
      console.log('   ✅ 向量化服务可用');
    } else {
      console.log('   ❌ 向量化服务不可用（Python环境可能有问题）');
      return false;
    }
  } catch (error) {
    console.log(`   ❌ 向量化服务检查失败: ${error.message}`);
    return false;
  }

  // 3. 检查MySQL连接
  console.log('\n3. 检查MySQL连接...');
  try {
    const imageCount = await Image.count();
    console.log(`   ✅ MySQL连接正常，共有 ${imageCount} 张图片`);
  } catch (error) {
    console.log(`   ❌ MySQL连接失败: ${error.message}`);
    return false;
  }

  return true;
}

async function testSingleImage() {
  console.log('\n=== 单张图片向量化测试 ===\n');

  try {
    // 查找一张图片进行测试
    const image = await Image.findOne({
      include: [
        {
          model: Model,
          required: false,
          include: [
            {
              model: Brand,
              required: false
            }
          ]
        }
      ],
      order: [['id', 'DESC']],
      limit: 1
    });

    if (!image) {
      console.log('❌ 没有找到可测试的图片');
      return false;
    }

    console.log(`找到测试图片: ID=${image.id}, URL=${image.url}`);
    console.log(`车型: ${image.Model?.name || '未知'}`);
    console.log(`品牌: ${image.Model?.Brand?.name || '未知'}`);
    console.log('');

    console.log('开始向量化...');
    const startTime = Date.now();
    
    const result = await vectorizeAndUpsertImage(image.id);
    
    const duration = Date.now() - startTime;

    if (result.success) {
      console.log(`✅ 向量化成功！耗时: ${duration}ms`);
      console.log(`   - imageId: ${result.imageId}`);
      console.log(`   - vectorized: ${result.vectorized}`);
      console.log(`   - upserted: ${result.upserted}`);
      return true;
    } else {
      console.log(`❌ 向量化失败: ${result.error}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ 测试失败: ${error.message}`);
    console.error(error.stack);
    return false;
  }
}

async function showUsageExamples() {
  console.log('\n=== 使用示例 ===\n');
  
  console.log('1. 批量向量化历史图片:');
  console.log('   node scripts/vectorize_existing_images.js --limit 10');
  console.log('');
  
  console.log('2. 向量化指定车型的图片:');
  console.log('   node scripts/vectorize_existing_images.js --model-id 123');
  console.log('');
  
  console.log('3. 模拟运行（不实际向量化）:');
  console.log('   node scripts/vectorize_existing_images.js --dry-run --limit 5');
  console.log('');
  
  console.log('4. 在代码中使用:');
  console.log('   const { vectorizeAndUpsertImage } = require("./services/autoVectorizeService");');
  console.log('   await vectorizeAndUpsertImage(imageId);');
  console.log('');
}

async function main() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   自动向量化功能测试                   ║');
  console.log('╚════════════════════════════════════════╝');

  try {
    // 环境检查
    const envOk = await testEnvironment();
    if (!envOk) {
      console.log('\n❌ 环境检查失败，请先解决上述问题');
      console.log('\n可能的解决方法:');
      console.log('1. 确保Qdrant服务正在运行');
      console.log('2. 安装Python依赖: cd backend/services && pip3 install -r requirements.txt');
      console.log('3. 检查 .env 配置文件');
      process.exit(1);
    }

    console.log('\n✅ 环境检查通过！');

    // 单张图片测试
    const testOk = await testSingleImage();
    
    if (testOk) {
      console.log('\n✅ 所有测试通过！自动向量化功能正常工作');
      showUsageExamples();
      process.exit(0);
    } else {
      console.log('\n❌ 测试失败');
      console.log('\n故障排查建议:');
      console.log('1. 检查日志中的详细错误信息');
      console.log('2. 确认图片URL可访问');
      console.log('3. 检查Python CLIP模型是否正确加载');
      console.log('4. 查看文档: docs/features/auto-vectorization.md');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ 测试脚本异常:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { main };





