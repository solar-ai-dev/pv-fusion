import type { ResourceStatus } from '../plants/types'

export type ZoneSummary = {
  zoneId: number
  plantId: number
  name: string
  arrayCount: number
  panelCount: number
  latestInspectionAt: string | null
  anomalyCandidateCount: number
  topActionCandidate: string | null
  priorityLevel: string | null
}

export type Zone = {
  zoneId: number
  plantId: number
  name: string
  location: string | null
  description: string | null
  status: ResourceStatus
  createdByUserId: number
  arrayCount: number
  panelCount: number
  latestInspectionAt: string | null
  anomalyCandidateCount: number
  topActionCandidate: string | null
  priorityLevel: string | null
  createdAt: string
  updatedAt: string
}

export type CreateZoneRequest = {
  name: string
  location?: string | null
  description?: string | null
}

export type UpdateZoneRequest = CreateZoneRequest

export function getPriorityLabel(priorityLevel: string | null) {
  if (!priorityLevel) {
    return '-'
  }

  return priorityLevel
}
