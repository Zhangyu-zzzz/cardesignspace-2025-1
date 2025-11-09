const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');
// ⭐ 添加认证中间件
const { authenticateToken } = require('../middleware/auth');

/**
 * 获取所有载具列表（需要登录）
 * GET /api/draw-car/vehicles
 */
router.get('/vehicles', authenticateToken, vehicleController.getVehicles);

/**
 * 创建新载具（需要登录）
 * POST /api/draw-car/vehicles
 */
router.post('/vehicles', authenticateToken, vehicleController.createVehicle);

/**
 * 获取单个载具详情
 * GET /api/draw-car/vehicles/:id
 */
router.get('/vehicles/:id', vehicleController.getVehicleById);

/**
 * 投票（点赞/拉踩）（需要登录）
 * POST /api/draw-car/vehicles/:id/vote
 */
router.post('/vehicles/:id/vote', authenticateToken, vehicleController.voteVehicle);

/**
 * 举报载具
 * POST /api/draw-car/vehicles/:id/report
 */
router.post('/vehicles/:id/report', vehicleController.reportVehicle);

/**
 * 获取排行榜
 * GET /api/draw-car/vehicles/rank
 */
router.get('/vehicles/rank', vehicleController.getRankList);

/**
 * 删除载具（管理员功能，暂时不启用）
 * DELETE /api/draw-car/vehicles/:id
 */
// router.delete('/vehicles/:id', authenticateToken, vehicleController.deleteVehicle);

module.exports = router;


