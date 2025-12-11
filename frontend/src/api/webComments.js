import { apiClient } from '@/services/api'

// 提交网站优化意见
export function submitWebComment(data) {
  return apiClient.post('/web-comments', data)
}

// 获取网站优化意见列表（管理员用）
export function getWebCommentList(params) {
  return apiClient.get('/web-comments', { params })
}

// 更新网站优化意见状态（管理员用）
export function updateWebCommentStatus(id, status) {
  return apiClient.put(`/web-comments/${id}/status`, { status })
}

// 回复网站优化意见（管理员用）
export function replyWebComment(id, reply) {
  return apiClient.put(`/web-comments/${id}/reply`, { reply })
}

// 删除网站优化意见（管理员用）
export function deleteWebComment(id) {
  return apiClient.delete(`/web-comments/${id}`)
}

