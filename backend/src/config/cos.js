require('dotenv').config();
const COS = require('cos-nodejs-sdk-v5');

const cos = new COS({
  SecretId: process.env.TENCENT_SECRET_ID || 'your-secret-id',
  SecretKey: process.env.TENCENT_SECRET_KEY || 'your-secret-key',
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
 * 上传文件到腾讯云COS
 * @param {Buffer} fileBuffer 文件缓冲区
 * @param {string} key 文件路径/名称
 * @param {string} contentType 文件类型
 * @returns {Promise<Object>} 上传结果
 */
const uploadToCOS = (fileBuffer, key, contentType) => {
  return new Promise((resolve, reject) => {
    // 动态获取最新的COS配置
    const currentCosConfig = getCosConfig();
    
    console.log('开始上传到腾讯云COS:', {
      bucket: currentCosConfig.Bucket,
      region: currentCosConfig.Region,
      key: key,
      contentType: contentType
    });
    
    // 使用腾讯云COS存储
    cos.putObject({
      Bucket: currentCosConfig.Bucket,
      Region: currentCosConfig.Region,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
      StorageClass: 'STANDARD',
      onProgress: function(progressData) {
        console.log('上传进度:', JSON.stringify(progressData));
      }
    }, function(err, data) {
      if (err) {
        console.error('COS上传失败:', err);
        reject(err);
      } else {
        console.log('COS上传成功:', data);
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