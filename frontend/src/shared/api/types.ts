export type ApiSuccessResponse<T> = {
  success: true
  data: T
  message: string
}

export type ApiErrorBody = {
  status: number
  code: string
  message: string
  detail?: string
  path?: string
  timestamp?: string
  traceId?: string
}

export type ApiErrorResponse = {
  success: false
  error: ApiErrorBody
}

export type PageResponse<T> = {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  hasNext: boolean
}

export type DeleteImpact = {
  resourceType: string
  resourceId: number
  resourceName: string
  plantCount: number
  plantMemberCount: number
  zoneCount: number
  equipmentCount: number
  inspectionCount: number
  imageCount: number
  analysisJobCount: number
  analysisResultCount: number
  detectedDefectCount: number
  reviewHistoryCount: number
  operationLogCount: number
  storageFileCount: number
}

export type DeleteResourceResult = {
  resourceType: string
  resourceId: number
  resourceName: string
}
