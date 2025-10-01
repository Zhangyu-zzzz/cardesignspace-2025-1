#!/usr/bin/env node

/**
 * 腾讯云COS到S3-bmnas备份脚本
 * 
 * 功能：
 * 1. 从数据库读取所有图片URL
 * 2. 直接从COS下载到S3（不经过本地）
 * 3. 支持图片变体备份
 * 4. 业务低峰期运行
 * 5. 完整的进度监控和错误处理
 * 
 * 使用方法：
 * node backend/scripts/cos-to-s3-backup.js [options]
 * 
 * 选项：
 * --batch-size=100    每批处理数量
 * --delay=1000        批次间延迟(ms)
 * --dry-run           仅测试，不实际备份
 * --resume            从上次中断处继续
 * --variant-only      仅备份变体
 * --original-only     仅备份原图
 */

require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const { Sequelize } = require('sequelize');
const COS = require('cos-nodejs-sdk-v5');
const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { createReadStream } = require('stream');
const { pipeline } = require('stream/promises');

// 配置
const CONFIG = {
  // 数据库配置
  DB: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    dialect: 'mysql',
    logging: false
  },
  
  // 腾讯云COS配置
  COS: {
    SecretId: process.env.TENCENT_SECRET_ID,
    SecretKey: process.env.TENCENT_SECRET_KEY,
    Bucket: process.env.COS_BUCKET,
    Region: process.env.COS_REGION,
    Domain: process.env.COS_DOMAIN
  },
  
  // S3-bmnas配置
  S3: {
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION,
    bucket: process.env.S3_BUCKET,
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
    publicBaseUrl: process.env.S3_DOMAIN
  },
  
  // 备份配置
  BACKUP: {
    batchSize: 50,           // 每批处理数量
    delay: 2000,             // 批次间延迟(ms)
    maxRetries: 3,           // 最大重试次数
    timeout: 30000,          // 超时时间(ms)
    lowTrafficHours: [2, 3, 4, 5], // 业务低峰期(小时)
    progressFile: './backup-progress.json',
    logFile: './backup.log'
  }
};

// 初始化客户端
const sequelize = new Sequelize(CONFIG.DB);
const cos = new COS({
  SecretId: CONFIG.COS.SecretId,
  SecretKey: CONFIG.COS.SecretKey,
});
const s3Client = new S3Client({
  endpoint: CONFIG.S3.endpoint,
  region: CONFIG.S3.region,
  credentials: {
    accessKeyId: CONFIG.S3.accessKeyId,
    secretAccessKey: CONFIG.S3.secretAccessKey,
  },
  forcePathStyle: true,
});

// 日志系统
class Logger {
  constructor(logFile) {
    this.logFile = logFile;
  }
  
