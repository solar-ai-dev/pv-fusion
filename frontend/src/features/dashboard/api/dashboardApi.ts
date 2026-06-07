import { apiClient } from '../../../shared/api/client'
import { ApiSuccessResponse } from '../../../shared/api/types'
import type {
  DashboardActionStats,
  DashboardQueryParams,
  DashboardResponse,
  DashboardSeverityStats,
  DashboardTrend,
  DashboardTrendQueryParams,
} from '../types'

export const dashboardApi = {
  fetchDashboard: async (params?: DashboardQueryParams) => {
    const response = await apiClient.get<ApiSuccessResponse<DashboardResponse>>(
      '/dashboard',
      { params },
    )
    return response.data
  },
  fetchActionStats: async (params?: DashboardQueryParams) => {
    const response = await apiClient.get<ApiSuccessResponse<DashboardActionStats>>(
      '/dashboard/action-stats',
      { params },
    )
    return response.data
  },
  fetchSeverityStats: async (params?: DashboardQueryParams) => {
    const response = await apiClient.get<ApiSuccessResponse<DashboardSeverityStats>>(
      '/dashboard/severity-stats',
      { params },
    )
    return response.data
  },
  fetchTrends: async (params?: DashboardTrendQueryParams) => {
    const response = await apiClient.get<ApiSuccessResponse<DashboardTrend>>(
      '/dashboard/trends',
      { params },
    )
    return response.data
  },
}
