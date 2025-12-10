const SearchStat = require('../models/mysql/SearchStat');
const SearchHistory = require('../models/mysql/SearchHistory');
const { Op } = require('sequelize');
const { sequelize } = require('../config/mysql');

// 获取客户端IP地址
const getClientIP = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0] || 
         req.headers['x-real-ip'] || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress ||
         req.ip;
};

// 检测设备类型
const getDeviceType = (userAgent) => {
  if (!userAgent) return 'unknown';
  const ua = userAgent.toLowerCase();
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) return 'mobile';
  if (ua.includes('tablet') || ua.includes('ipad')) return 'tablet';
  return 'desktop';
};

// 记录搜索（同时记录统计和详细历史）
exports.recordSearch = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { 
      query, 
      translatedQuery, 
      brandId, 
      resultsCount = 0, 
      searchType = 'smart',
      isSuccessful = true,
      errorMessage = null,
      sessionId = null
    } = req.body;
    
    if (!query || !query.trim()) {
      return res.status(400).json({
        success: false,
        message: '搜索关键词不能为空'
      });
    }

    const trimmedQuery = query.trim();
    const userId = req.user?.id || null; // 如果使用了认证中间件
    const ipAddress = getClientIP(req);
    const userAgent = req.headers['user-agent'] || null;
    const referrer = req.headers['referer'] || req.headers['referrer'] || null;
    const deviceType = getDeviceType(userAgent);
    const searchDuration = Date.now() - startTime;
    
    // 1. 更新搜索统计
    const existingStat = await SearchStat.findOne({
      where: { query: trimmedQuery }
    });

    if (existingStat) {
      await existingStat.update({
        count: existingStat.count + 1,
        last_searched_at: new Date()
      });
    } else {
      await SearchStat.create({
        query: trimmedQuery,
        count: 1,
        last_searched_at: new Date()
      });
    }
    
    // 2. 记录详细搜索历史
    await SearchHistory.create({
      user_id: userId,
      session_id: sessionId,
      query: trimmedQuery,
      translated_query: translatedQuery,
      brand_id: brandId,
      results_count: resultsCount,
      search_type: searchType,
      ip_address: ipAddress,
      user_agent: userAgent,
      referrer: referrer,
      device_type: deviceType,
      search_duration_ms: searchDuration,
      is_successful: isSuccessful,
      error_message: errorMessage
    });

    res.json({
      success: true,
      message: '搜索记录已保存'
    });
  } catch (error) {
    console.error('记录搜索失败:', error);
    res.status(500).json({
      success: false,
      message: '记录搜索失败',
      error: error.message
    });
  }
};

// 获取热门搜索
exports.getPopularSearches = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 6;
    const days = parseInt(req.query.days) || 30; // 默认显示30天内的热门搜索
    
    // 计算日期范围
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);
    
    const popularSearches = await SearchStat.findAll({
      where: {
        last_searched_at: {
          [Op.gte]: dateThreshold
        }
      },
      order: [
        ['count', 'DESC'],
        ['last_searched_at', 'DESC']
      ],
      limit: limit,
      attributes: ['query', 'count', 'last_searched_at']
    });

    res.json({
      success: true,
      data: popularSearches
    });
  } catch (error) {
    console.error('获取热门搜索失败:', error);
    res.status(500).json({
      success: false,
      message: '获取热门搜索失败',
      error: error.message
    });
  }
};

// 获取所有搜索统计（管理员功能）
exports.getAllStats = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    
    const { count, rows } = await SearchStat.findAndCountAll({
      order: [['count', 'DESC']],
      limit: limit,
      offset: offset
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: page,
        limit: limit,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('获取搜索统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取搜索统计失败',
      error: error.message
    });
  }
};

// 清理旧数据（可选的管理功能）
exports.cleanOldStats = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 90;
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);
    
    const deleted = await SearchStat.destroy({
      where: {
        last_searched_at: {
          [Op.lt]: dateThreshold
        },
        count: {
          [Op.lt]: 3 // 只删除搜索次数少于3的旧记录
        }
      }
    });

    res.json({
      success: true,
      message: `已清理 ${deleted} 条旧搜索统计记录`
    });
  } catch (error) {
    console.error('清理旧数据失败:', error);
    res.status(500).json({
      success: false,
      message: '清理旧数据失败',
      error: error.message
    });
  }
};

// 清理搜索历史记录
exports.cleanOldHistory = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 180; // 默认保留180天
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);
    
    const deleted = await SearchHistory.destroy({
      where: {
        created_at: {
          [Op.lt]: dateThreshold
        }
      }
    });

    res.json({
      success: true,
      message: `已清理 ${deleted} 条搜索历史记录`
    });
  } catch (error) {
    console.error('清理搜索历史失败:', error);
    res.status(500).json({
      success: false,
      message: '清理搜索历史失败',
      error: error.message
    });
  }
};

// 获取搜索历史（管理员或用户自己）
exports.getSearchHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const userId = req.query.userId || req.user?.id;
    
    const where = {};
    if (userId) {
      where.user_id = userId;
    }
    
    const { count, rows } = await SearchHistory.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit,
      offset,
      attributes: [
        'id', 'query', 'translated_query', 'brand_id', 'results_count',
        'search_type', 'device_type', 'search_duration_ms', 
        'is_successful', 'created_at'
      ]
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('获取搜索历史失败:', error);
    res.status(500).json({
      success: false,
      message: '获取搜索历史失败',
      error: error.message
    });
  }
};

// 搜索分析统计
exports.getSearchAnalytics = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);
    
    // 总搜索次数
    const totalSearches = await SearchHistory.count({
      where: {
        created_at: { [Op.gte]: dateThreshold }
      }
    });
    
    // 唯一用户数
    const uniqueUsers = await SearchHistory.count({
      distinct: true,
      col: 'user_id',
      where: {
        created_at: { [Op.gte]: dateThreshold },
        user_id: { [Op.not]: null }
      }
    });
    
    // 平均搜索结果数
    const avgResults = await SearchHistory.findOne({
      attributes: [
        [sequelize.fn('AVG', sequelize.col('results_count')), 'avg']
      ],
      where: {
        created_at: { [Op.gte]: dateThreshold }
      },
      raw: true
    });
    
    // 搜索成功率
    const successRate = await SearchHistory.findAll({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
        [sequelize.fn('SUM', sequelize.literal('CASE WHEN is_successful = 1 THEN 1 ELSE 0 END')), 'success']
      ],
      where: {
        created_at: { [Op.gte]: dateThreshold }
      },
      raw: true
    });

    res.json({
      success: true,
      data: {
        period_days: days,
        total_searches: totalSearches,
        unique_users: uniqueUsers,
        avg_results: parseFloat(avgResults?.avg || 0).toFixed(2),
        success_rate: successRate[0]?.total > 0 
          ? ((successRate[0].success / successRate[0].total) * 100).toFixed(2) + '%'
          : '0%'
      }
    });
  } catch (error) {
    console.error('获取搜索分析失败:', error);
    res.status(500).json({
      success: false,
      message: '获取搜索分析失败',
      error: error.message
    });
  }
};

