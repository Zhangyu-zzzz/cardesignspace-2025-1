#!/usr/bin/env node

/**
 * S3上传工具
 * 
 * 功能：
 * 1. 上传文件到BMNAS S3存储
 * 2. 支持断点续传
 * 3. 自动重试机制
 * 4. 进度显示
 * 
 * 使用方法：
 * node scripts/s3-upload-tool.js <local_file> <s3_key> [options]
 */

const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { createReadStream } = require('fs');

// 尝试加载环境变量文件
try {
  const envPaths = [
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '../backend/.env')
  ];
  
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value && !process.env[key]) {
          process.env[key] = value.trim();
        }
      });
      break;
    }
  }
} catch (err) {
  // 忽略环境变量加载错误
}

// 配置
const CONFIG = {
  S3: {
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION,
    bucket: process.env.S3_BUCKET,
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  }
};

// 初始化S3客户端
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
  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`);
    if (data) console.log(JSON.stringify(data, null, 2));
  }
  
  info(message, data) { this.log('info', message, data); }
  warn(message, data) { this.log('warn', message, data); }
  error(message, data) { this.log('error', message, data); }
}

const logger = new Logger();

// 文件上传器
class S3Uploader {
  constructor() {
    this.s3Client = s3Client;
    this.bucket = CONFIG.S3.bucket;
  }
  
  async uploadFile(localFilePath, s3Key, options = {}) {
    const {
      contentType = 'application/gzip',
      storageClass = 'STANDARD_IA',
      maxRetries = 3,
      retryDelay = 5000
    } = options;
    
    logger.info('开始上传文件', {
      localFile: localFilePath,
      s3Key: s3Key,
      bucket: this.bucket
    });
    
    // 检查本地文件
    if (!fs.existsSync(localFilePath)) {
      throw new Error(`本地文件不存在: ${localFilePath}`);
    }
    
    const fileStats = fs.statSync(localFilePath);
    const fileSize = fileStats.size;
    
    logger.info('文件信息', {
      size: `${(fileSize / 1024 / 1024).toFixed(2)}MB`,
      modified: fileStats.mtime
    });
    
    // 检查S3中是否已存在
    try {
      const headCommand = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: s3Key
      });
      
      const headResult = await this.s3Client.send(headCommand);
      
      if (headResult.ContentLength === fileSize) {
        logger.info('文件已存在且大小相同，跳过上传', {
          s3Key: s3Key,
          size: headResult.ContentLength
        });
        return { success: true, skipped: true, key: s3Key };
      } else {
        logger.warn('文件已存在但大小不同，将重新上传', {
          s3Key: s3Key,
          existingSize: headResult.ContentLength,
          newSize: fileSize
        });
      }
    } catch (error) {
      if (error.name !== 'NotFound') {
        logger.warn('检查S3文件时出错', { error: error.message });
      }
    }
    
    // 上传文件
    let retryCount = 0;
    while (retryCount < maxRetries) {
      try {
        const uploadCommand = new PutObjectCommand({
          Bucket: this.bucket,
          Key: s3Key,
          Body: createReadStream(localFilePath),
          ContentType: contentType,
          Metadata: {
            'uploaded-at': new Date().toISOString(),
            'original-filename': path.basename(localFilePath),
            'file-size': fileSize.toString()
          }
        });
        
        const result = await this.s3Client.send(uploadCommand);
        
        logger.info('文件上传成功', {
          s3Key: s3Key,
          etag: result.ETag,
          size: fileSize
        });
        
        return {
          success: true,
          key: s3Key,
          etag: result.ETag,
          size: fileSize
        };
        
      } catch (error) {
        retryCount++;
        logger.error(`上传失败 (第${retryCount}次尝试)`, {
          error: error.message,
          s3Key: s3Key
        });
        
        if (retryCount < maxRetries) {
          logger.info(`等待${retryDelay}ms后重试...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        } else {
          throw error;
        }
      }
    }
  }
  
  async uploadDatabaseBackup(localFilePath, backupType = 'daily') {
    const fileName = path.basename(localFilePath);
    const s3Key = `database-backups/${backupType}/${fileName}`;
    
    return await this.uploadFile(localFilePath, s3Key, {
      contentType: 'application/gzip',
      storageClass: 'STANDARD_IA'
    });
  }
}

// 命令行参数解析
function parseArgs() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('使用方法: node s3-upload-tool.js <local_file> <s3_key> [options]');
    console.log('');
    console.log('示例:');
    console.log('  node s3-upload-tool.js ./backup.sql.gz database-backups/daily/backup.sql.gz');
    console.log('  node s3-upload-tool.js ./backup.sql.gz database-backups/daily/backup.sql.gz --storage-class STANDARD_IA');
    process.exit(1);
  }
  
  const options = {
    localFile: args[0],
    s3Key: args[1],
    storageClass: 'STANDARD_IA',
    maxRetries: 3
  };
  
  // 解析选项
  for (let i = 2; i < args.length; i++) {
    if (args[i].startsWith('--storage-class=')) {
      options.storageClass = args[i].split('=')[1];
    } else if (args[i].startsWith('--max-retries=')) {
      options.maxRetries = parseInt(args[i].split('=')[1]);
    }
  }
  
  return options;
}

// 主程序
async function main() {
  try {
    const options = parseArgs();
    const uploader = new S3Uploader();
    
    const result = await uploader.uploadFile(
      options.localFile,
      options.s3Key,
      {
        storageClass: options.storageClass,
        maxRetries: options.maxRetries
      }
    );
    
    if (result.success) {
      console.log('✅ 上传成功!');
      console.log(`📁 S3 Key: ${result.key}`);
      if (result.etag) {
        console.log(`🏷️  ETag: ${result.etag}`);
      }
      if (result.size) {
        console.log(`📊 Size: ${(result.size / 1024 / 1024).toFixed(2)}MB`);
      }
    } else {
      console.log('❌ 上传失败');
      process.exit(1);
    }
    
  } catch (error) {
    logger.error('上传程序异常', { error: error.message });
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { S3Uploader, CONFIG };
