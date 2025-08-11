const logger = require('../config/logger');

const isQueueEnabled = process.env.QUEUE_ENABLED === 'true';
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

let connection = null;
let queues = {};

function safeRequire(moduleName) {
  try {
    return require(moduleName);
  } catch (err) {
    logger.warn(`模块未安装或加载失败: ${moduleName}. ${err && err.message}`);
    return null;
  }
}

function getRedisConnection() {
  if (!isQueueEnabled) return null;
  if (!connection) {
    const IORedis = safeRequire('ioredis');
    if (!IORedis) return null;
    connection = new IORedis(redisUrl);
    connection.on('error', (err) => logger.error('Redis 连接错误: ' + err.message));
  }
  return connection;
}

function getQueue(name) {
  if (!isQueueEnabled) return null;
  if (!queues[name]) {
    const bullmq = safeRequire('bullmq');
    const conn = getRedisConnection();
    if (!bullmq || !conn) return null;
    const { Queue } = bullmq;
    queues[name] = new Queue(name, { connection: conn });
  }
  return queues[name] || null;
}

function createWorker(name, processor) {
  if (!isQueueEnabled) return null;
  const bullmq = safeRequire('bullmq');
  const conn = getRedisConnection();
  if (!bullmq || !conn) return null;
  const { Worker, QueueEvents } = bullmq;
  const worker = new Worker(name, processor, { connection: conn });
  const events = new QueueEvents(name, { connection: conn });
  events.on('failed', ({ jobId, failedReason }) =>
    logger.error(`[Queue:${name}] Job ${jobId} failed: ${failedReason}`)
  );
  events.on('completed', ({ jobId }) =>
    logger.info(`[Queue:${name}] Job ${jobId} completed`)
  );
  return worker;
}

module.exports = { getQueue, createWorker, isQueueEnabled };


