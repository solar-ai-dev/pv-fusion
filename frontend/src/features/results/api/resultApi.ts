import { apiClient } from '../../../shared/api/client'
import { ApiSuccessResponse, PageResponse } from '../../../shared/api/types'
import type {
  AnalysisResult,
  AnalysisResultSummary,
  ResultVisualization,
  UpdateActionCandidateRequest,
  UpdateReviewStatusRequest,
} from '../types'

export const resultApi = {
  fetchResults: async (params?: Record<string, unknown>) => {
    const response = await apiClient.get<
      ApiSuccessResponse<PageResponse<AnalysisResultSummary>>
    >('/analysis-results', { params })
    return response.data
  },
  fetchResult: async (resultId: string | number) => {
    const response = await apiClient.get<ApiSuccessResponse<AnalysisResult>>(
      `/analysis-results/${resultId}`,
    )
    return response.data
  },
  fetchResultVisualization: async (
    resultId: string | number,
    params?: Record<string, unknown>,
  ) => {
    const response = await apiClient.get<ApiSuccessResponse<ResultVisualization>>(
      `/analysis-results/${resultId}/visualization`,
      { params },
    )
    return response.data
  },
  updateReviewStatus: async (
    resultId: string | number,
    payload: UpdateReviewStatusRequest,
  ) => {
    const response = await apiClient.patch<ApiSuccessResponse<AnalysisResult>>(
      `/analysis-results/${resultId}/review`,
      payload,
    )
    return response.data
  },
  updateActionCandidate: async (
    resultId: string | number,
    payload: UpdateActionCandidateRequest,
  ) => {
    const response = await apiClient.patch<ApiSuccessResponse<AnalysisResult>>(
      `/analysis-results/${resultId}`,
      payload,
    )
    return response.data
  },
}
