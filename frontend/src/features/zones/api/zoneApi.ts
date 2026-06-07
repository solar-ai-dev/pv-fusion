import { apiClient } from '../../../shared/api/client'
import { ApiSuccessResponse } from '../../../shared/api/types'
import {
  CreateZoneRequest,
  UpdateZoneRequest,
  Zone,
  ZoneSummary,
} from '../types'

export const zoneApi = {
  fetchZonesByPlantId: async (plantId: string | number) => {
    const response = await apiClient.get<ApiSuccessResponse<ZoneSummary[]>>(
      `/plants/${plantId}/zones`,
    )
    return response.data
  },
  createZone: async (plantId: string | number, payload: CreateZoneRequest) => {
    const response = await apiClient.post<ApiSuccessResponse<Zone>>(
      `/plants/${plantId}/zones`,
      payload,
    )
    return response.data
  },
  fetchZone: async (zoneId: string | number) => {
    const response = await apiClient.get<ApiSuccessResponse<Zone>>(`/zones/${zoneId}`)
    return response.data
  },
  updateZone: async (zoneId: string | number, payload: UpdateZoneRequest) => {
    const response = await apiClient.patch<ApiSuccessResponse<Zone>>(
      `/zones/${zoneId}`,
      payload,
    )
    return response.data
  },
  deactivateZone: async (zoneId: string | number) => {
    const response = await apiClient.patch<ApiSuccessResponse<Zone>>(
      `/zones/${zoneId}/deactivate`,
    )
    return response.data
  },
}
