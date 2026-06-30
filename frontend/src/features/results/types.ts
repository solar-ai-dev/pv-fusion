import type {
  AnalysisInputType,
  AnalysisJobStatus,
  AnalysisModelType,
} from '../analysisJobs/types'
import type { TargetType } from '../images/types'
import type { PageResponse } from '../../shared/api/types'

export type AnalysisResultStatus = 'NORMAL' | 'ANOMALY' | 'LOW_CONFIDENCE'

export type ActionCandidate =
  | 'CLEANING'
  | 'RETAKE'
  | 'FIELD_INSPECTION'
  | 'REPLACEMENT_REVIEW'

export type ReviewStatus =
  | 'UNCHECKED'
  | 'CONFIRMED'
  | 'RECHECK_REQUIRED'
  | 'ACTION_COMPLETED'

export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export type DefectType =
  | 'CONTAMINATION'
  | 'DUST'
  | 'LEAF'
  | 'BIRD_DROPPING'
  | 'SHADING'
  | 'VEGETATION'
  | 'APPEARANCE_DAMAGE'
  | 'HOTSPOT'
  | 'OVERHEATING'
  | 'ABNORMAL_HEAT'
  | 'UNKNOWN'

export type DefectSource = 'RGB' | 'THERMAL'

export type ResultVisualizationType = 'bbox' | 'heatmap' | 'mask'

export type ResultVisualization = {
  type: string
  url: string
  expiresAt: string | null
}

export type ModelInfo = {
  modelName: string
  modelVersion: string
  modelFormat: string
  runtime: string
  inputSize: number
  threshold: string
}

export type DetectedDefect = {
  defectId: number
  analysisResultId: number
  defectType: DefectType
  defectSource: DefectSource
  confidence: string | null
  areaRatio: string | null
  bboxX: number | null
  bboxY: number | null
  bboxWidth: number | null
  bboxHeight: number | null
  maskBucketName: string | null
  maskObjectKey: string | null
  maskFileUrl: string | null
  severityScore: string | null
  severityLevel: SeverityLevel
  actionCandidate: ActionCandidate
  createdAt: string
  updatedAt: string
}

export type ResultReviewHistory = {
  reviewHistoryId: number
  analysisResultId: number
  reviewerUserId: number
  previousReviewStatus: ReviewStatus | null
  newReviewStatus: ReviewStatus
  previousActionCandidate: ActionCandidate | null
  newActionCandidate: ActionCandidate | null
  memo: string | null
  createdAt: string
  updatedAt: string
}

export type AnalysisResultSummary = {
  resultId: number
  jobId: number
  plantId: number | null
  zoneId: number | null
  inspectionId: number | null
  targetType: TargetType | null
  equipmentId: number | null
  inputType: AnalysisInputType | null
  modelType: AnalysisModelType | null
  jobStatus: AnalysisJobStatus | null
  resultStatus: AnalysisResultStatus
  anomalyCount: number | null
  severityScore: string | null
  severityLevel: SeverityLevel | null
  actionCandidate: ActionCandidate | null
  priorityLevel: PriorityLevel | null
  reviewStatus: ReviewStatus | null
  analyzedAt: string | null
}

export type AnalysisResult = {
  resultId: number
  jobId: number
  plantId: number | null
  zoneId: number | null
  inspectionId: number | null
  targetType: TargetType | null
  equipmentId: number | null
  inputType: AnalysisInputType | null
  modelType: AnalysisModelType | null
  resultStatus: AnalysisResultStatus
  anomalyCount: number | null
  maxConfidence: string | null
  areaRatio: string | null
  severityScore: string | null
  severityLevel: SeverityLevel | null
  actionCandidate: ActionCandidate | null
  priorityLevel: PriorityLevel | null
  reviewStatus: ReviewStatus | null
  bboxBucketName: string | null
  bboxObjectKey: string | null
  bboxFileUrl: string | null
  heatmapBucketName: string | null
  heatmapObjectKey: string | null
  heatmapFileUrl: string | null
  maskBucketName: string | null
  maskObjectKey: string | null
  maskFileUrl: string | null
  analyzedAt: string | null
  createdAt: string
  updatedAt: string
  detections: DetectedDefect[]
  reviewHistories: ResultReviewHistory[]
  bboxVisualization: ResultVisualization | null
  heatmapVisualization: ResultVisualization | null
  maskVisualization: ResultVisualization | null
  modelInfo: ModelInfo | null
}

export type ResultListParams = {
  plantId?: number
  zoneId?: number
  inspectionId?: number
  targetType?: TargetType
  equipmentId?: number
  inputType?: AnalysisInputType
  modelType?: AnalysisModelType
  jobStatus?: AnalysisJobStatus
  resultStatus?: AnalysisResultStatus
  actionCandidate?: ActionCandidate
  severityLevel?: SeverityLevel
  reviewStatus?: ReviewStatus
  page?: number
  size?: number
}

export type UpdateReviewStatusRequest = {
  reviewStatus: ReviewStatus
  actionCandidate?: ActionCandidate | null
  memo?: string | null
}

