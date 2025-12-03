/**
 * CLIP向量化服务客户端
 * 调用Python服务将文本转换为向量
 */
const axios = require('axios');
const logger = require('../config/logger');

// CLIP服务配置
const CLIP_SERVICE_URL = process.env.CLIP_SERVICE_URL || 'http://localhost:5001';
const CLIP_SERVICE_TIMEOUT = parseInt(process.env.CLIP_SERVICE_TIMEOUT || '15000'); // 15秒超时（降低以提高响应速度）

/**
 * 将文本编码为向量
 * @param {string} text - 要编码的文本
 * @returns {Promise<Array<number>>} 向量数组
 */
async function encodeText(text) {
  try {
    if (!text || !text.trim()) {
      throw new Error('文本不能为空');
    }

    const response = await axios.post(
      `${CLIP_SERVICE_URL}/encode-text`,
      { text: text.trim() },
      {
        timeout: CLIP_SERVICE_TIMEOUT,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.status === 'success' && response.data.vector) {
      logger.info(`文本向量化成功: "${text}" -> ${response.data.vector.length}维向量`);
      return response.data.vector;
    } else {
      throw new Error(response.data.error || '向量化失败');
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      logger.warn(`CLIP服务未启动 (${CLIP_SERVICE_URL})，无法进行文本向量化`);
      throw new Error('CLIP向量化服务未启动');
    }
    logger.error(`文本向量化失败: ${error.message}`);
    throw error;
  }
}

/**
 * 批量将文本编码为向量
 * @param {Array<string>} texts - 要编码的文本数组
 * @returns {Promise<Array<Array<number>>>} 向量数组的数组
 */
async function encodeTexts(texts) {
  try {
    if (!Array.isArray(texts) || texts.length === 0) {
      throw new Error('文本数组不能为空');
    }

    const response = await axios.post(
      `${CLIP_SERVICE_URL}/encode-texts`,
      { texts: texts.map(t => t.trim()).filter(t => t.length > 0) },
      {
        timeout: CLIP_SERVICE_TIMEOUT,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.status === 'success' && response.data.vectors) {
      logger.info(`批量文本向量化成功: ${texts.length} 个文本 -> ${response.data.vectors.length} 个向量`);
      return response.data.vectors;
    } else {
      throw new Error(response.data.error || '批量向量化失败');
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      logger.warn(`CLIP服务未启动 (${CLIP_SERVICE_URL})，无法进行文本向量化`);
      throw new Error('CLIP向量化服务未启动');
    }
    logger.error(`批量文本向量化失败: ${error.message}`);
    throw error;
  }
}

/**
 * 检查CLIP服务是否可用
 * @returns {Promise<boolean>}
 */
async function checkServiceHealth() {
  try {
    const response = await axios.get(`${CLIP_SERVICE_URL}/health`, {
      timeout: 5000
    });
    return response.data.status === 'ok' && response.data.clip_loaded === true;
  } catch (error) {
    return false;
  }
}

module.exports = {
  encodeText,
  encodeTexts,
  checkServiceHealth
};

