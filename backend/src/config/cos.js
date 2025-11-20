// 确保正确加载环境变量（与app.js保持一致）
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
// 如果上面的路径不存在，尝试当前目录
if (!process.env.TENCENT_SECRET_ID && !process.env.TENCENT_SECRET_KEY) {
  require('dotenv').config();
}

const COS = require('cos-nodejs-sdk-v5');

const cos = new COS({
  SecretId: process.env.TENCENT_SECRET_ID || 'your-secret-id',
  SecretKey: process.env.TENCENT_SECRET_KEY || 'your-secret-key',
  // 添加超时和重试配置
  // 注意：COS SDK v5 可能不支持所有超时参数，我们会在上传时单独设置
});

// 动态获取COS配置，确保每次都读取最新的环境变量
const getCosConfig = () => {
  return {
    Bucket: process.env.COS_BUCKET || 'test-1250000000',
    Region: process.env.COS_REGION || 'ap-beijing',
    // 公共读写权限的存储桶域名
    BucketDomain: process.env.COS_DOMAIN || 'https://test-1250000000.cos.ap-beijing.myqcloud.com'
  };
};

const cosConfig = getCosConfig();

// 开发模式：也使用腾讯云COS存储
const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * 上传文件到腾讯云COS（带重试机制）
 * @param {Buffer} fileBuffer 文件缓冲区
 * @param {string} key 文件路径/名称
 * @param {string} contentType 文件类型
 * @param {number} retryCount 当前重试次数
 * @returns {Promise<Object>} 上传结果
 */
const uploadToCOS = (fileBuffer, key, contentType, retryCount = 0) => {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000; // 2秒延迟
  
  return new Promise((resolve, reject) => {
    try {
      // 验证文件缓冲区
      if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
        const error = new Error('无效的文件缓冲区');
        console.error('COS上传失败 - 文件缓冲区验证失败:', error);
        return reject(error);
      }

      // 验证文件大小
      if (fileBuffer.length === 0) {
        const error = new Error('文件大小为0');
        console.error('COS上传失败 - 文件大小验证失败:', error);
        return reject(error);
      }

      // 动态获取最新的COS配置
      const currentCosConfig = getCosConfig();
      
      // 验证COS配置
      if (!currentCosConfig.Bucket || currentCosConfig.Bucket === 'test-1250000000') {
        const error = new Error('COS存储桶配置无效，请检查环境变量COS_BUCKET');
        console.error('COS上传失败 - 配置验证失败:', error);
        return reject(error);
      }

      if (!currentCosConfig.Region) {
        const error = new Error('COS区域配置无效，请检查环境变量COS_REGION');
        console.error('COS上传失败 - 配置验证失败:', error);
        return reject(error);
      }

      // 验证密钥配置
      const secretId = process.env.TENCENT_SECRET_ID;
      const secretKey = process.env.TENCENT_SECRET_KEY;
      if (!secretId || secretId === 'your-secret-id' || !secretKey || secretKey === 'your-secret-key') {
        const error = new Error('COS密钥配置无效，请检查环境变量TENCENT_SECRET_ID和TENCENT_SECRET_KEY');
        console.error('COS上传失败 - 密钥验证失败:', error);
        return reject(error);
      }

      console.log(`开始上传到腾讯云COS (尝试 ${retryCount + 1}/${MAX_RETRIES + 1}):`, {
        bucket: currentCosConfig.Bucket,
        region: currentCosConfig.Region,
        key: key,
        contentType: contentType,
        fileSize: fileBuffer.length
      });
      
      // 使用腾讯云COS存储，添加超时配置
      cos.putObject({
        Bucket: currentCosConfig.Bucket,
        Region: currentCosConfig.Region,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
        StorageClass: 'STANDARD',
        // 添加超时配置
        Timeout: 60000, // 60秒超时
        onProgress: function(progressData) {
          console.log('上传进度:', JSON.stringify(progressData));
        }
      }, function(err, data) {
        if (err) {
          console.error('COS上传失败 - 详细错误:', {
            code: err.code,
            statusCode: err.statusCode,
            message: err.message,
            requestId: err.requestId,
            resource: err.resource,
            bucket: currentCosConfig.Bucket,
            region: currentCosConfig.Region,
            key: key,
            retryCount: retryCount
          });
          
          // 判断是否应该重试
          const shouldRetry = retryCount < MAX_RETRIES && (
            err.code === 'ECONNRESET' ||
            err.code === 'ETIMEDOUT' ||
            err.code === 'ENOTFOUND' ||
            err.message?.includes('ECONNRESET') ||
            err.message?.includes('timeout') ||
            err.message?.includes('ETIMEDOUT')
          );
          
          if (shouldRetry) {
            console.log(`网络错误，将在 ${RETRY_DELAY}ms 后重试 (${retryCount + 1}/${MAX_RETRIES})...`);
            setTimeout(() => {
              uploadToCOS(fileBuffer, key, contentType, retryCount + 1)
                .then(resolve)
                .catch(reject);
            }, RETRY_DELAY * (retryCount + 1)); // 递增延迟
            return;
          }
          
          // 提供更友好的错误信息
          let errorMessage = '图片上传到云存储失败';
          if (err.statusCode === 403) {
            errorMessage = 'COS访问被拒绝，请检查密钥权限';
          } else if (err.statusCode === 404) {
            errorMessage = 'COS存储桶不存在，请检查配置';
          } else if (err.code === 'CredentialsError') {
            errorMessage = 'COS密钥验证失败，请检查密钥配置';
          } else if (err.code === 'ECONNRESET' || err.message?.includes('ECONNRESET')) {
            errorMessage = 'COS上传失败: 网络连接被重置，请检查网络连接或稍后重试';
          } else if (err.code === 'ETIMEDOUT' || err.message?.includes('timeout')) {
            errorMessage = 'COS上传失败: 上传超时，请检查网络连接或稍后重试';
          } else if (err.message) {
            errorMessage = `COS上传失败: ${err.message}`;
          }
          
          const enhancedError = new Error(errorMessage);
          enhancedError.originalError = err;
          enhancedError.code = err.code;
          enhancedError.statusCode = err.statusCode;
          reject(enhancedError);
        } else {
          console.log('COS上传成功:', {
            location: data.Location,
            etag: data.ETag,
            requestId: data.RequestId,
            retryCount: retryCount
          });
          // 构建完整的访问URL，确保正确的URL编码
          const encodedKey = encodeURIComponent(key).replace(/%2F/g, '/');
          const url = `${currentCosConfig.BucketDomain}/${encodedKey}`;
          resolve({
            url,
            location: data.Location,
            key: key
          });
        }
      });
    } catch (error) {
      console.error('COS上传异常:', error);
      reject(error);
    }
  });
};

