const { MonitoredPage, CrawlHistory } = require('../models/mysql');
const schedulerService = require('../services/schedulerService');
const logger = require('../config/logger');

/**
 * 获取所有监控页面
 */
exports.getMonitoredPages = async (req, res) => {
  try {
    const pages = await MonitoredPage.findAll({
      order: [['createdAt', 'DESC']],
      include: [{
        model: CrawlHistory,
        as: 'CrawlHistories',
        limit: 5,
        order: [['createdAt', 'DESC']],
        required: false
      }]
    });

    res.json({
      status: 'success',
      data: pages
    });
  } catch (error) {
    logger.error('获取监控页面失败:', error);
    res.status(500).json({
      status: 'error',
      message: '获取监控页面失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 获取单个监控页面
 */
exports.getMonitoredPage = async (req, res) => {
  try {
    const { id } = req.params;
    const page = await MonitoredPage.findByPk(id, {
      include: [{
        model: CrawlHistory,
        as: 'CrawlHistories',
        limit: 20,
        order: [['createdAt', 'DESC']],
        required: false
      }]
    });

    if (!page) {
      return res.status(404).json({
        status: 'error',
        message: '监控页面不存在'
      });
    }

    res.json({
      status: 'success',
      data: page
    });
  } catch (error) {
    logger.error('获取监控页面失败:', error);
    res.status(500).json({
      status: 'error',
      message: '获取监控页面失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 创建监控页面
 */
exports.createMonitoredPage = async (req, res) => {
  try {
    const {
      url,
      name,
      selector,
      articleSelector,
      imageSelector,
      textSelector,
      interval = 3600,
      enabled = true,
      config
    } = req.body;

    if (!url || !name) {
      return res.status(400).json({
        status: 'error',
        message: 'URL和名称不能为空'
      });
    }

    // 验证URL格式
    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({
        status: 'error',
        message: 'URL格式不正确'
      });
    }

    const page = await MonitoredPage.create({
      url,
      name,
      selector,
      articleSelector,
      imageSelector,
      textSelector,
      interval: parseInt(interval) || 3600,
      enabled: enabled !== false,
      config: config || {}
    });

    // 如果启用，立即添加到调度器
    if (page.enabled) {
      await schedulerService.schedulePage(page);
    }

    res.json({
      status: 'success',
      data: page,
      message: '监控页面创建成功'
    });
  } catch (error) {
    logger.error('创建监控页面失败:', error);
    res.status(500).json({
      status: 'error',
      message: '创建监控页面失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 更新监控页面
 */
exports.updateMonitoredPage = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      url,
      name,
      selector,
      articleSelector,
      imageSelector,
      textSelector,
      interval,
      enabled,
      config
    } = req.body;

    const page = await MonitoredPage.findByPk(id);
    if (!page) {
      return res.status(404).json({
        status: 'error',
        message: '监控页面不存在'
      });
    }

    // 更新字段
    if (url !== undefined) {
      try {
        new URL(url);
        page.url = url;
      } catch (e) {
        return res.status(400).json({
          status: 'error',
          message: 'URL格式不正确'
        });
      }
    }
    if (name !== undefined) page.name = name;
    if (selector !== undefined) page.selector = selector;
    if (articleSelector !== undefined) page.articleSelector = articleSelector;
    if (imageSelector !== undefined) page.imageSelector = imageSelector;
    if (textSelector !== undefined) page.textSelector = textSelector;
    if (interval !== undefined) page.interval = parseInt(interval) || 3600;
    if (enabled !== undefined) page.enabled = enabled;
    if (config !== undefined) page.config = config;

    await page.save();

    // 更新调度器
    if (page.enabled) {
      await schedulerService.schedulePage(page);
    } else {
      // 如果禁用，从调度器移除
      const job = schedulerService.jobs.get(page.id);
      if (job) {
        job.destroy();
        schedulerService.jobs.delete(page.id);
      }
    }

    res.json({
      status: 'success',
      data: page,
      message: '监控页面更新成功'
    });
  } catch (error) {
    logger.error('更新监控页面失败:', error);
    res.status(500).json({
      status: 'error',
      message: '更新监控页面失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 删除监控页面
 */
exports.deleteMonitoredPage = async (req, res) => {
  try {
    const { id } = req.params;
    const page = await MonitoredPage.findByPk(id);
    
    if (!page) {
      return res.status(404).json({
        status: 'error',
        message: '监控页面不存在'
      });
    }

    // 从调度器移除
    const job = schedulerService.jobs.get(page.id);
    if (job) {
      job.destroy();
      schedulerService.jobs.delete(page.id);
    }

    await page.destroy();

    res.json({
      status: 'success',
      message: '监控页面删除成功'
    });
  } catch (error) {
    logger.error('删除监控页面失败:', error);
    res.status(500).json({
      status: 'error',
      message: '删除监控页面失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 手动触发抓取
 */
exports.triggerCrawl = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await schedulerService.triggerCrawl(parseInt(id));

    if (result.success) {
      res.json({
        status: 'success',
        message: '抓取任务已触发'
      });
    } else {
      res.status(500).json({
        status: 'error',
        message: result.error || '触发抓取失败'
      });
    }
  } catch (error) {
    logger.error('触发抓取失败:', error);
    res.status(500).json({
      status: 'error',
      message: '触发抓取失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 获取抓取历史
 */
exports.getCrawlHistory = async (req, res) => {
  try {
    const { pageId } = req.query;
    const where = {};
    
    if (pageId) {
      where.pageId = parseInt(pageId);
    }

    const history = await CrawlHistory.findAll({
      where,
      include: [{
        model: MonitoredPage,
        as: 'MonitoredPage',
        required: false
      }],
      order: [['createdAt', 'DESC']],
      limit: 100
    });

    res.json({
      status: 'success',
      data: history
    });
  } catch (error) {
    logger.error('获取抓取历史失败:', error);
    res.status(500).json({
      status: 'error',
      message: '获取抓取历史失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


