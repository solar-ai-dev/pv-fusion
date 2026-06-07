import { apiClient } from '../../../shared/api/client'
import { ApiSuccessResponse, PageResponse } from '../../../shared/api/types'

export const inspectionApi = {
  fetchInspections: async (params?: Record<string, unknown>) => {
    const response = await apiClient.get<ApiSuccessResponse<PageResponse<unknown>>>(
      '/inspections',
      { params },
    )
    return response.data
  },
  createInspection: async (payload: unknown) => {
    const response = await apiClient.post<ApiSuccessResponse<unknown>>(
      '/inspections',
      payload,
    )
    return response.data
  },
  fetchInspection: async (inspectionId: string | number) => {
    const response = await apiClient.get<ApiSuccessResponse<unknown>>(
      `/inspections/${inspectionId}`,
    )
    return response.data
  },
  updateInspection: async (
    inspectionId: string | number,
    payload: unknown,
  ) => {
    const response = await apiClient.patch<ApiSuccessResponse<unknown>>(
      `/inspections/${inspectionId}`,
      payload,
    )
    return response.data
  },
}
