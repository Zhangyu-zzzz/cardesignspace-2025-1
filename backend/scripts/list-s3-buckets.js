#!/usr/bin/env node

/**
 * 列出BMNAS S3存储中的所有桶
 * 
 * 功能：
 * 1. 连接到BMNAS S3存储
 * 2. 列出所有可用的存储桶
 * 3. 显示每个桶的基本信息
 * 4. 验证连接状态
 * 
 * 使用方法：
 * node backend/scripts/list-s3-buckets.js
 */

require('dotenv').config({ path: '/Users/birdmanoutman/PycharmProjects/cardesignspace-2025-1/.env' });
const { S3Client, ListBucketsCommand, HeadBucketCommand, GetBucketLocationCommand } = require('@aws-sdk/client-s3');

// 配置
const CONFIG = {
  S3: {
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION,
    bucket: process.env.S3_BUCKET,
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
    publicBaseUrl: process.env.S3_DOMAIN
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

// S3桶信息获取器
class S3BucketLister {
  constructor() {
    this.s3Client = s3Client;
  }
  
  async listAllBuckets() {
    logger.info('开始获取S3存储桶列表');
    
    try {
      const command = new ListBucketsCommand({});
      const response = await this.s3Client.send(command);
      
      if (!response.Buckets || response.Buckets.length === 0) {
        logger.warn('未找到任何存储桶');
        return [];
      }
      
      logger.info(`找到 ${response.Buckets.length} 个存储桶`);
      
      // 获取每个桶的详细信息
      const bucketDetails = await Promise.all(
        response.Buckets.map(async (bucket) => {
          return await this.getBucketDetails(bucket.Name);
        })
      );
      
      return bucketDetails;
      
    } catch (error) {
      logger.error('获取存储桶列表失败', { error: error.message });
      throw error;
    }
  }
  
  async getBucketDetails(bucketName) {
    try {
      // 检查桶是否存在
      await this.s3Client.send(new HeadBucketCommand({
        Bucket: bucketName
      }));
      
      // 获取桶的位置信息
      let location = 'unknown';
      try {
        const locationCommand = new GetBucketLocationCommand({
          Bucket: bucketName
        });
        const locationResponse = await this.s3Client.send(locationCommand);
        location = locationResponse.LocationConstraint || 'us-east-1';
      } catch (err) {
        // 忽略位置获取错误
      }
      
      return {
        name: bucketName,
        creationDate: new Date().toISOString(), // 简化处理
        location: location,
        status: 'accessible',
        publicUrl: `${CONFIG.S3.publicBaseUrl}/${bucketName}/`,
        isConfiguredBucket: bucketName === CONFIG.S3.bucket
      };
      
    } catch (error) {
      return {
        name: bucketName,
        creationDate: new Date().toISOString(),
        location: 'unknown',
        status: 'inaccessible',
        error: error.message,
        isConfiguredBucket: bucketName === CONFIG.S3.bucket
      };
    }
  }
  
  async testConnection() {
    logger.info('测试S3连接');
    
    try {
      // 尝试列出桶来测试连接
      await this.s3Client.send(new ListBucketsCommand({}));
      logger.info('S3连接测试成功');
      return true;
    } catch (error) {
      logger.error('S3连接测试失败', { error: error.message });
      return false;
    }
  }
  
  displayBuckets(buckets) {
    console.log('\n=== BMNAS S3 存储桶列表 ===\n');
    
    if (buckets.length === 0) {
      console.log('未找到任何存储桶');
      return;
    }
    
    // 按状态分组
    const accessibleBuckets = buckets.filter(b => b.status === 'accessible');
    const inaccessibleBuckets = buckets.filter(b => b.status === 'inaccessible');
    
    if (accessibleBuckets.length > 0) {
      console.log('✅ 可访问的存储桶:');
      accessibleBuckets.forEach((bucket, index) => {
        const configFlag = bucket.isConfiguredBucket ? ' (当前配置桶)' : '';
        console.log(`  ${index + 1}. ${bucket.name}${configFlag}`);
        console.log(`     位置: ${bucket.location}`);
        console.log(`     公共URL: ${bucket.publicUrl}`);
        console.log('');
      });
    }
    
    if (inaccessibleBuckets.length > 0) {
      console.log('❌ 不可访问的存储桶:');
      inaccessibleBuckets.forEach((bucket, index) => {
        console.log(`  ${index + 1}. ${bucket.name}`);
        console.log(`     错误: ${bucket.error}`);
        console.log('');
      });
    }
    
    // 显示配置信息
    console.log('📋 当前配置:');
    console.log(`  S3端点: ${CONFIG.S3.endpoint}`);
    console.log(`  区域: ${CONFIG.S3.region}`);
    console.log(`  配置桶: ${CONFIG.S3.bucket}`);
    console.log(`  访问密钥: ${CONFIG.S3.accessKeyId ? '***' + CONFIG.S3.accessKeyId.slice(-4) : '未设置'}`);
    console.log('');
  }
}

// 环境验证器
class EnvironmentValidator {
  static validate() {
    const required = [
      'S3_ENDPOINT',
      'S3_REGION', 
      'S3_ACCESS_KEY',
      'S3_SECRET_KEY',
      'S3_DOMAIN'
    ];
    
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`缺少必需的环境变量: ${missing.join(', ')}`);
    }
    
    logger.info('环境变量验证通过');
    return true;
  }
  
  static displayConfig() {
    logger.info('当前S3配置', {
      endpoint: CONFIG.S3.endpoint,
      region: CONFIG.S3.region,
      bucket: CONFIG.S3.bucket,
      publicBaseUrl: CONFIG.S3.publicBaseUrl,
      accessKeyId: CONFIG.S3.accessKeyId ? '***' + CONFIG.S3.accessKeyId.slice(-4) : '未设置'
    });
  }
}

// 主程序
async function main() {
  try {
    // 验证环境变量
    EnvironmentValidator.validate();
    EnvironmentValidator.displayConfig();
    
    const lister = new S3BucketLister();
    
    // 测试连接
    const connectionOk = await lister.testConnection();
    if (!connectionOk) {
      console.log('❌ 无法连接到S3存储，请检查配置');
      process.exit(1);
    }
    
    // 获取桶列表
    const buckets = await lister.listAllBuckets();
    
    // 显示结果
    lister.displayBuckets(buckets);
    
    console.log(`\n总计: ${buckets.length} 个存储桶`);
    
  } catch (error) {
    logger.error('程序执行失败', { error: error.message });
    console.log('\n❌ 执行失败:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { S3BucketLister, EnvironmentValidator, CONFIG };
