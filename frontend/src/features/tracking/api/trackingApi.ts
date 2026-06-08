import { apiClient } from '../../../shared/api/client'
import { ApiSuccessResponse } from '../../../shared/api/types'
import type {
  InspectionCompare,
  TrackingListParams,
  TrackingResponse,
} from '../types'

export const trackingApi = {
  fetchTracking: async (params?: TrackingListParams) => {
    const response = await apiClient.get<ApiSuccessResponse<TrackingResponse>>(
      '/tracking',
      { params },
    )
    return response.data
  },
  fetchTrackingCompare: async (params: {
    currentResultId: number
    previousResultId?: number
  }) => {
    const response = await apiClient.get<ApiSuccessResponse<InspectionCompare>>(
      '/tracking/compare',
      { params },
    )
    return response.data
  },
}
