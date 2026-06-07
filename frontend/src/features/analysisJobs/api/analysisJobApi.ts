import { apiClient } from '../../../shared/api/client'
import { ApiSuccessResponse, PageResponse } from '../../../shared/api/types'
import type {
  AnalysisJob,
  AnalysisJobSummary,
  CreateAnalysisJobRequest,
  RetryAnalysisJobRequest,
} from '../types'

export const analysisJobApi = {
  createAnalysisJob: async (payload: CreateAnalysisJobRequest) => {
    const response = await apiClient.post<ApiSuccessResponse<AnalysisJob>>(
      '/analysis-jobs',
      payload,
    )
    return response.data
  },
  fetchAnalysisJobs: async (params?: Record<string, unknown>) => {
    const response = await apiClient.get<
      ApiSuccessResponse<PageResponse<AnalysisJobSummary>>
    >('/analysis-jobs', { params })
    return response.data
  },
  fetchAnalysisJob: async (jobId: string | number) => {
    const response = await apiClient.get<ApiSuccessResponse<AnalysisJob>>(
      `/analysis-jobs/${jobId}`,
    )
    return response.data
  },
  retryAnalysisJob: async (
    jobId: string | number,
    payload?: RetryAnalysisJobRequest,
  ) => {
    const response = await apiClient.post<ApiSuccessResponse<AnalysisJob>>(
      `/analysis-jobs/${jobId}/retry`,
      payload,
    )
    return response.data
  },
}
