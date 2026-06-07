import { apiClient } from '../../../shared/api/client'
import { ApiSuccessResponse } from '../../../shared/api/types'

export const trackingApi = {
  fetchTracking: async (params?: Record<string, unknown>) => {
    const response = await apiClient.get<ApiSuccessResponse<unknown>>(
      '/tracking',
      { params },
    )
    return response.data
  },
  fetchTrackingCompare: async (params?: Record<string, unknown>) => {
    const response = await apiClient.get<ApiSuccessResponse<unknown>>(
      '/tracking/compare',
      { params },
    )
    return response.data
  },
}
