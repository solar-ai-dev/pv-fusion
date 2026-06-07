import { apiClient } from '../../../shared/api/client'
import { ApiSuccessResponse, PageResponse } from '../../../shared/api/types'

export const plantApi = {
  fetchPlants: async (params?: Record<string, unknown>) => {
    const response = await apiClient.get<ApiSuccessResponse<PageResponse<unknown>>>(
      '/plants',
      { params },
    )
    return response.data
  },
  createPlant: async (payload: unknown) => {
    const response = await apiClient.post<ApiSuccessResponse<unknown>>(
      '/plants',
      payload,
    )
    return response.data
  },
  fetchPlant: async (plantId: string | number) => {
    const response = await apiClient.get<ApiSuccessResponse<unknown>>(
      `/plants/${plantId}`,
    )
    return response.data
  },
  updatePlant: async (plantId: string | number, payload: unknown) => {
    const response = await apiClient.patch<ApiSuccessResponse<unknown>>(
      `/plants/${plantId}`,
      payload,
    )
    return response.data
  },
  deactivatePlant: async (plantId: string | number) => {
    const response = await apiClient.patch<void>(`/plants/${plantId}/deactivate`)
    return response.status === 204 ? undefined : response.data
  },
}
