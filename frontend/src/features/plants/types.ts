export type ResourceStatus = 'ACTIVE' | 'INACTIVE'

export type PlantSummary = {
  plantId: number
  name: string
  location: string | null
  status: ResourceStatus
  zoneCount: number
  latestInspectionAt: string | null
}

export type Plant = {
  plantId: number
  name: string
  location: string | null
  description: string | null
  status: ResourceStatus
  createdByUserId: number
  zoneCount: number
  latestInspectionAt: string | null
  createdAt: string
  updatedAt: string
}

export type PlantListParams = {
  keyword?: string
  status?: ResourceStatus
  page?: number
  size?: number
}

export type CreatePlantRequest = {
  name: string
  location?: string | null
  description?: string | null
}

export type UpdatePlantRequest = CreatePlantRequest

export const RESOURCE_STATUS_OPTIONS: ResourceStatus[] = ['ACTIVE', 'INACTIVE']

export function getResourceStatusLabel(status: ResourceStatus) {
  return status === 'ACTIVE' ? '운영 중' : '비활성'
}

export function getResourceStatusTone(status: ResourceStatus) {
  return status === 'ACTIVE' ? 'success' : 'danger'
}
