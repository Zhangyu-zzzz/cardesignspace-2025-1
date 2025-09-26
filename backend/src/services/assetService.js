const sharp = require('sharp');
const { uploadToCOS } = require('../config/cos');
const { ImageAsset } = require('../models/mysql');

// 变体规格定义
const VARIANTS = {
  thumb: { width: 320 },
  small: { width: 640 },
  medium: { width: 1280 },
  large: { width: 1920 },
  // webp 使用与 medium 相同宽度，输出为 webp
  webp: { width: 1280, format: 'webp' },
};

function buildVariantKey(originalKey, variant, ext) {
  // 将 key 拆分插入 variants 前缀：CARS/.../filename.jpg -> variants/variant/CARS/.../filename.ext
  const normalized = originalKey.replace(/^\/+/, '');
  const newExt = ext.startsWith('.') ? ext.slice(1) : ext;
  return `variants/${variant}/${normalized}`.replace(/\.[^.]+$/, `.${newExt}`);
}

async function generateOneVariant(buffer, contentType, variant, originalKey) {
  const spec = VARIANTS[variant];
  if (!spec) throw new Error(`Unknown variant: ${variant}`);

  let pipeline = sharp(buffer).rotate();
  if (spec.width) {
    pipeline = pipeline.resize({ width: spec.width, withoutEnlargement: true });
  }
  if (spec.format === 'webp') {
    pipeline = pipeline.webp({ quality: 82 });
  } else {
    // 保持原格式，若是 jpeg/png，设置合适质量
    pipeline = pipeline.jpeg({ quality: 85 }).toFormat('jpeg');
  }

  const outputBuffer = await pipeline.toBuffer();
  const meta = await sharp(outputBuffer).metadata();

  const ext = spec.format === 'webp' ? 'webp' : 'jpg';
  const key = buildVariantKey(originalKey, variant, ext);
  const result = await uploadToCOS(outputBuffer, key, spec.format === 'webp' ? 'image/webp' : 'image/jpeg');

  return {
    variant,
    url: result.url,
    width: meta.width || null,
    height: meta.height || null,
    size: outputBuffer.length,
    key,
  };
}

async function generateAndSaveAssets({ imageId, originalBuffer, originalKey, originalContentType }) {
  const tasks = ['thumb', 'small', 'medium', 'large', 'webp'].map((v) =>
    generateOneVariant(originalBuffer, originalContentType, v, originalKey)
  );
  const results = await Promise.all(tasks);

  // 幂等写入（imageId + variant 唯一）
  const saved = [];
  for (const r of results) {
    const [row] = await ImageAsset.upsert(
      {
        imageId,
        variant: r.variant,
        url: r.url,
        width: r.width,
        height: r.height,
        size: r.size,
      },
      { returning: true }
    );
    saved.push(row);
  }

  return results.reduce((acc, r) => {
    acc[r.variant] = r.url;
    return acc;
  }, {});
}

function selectBestVariant(assets, preferWebp = true) {
  if (!assets) {
    return { variant: null, url: null };
  }

  const order = preferWebp
    ? ['webp', 'medium', 'large', 'small', 'thumb']
    : ['medium', 'large', 'small', 'thumb', 'webp'];

  for (const variant of order) {
    const entry = assets[variant];
    if (!entry) continue;
    const url = typeof entry === 'string' ? entry : entry.url;
    if (url) {
      return { variant, url };
    }
  }

  return { variant: null, url: null };
}

function chooseBestUrl(assets, preferWebp = true) {
  const { url } = selectBestVariant(assets, preferWebp);
  return url;
}

module.exports = {
  VARIANTS,
  generateAndSaveAssets,
  selectBestVariant,
  chooseBestUrl,
};
