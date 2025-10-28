import { apiClient } from '@/services/api'

// 提交用户反馈
export function submitFeedback(data) {
  return apiClient.post('/feedback', data)
}

// 获取反馈列表（管理员用）
export function getFeedbackList(params) {
  return apiClient.get('/feedback', { params })
}

// 更新反馈状态（管理员用）
export function updateFeedbackStatus(id, status) {
  return apiClient.put(`/feedback/${id}/status`, { status })
}

// 回复反馈（管理员用）
export function replyFeedback(id, reply) {
  return apiClient.put(`/feedback/${id}/reply`, { reply })
}
