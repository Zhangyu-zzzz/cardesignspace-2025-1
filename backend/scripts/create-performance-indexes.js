const { sequelize } = require('../src/config/mysql');
const logger = require('../src/config/logger');

async function createPerformanceIndexes() {
  try {
    await sequelize.authenticate();
    logger.info('开始创建性能优化索引...');

    // 1. 为images表的createdAt字段创建索引（用于排序）
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_images_createdAt 
      ON images (createdAt DESC)
    `);
    logger.info('✅ 创建images.createdAt索引');

    // 2. 为images表的modelId字段创建索引（用于JOIN）
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_images_modelId 
      ON images (modelId)
    `);
    logger.info('✅ 创建images.modelId索引');

    // 3. 为models表的brandId字段创建索引（用于JOIN）
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_models_brandId 
      ON models (brandId)
    `);
    logger.info('✅ 创建models.brandId索引');

    // 4. 为models表的type字段创建索引（用于筛选）
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_models_type 
      ON models (type)
    `);
    logger.info('✅ 创建models.type索引');

    // 5. 创建复合索引用于常见查询
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_images_model_created 
      ON images (modelId, createdAt DESC)
    `);
    logger.info('✅ 创建复合索引');

    // 6. 为image_assets表创建索引
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_image_assets_imageId 
      ON image_assets (imageId)
    `);
    logger.info('✅ 创建image_assets.imageId索引');

    logger.info('🎉 所有性能索引创建完成！');

  } catch (error) {
    logger.error('创建索引失败:', error);
  } finally {
    await sequelize.close();
  }
}

createPerformanceIndexes();
