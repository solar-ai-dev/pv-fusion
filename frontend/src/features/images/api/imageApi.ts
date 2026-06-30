import { apiClient } from '../../../shared/api/client'
import { ApiSuccessResponse } from '../../../shared/api/types'
import type {
  Image,
  ImageListParams,
  ImagePreview,
  ImageSummary,
  UploadImageRequest,
} from '../types'

export const imageApi = {
  uploadImage: async (payload: UploadImageRequest) => {
    const formData = new FormData()
    formData.append('file', payload.file)
    formData.append('inspectionId', String(payload.inspectionId))
    formData.append('targetType', payload.targetType)
    formData.append('imageType', payload.imageType)

    if (typeof payload.equipmentId === 'number') {
      formData.append('equipmentId', String(payload.equipmentId))
    }

    if (payload.capturedAt) {
      formData.append('capturedAt', payload.capturedAt)
    }

    if (payload.memo) {
      formData.append('memo', payload.memo)
    }

    const response = await apiClient.post<ApiSuccessResponse<Image>>(
      '/images',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    )
    return response.data
  },
  fetchImages: async (params?: ImageListParams) => {
    const response = await apiClient.get<ApiSuccessResponse<ImageSummary[]>>(
      '/images',
      { params },
    )
    return response.data
  },
  fetchImage: async (imageId: string | number) => {
    const response = await apiClient.get<ApiSuccessResponse<Image>>(
      `/images/${imageId}`,
    )
    return response.data
  },
  fetchImagePreview: async (imageId: string | number) => {
    const response = await apiClient.get<ApiSuccessResponse<ImagePreview>>(
      `/images/${imageId}/preview`,
    )
    return response.data
  },
  deactivateImage: async (imageId: string | number) => {
    const response = await apiClient.patch<ApiSuccessResponse<Image>>(
      `/images/${imageId}/deactivate`,
    )
    return response.data
  },
}