  async log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data
    };
    
    console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`);
    if (data) console.log(JSON.stringify(data, null, 2));
    
    try {
      await fs.appendFile(this.logFile, JSON.stringify(logEntry) + '\n');
    } catch (err) {
      console.error('写入日志失败:', err.message);
    }
  }
  
  info(message, data) { return this.log('info', message, data); }
  warn(message, data) { return this.log('warn', message, data); }
  error(message, data) { return this.log('error', message, data); }
}

const logger = new Logger(CONFIG.BACKUP.logFile);

// 进度管理
class ProgressManager {
  constructor(progressFile) {
    this.progressFile = progressFile;
    this.progress = {
      startTime: null,
      endTime: null,
      totalImages: 0,
      processedImages: 0,
      successfulImages: 0,
      failedImages: 0,
      skippedImages: 0,
      totalVariants: 0,
      processedVariants: 0,
      successfulVariants: 0,
      failedVariants: 0,
      skippedVariants: 0,
      currentBatch: 0,
      lastProcessedId: 0,
      errors: [],
      stats: {
        totalSize: 0,
        averageSize: 0,
        processingRate: 0
      }
    };
  }
  
  async load() {
    try {
      const data = await fs.readFile(this.progressFile, 'utf8');
      this.progress = { ...this.progress, ...JSON.parse(data) };
      logger.info('加载进度文件成功', { lastProcessedId: this.progress.lastProcessedId });
    } catch (err) {
      logger.info('进度文件不存在，从头开始');
    }
  }
  
  async save() {
    try {
      await fs.writeFile(this.progressFile, JSON.stringify(this.progress, null, 2));
    } catch (err) {
      logger.error('保存进度文件失败', { error: err.message });
    }
  }
  
  updateStats() {
    const elapsed = Date.now() - this.progress.startTime;
    this.progress.stats.processingRate = this.progress.processedImages / (elapsed / 1000 / 60); // 每分钟处理数量
    this.progress.stats.averageSize = this.progress.stats.totalSize / this.progress.successfulImages || 0;
  }
  
  addError(error, context) {
    this.progress.errors.push({
      timestamp: new Date().toISOString(),
      error: error.message,
      context
    });
  }
}

// 图片URL解析器
class ImageUrlParser {
  static parseCosUrl(url) {
    // 解析COS URL: https://bucket.cos.region.myqcloud.com/path/to/file.jpg
    const match = url.match(/https:\/\/([^\.]+)\.cos\.([^\.]+)\.myqcloud\.com\/(.+)/);
    if (!match) return null;
    
    // 解码URL编码的路径
    const decodedKey = decodeURIComponent(match[3]);
    
    return {
      bucket: match[1],
      region: match[2],
      key: decodedKey
    };
  }
  
  static buildS3Key(cosKey, isVariant = false) {
    // 保持相同的路径结构
    return cosKey;
  }
  
  static buildS3Url(s3Key) {
    return `${CONFIG.S3.publicBaseUrl}/${CONFIG.S3.bucket}/${s3Key}`;
  }
}

// 文件传输器
class FileTransferer {
  constructor() {
    this.retryCount = 0;
  }
  
  async transferFile(cosKey, s3Key, contentType = 'image/jpeg') {
    return new Promise(async (resolve, reject) => {
      try {
        // 检查S3中是否已存在
        try {
          await s3Client.send(new HeadObjectCommand({
            Bucket: CONFIG.S3.bucket,
            Key: s3Key
          }));
          logger.info(`文件已存在，跳过: ${s3Key}`);
          resolve({ skipped: true, key: s3Key });
          return;
        } catch (err) {
          // 文件不存在，继续下载
        }
        
        // 从COS下载到Buffer（而不是流）
        const downloadResult = await new Promise((resolve, reject) => {
          cos.getObject({
            Bucket: CONFIG.COS.Bucket,
            Region: CONFIG.COS.Region,
            Key: cosKey,
          }, function(err, data) {
            if (err) {
              reject(err);
            } else {
              resolve(data);
            }
          });
        });
        
        // 上传到S3
        const uploadCommand = new PutObjectCommand({
          Bucket: CONFIG.S3.bucket,
          Key: s3Key,
          Body: downloadResult.Body,
          ContentType: contentType,
          ACL: 'public-read'
        });
        
        const result = await s3Client.send(uploadCommand);
        
        logger.info(`文件传输成功: ${cosKey} -> ${s3Key}`);
        resolve({ 
          success: true, 
          key: s3Key, 
          etag: result.ETag,
          size: downloadResult.Body.length 
        });
        
      } catch (error) {
        logger.error(`文件传输失败: ${cosKey}`, { 
          error: error.message,
          retryCount: this.retryCount 
        });
        
        if (this.retryCount < CONFIG.BACKUP.maxRetries) {
          this.retryCount++;
          logger.warn(`重试传输: ${cosKey} (第${this.retryCount}次)`);
          setTimeout(() => {
            this.transferFile(cosKey, s3Key, contentType).then(resolve).catch(reject);
          }, 1000 * this.retryCount);
        } else {
          reject(error);
        }
      }
    });
  }
}

// 数据库查询器
class DatabaseQuerier {
  constructor() {
    this.sequelize = sequelize;
  }
  
  async getImages(batchSize, lastId = 0) {
    const query = `
      SELECT 
        i.id,
        i.url as originalUrl,
        i.filename,
        i.fileSize,
        i.fileType,
        m.name as modelName,
        b.name as brandName
      FROM images i
      LEFT JOIN models m ON i.modelId = m.id
      LEFT JOIN brands b ON m.brandId = b.id
      WHERE i.id > :lastId
      ORDER BY i.id
      LIMIT :batchSize
    `;
    
    const results = await this.sequelize.query(query, {
      replacements: { lastId, batchSize },
      type: Sequelize.QueryTypes.SELECT
    });
    
    return results;
  }
  
  async getImageVariants(imageId) {
    const query = `
      SELECT 
        variant,
        url,
        width,
        height,
        size
      FROM image_assets
      WHERE imageId = :imageId
    `;
    
    const [results] = await this.sequelize.query(query, {
      replacements: { imageId },
      type: Sequelize.QueryTypes.SELECT
    });
    
    return results;
  }
  
  async getArticleImages(batchSize, lastId = 0) {
    const query = `
      SELECT 
        id,
        url,
        cosKey,
        filename,
        fileSize,
        fileType
      FROM article_images
      WHERE id > :lastId
      ORDER BY id
      LIMIT :batchSize
    `;
    
    const [results] = await this.sequelize.query(query, {
      replacements: { lastId, batchSize },
      type: Sequelize.QueryTypes.SELECT
    });
    
    return results;
  }
  
  async getTotalCounts() {
    const [imageCount] = await this.sequelize.query(
      'SELECT COUNT(*) as count FROM images',
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    const [variantCount] = await this.sequelize.query(
      'SELECT COUNT(*) as count FROM image_assets',
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    const [articleImageCount] = await this.sequelize.query(
      'SELECT COUNT(*) as count FROM article_images',
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    return {
      images: imageCount.count,
      variants: variantCount.count,
      articleImages: articleImageCount.count
    };
  }
}

// 主备份类
class CosToS3Backup {
  constructor(options = {}) {
    this.options = {
      batchSize: options.batchSize || CONFIG.BACKUP.batchSize,
      delay: options.delay || CONFIG.BACKUP.delay,
      dryRun: options.dryRun || false,
      resume: options.resume || false,
      variantOnly: options.variantOnly || false,
      originalOnly: options.originalOnly || false,
      ...options
    };
    
    this.progress = new ProgressManager(CONFIG.BACKUP.progressFile);
    this.transferer = new FileTransferer();
    this.querier = new DatabaseQuerier();
  }
  
  async initialize() {
    logger.info('初始化备份任务', this.options);
    
    // 测试数据库连接
    try {
      await sequelize.authenticate();
      logger.info('数据库连接成功');
    } catch (error) {
      logger.error('数据库连接失败', { error: error.message });
      throw error;
    }
    
    // 测试S3连接
    try {
      await s3Client.send(new HeadObjectCommand({
        Bucket: CONFIG.S3.bucket,
        Key: 'test-connection'
      }));
    } catch (error) {
      if (error.name === 'NotFound') {
        logger.info('S3连接成功');
      } else {
        logger.error('S3连接失败', { error: error.message });
        throw error;
      }
    }
    
    // 加载进度
    if (this.options.resume) {
      await this.progress.load();
    } else {
      this.progress.progress.startTime = Date.now();
    }
    
    // 获取总数
    const counts = await this.querier.getTotalCounts();
    this.progress.progress.totalImages = counts.images;
    this.progress.progress.totalVariants = counts.variants;
    
    logger.info('备份统计', {
      totalImages: counts.images,
      totalVariants: counts.variants,
      totalArticleImages: counts.articleImages
    });
  }
  
  async backupImages() {
    logger.info('开始备份主图片');
    
    let lastId = this.progress.progress.lastProcessedId;
    let batchCount = 0;
    
    while (true) {
      const images = await this.querier.getImages(this.options.batchSize, lastId);
      
      if (images.length === 0) {
        logger.info('主图片备份完成');
        break;
      }
      
      batchCount++;
      logger.info(`处理第${batchCount}批主图片`, { 
        count: images.length, 
        lastId: lastId 
      });
      
      for (const image of images) {
        try {
          await this.backupSingleImage(image);
          this.progress.progress.processedImages++;
          this.progress.progress.successfulImages++;
          lastId = image.id;
        } catch (error) {
          logger.error(`备份图片失败: ${image.id}`, { 
            error: error.message,
            url: image.originalUrl 
          });
          this.progress.progress.failedImages++;
          this.progress.addError(error, { type: 'image', id: image.id });
        }
      }
      
      this.progress.progress.lastProcessedId = lastId;
      await this.progress.save();
      
      // 批次间延迟
      if (this.options.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, this.options.delay));
      }
    }
  }
  
  async backupSingleImage(image) {
    const cosInfo = ImageUrlParser.parseCosUrl(image.originalUrl);
    if (!cosInfo) {
      throw new Error(`无法解析COS URL: ${image.originalUrl}`);
    }
    
    const s3Key = ImageUrlParser.buildS3Key(cosInfo.key);
    
    if (this.options.dryRun) {
      logger.info(`[DRY RUN] 备份图片: ${cosInfo.key} -> ${s3Key}`);
      return;
    }
    
    const result = await this.transferer.transferFile(
      cosInfo.key, 
      s3Key, 
      image.fileType || 'image/jpeg'
    );
    
    if (result.success) {
      this.progress.progress.stats.totalSize += result.size || 0;
    }
    
    return result;
  }
  
  async backupVariants() {
    logger.info('开始备份图片变体');
    
    const variants = await this.querier.getImageVariants();
    
    for (const variant of variants) {
      try {
        const cosInfo = this.urlParser.parseCosUrl(variant.url);
        if (!cosInfo) {
          throw new Error(`无法解析变体COS URL: ${variant.url}`);
        }
        
        const s3Key = this.urlParser.buildS3Key(cosInfo.key, true);
        
        if (this.options.dryRun) {
          logger.info(`[DRY RUN] 备份变体: ${cosInfo.key} -> ${s3Key}`);
        } else {
          await this.transferer.transferFile(
            cosInfo.key, 
            s3Key, 
            'image/jpeg'
          );
        }
        
        this.progress.progress.processedVariants++;
        this.progress.progress.successfulVariants++;
        
      } catch (error) {
        logger.error(`备份变体失败: ${variant.url}`, { error: error.message });
        this.progress.progress.failedVariants++;
        this.progress.addError(error, { type: 'variant', url: variant.url });
      }
    }
    
    logger.info('图片变体备份完成');
  }
  
  async run() {
    try {
      await this.initialize();
      
      if (!this.options.variantOnly) {
        await this.backupImages();
      }
      
      if (!this.options.originalOnly) {
        await this.backupVariants();
      }
      
      this.progress.progress.endTime = Date.now();
      this.progress.updateStats();
      await this.progress.save();
      
      logger.info('备份任务完成', {
        duration: this.progress.progress.endTime - this.progress.progress.startTime,
        stats: this.progress.progress.stats
      });
      
    } catch (error) {
      logger.error('备份任务失败', { error: error.message });
      throw error;
    } finally {
      await sequelize.close();
    }
  }
}

// 命令行参数解析
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  
  for (const arg of args) {
    if (arg.startsWith('--batch-size=')) {
      options.batchSize = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--delay=')) {
      options.delay = parseInt(arg.split('=')[1]);
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--resume') {
      options.resume = true;
    } else if (arg === '--variant-only') {
      options.variantOnly = true;
    } else if (arg === '--original-only') {
      options.originalOnly = true;
    }
  }
  
  return options;
}

// 主程序
async function main() {
  const options = parseArgs();
  const backup = new CosToS3Backup(options);
  
  try {
    await backup.run();
    process.exit(0);
  } catch (error) {
    logger.error('备份程序异常退出', { error: error.message });
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { CosToS3Backup, CONFIG };
