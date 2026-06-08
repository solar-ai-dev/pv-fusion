import type {
  ActionCandidate,
  DefectType,
  PriorityLevel,
  SeverityLevel,
} from '../results/types'
import type { AnalysisInputType, AnalysisModelType } from '../analysisJobs/types'
import type { TargetType } from '../images/types'

export type TrackingListParams = {
  plantId?: number
  zoneId?: number
  equipmentId?: number
  targetType?: TargetType
  from?: string
  to?: string
  inputType?: AnalysisInputType
  modelType?: AnalysisModelType
  actionCandidate?: ActionCandidate
  priorityLevel?: PriorityLevel
  severityLevel?: SeverityLevel
}

export type TrackingSummary = {
  currentInspectionId: number | null
  previousInspectionId: number | null
  currentResultId: number | null
  previousResultId: number | null
  plantId: number | null
  zoneId: number | null
  equipmentId: number | null
  targetType: TargetType | null
  inputType: AnalysisInputType | null
  modelType: AnalysisModelType | null
  anomalyCount: number | null
  repeatedAnomalyCount: number | null
  currentAreaRatio: string | null
  previousAreaRatio: string | null
  currentSeverityScore: string | null
  previousSeverityScore: string | null
  actionCandidate: ActionCandidate | null
  priorityLevel: PriorityLevel | null
  severityLevel: SeverityLevel | null
  repeated: boolean
  worsened: boolean
  analyzedAt: string | null
}

export type TrackingResponse = {
  items: TrackingSummary[]
}

export type AreaChange = {
  currentAreaRatio: string | null
  previousAreaRatio: string | null
  areaRatioDiff: string | null
}

export type SeverityChange = {
  currentSeverityScore: string | null
  previousSeverityScore: string | null
  severityScoreDiff: string | null
  worsened: boolean
}

export type DefectChange = {
  currentDefectCount: number | null
  previousDefectCount: number | null
  defectCountDiff: number | null
  newDefectTypes: DefectType[]
  resolvedDefectTypes: DefectType[]
  persistentDefectTypes: DefectType[]
}

export type InspectionCompare = {
  currentResultId: number
  previousResultId: number | null
  currentResult: TrackingSummary
  previousResult: TrackingSummary | null
  areaChange: AreaChange
  severityChange: SeverityChange
  defectChange: DefectChange
  repeatedAnomaly: boolean
  worsened: boolean
  priorityReason: string | null
}

export type TrackingCompareParams = {
  currentResultId: number
  previousResultId?: number
}
