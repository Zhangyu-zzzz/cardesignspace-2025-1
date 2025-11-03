/**
 * 将已有的载具图片从 base64 迁移到腾讯云COS
 * 
 * 使用方法：
 * node backend/scripts/migrate-vehicles-to-cos.js
 */

require('dotenv').config();
const { Vehicle } = require('../src/models/mysql');
const { uploadToCOS } = require('../src/config/cos');
const { v4: uuidv4 } = require('uuid');

async function migrateVehiclesToCOS() {
  try {
    console.log('🚀 开始迁移载具图片到COS...\n');

    // 查找所有还没有迁移的载具（imageUrl 为空的）
    const vehicles = await Vehicle.findAll({
      where: {
        imageUrl: null
      }
    });

    if (vehicles.length === 0) {
      console.log('✅ 没有需要迁移的载具');
      process.exit(0);
    }

    console.log(`📊 找到 ${vehicles.length} 个需要迁移的载具\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < vehicles.length; i++) {
      const vehicle = vehicles[i];
      console.log(`[${i + 1}/${vehicles.length}] 处理载具 #${vehicle.id} "${vehicle.name}"...`);

      try {
        // 检查是否有 imageData
        if (!vehicle.imageData) {
          console.log(`  ⚠️  跳过：没有图片数据`);
          errorCount++;
          continue;
        }

        // 解析 base64 数据
        const base64Match = vehicle.imageData.match(/^data:image\/(png|jpeg|jpg|gif);base64,(.+)$/);
        if (!base64Match) {
          console.log(`  ⚠️  跳过：图片数据格式不正确`);
          errorCount++;
          continue;
        }

        const imageType = base64Match[1];
        const base64Data = base64Match[2];
        const imageBuffer = Buffer.from(base64Data, 'base64');

        // 生成唯一文件名
        const fileName = `vehicle-${uuidv4()}.${imageType}`;
        const cosKey = `draw-car/vehicles/${fileName}`;

        // 上传到 COS
        const cosResult = await uploadToCOS(
          imageBuffer,
          cosKey,
          `image/${imageType}`
        );

        // 更新数据库
        await vehicle.update({
          imageUrl: cosResult.url,
          cosKey: cosKey
        });

        console.log(`  ✅ 上传成功: ${cosResult.url}`);
        successCount++;

      } catch (error) {
        console.error(`  ❌ 失败: ${error.message}`);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 迁移完成统计:');
    console.log(`  ✅ 成功: ${successCount}`);
    console.log(`  ❌ 失败: ${errorCount}`);
    console.log(`  📈 总计: ${vehicles.length}`);
    console.log('='.repeat(60) + '\n');

    if (successCount === vehicles.length) {
      console.log('🎉 所有载具图片迁移成功！');
      console.log('\n💡 下一步：');
      console.log('   1. 执行 backend/migrations/cleanup_imageData_column.sql');
      console.log('   2. 删除旧的 imageData 字段');
    } else {
      console.log('⚠️  部分载具迁移失败，请检查错误日志');
    }

    process.exit(0);

  } catch (error) {
    console.error('❌ 迁移过程出错:', error);
    process.exit(1);
  }
}

// 执行迁移
migrateVehiclesToCOS();


