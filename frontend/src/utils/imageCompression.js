/**
 * 图片压缩工具
 */

/**
 * 压缩图片文件
 * @param {File} file - 原始图片文件
 * @param {Object} options - 压缩选项
 * @returns {Promise<File>} - 压缩后的图片文件
 */
export function compressImage(file, options = {}) {
  return new Promise((resolve, reject) => {
    // 默认压缩选项
    const defaultOptions = {
      maxWidth: 1920,
      maxHeight: 1080,
      quality: 0.8,
      maxSize: 10 * 1024 * 1024, // 10MB
      outputFormat: 'webp' // 默认输出WebP格式
    }
    
    const config = { ...defaultOptions, ...options }
    
    // 如果文件已经小于限制，直接返回
    if (file.size <= config.maxSize && file.type === `image/${config.outputFormat}`) {
      resolve(file)
      return
    }
    
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    img.onload = function() {
      // 计算压缩后的尺寸
      let { width, height } = calculateDimensions(
        img.width, 
        img.height, 
        config.maxWidth, 
        config.maxHeight
      )
      
      // 设置canvas尺寸
      canvas.width = width
      canvas.height = height
      
      // 绘制图片
      ctx.drawImage(img, 0, 0, width, height)
      
      // 转换为Blob
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('图片压缩失败'))
          return
        }
        
        // 创建新的File对象
        const compressedFile = new File(
          [blob], 
          `compressed_${Date.now()}.${config.outputFormat}`, 
          { type: `image/${config.outputFormat}` }
        )
        
        console.log(`图片压缩完成: ${formatFileSize(file.size)} → ${formatFileSize(compressedFile.size)}`)
        resolve(compressedFile)
      }, `image/${config.outputFormat}`, config.quality)
    }
    
    img.onerror = function() {
      reject(new Error('图片加载失败'))
    }
    
    // 读取文件
    const reader = new FileReader()
    reader.onload = function(e) {
      img.src = e.target.result
    }
    reader.onerror = function() {
      reject(new Error('文件读取失败'))
    }
    reader.readAsDataURL(file)
  })
}

/**
 * 计算压缩后的尺寸（保持宽高比）
 */
function calculateDimensions(originalWidth, originalHeight, maxWidth, maxHeight) {
  let width = originalWidth
  let height = originalHeight
  
  // 如果尺寸超过限制，按比例缩放
  if (width > maxWidth || height > maxHeight) {
    const widthRatio = maxWidth / width
    const heightRatio = maxHeight / height
    const ratio = Math.min(widthRatio, heightRatio)
    
    width = Math.round(width * ratio)
    height = Math.round(height * ratio)
  }
  
  return { width, height }
}

/**
 * 格式化文件大小显示
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * 批量压缩图片
 */
export function compressImages(files, options = {}) {
  const promises = files.map(file => compressImage(file, options))
  return Promise.all(promises)
} 