import { apiClient } from '../../../shared/api/client'
import { ApiSuccessResponse, PageResponse } from '../../../shared/api/types'
import {
  CreatePlantRequest,
  Plant,
  PlantListParams,
  PlantSummary,
  UpdatePlantRequest,
} from '../types'

export const plantApi = {
  fetchPlants: async (params?: PlantListParams) => {
    const response = await apiClient.get<
      ApiSuccessResponse<PageResponse<PlantSummary>>
    >('/plants', { params })
    return response.data
  },
  createPlant: async (payload: CreatePlantRequest) => {
    const response = await apiClient.post<ApiSuccessResponse<Plant>>(
      '/plants',
      payload,
    )
    return response.data
  },
  fetchPlant: async (plantId: string | number) => {
    const response = await apiClient.get<ApiSuccessResponse<Plant>>(`/plants/${plantId}`)
    return response.data
  },
  updatePlant: async (plantId: string | number, payload: UpdatePlantRequest) => {
    const response = await apiClient.patch<ApiSuccessResponse<Plant>>(
      `/plants/${plantId}`,
      payload,
    )
    return response.data
  },
  deactivatePlant: async (plantId: string | number) => {
    const response = await apiClient.patch<ApiSuccessResponse<Plant>>(
      `/plants/${plantId}/deactivate`,
    )
    return response.data
  },
}
