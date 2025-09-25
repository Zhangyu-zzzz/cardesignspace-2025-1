const { createWorker, isQueueEnabled } = require('../services/queueService');
const logger = require('../config/logger');
const { Image, ImageAsset } = require('../models/mysql');

function bootIngestWorkers() {
  if (!isQueueEnabled) return;

  // 图片元数据入库（示例：可扩展为写入 Staging 表并做幂等去重）
  createWorker('image_ingest', async (job) => {
    const item = job.data;
    // 仅示例：最少字段校验
    if (!item || !item.imageId) {
      throw new Error('缺少 imageId');
    }
    // 这里可以写入 staging 表或直接操作 Image/ImageAsset（建议：staging + 校验）
    // await Image.create(...)
    return { ok: true };
  });

  // 图像处理任务（例如抠图）
  createWorker('image_tasks', async (job) => {
    const payload = job.data;
    logger.info(`[image_tasks] type=${job.name} payload=${JSON.stringify(payload).substring(0, 200)}`);
    // TODO: 调用实际处理服务或第三方 API
    return { ok: true };
  });
}

module.exports = { bootIngestWorkers };


