#!/usr/bin/env node

/**
 * S3-bmnas存储配置脚本
 * 
 * 功能：
 * 1. 创建S3存储桶
 * 2. 配置访问权限
 * 3. 设置CORS策略
 * 4. 验证配置
 * 
 * 使用方法：
 * node backend/scripts/setup-s3-backup.js [options]
 * 
 * 选项：
 * --create-bucket    创建存储桶
 * --set-permissions  设置权限
 * --set-cors         设置CORS
 * --verify           验证配置
 * --all              执行所有配置
 */

require('dotenv').config({ path: '/Users/birdmanoutman/PycharmProjects/cardesignspace-2025-1/.env' });
const { S3Client, CreateBucketCommand, PutBucketPolicyCommand, PutBucketCorsCommand, HeadBucketCommand, GetBucketPolicyCommand, GetBucketCorsCommand } = require('@aws-sdk/client-s3');

// 配置
const CONFIG = {
  // S3-bmnas配置
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

// S3配置管理器
class S3ConfigManager {
  constructor() {
    this.s3Client = s3Client;
    this.bucketName = CONFIG.S3.bucket;
  }
  
  async createBucket() {
    logger.info('创建S3存储桶', { bucket: this.bucketName });
    
    try {
      // 检查存储桶是否已存在
      try {
        await this.s3Client.send(new HeadBucketCommand({
          Bucket: this.bucketName
        }));
        logger.warn('存储桶已存在', { bucket: this.bucketName });
        return { success: true, message: '存储桶已存在' };
      } catch (error) {
        if (error.name !== 'NotFound') {
          throw error;
        }
      }
      
      // 创建存储桶
      const command = new CreateBucketCommand({
        Bucket: this.bucketName,
        ACL: 'public-read'
      });
      
      await this.s3Client.send(command);
      logger.info('存储桶创建成功', { bucket: this.bucketName });
      
      return { success: true, message: '存储桶创建成功' };
      
    } catch (error) {
      logger.error('创建存储桶失败', { 
        bucket: this.bucketName, 
        error: error.message 
      });
      throw error;
    }
  }
  
  async setPermissions() {
    logger.info('设置存储桶权限');
    
    try {
      // 公有读权限策略
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'PublicReadGetObject',
            Effect: 'Allow',
            Principal: '*',
            Action: 's3:GetObject',
            Resource: `arn:aws:s3:::${this.bucketName}/*`
          },
          {
            Sid: 'AllowBackupAccess',
            Effect: 'Allow',
            Principal: {
              AWS: `arn:aws:iam::${CONFIG.S3.accessKeyId}:root`
            },
            Action: [
              's3:GetObject',
              's3:PutObject',
              's3:DeleteObject',
              's3:ListBucket'
            ],
            Resource: [
              `arn:aws:s3:::${this.bucketName}`,
              `arn:aws:s3:::${this.bucketName}/*`
            ]
          }
        ]
      };
      
      const command = new PutBucketPolicyCommand({
        Bucket: this.bucketName,
        Policy: JSON.stringify(policy)
      });
      
      await this.s3Client.send(command);
      logger.info('存储桶权限设置成功');
      
      return { success: true, message: '权限设置成功' };
      
    } catch (error) {
      logger.error('设置存储桶权限失败', { error: error.message });
      throw error;
    }
  }
  
  async setCors() {
    logger.info('设置CORS策略');
    
    try {
      const corsConfig = {
        CORSRules: [
          {
            AllowedHeaders: ['*'],
            AllowedMethods: ['GET', 'HEAD'],
            AllowedOrigins: ['*'],
            ExposeHeaders: ['ETag'],
            MaxAgeSeconds: 3000
          }
        ]
      };
      
      const command = new PutBucketCorsCommand({
        Bucket: this.bucketName,
        CORSConfiguration: corsConfig
      });
      
      await this.s3Client.send(command);
      logger.info('CORS策略设置成功');
      
      return { success: true, message: 'CORS设置成功' };
      
    } catch (error) {
      logger.error('设置CORS策略失败', { error: error.message });
      throw error;
    }
  }
  
  async verifyConfig() {
    logger.info('验证S3配置');
    
    const results = {
      bucketExists: false,
      permissionsSet: false,
      corsSet: false,
      publicAccess: false,
      errors: []
    };
    
    try {
      // 检查存储桶是否存在
      try {
        await this.s3Client.send(new HeadBucketCommand({
          Bucket: this.bucketName
        }));
        results.bucketExists = true;
        logger.info('存储桶存在');
      } catch (error) {
        if (error.name === 'NotFound') {
          results.errors.push('存储桶不存在');
        } else {
          results.errors.push(`检查存储桶失败: ${error.message}`);
        }
      }
      
      // 检查权限策略
      try {
        const policyCommand = new GetBucketPolicyCommand({
          Bucket: this.bucketName
        });
        const policyResponse = await this.s3Client.send(policyCommand);
        
        if (policyResponse.Policy) {
          const policy = JSON.parse(policyResponse.Policy);
          const hasPublicRead = policy.Statement.some(statement => 
            statement.Effect === 'Allow' && 
            statement.Principal === '*' &&
            statement.Action === 's3:GetObject'
          );
          
          results.permissionsSet = true;
          results.publicAccess = hasPublicRead;
          
          logger.info('权限策略已设置', { publicAccess: hasPublicRead });
        }
      } catch (error) {
        if (error.name === 'NoSuchBucketPolicy') {
          results.errors.push('权限策略未设置');
        } else {
          results.errors.push(`检查权限策略失败: ${error.message}`);
        }
      }
      
      // 检查CORS配置
      try {
        const corsCommand = new GetBucketCorsCommand({
          Bucket: this.bucketName
        });
        const corsResponse = await this.s3Client.send(corsCommand);
        
        if (corsResponse.CORSRules && corsResponse.CORSRules.length > 0) {
          results.corsSet = true;
          logger.info('CORS策略已设置');
        }
      } catch (error) {
        if (error.name === 'NoSuchCORSConfiguration') {
          results.errors.push('CORS策略未设置');
        } else {
          results.errors.push(`检查CORS配置失败: ${error.message}`);
        }
      }
      
      // 测试公有访问
      if (results.publicAccess) {
        try {
          const testUrl = `${CONFIG.S3.publicBaseUrl}/${this.bucketName}/`;
          logger.info('测试公有访问', { url: testUrl });
          // 这里可以添加实际的HTTP请求测试
        } catch (error) {
          results.errors.push(`测试公有访问失败: ${error.message}`);
        }
      }
      
    } catch (error) {
      logger.error('验证配置时发生错误', { error: error.message });
      results.errors.push(`验证过程错误: ${error.message}`);
    }
    
    return results;
  }
  
  async setupAll() {
    logger.info('开始完整S3配置');
    
    const results = {
      bucket: null,
      permissions: null,
      cors: null,
      verification: null
    };
    
    try {
      // 创建存储桶
      results.bucket = await this.createBucket();
      
      // 设置权限
      results.permissions = await this.setPermissions();
      
      // 设置CORS
      results.cors = await this.setCors();
      
      // 验证配置
      results.verification = await this.verifyConfig();
      
      logger.info('S3配置完成', results);
      
      return results;
      
    } catch (error) {
      logger.error('S3配置失败', { error: error.message });
      throw error;
    }
  }
}

