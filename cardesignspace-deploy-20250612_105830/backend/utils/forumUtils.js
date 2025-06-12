/**
 * 生成论坛图片在COS中的存储路径
 * @param {string} originalName 原始文件名
 * @param {number} userId 用户ID
 * @returns {string} COS存储路径
 */
const generateForumImagePath = (originalName, userId) => {
  const ext = originalName.split('.').pop().toLowerCase();
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  
  return `forum/images/${userId}/${timestamp}_${random}.${ext}`;
};

/**
 * 验证图片文件类型
 * @param {string} mimetype 文件MIME类型
 * @returns {boolean} 是否为有效图片类型
 */
const isValidImageType = (mimetype) => {
  const validTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp'
  ];
  return validTypes.includes(mimetype.toLowerCase());
};

/**
 * 格式化文件大小
 * @param {number} bytes 字节数
 * @returns {string} 格式化后的大小
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

module.exports = {
  generateForumImagePath,
  isValidImageType,
  formatFileSize
}; 