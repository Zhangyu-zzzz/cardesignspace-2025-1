import { apiClient } from '@/services/api'

/**
 * 获取所有载具列表
 */
export function getVehicles(params) {
  return apiClient.get('/draw-car/vehicles', { params })
}

/**
 * 保存新载具
 */
export function saveVehicle(data) {
  console.log('[Draw Car API] 保存载具数据:', {
    hasImageData: !!data.imageData,
    hasDrawingData: !!data.drawingData,
    name: data.name
  })
  
  return apiClient.post('/draw-car/vehicles', data)
}

/**
 * 投票（点赞/拉踩）
 */
export function voteVehicle(vehicleId, type, deviceId) {
  return apiClient.post(`/draw-car/vehicles/${vehicleId}/vote`, { 
    type,
    deviceId // ⭐ 发送设备ID用于匿名用户识别
  })
}

/**
 * 获取载具详情
 */
export function getVehicleDetail(vehicleId) {
  return apiClient.get(`/draw-car/vehicles/${vehicleId}`)
}

/**
 * 举报载具
 */
export function reportVehicle(vehicleId, reason) {
  return apiClient.post(`/draw-car/vehicles/${vehicleId}/report`, { reason })
}

/**
 * 获取排行榜
 */
export function getRankList(sortType) {
  return apiClient.get('/draw-car/vehicles/rank', { params: { sortType } })
}

