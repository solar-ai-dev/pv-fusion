import { apiClient } from '../../../shared/api/client'
import { ApiSuccessResponse } from '../../../shared/api/types'

export const dashboardApi = {
  fetchDashboard: async () => {
    const response =
      await apiClient.get<ApiSuccessResponse<unknown>>('/dashboard')
    return response.data
  },
}
