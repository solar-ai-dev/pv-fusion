import type { PageResponse } from '../../shared/api/types'

export type AnalysisInputType =
  | 'RGB_SINGLE'
  | 'THERMAL_SINGLE'
  | 'RGB_THERMAL_PAIR'

export type AnalysisModelType = 'RGB_ONLY' | 'THERMAL_ONLY' | 'FUSION'

export type RequestedModelType =
  | 'AUTO'
  | 'RGB_ONLY'
  | 'THERMAL_ONLY'
  | 'FUSION_AUTO'
  | 'EARLY_FUSION'
  | 'LATE_FUSION'

export type AnalysisJobStatus = 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED'

export type AnalysisJobSummary = {
  jobId: number
  plantId: number | null
  zoneId: number | null
  inspectionId: number | null
  imageId: number | null
  imagePairId: number | null
  inputType: AnalysisInputType
  modelType: AnalysisModelType | null
  jobStatus: AnalysisJobStatus
  requestedAt: string | null
  startedAt: string | null
  completedAt: string | null
}

export type AnalysisJob = AnalysisJobSummary & {
  requestedModelType: RequestedModelType
  requestedByUserId: number
  failureCode: string | null
  failureMessage: string | null
  createdAt: string
  updatedAt: string
  traceId: string | null
}

export type AnalysisJobListParams = {
  plantId?: number
  zoneId?: number
  inspectionId?: number
  jobStatus?: AnalysisJobStatus
  inputType?: AnalysisInputType
  modelType?: AnalysisModelType
  page?: number
  size?: number
}

export type CreateAnalysisJobRequest = {
  imageId: number
  traceId?: string | null
}

export type RetryAnalysisJobRequest = {
  traceId?: string | null
}

export type AnalysisJobPage = PageResponse<AnalysisJobSummary>

export const ANALYSIS_JOB_STATUS_OPTIONS: AnalysisJobStatus[] = [
  'QUEUED',
  'RUNNING',
  'SUCCEEDED',
  'FAILED',
]

export const ANALYSIS_INPUT_TYPE_OPTIONS: AnalysisInputType[] = [
  'RGB_SINGLE',
  'THERMAL_SINGLE',
  'RGB_THERMAL_PAIR',
]

export function getAnalysisInputTypeLabel(inputType: AnalysisInputType) {
  switch (inputType) {
    case 'RGB_SINGLE':
      return 'RGB 단일'
    case 'THERMAL_SINGLE':
      return '열화상 단일'
    case 'RGB_THERMAL_PAIR':
      return 'RGB-열화상 Pair'
  }
}

export function getRequestedModelTypeLabel(modelType: RequestedModelType) {
  switch (modelType) {
    case 'AUTO':
      return '자동 선택'
    case 'RGB_ONLY':
      return 'RGB 전용'
    case 'THERMAL_ONLY':
      return '열화상 전용'
    case 'FUSION_AUTO':
      return 'Fusion 자동'
    case 'EARLY_FUSION':
      return 'Early Fusion'
    case 'LATE_FUSION':
      return 'Late Fusion'
  }
}

export function getAnalysisModelTypeLabel(modelType?: AnalysisModelType | null) {
  switch (modelType) {
    case 'RGB_ONLY':
      return 'RGB 전용'
    case 'THERMAL_ONLY':
      return '열화상 전용'
    case 'FUSION':
      return 'Fusion'
    default:
      return '-'
  }
}

export function getAnalysisJobStatusLabel(status: AnalysisJobStatus) {
  switch (status) {
    case 'QUEUED':
      return '대기 중'
    case 'RUNNING':
      return '실행 중'
    case 'SUCCEEDED':
      return '성공'
    case 'FAILED':
      return '실패'
  }
}

export function getAnalysisJobStatusTone(status: AnalysisJobStatus) {
  switch (status) {
    case 'QUEUED':
      return 'warning'
    case 'RUNNING':
      return 'default'
    case 'SUCCEEDED':
      return 'success'
    case 'FAILED':
      return 'danger'
  }
}
