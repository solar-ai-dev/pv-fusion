export type InspectionStatus =
  | 'READY'
  | 'UPLOADING'
  | 'ANALYZING'
  | 'COMPLETED'
  | 'FAILED'

export type CaptureMethod = 'DRONE' | 'MANUAL' | 'OTHER'

export type InspectionSummary = {
  inspectionId: number
  zoneId: number
  plantId: number | null
  name: string
  capturedAt: string | null
  captureMethod: CaptureMethod
  inspectionStatus: InspectionStatus
  createdAt: string
}

export type Inspection = {
  inspectionId: number
  zoneId: number
  plantId: number
  name: string
  capturedAt: string | null
  captureMethod: CaptureMethod
  inspectorName: string | null
  memo: string | null
  inspectionStatus: InspectionStatus
  createdByUserId: number
  createdAt: string
  updatedAt: string
  images: unknown[]
  imagePairs: unknown[]
  analysisJobIds: number[]
}

export type InspectionListParams = {
  plantId?: number
  zoneId?: number
  inspectionStatus?: InspectionStatus
  from?: string
  to?: string
  page?: number
  size?: number
}

export type CreateInspectionRequest = {
  zoneId: number
  name: string
  capturedAt?: string | null
  captureMethod: CaptureMethod
  inspectorName?: string | null
  memo?: string | null
}

export type UpdateInspectionRequest = {
  name?: string
  capturedAt?: string | null
  captureMethod?: CaptureMethod
  inspectorName?: string | null
  memo?: string | null
}

export const INSPECTION_STATUS_OPTIONS = [
  'READY',
  'UPLOADING',
  'ANALYZING',
  'COMPLETED',
  'FAILED',
] as const

export const CAPTURE_METHOD_OPTIONS = ['DRONE', 'MANUAL', 'OTHER'] as const

export function getInspectionStatusLabel(status: InspectionStatus) {
  switch (status) {
    case 'READY':
      return '준비'
    case 'UPLOADING':
      return '업로드 중'
    case 'ANALYZING':
      return '분석 중'
    case 'COMPLETED':
      return '완료'
    case 'FAILED':
      return '실패'
  }
}

export function getInspectionStatusTone(status: InspectionStatus) {
  switch (status) {
    case 'READY':
      return 'default'
    case 'UPLOADING':
    case 'ANALYZING':
      return 'warning'
    case 'COMPLETED':
      return 'success'
    case 'FAILED':
      return 'danger'
  }
}

export function getCaptureMethodLabel(method: CaptureMethod) {
  switch (method) {
    case 'DRONE':
      return '드론'
    case 'MANUAL':
      return '수동'
    case 'OTHER':
      return '기타'
  }
}
