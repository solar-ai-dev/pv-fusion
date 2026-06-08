import { apiClient } from '../../../shared/api/client'
import { ApiSuccessResponse } from '../../../shared/api/types'
import type {
  CreateImagePairRequest,
  ImagePair,
  ImagePairCandidate,
  ImagePairCandidateParams,
  UpdateImagePairRequest,
} from '../types'

export const imagePairApi = {
  fetchImagePairCandidates: async (params: ImagePairCandidateParams) => {
    const response = await apiClient.get<ApiSuccessResponse<ImagePairCandidate>>(
      '/image-pairs/candidates',
      { params },
    )
    return response.data
  },
  createImagePair: async (payload: CreateImagePairRequest) => {
    const response = await apiClient.post<ApiSuccessResponse<ImagePair>>('/image-pairs', payload)
    return response.data
  },
  fetchImagePair: async (imagePairId: string | number) => {
    const response = await apiClient.get<ApiSuccessResponse<ImagePair>>(`/image-pairs/${imagePairId}`)
    return response.data
  },
  updateImagePair: async (
    imagePairId: string | number,
    payload: UpdateImagePairRequest,
  ) => {
    const response = await apiClient.patch<ApiSuccessResponse<ImagePair>>(
      `/image-pairs/${imagePairId}`,
      payload,
    )
    return response.data
  },
  deactivateImagePair: async (imagePairId: string | number) => {
    const response = await apiClient.patch<ApiSuccessResponse<ImagePair>>(
      `/image-pairs/${imagePairId}/deactivate`,
    )
    return response.data
  },
}
