import { apiClient } from '../../../shared/api/client'
import { ApiSuccessResponse, PageResponse } from '../../../shared/api/types'

export const analysisJobApi = {
  createAnalysisJob: async (payload: unknown) => {
    const response = await apiClient.post<ApiSuccessResponse<unknown>>(
      '/analysis-jobs',
      payload,
    )
    return response.data
  },
  fetchAnalysisJobs: async (params?: Record<string, unknown>) => {
    const response = await apiClient.get<ApiSuccessResponse<PageResponse<unknown>>>(
      '/analysis-jobs',
      { params },
    )
    return response.data
  },
  fetchAnalysisJob: async (jobId: string | number) => {
    const response = await apiClient.get<ApiSuccessResponse<unknown>>(
      `/analysis-jobs/${jobId}`,
    )
    return response.data
  },
  retryAnalysisJob: async (jobId: string | number) => {
    const response = await apiClient.post<ApiSuccessResponse<unknown>>(
      `/analysis-jobs/${jobId}/retry`,
    )
    return response.data
  },
}
