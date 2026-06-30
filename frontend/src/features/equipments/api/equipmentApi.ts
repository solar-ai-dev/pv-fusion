import { apiClient } from '../../../shared/api/client'
import { ApiSuccessResponse } from '../../../shared/api/types'
import {
  CreateEquipmentRequest,
  Equipment,
  EquipmentListParams,
  EquipmentTreeNode,
  UpdateEquipmentRequest,
} from '../types'

export const equipmentApi = {
  fetchEquipments: async (
    zoneId: string | number,
    params?: EquipmentListParams,
  ) => {
    const response = await apiClient.get<ApiSuccessResponse<EquipmentTreeNode[]>>(
      `/zones/${zoneId}/equipments`,
      { params },
    )
    return response.data
  },
  createEquipment: async (
    zoneId: string | number,
    payload: CreateEquipmentRequest,
  ) => {
    const response = await apiClient.post<ApiSuccessResponse<Equipment>>(
      `/zones/${zoneId}/equipments`,
      payload,
    )
    return response.data
  },
  fetchEquipment: async (equipmentId: string | number) => {
    const response = await apiClient.get<ApiSuccessResponse<Equipment>>(
      `/equipments/${equipmentId}`,
    )
    return response.data
  },
  updateEquipment: async (
    equipmentId: string | number,
    payload: UpdateEquipmentRequest,
  ) => {
    const response = await apiClient.patch<ApiSuccessResponse<Equipment>>(
      `/equipments/${equipmentId}`,
      payload,
    )
    return response.data
  },
  deactivateEquipment: async (equipmentId: string | number) => {
    const response = await apiClient.patch<ApiSuccessResponse<Equipment>>(
      `/equipments/${equipmentId}/deactivate`,
    )
    return response.data
  },
}
