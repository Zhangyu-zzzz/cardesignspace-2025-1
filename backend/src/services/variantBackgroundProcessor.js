const logger = require('../config/logger');
const { Image, ImageAsset } = require('../models/mysql');
const { generateAndSaveAssets } = require('./assetService');
const axios = require('axios');

class VariantBackgroundProcessor {
  constructor() {
    this.isProcessing = false;
    this.processingInterval = null;
    this.idleTimeout = null;
    this.lastActivityTime = Date.now();
    this.processingBatchSize = 10; // 每次处理的图片数量
    this.idleThreshold = 5 * 60 * 1000; // 5分钟空闲时间
    this.processingIntervalMs = 10 * 60 * 1000; // 10分钟检查一次
    
    this.start();
  }

  // 启动后台处理器
  start() {
    logger.info('启动变体后台处理器...');
    
    // 定期检查是否需要处理
    this.processingInterval = setInterval(() => {
      this.checkAndProcess();
    }, this.processingIntervalMs);

    // 监听服务器活动
    this.setupActivityMonitoring();
  }

  // 停止后台处理器
  stop() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout);
      this.idleTimeout = null;
    }
    logger.info('变体后台处理器已停止');
  }

  // 设置活动监控
  setupActivityMonitoring() {
    // 监听HTTP请求活动
    const originalEmit = process.emit;
    process.emit = (...args) => {
      if (args[0] === 'request') {
        this.updateActivityTime();
      }
      return originalEmit.apply(process, args);
    };
  }

  // 更新活动时间
  updateActivityTime() {
    this.lastActivityTime = Date.now();
  }

  // 检查是否空闲
  isIdle() {
    return Date.now() - this.lastActivityTime > this.idleThreshold;
  }

  // 检查并处理缺失的变体
  async checkAndProcess() {
    if (this.isProcessing || !this.isIdle()) {
      return;
    }

    try {
      this.isProcessing = true;
      logger.info('开始后台处理缺失的变体...');

      // 查找缺失变体的图片
      const imagesWithMissingVariants = await this.findImagesWithMissingVariants();
      
      if (imagesWithMissingVariants.length === 0) {
        logger.info('没有发现缺失变体的图片');
        return;
      }

      logger.info(`发现 ${imagesWithMissingVariants.length} 张图片缺失变体，开始处理...`);

      // 分批处理
      for (let i = 0; i < imagesWithMissingVariants.length; i += this.processingBatchSize) {
        const batch = imagesWithMissingVariants.slice(i, i + this.processingBatchSize);
        await this.processBatch(batch);
        
        // 检查是否仍然空闲
        if (!this.isIdle()) {
          logger.info('检测到服务器活动，暂停后台处理');
          break;
        }
      }

      logger.info('后台变体处理完成');
    } catch (error) {
      logger.error('后台变体处理失败:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  // 查找缺失变体的图片
  async findImagesWithMissingVariants() {
    try {
      // 查找有图片但没有变体的记录
      const imagesWithoutVariants = await Image.findAll({
        include: [{
          model: ImageAsset,
          as: 'Assets',
          required: false
        }],
        where: {
          url: {
            [require('sequelize').Op.ne]: null
          }
        },
        limit: 100 // 限制查询数量
      });

      const imagesWithMissingVariants = [];

      for (const image of imagesWithoutVariants) {
        // 检查变体是否存在
        const missingVariants = await this.checkMissingVariants(image);
        if (missingVariants.length > 0) {
          imagesWithMissingVariants.push({
            image,
            missingVariants
          });
        }
      }

      return imagesWithMissingVariants;
    } catch (error) {
      logger.error('查找缺失变体图片失败:', error);
      return [];
    }
  }

  // 检查图片缺失的变体
  async checkMissingVariants(image) {
    const requiredVariants = ['thumb', 'small', 'medium', 'large', 'webp'];
    const existingVariants = image.Assets ? image.Assets.map(asset => asset.variant) : [];
    const missingVariants = [];

    for (const variant of requiredVariants) {
      if (!existingVariants.includes(variant)) {
        missingVariants.push(variant);
      }
    }

    return missingVariants;
  }

  // 处理一批图片
  async processBatch(batch) {
    logger.info(`处理批次: ${batch.length} 张图片`);
    
    for (const { image, missingVariants } of batch) {
      try {
        logger.info(`为图片 ${image.id} 生成变体: ${missingVariants.join(', ')}`);
        
        // 生成变体
        const generatedAssets = await generateAndSaveAssets(
          image.id,
          image.url,
          missingVariants
        );

        if (generatedAssets && Object.keys(generatedAssets).length > 0) {
          logger.info(`图片 ${image.id} 变体生成成功: ${Object.keys(generatedAssets).join(', ')}`);
        } else {
          logger.warn(`图片 ${image.id} 变体生成失败`);
        }

        // 短暂延迟，避免过度占用资源
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        logger.error(`处理图片 ${image.id} 失败:`, error);
      }
    }
  }

  // 手动触发处理
  async triggerProcessing() {
    if (this.isProcessing) {
      logger.info('后台处理正在进行中，跳过手动触发');
      return;
    }

    logger.info('手动触发变体处理...');
    await this.checkAndProcess();
  }

  // 获取处理器状态
  getStatus() {
    return {
      isProcessing: this.isProcessing,
      isIdle: this.isIdle(),
      lastActivityTime: this.lastActivityTime,
      idleThreshold: this.idleThreshold,
      processingIntervalMs: this.processingIntervalMs,
      processingBatchSize: this.processingBatchSize
    };
  }
}

// 创建全局实例
const variantProcessor = new VariantBackgroundProcessor();

module.exports = variantProcessor;
