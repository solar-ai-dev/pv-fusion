import { apiClient } from '../../../shared/api/client'
import { ApiSuccessResponse } from '../../../shared/api/types'

export const equipmentApi = {
  fetchEquipments: async (zoneId: string | number) => {
    const response = await apiClient.get<ApiSuccessResponse<unknown>>(
      `/zones/${zoneId}/equipments`,
    )
    return response.data
  },
  createEquipment: async (zoneId: string | number, payload: unknown) => {
    const response = await apiClient.post<ApiSuccessResponse<unknown>>(
      `/zones/${zoneId}/equipments`,
      payload,
    )
    return response.data
  },
  updateEquipment: async (equipmentId: string | number, payload: unknown) => {
    const response = await apiClient.patch<ApiSuccessResponse<unknown>>(
      `/equipments/${equipmentId}`,
      payload,
    )
    return response.data
  },
  deactivateEquipment: async (equipmentId: string | number) => {
    const response = await apiClient.patch<void>(
      `/equipments/${equipmentId}/deactivate`,
    )
    return response.status === 204 ? undefined : response.data
  },
}
