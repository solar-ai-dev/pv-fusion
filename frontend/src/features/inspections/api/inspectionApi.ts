import { apiClient } from '../../../shared/api/client'
import { ApiSuccessResponse, PageResponse } from '../../../shared/api/types'
import type {
  CreateInspectionRequest,
  Inspection,
  InspectionListParams,
  InspectionSummary,
  UpdateInspectionRequest,
} from '../types'

export const inspectionApi = {
  fetchInspections: async (params?: InspectionListParams) => {
    const response = await apiClient.get<
      ApiSuccessResponse<PageResponse<InspectionSummary>>
    >('/inspections', { params })
    return response.data
  },
  createInspection: async (payload: CreateInspectionRequest) => {
    const response = await apiClient.post<ApiSuccessResponse<Inspection>>(
      '/inspections',
      payload,
    )
    return response.data
  },
  fetchInspection: async (inspectionId: string | number) => {
    const response = await apiClient.get<ApiSuccessResponse<Inspection>>(
      `/inspections/${inspectionId}`,
    )
    return response.data
  },
  updateInspection: async (
    inspectionId: string | number,
    payload: UpdateInspectionRequest,
  ) => {
    const response = await apiClient.patch<ApiSuccessResponse<Inspection>>(
      `/inspections/${inspectionId}`,
      payload,
    )
    return response.data
  },
}
