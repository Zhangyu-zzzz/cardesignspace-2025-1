const sharp = require('sharp');
const { ImageAnalysis } = require('../models/mysql');

function getAspectRatio(width, height) {
  if (!width || !height) return null;
  return Number((width / height).toFixed(4));
}

async function extractDominantColors(buffer, maxColors = 5) {
  // 简化占位：用 sharp stats 的 dominant
  try {
    const stats = await sharp(buffer).stats();
    const channels = stats.channels || [];
    // 构造粗略主色（R/G/B三通道最大均值近似）
    const r = channels[0]?.mean || 0;
    const g = channels[1]?.mean || 0;
    const b = channels[2]?.mean || 0;
    const hex = `#${[r, g, b]
      .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
      .join('')}`;
    return [{ hex, ratio: 1 }];
  } catch (e) {
    return null;
  }
}

function computeSimpleQuality({ brightness, contrast, sharpness }) {
  // 简化质量评分：归一后平均
  const values = [brightness, contrast, sharpness].filter((v) => typeof v === 'number');
  if (values.length === 0) return null;
  const clamped = values.map((v) => Math.max(0, Math.min(1, v)));
  const mean = clamped.reduce((a, b) => a + b, 0) / clamped.length;
  return Number((mean * 100).toFixed(2));
}

async function analyzeBufferAndUpsert({ imageId, buffer, width, height, extractorVersion = 'v1' }) {
  // 计算基础指标
  const aspectRatio = getAspectRatio(width, height);
  const dominantColors = await extractDominantColors(buffer);

  // 粗略的亮度/对比度/清晰度占位
  // 这里使用图像尺寸作为权重进行简单估计，后续可替换为更准确的OpenCV指标
  const megaPixels = width && height ? (width * height) / 1_000_000 : 0;
  const brightness = Math.max(0, Math.min(1, 0.5 + (megaPixels ? 0.05 : 0)));
  const contrast = Math.max(0, Math.min(1, 0.5 + (megaPixels ? 0.05 : 0)));
  const sharpness = Math.max(0, Math.min(1, 0.5 + (megaPixels ? 0.05 : 0)));

  const overall = computeSimpleQuality({ brightness, contrast, sharpness });

  const payload = {
    imageId,
    dominantColors,
    brightness,
    contrast,
    sharpness,
    aspectRatio,
    compositionType: 'other',
    technicalScore: overall,
    aestheticScore: overall,
    overallScore: overall,
    extractorVersion,
    updatedAt: new Date(),
  };

  await ImageAnalysis.upsert(payload);
  return payload;
}

module.exports = {
  analyzeBufferAndUpsert,
};


