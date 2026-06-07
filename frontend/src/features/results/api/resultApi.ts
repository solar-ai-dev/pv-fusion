import { apiClient } from '../../../shared/api/client'
import { ApiSuccessResponse, PageResponse } from '../../../shared/api/types'

export const resultApi = {
  fetchResults: async (params?: Record<string, unknown>) => {
    const response = await apiClient.get<ApiSuccessResponse<PageResponse<unknown>>>(
      '/results',
      { params },
    )
    return response.data
  },
  fetchResult: async (resultId: string | number) => {
    const response = await apiClient.get<ApiSuccessResponse<unknown>>(
      `/results/${resultId}`,
    )
    return response.data
  },
  fetchResultVisualization: async (
    resultId: string | number,
    params?: Record<string, unknown>,
  ) => {
    const response = await apiClient.get(`/results/${resultId}/visualization`, {
      params,
      responseType: 'blob',
    })
    return response.data
  },
  updateReviewStatus: async (resultId: string | number, payload: unknown) => {
    const response = await apiClient.patch<ApiSuccessResponse<unknown>>(
      `/results/${resultId}/review-status`,
      payload,
    )
    return response.data
  },
  updateActionCandidate: async (
    resultId: string | number,
    payload: unknown,
  ) => {
    const response = await apiClient.patch<ApiSuccessResponse<unknown>>(
      `/results/${resultId}/action`,
      payload,
    )
    return response.data
  },
}
