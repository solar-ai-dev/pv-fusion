import type { ResourceStatus } from '../plants/types'
import type { ImageSummary, TargetType } from '../images/types'

export type ImagePairSummary = {
  imagePairId: number
  inspectionId: number
  plantId: number | null
  zoneId: number | null
  equipmentId: number | null
  targetType: TargetType
  rgbImageId: number
  thermalImageId: number
  status: ResourceStatus
  createdAt: string
}

export type ImagePair = ImagePairSummary & {
  createdByUserId: number
  updatedAt: string
  rgbImage: ImageSummary
  thermalImage: ImageSummary
}

export type ImagePairCandidate = {
  inspectionId: number
  plantId: number | null
  zoneId: number | null
  equipmentId: number | null
  rgbCandidates: ImageSummary[]
  thermalCandidates: ImageSummary[]
}

export type ImagePairCandidateParams = {
  inspectionId: number
  targetType: TargetType
  equipmentId?: number
}

export type CreateImagePairRequest = {
  rgbImageId: number
  thermalImageId: number
}

export type UpdateImagePairRequest = {
  rgbImageId?: number | null
  thermalImageId?: number | null
}

export function getImagePairTargetLabel(targetType: TargetType) {
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
