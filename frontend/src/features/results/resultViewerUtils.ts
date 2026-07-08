import type { AnalysisResult, DetectedDefect, ResultVisualizationType } from './types'
import { VISUALIZATION_TYPE_OPTIONS } from './types'

export type ImageViewMode = 'original' | 'result' | 'split'

export function hasVisualizationAsset(
  result: AnalysisResult,
  type: ResultVisualizationType,
): boolean {
  switch (type) {
    case 'bbox':
      return Boolean(
        result.bboxVisualization?.url ||
          result.bboxFileUrl ||
          (result.bboxBucketName && result.bboxObjectKey),
      )
    case 'heatmap':
      return Boolean(
        result.heatmapVisualization?.url ||
          result.heatmapFileUrl ||
          (result.heatmapBucketName && result.heatmapObjectKey),
      )
    case 'mask':
      return Boolean(
        result.maskVisualization?.url ||
          result.maskFileUrl ||
          (result.maskBucketName && result.maskObjectKey),
      )
  }
}

export function getVisualizationDisabledReason(
  result: AnalysisResult,
  type: ResultVisualizationType,
): string | null {
  if (hasVisualizationAsset(result, type)) return null
  switch (type) {
    case 'bbox':
      return '경계 상자 결과 없음'
    case 'heatmap':
      return '히트맵 데이터 없음'
    case 'mask':
      return '마스크 데이터 없음'
  }
}

export function getDefaultVisualizationType(
  result: AnalysisResult,
): ResultVisualizationType {
  for (const type of VISUALIZATION_TYPE_OPTIONS) {
    if (hasVisualizationAsset(result, type)) return type
  }
  return 'bbox'
}

export function defectHasBbox(defect: DetectedDefect): boolean {
  return (
    defect.bboxX != null &&
    defect.bboxY != null &&
    defect.bboxWidth != null &&
    defect.bboxHeight != null
  )
}

export function canShowOriginalImage(result: AnalysisResult): boolean {
  return typeof result.imageId === 'number' && result.imageId > 0
}

export function canShowResultImage(
  result: AnalysisResult,
  visualizationType: ResultVisualizationType,
): boolean {
  return hasVisualizationAsset(result, visualizationType)
}
