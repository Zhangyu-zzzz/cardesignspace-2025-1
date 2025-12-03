/**
 * CLIP向量化服务（集成版）
 * 直接调用Python脚本进行文本向量化，无需独立的HTTP服务
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const logger = require('../config/logger');

// Python脚本路径
const CLIP_SCRIPT_PATH = path.join(__dirname, '../../services/clip_vectorize_standalone.py');
const CLIP_UTILS_DIR = path.join(__dirname, '../../services/clip_utils');

// 检查Python脚本是否存在
if (!fs.existsSync(CLIP_SCRIPT_PATH)) {
  logger.warn(`⚠️  CLIP Python脚本不存在: ${CLIP_SCRIPT_PATH}`);
}

/**
 * 调用Python脚本进行文本向量化
 * @param {string} text - 要编码的文本
 * @returns {Promise<Array<number>>} 向量数组
 */
async function encodeTextWithPython(text) {
  return new Promise((resolve, reject) => {
    if (!text || !text.trim()) {
      return reject(new Error('文本不能为空'));
    }

    // 检查Python脚本是否存在
    if (!fs.existsSync(CLIP_SCRIPT_PATH)) {
      return reject(new Error(`CLIP Python脚本不存在: ${CLIP_SCRIPT_PATH}`));
    }

    // 使用python3执行独立脚本
    const pythonProcess = spawn('python3', [CLIP_SCRIPT_PATH, text.trim()], {
      cwd: path.join(__dirname, '../../services'),
      env: {
        ...process.env,
        PYTHONPATH: CLIP_UTILS_DIR
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
      reject(new Error('CLIP向量化超时（60秒）'));
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
          return reject(new Error('CLIP_PYTHON_DEPS_MISSING')); // 特殊错误码，用于回退
        }
        
        logger.error(`Python脚本执行失败 (退出码: ${code}): ${errorMessage}`);
        return reject(new Error(`CLIP向量化失败: ${errorMessage}`));
      }

      try {
        const result = JSON.parse(stdout.trim());
        if (result.status === 'success' && result.vector) {
          logger.info(`✅ 文本向量化成功: "${text}" -> ${result.vector.length}维向量`);
          resolve(result.vector);
        } else {
          reject(new Error(result.error || '向量化失败'));
        }
      } catch (parseError) {
        logger.error(`解析Python输出失败: ${stdout}`);
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
 * 将文本编码为向量（集成版）
 * @param {string} text - 要编码的文本
 * @returns {Promise<Array<number>>} 向量数组
 */
async function encodeText(text) {
  try {
    logger.info(`📝 开始文本向量化（集成版）: "${text}"`);
    const vector = await encodeTextWithPython(text);
    
    // 验证向量格式
    if (!Array.isArray(vector)) {
      throw new Error(`向量格式错误: 期望数组，实际得到${typeof vector}`);
    }
    if (vector.length !== 512) {
      throw new Error(`向量维度错误: 期望512维，实际${vector.length}维`);
    }
    
    return vector;
  } catch (error) {
    logger.error(`❌ CLIP向量化失败: ${error.message}`);
    throw error;
  }
}

/**
 * 批量将文本编码为向量
 * @param {Array<string>} texts - 要编码的文本数组
 * @returns {Promise<Array<Array<number>>>} 向量数组的数组
 */
async function encodeTexts(texts) {
  if (!Array.isArray(texts) || texts.length === 0) {
    throw new Error('文本数组不能为空');
  }

  // 串行处理，避免同时启动多个Python进程
  const vectors = [];
  for (const text of texts) {
    const vector = await encodeText(text);
    vectors.push(vector);
  }

  return vectors;
}

/**
 * 检查CLIP服务是否可用（集成版总是可用，只要Python环境正常）
 * @returns {Promise<boolean>}
 */
async function checkServiceHealth() {
  try {
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
  encodeText,
  encodeTexts,
  checkServiceHealth
};

