import { apiClient } from '../../../shared/api/client'
import { ApiSuccessResponse } from '../../../shared/api/types'

export const zoneApi = {
  fetchZone: async (zoneId: string | number) => {
    const response = await apiClient.get<ApiSuccessResponse<unknown>>(
      `/zones/${zoneId}`,
    )
    return response.data
  },
  updateZone: async (zoneId: string | number, payload: unknown) => {
    const response = await apiClient.patch<ApiSuccessResponse<unknown>>(
      `/zones/${zoneId}`,
      payload,
    )
    return response.data
  },
  deactivateZone: async (zoneId: string | number) => {
    const response = await apiClient.patch<void>(`/zones/${zoneId}/deactivate`)
    return response.status === 204 ? undefined : response.data
  },
}