// 环境验证器
class EnvironmentValidator {
  static validate() {
    const required = [
      'S3_ENDPOINT',
      'S3_REGION', 
      'S3_BUCKET',
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

// 命令行参数解析
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  
  for (const arg of args) {
    if (arg === '--create-bucket') {
      options.createBucket = true;
    } else if (arg === '--set-permissions') {
      options.setPermissions = true;
    } else if (arg === '--set-cors') {
      options.setCors = true;
    } else if (arg === '--verify') {
      options.verify = true;
    } else if (arg === '--all') {
      options.all = true;
    }
  }
  
  return options;
}

// 主程序
async function main() {
  const options = parseArgs();
  
  try {
    // 验证环境变量
    EnvironmentValidator.validate();
    EnvironmentValidator.displayConfig();
    
    const manager = new S3ConfigManager();
    
    if (options.all) {
      // 执行所有配置
      const results = await manager.setupAll();
      console.log('\n配置结果:');
      console.log(JSON.stringify(results, null, 2));
      
    } else if (options.createBucket) {
      const result = await manager.createBucket();
      console.log('创建存储桶结果:', result);
      
    } else if (options.setPermissions) {
      const result = await manager.setPermissions();
      console.log('设置权限结果:', result);
      
    } else if (options.setCors) {
      const result = await manager.setCors();
      console.log('设置CORS结果:', result);
      
    } else if (options.verify) {
      const results = await manager.verifyConfig();
      console.log('验证结果:');
      console.log(JSON.stringify(results, null, 2));
      
    } else {
      console.log('使用方法:');
      console.log('  --create-bucket    创建存储桶');
      console.log('  --set-permissions  设置权限');
      console.log('  --set-cors         设置CORS');
      console.log('  --verify           验证配置');
      console.log('  --all              执行所有配置');
    }
    
  } catch (error) {
    logger.error('配置程序异常', { error: error.message });
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { S3ConfigManager, EnvironmentValidator, CONFIG };