/**
 * 删除COS文件
 * @param {string} key 文件路径
 * @returns {Promise<Object>} 删除结果
 */
const deleteFromCOS = (key) => {
  return new Promise((resolve, reject) => {
    cos.deleteObject({
      Bucket: cosConfig.Bucket,
      Region: cosConfig.Region,
      Key: key
    }, function(err, data) {
      if (err) {
        console.error('COS删除失败:', err);
        reject(err);
      } else {
        console.log('COS删除成功:', data);
        resolve(data);
      }
    });
  });
};

// 导入模型
const { Model, Brand } = require('../models/mysql');

/**
 * 生成文件上传路径
 * @param {string} originalName 原始文件名
 * @param {number} modelId 车型ID
 * @param {string} category 图片分类
 * @param {string} path 文件路径（可选）
 * @returns {Promise<string>} COS存储路径
 */
const generateUploadPath = async (originalName, modelId, category = 'general', path = null) => {
  try {
    console.log('生成上传路径 - 参数:', { originalName, modelId, category, path });
    
    const ext = originalName.split('.').pop().toLowerCase();
    console.log('文件扩展名:', ext);
    
    // 获取车型信息
    const model = await Model.findByPk(modelId, {
      include: [{
        model: Brand,
        attributes: ['name']
      }]
    });

    console.log('查询到的车型信息:', model ? {
      modelId: model.id,
      modelName: model.name,
      brandId: model.Brand?.id,
      brandName: model.Brand?.name
    } : '未找到车型');

    if (!model || !model.Brand) {
      console.error('生成上传路径失败: 未找到车型或品牌信息');
      throw new Error('未找到车型或品牌信息');
    }

    // 生成随机序号
    const sequence = Math.floor(Math.random() * 999) + 1;
    
    // 如果有文件夹路径，保持原有结构
    if (path) {
      // 使用文件夹结构: CARS/品牌名/车型名/文件夹路径/序号.扩展名
      const uploadPath = `CARS/${model.Brand.name}/${model.name}/${path.replace(/\\/g, '/')}`;
      console.log('生成的上传路径(文件夹):', uploadPath);
      return uploadPath;
    } else {
      // 标准路径: CARS/品牌名/车型名/序号.扩展名
      const uploadPath = `CARS/${model.Brand.name}/${model.name}/${sequence}.${ext}`;
      console.log('生成的上传路径(标准):', uploadPath);
      return uploadPath;
    }
  } catch (error) {
    console.error('生成上传路径失败:', error);
    throw error;
  }
};

module.exports = {
  cos,
  cosConfig,
  getCosConfig,
  uploadToCOS,
  deleteFromCOS,
  generateUploadPath
}; 