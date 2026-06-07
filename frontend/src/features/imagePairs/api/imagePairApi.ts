import { apiClient } from '../../../shared/api/client'
import { ApiSuccessResponse, PageResponse } from '../../../shared/api/types'

export const imagePairApi = {
  fetchImagePairCandidates: async (params?: Record<string, unknown>) => {
    const response = await apiClient.get<ApiSuccessResponse<PageResponse<unknown>>>(
      '/image-pairs/candidates',
      { params },
    )
    return response.data
  },
  createImagePair: async (payload: unknown) => {
    const response = await apiClient.post<ApiSuccessResponse<unknown>>(
      '/image-pairs',
      payload,
    )
    return response.data
  },
  fetchImagePair: async (imagePairId: string | number) => {
    const response = await apiClient.get<ApiSuccessResponse<unknown>>(
      `/image-pairs/${imagePairId}`,
    )
    return response.data
  },
  updateImagePair: async (
    imagePairId: string | number,
    payload: unknown,
  ) => {
    const response = await apiClient.patch<ApiSuccessResponse<unknown>>(
      `/image-pairs/${imagePairId}`,
      payload,
    )
    return response.data
  },
  deactivateImagePair: async (imagePairId: string | number) => {
    const response = await apiClient.patch<void>(
      `/image-pairs/${imagePairId}/deactivate`,
    )
    return response.status === 204 ? undefined : response.data
  },
}
