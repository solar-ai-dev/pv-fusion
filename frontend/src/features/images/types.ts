import type { ResourceStatus } from '../plants/types'

export type TargetType = 'ZONE' | 'ARRAY' | 'PANEL' | 'MODULE'

export type ImageType = 'RGB' | 'THERMAL'

export type UploadStatus = 'UPLOADED' | 'FAILED'

export type ImageSummary = {
  imageId: number
  inspectionId: number
  plantId: number | null
  zoneId: number | null
  equipmentId: number | null
  targetType: TargetType
  imageType: ImageType
  originalFilename: string
  fileUrl: string | null
  uploadStatus: UploadStatus
  status: ResourceStatus
  capturedAt: string | null
}

export type Image = {
  imageId: number
  inspectionId: number
  plantId: number | null
  zoneId: number | null
  equipmentId: number | null
  targetType: TargetType
  imageType: ImageType
  originalFilename: string
  mimeType: string | null
  fileSize: number | null
  bucketName: string | null
  objectKey: string | null
  fileUrl: string | null
  capturedAt: string | null
  uploadStatus: UploadStatus
  status: ResourceStatus
  uploadedByUserId: number
  createdAt: string
  updatedAt: string
}

export type ImagePreview = {
  imageId: number
  url: string
  expiresAt: string
}

export type ImageListParams = {
  plantId?: number
  zoneId?: number
  inspectionId?: number
  equipmentId?: number
  imageType?: ImageType
  targetType?: TargetType
  status?: ResourceStatus
}

export type UploadImageRequest = {
  inspectionId: number
  equipmentId?: number | null
  targetType: TargetType
  imageType: ImageType
  capturedAt?: string | null
  memo?: string | null
  file: File
}

export const TARGET_TYPE_OPTIONS = ['ZONE', 'ARRAY', 'PANEL', 'MODULE'] as const

export const IMAGE_TYPE_OPTIONS = ['RGB', 'THERMAL'] as const

export function getTargetTypeLabel(targetType: TargetType) {
  switch (targetType) {
    case 'ZONE':
      return '구역'
    case 'ARRAY':
      return '어레이'
    case 'PANEL':
      return '패널'
    case 'MODULE':
      return '모듈'
  }
}

export function getImageTypeLabel(imageType: ImageType) {
  return imageType === 'RGB' ? 'RGB' : '열화상'
}

export function getUploadStatusLabel(status: UploadStatus) {
  return status === 'UPLOADED' ? '업로드 완료' : '업로드 실패'
}

export function getUploadStatusTone(status: UploadStatus) {
  return status === 'UPLOADED' ? 'success' : 'danger'
}
