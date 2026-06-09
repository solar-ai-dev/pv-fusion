import { apiClient } from '../../../shared/api/client'
import { ApiSuccessResponse, PageResponse } from '../../../shared/api/types'
import type {
  AdminUser,
  AdminUserSummary,
  ChangeUserRoleRequest,
  OperationLogSummary,
} from '../types'

function sanitizeParams(params?: Record<string, unknown>) {
  if (!params) {
    return undefined
  }

  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => {
      if (value == null) {
        return false
      }

      if (typeof value === 'string') {
        const trimmed = value.trim()
        return trimmed.length > 0 && trimmed !== 'ALL' && trimmed !== '전체'
      }

      return true
    }),
  )
}

export const adminApi = {
  fetchPendingUsers: async (params?: Record<string, unknown>) => {
    const response = await apiClient.get<
      ApiSuccessResponse<PageResponse<AdminUserSummary>>
    >('/admin/users/pending', { params: sanitizeParams(params) })
    return response.data
  },
  approveUser: async (userId: string | number) => {
    const response = await apiClient.patch<ApiSuccessResponse<AdminUser>>(
      `/admin/users/${userId}/approve`,
    )
    return response.data
  },
  fetchUsers: async (params?: Record<string, unknown>) => {
    const response = await apiClient.get<
      ApiSuccessResponse<PageResponse<AdminUserSummary>>
    >('/admin/users', { params: sanitizeParams(params) })
    return response.data
  },
  fetchUser: async (userId: string | number) => {
    const response = await apiClient.get<ApiSuccessResponse<AdminUser>>(
      `/admin/users/${userId}`,
    )
    return response.data
  },
  updateUserRole: async (
    userId: string | number,
    payload: ChangeUserRoleRequest,
  ) => {
    const response = await apiClient.patch<ApiSuccessResponse<AdminUser>>(
      `/admin/users/${userId}/role`,
      payload,
    )
    return response.data
  },
  deactivateUser: async (userId: string | number) => {
    const response = await apiClient.patch<ApiSuccessResponse<AdminUser>>(
      `/admin/users/${userId}/deactivate`,
    )
    return response.data
  },
  fetchOperationLogs: async (params?: Record<string, unknown>) => {
    const response = await apiClient.get<
      ApiSuccessResponse<PageResponse<OperationLogSummary>>
    >('/admin/operation-logs', { params: sanitizeParams(params) })
    return response.data
  },
}