export type UpdateActionCandidateRequest = {
  actionCandidate: ActionCandidate
  memo?: string | null
}

export type ResultPage = PageResponse<AnalysisResultSummary>

export const RESULT_STATUS_OPTIONS: AnalysisResultStatus[] = [
  'NORMAL',
  'ANOMALY',
  'LOW_CONFIDENCE',
]

export const ACTION_CANDIDATE_OPTIONS: ActionCandidate[] = [
  'CLEANING',
  'RETAKE',
  'FIELD_INSPECTION',
  'REPLACEMENT_REVIEW',
]

export const REVIEW_STATUS_OPTIONS: ReviewStatus[] = [
  'UNCHECKED',
  'CONFIRMED',
  'RECHECK_REQUIRED',
  'ACTION_COMPLETED',
]

export const SEVERITY_LEVEL_OPTIONS: SeverityLevel[] = [
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
]

export const VISUALIZATION_TYPE_OPTIONS: ResultVisualizationType[] = [
  'bbox',
  'heatmap',
  'mask',
]

export function getResultStatusLabel(status?: AnalysisResultStatus | null) {
  switch (status) {
    case 'NORMAL':
      return '정상'
    case 'ANOMALY':
      return '이상'
    case 'LOW_CONFIDENCE':
      return '저신뢰'
    default:
      return '-'
  }
}

export function getResultStatusTone(status?: AnalysisResultStatus | null) {
  switch (status) {
    case 'NORMAL':
      return 'success'
    case 'ANOMALY':
      return 'danger'
    case 'LOW_CONFIDENCE':
      return 'warning'
    default:
      return 'default'
  }
}

export function getActionCandidateLabel(actionCandidate?: ActionCandidate | null) {
  switch (actionCandidate) {
    case 'CLEANING':
      return '세척'
    case 'RETAKE':
      return '재촬영'
    case 'FIELD_INSPECTION':
      return '현장 점검'
    case 'REPLACEMENT_REVIEW':
      return '교체 검토'
    default:
      return '-'
  }
}

export function getReviewStatusLabel(reviewStatus?: ReviewStatus | null) {
  switch (reviewStatus) {
    case 'UNCHECKED':
      return '미검토'
    case 'CONFIRMED':
      return '확인됨'
    case 'RECHECK_REQUIRED':
      return '재점검 필요'
    case 'ACTION_COMPLETED':
      return '조치 완료'
    default:
      return '-'
  }
}

export function getReviewStatusTone(reviewStatus?: ReviewStatus | null) {
  switch (reviewStatus) {
    case 'CONFIRMED':
    case 'ACTION_COMPLETED':
      return 'success'
    case 'RECHECK_REQUIRED':
      return 'warning'
    case 'UNCHECKED':
      return 'default'
    default:
      return 'default'
  }
}

export function getSeverityLevelLabel(severityLevel?: SeverityLevel | null) {
  switch (severityLevel) {
    case 'LOW':
      return '낮음'
    case 'MEDIUM':
      return '보통'
    case 'HIGH':
      return '높음'
    case 'CRITICAL':
      return '치명적'
    default:
      return '-'
  }
}

export function getSeverityLevelTone(severityLevel?: SeverityLevel | null) {
  switch (severityLevel) {
    case 'LOW':
      return 'default'
    case 'MEDIUM':
      return 'warning'
    case 'HIGH':
    case 'CRITICAL':
      return 'danger'
    default:
      return 'default'
  }
}

export function getPriorityLevelLabel(priorityLevel?: PriorityLevel | null) {
  switch (priorityLevel) {
    case 'LOW':
      return '낮음'
    case 'MEDIUM':
      return '보통'
    case 'HIGH':
      return '높음'
    case 'URGENT':
      return '긴급'
    default:
      return '-'
  }
}

export function getDefectTypeLabel(defectType?: DefectType | null) {
  switch (defectType) {
    case 'CONTAMINATION':
      return '오염'
    case 'DUST':
      return '먼지'
    case 'LEAF':
      return '낙엽'
    case 'BIRD_DROPPING':
      return '조류 배설물'
    case 'SHADING':
      return '음영'
    case 'VEGETATION':
      return '잡초'
    case 'APPEARANCE_DAMAGE':
      return '외관 손상'
    case 'HOTSPOT':
      return '핫스팟'
    case 'OVERHEATING':
      return '과열'
    case 'ABNORMAL_HEAT':
      return '이상 발열'
    case 'UNKNOWN':
      return '알 수 없음'
    default:
      return '-'
  }
}

export function getDefectSourceLabel(defectSource?: DefectSource | null) {
  switch (defectSource) {
    case 'RGB':
      return 'RGB'
    case 'THERMAL':
      return '열화상'
    default:
      return '-'
  }
}

export function getVisualizationTypeLabel(type: ResultVisualizationType) {
  switch (type) {
    case 'bbox':
      return 'BBox'
    case 'heatmap':
      return 'Heatmap'
    case 'mask':
      return 'Mask'
  }
}
