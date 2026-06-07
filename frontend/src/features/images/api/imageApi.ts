import { apiClient } from '../../../shared/api/client'
import { ApiSuccessResponse, PageResponse } from '../../../shared/api/types'

export const imageApi = {
  uploadImage: async (formData: FormData) => {
    const response = await apiClient.post<ApiSuccessResponse<unknown>>(
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
  fetchImages: async (params?: Record<string, unknown>) => {
    const response = await apiClient.get<ApiSuccessResponse<PageResponse<unknown>>>(
      '/images',
      { params },
    )
    return response.data
  },
  fetchImage: async (imageId: string | number) => {
    const response = await apiClient.get<ApiSuccessResponse<unknown>>(
      `/images/${imageId}`,
    )
    return response.data
  },
  fetchImagePreview: async (imageId: string | number) => {
    const response = await apiClient.get<Blob>(`/images/${imageId}/preview`, {
      responseType: 'blob',
    })
    return response.data
  },
  deactivateImage: async (imageId: string | number) => {
    const response = await apiClient.patch<void>(`/images/${imageId}/deactivate`)
    return response.status === 204 ? undefined : response.data
  },
}
