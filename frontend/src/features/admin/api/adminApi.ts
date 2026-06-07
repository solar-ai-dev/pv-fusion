import { apiClient } from '../../../shared/api/client'
import { ApiSuccessResponse, PageResponse } from '../../../shared/api/types'

export const adminApi = {
  fetchPendingUsers: async (params?: Record<string, unknown>) => {
    const response = await apiClient.get<ApiSuccessResponse<PageResponse<unknown>>>(
      '/admin/users/pending',
      { params },
    )
    return response.data
  },
  approveUser: async (userId: string | number) => {
    const response = await apiClient.patch<ApiSuccessResponse<unknown>>(
      `/admin/users/${userId}/approve`,
    )
    return response.data
  },
  fetchUsers: async (params?: Record<string, unknown>) => {
    const response = await apiClient.get<ApiSuccessResponse<PageResponse<unknown>>>(
      '/admin/users',
      { params },
    )
    return response.data
  },
  fetchUser: async (userId: string | number) => {
    const response = await apiClient.get<ApiSuccessResponse<unknown>>(
      `/admin/users/${userId}`,
    )
    return response.data
  },
  updateUserRole: async (userId: string | number, payload: unknown) => {
    const response = await apiClient.patch<ApiSuccessResponse<unknown>>(
      `/admin/users/${userId}/role`,
      payload,
    )
    return response.data
  },
  deactivateUser: async (userId: string | number) => {
    const response = await apiClient.patch<ApiSuccessResponse<unknown>>(
      `/admin/users/${userId}/deactivate`,
    )
    return response.data
  },
  fetchAdminPlants: async (params?: Record<string, unknown>) => {
    const response = await apiClient.get<ApiSuccessResponse<PageResponse<unknown>>>(
      '/admin/plants',
      { params },
    )
    return response.data
  },
  fetchAdminImages: async (params?: Record<string, unknown>) => {
    const response = await apiClient.get<ApiSuccessResponse<PageResponse<unknown>>>(
      '/admin/images',
      { params },
    )
    return response.data
  },
  fetchAdminAnalysisJobs: async (params?: Record<string, unknown>) => {
    const response = await apiClient.get<ApiSuccessResponse<PageResponse<unknown>>>(
      '/admin/analysis-jobs',
      { params },
    )
    return response.data
  },
  fetchAdminResults: async (params?: Record<string, unknown>) => {
    const response = await apiClient.get<ApiSuccessResponse<PageResponse<unknown>>>(
      '/admin/results',
      { params },
    )
    return response.data
  },
  fetchOperationLogs: async (params?: Record<string, unknown>) => {
    const response = await apiClient.get<ApiSuccessResponse<PageResponse<unknown>>>(
      '/admin/operation-logs',
      { params },
    )
    return response.data
  },
}
