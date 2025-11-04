const { Vehicle, VehicleVote, User } = require('../models/mysql');
const { Op } = require('sequelize');

/**
 * 获取所有载具列表
 */
exports.getVehicles = async (req, res) => {
  try {
    const { limit = 100, offset = 0, sortBy = 'createdAt', order = 'DESC' } = req.query;

    const vehicles = await Vehicle.findAll({
      where: {
        status: 'active'
      },
      order: [[sortBy, order]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        {
          model: User,
          as: 'Creator',
          attributes: ['id', 'username', 'avatar']
        }
      ]
    });

    res.json({
      status: 'success',
      data: vehicles,
      total: await Vehicle.count({ where: { status: 'active' } })
    });
  } catch (error) {
    console.error('获取载具列表失败:', error);
    res.status(500).json({
      status: 'error',
      message: '获取载具列表失败',
      details: error.message
    });
  }
};

/**
 * 创建新载具
 */
exports.createVehicle = async (req, res) => {
  try {
    const { name, imageData } = req.body;
    const userId = req.user ? req.user.id : null;

    // 验证必填字段
    if (!imageData) {
      return res.status(400).json({
        status: 'error',
        message: '载具图片数据不能为空'
      });
    }

    const finalName = (name && name.trim()) || '未命名载具';

    // ⭐ 验证名称唯一性（不区分大小写）
    if (finalName !== '未命名载具') {
      const existingVehicle = await Vehicle.findOne({
        where: {
          name: finalName, // MySQL 默认不区分大小写
          status: 'active'
        }
      });

      if (existingVehicle) {
        return res.status(400).json({
          status: 'error',
          message: '该名称已被使用，请换一个独特的名字',
          code: 'NAME_TAKEN'
        });
      }
    }

    // 创建载具
    const vehicle = await Vehicle.create({
      name: finalName,
      imageData,
      userId,
      likes: 0,
      dislikes: 0,
      score: 0,
      status: 'active'
    });

    console.log('新载具创建成功:', {
      id: vehicle.id,
      name: vehicle.name,
      userId: vehicle.userId
    });

    res.json({
      status: 'success',
      message: '载具创建成功！',
      data: vehicle
    });
  } catch (error) {
    console.error('创建载具失败:', error);
    res.status(500).json({
      status: 'error',
      message: '创建载具失败',
      details: error.message
    });
  }
};

/**
 * 获取单个载具详情
 */
exports.getVehicleById = async (req, res) => {
  try {
    const { id } = req.params;

    const vehicle = await Vehicle.findOne({
      where: { id, status: 'active' },
      include: [
        {
          model: User,
          as: 'Creator',
          attributes: ['id', 'username', 'avatar']
        }
      ]
    });

    if (!vehicle) {
      return res.status(404).json({
        status: 'error',
        message: '载具不存在'
      });
    }

    res.json({
      status: 'success',
      data: vehicle
    });
  } catch (error) {
    console.error('获取载具详情失败:', error);
    res.status(500).json({
      status: 'error',
      message: '获取载具详情失败',
      details: error.message
    });
  }
};

/**
 * 投票（点赞/拉踩）
 */
exports.voteVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.body; // 'like' or 'dislike'
    const userId = req.user ? req.user.id : null;
    const ipAddress = req.ip || req.connection.remoteAddress;

    // 验证投票类型
    if (!['like', 'dislike'].includes(type)) {
      return res.status(400).json({
        status: 'error',
        message: '无效的投票类型'
      });
    }

    // 查找载具
    const vehicle = await Vehicle.findOne({
      where: { id, status: 'active' }
    });

    if (!vehicle) {
      return res.status(404).json({
        status: 'error',
        message: '载具不存在'
      });
    }

    // 检查是否已经投过票
    const existingVote = await VehicleVote.findOne({
      where: {
        vehicleId: id,
        [Op.or]: [
          { userId: userId },
          { ipAddress: ipAddress }
        ]
      }
    });

    if (existingVote) {
      // 如果已经投过票，更新投票类型
      if (existingVote.voteType !== type) {
        // 撤销原来的投票
        if (existingVote.voteType === 'like') {
          vehicle.likes = Math.max(0, vehicle.likes - 1);
          vehicle.score--;
        } else {
          vehicle.dislikes = Math.max(0, vehicle.dislikes - 1);
          vehicle.score++;
        }

        // 添加新的投票
        if (type === 'like') {
          vehicle.likes++;
          vehicle.score++;
        } else {
          vehicle.dislikes++;
          vehicle.score--;
        }

        existingVote.voteType = type;
        await existingVote.save();
      } else {
        return res.json({
          status: 'success',
          message: '您已经投过这个票了',
          data: vehicle
        });
      }
    } else {
      // 创建新的投票记录
      await VehicleVote.create({
        vehicleId: id,
        userId,
        ipAddress,
        voteType: type
      });

      // 更新载具的投票统计
      if (type === 'like') {
        vehicle.likes++;
        vehicle.score++;
      } else {
        vehicle.dislikes++;
        vehicle.score--;
      }
    }

    await vehicle.save();

    res.json({
      status: 'success',
      message: '投票成功',
      data: vehicle
    });
  } catch (error) {
    console.error('投票失败:', error);
    res.status(500).json({
      status: 'error',
      message: '投票失败',
      details: error.message
    });
  }
};

/**
 * 举报载具
 */
exports.reportVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const vehicle = await Vehicle.findByPk(id);

    if (!vehicle) {
      return res.status(404).json({
        status: 'error',
        message: '载具不存在'
      });
    }

    // 更新载具状态为已举报
    vehicle.status = 'reported';
    await vehicle.save();

    // TODO: 这里可以添加举报记录表，记录举报原因等

    res.json({
      status: 'success',
      message: '举报成功，我们会尽快处理'
    });
  } catch (error) {
    console.error('举报载具失败:', error);
    res.status(500).json({
      status: 'error',
      message: '举报失败',
      details: error.message
    });
  }
};

/**
 * 获取排行榜
 */
exports.getRankList = async (req, res) => {
  try {
    const { sortType = 'score', limit = 50 } = req.query;

    let orderField = 'score';
    if (sortType === 'hot') {
      // 按热度排序（点赞+拉踩总数）
      orderField = [
        [sequelize.literal('(likes + dislikes)'), 'DESC']
      ];
    } else if (sortType === 'date') {
      orderField = 'createdAt';
    }

    const vehicles = await Vehicle.findAll({
      where: {
        status: 'active'
      },
      order: sortType === 'hot' ? orderField : [[orderField, 'DESC']],
      limit: parseInt(limit),
      include: [
        {
          model: User,
          as: 'Creator',
          attributes: ['id', 'username', 'avatar']
        }
      ]
    });

    res.json({
      status: 'success',
      data: vehicles
    });
  } catch (error) {
    console.error('获取排行榜失败:', error);
    res.status(500).json({
      status: 'error',
      message: '获取排行榜失败',
      details: error.message
    });
  }
};

/**
 * 删除载具（管理员功能）
 */
exports.deleteVehicle = async (req, res) => {
  try {
    const { id } = req.params;

    const vehicle = await Vehicle.findByPk(id);

    if (!vehicle) {
      return res.status(404).json({
        status: 'error',
        message: '载具不存在'
      });
    }

    // 软删除
    vehicle.status = 'deleted';
    await vehicle.save();

    res.json({
      status: 'success',
      message: '载具已删除'
    });
  } catch (error) {
    console.error('删除载具失败:', error);
    res.status(500).json({
      status: 'error',
      message: '删除载具失败',
      details: error.message
    });
  }
};

