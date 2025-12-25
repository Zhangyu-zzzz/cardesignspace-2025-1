/**
 * 图片向量化服务
 * 调用Python CLIP模型将图片编码为向量
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const logger = require('../config/logger');

// Python脚本路径
const CLIP_IMAGE_SCRIPT_PATH = path.join(__dirname, '../../services/clip_image_encoder_standalone.py');

// 检查Python脚本是否存在
if (!fs.existsSync(CLIP_IMAGE_SCRIPT_PATH)) {
  logger.warn(`⚠️  CLIP图片向量化脚本不存在: ${CLIP_IMAGE_SCRIPT_PATH}`);
}

/**
 * 调用Python脚本进行图片向量化
 * @param {string} imageSource - 图片URL或本地路径
 * @returns {Promise<Array<number>>} 向量数组
 */
async function encodeImageWithPython(imageSource) {
  return new Promise((resolve, reject) => {
    if (!imageSource || !imageSource.trim()) {
      return reject(new Error('图片URL或路径不能为空'));
    }

    // 检查Python脚本是否存在
    if (!fs.existsSync(CLIP_IMAGE_SCRIPT_PATH)) {
      return reject(new Error(`CLIP图片向量化脚本不存在: ${CLIP_IMAGE_SCRIPT_PATH}`));
    }

    // 使用python3执行脚本
    const pythonProcess = spawn('python3', [CLIP_IMAGE_SCRIPT_PATH, imageSource.trim()], {
      cwd: path.join(__dirname, '../../services'),
      env: {
        ...process.env,
        PYTHONPATH: path.join(__dirname, '../../services/clip_utils')
      }
    });

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    // 设置超时（60秒，因为首次加载模型需要时间）
    const timeout = setTimeout(() => {
      pythonProcess.kill();
      reject(new Error('图片向量化超时（60秒）'));
    }, 60000);

    pythonProcess.on('close', (code) => {
      clearTimeout(timeout);
      
      if (code !== 0) {
        // 尝试解析stderr中的JSON错误信息
        let errorMessage = stderr || '未知错误';
        try {
          const errorJson = JSON.parse(stderr.trim());
          if (errorJson.error) {
            errorMessage = errorJson.error;
          }
        } catch (e) {
          // stderr不是JSON格式，使用原始错误信息
        }
        
        // 检查是否是依赖问题
        if (errorMessage.includes('No module named') || errorMessage.includes('ModuleNotFoundError')) {
          logger.warn(`Python依赖缺失: ${errorMessage.substring(0, 200)}`);
          return reject(new Error('CLIP_PYTHON_DEPS_MISSING'));
        }
        
        logger.error(`Python脚本执行失败 (退出码: ${code}): ${errorMessage}`);
        return reject(new Error(`图片向量化失败: ${errorMessage}`));
      }

      try {
        const result = JSON.parse(stdout.trim());
        if (result.status === 'success' && result.vector) {
          logger.info(`✅ 图片向量化成功: ${imageSource.substring(0, 100)} -> ${result.dimension}维向量`);
          resolve(result.vector);
        } else {
          reject(new Error(result.error || '向量化失败'));
        }
      } catch (parseError) {
        logger.error(`解析Python输出失败: ${stdout.substring(0, 200)}`);
        reject(new Error(`解析向量化结果失败: ${parseError.message}`));
      }
    });

    pythonProcess.on('error', (error) => {
      clearTimeout(timeout);
      logger.error(`启动Python进程失败: ${error.message}`);
      reject(new Error(`无法启动Python进程: ${error.message}`));
    });
  });
}

/**
 * 将图片编码为向量
 * @param {string} imageSource - 图片URL或本地路径
 * @returns {Promise<Array<number>>} 向量数组
 */
async function encodeImage(imageSource) {
  try {
    logger.info(`🖼️  开始图片向量化: ${imageSource.substring(0, 100)}`);
    const vector = await encodeImageWithPython(imageSource);
    
    // 验证向量格式
    if (!Array.isArray(vector)) {
      throw new Error(`向量格式错误: 期望数组，实际得到${typeof vector}`);
    }
    if (vector.length !== 512) {
      throw new Error(`向量维度错误: 期望512维，实际${vector.length}维`);
    }
    
    return vector;
  } catch (error) {
    logger.error(`❌ 图片向量化失败: ${error.message}`);
    throw error;
  }
}

/**
 * 批量将图片编码为向量
 * @param {Array<string>} imageSources - 图片URL或路径数组
 * @returns {Promise<Array<Array<number>>>} 向量数组的数组
 */
async function encodeImages(imageSources) {
  if (!Array.isArray(imageSources) || imageSources.length === 0) {
    throw new Error('图片源数组不能为空');
  }

  // 串行处理，避免同时启动多个Python进程
  const vectors = [];
  for (const imageSource of imageSources) {
    try {
      const vector = await encodeImage(imageSource);
      vectors.push(vector);
    } catch (error) {
      logger.error(`图片向量化失败 (${imageSource}): ${error.message}`);
      // 继续处理下一个，不中断整个批次
      vectors.push(null);
    }
  }

  return vectors;
}

/**
 * 检查图片向量化服务是否可用
 * @returns {Promise<boolean>}
 */
async function checkServiceHealth() {
  try {
    // 检查Python脚本是否存在
    if (!fs.existsSync(CLIP_IMAGE_SCRIPT_PATH)) {
      logger.warn('图片向量化脚本不存在');
      return false;
    }
    
    // 尝试执行一个简单的Python命令来检查环境
    const testProcess = spawn('python3', ['-c', 'import sys; sys.exit(0)']);
    return new Promise((resolve) => {
      testProcess.on('close', (code) => {
        resolve(code === 0);
      });
      testProcess.on('error', () => {
        resolve(false);
      });
      setTimeout(() => {
        testProcess.kill();
        resolve(false);
      }, 2000);
    });
  } catch (error) {
    return false;
  }
}

module.exports = {
  encodeImage,
  encodeImages,
  checkServiceHealth
};







