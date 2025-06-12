require('dotenv').config();
const COS = require('cos-nodejs-sdk-v5');

const cos = new COS({
  SecretId: process.env.TENCENT_SECRET_ID || 'your-secret-id',
  SecretKey: process.env.TENCENT_SECRET_KEY || 'your-secret-key',
});

const cosConfig = {
  Bucket: process.env.COS_BUCKET || 'your-bucket-1234567890',
  Region: process.env.COS_REGION || 'ap-beijing',
  // 公共读写权限的存储桶域名
  BucketDomain: process.env.COS_DOMAIN || 'https://your-bucket-1234567890.cos.ap-beijing.myqcloud.com'
};

/**
 * 上传文件到腾讯云COS
 * @param {Buffer} fileBuffer 文件缓冲区
 * @param {string} key 文件路径/名称
 * @param {string} contentType 文件类型
 * @returns {Promise<Object>} 上传结果
 */
const uploadToCOS = (fileBuffer, key, contentType) => {
  return new Promise((resolve, reject) => {
    cos.putObject({
      Bucket: cosConfig.Bucket,
      Region: cosConfig.Region,
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
        // 构建完整的访问URL
        const url = `${cosConfig.BucketDomain}/${key}`;
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

/**
 * 生成文件上传路径
 * @param {string} originalName 原始文件名
 * @param {number} modelId 车型ID
 * @param {string} category 图片分类
 * @returns {string} COS存储路径
 */
const generateUploadPath = (originalName, modelId, category = 'general') => {
  const ext = originalName.split('.').pop();
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  
  return `images/models/${modelId}/${category}/${timestamp}_${random}.${ext}`;
};

module.exports = {
  cos,
  cosConfig,
  uploadToCOS,
  deleteFromCOS,
  generateUploadPath
}; 