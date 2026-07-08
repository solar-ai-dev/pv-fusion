import type { AnalysisResult, DetectedDefect, ResultVisualizationType } from './types'
import { VISUALIZATION_TYPE_OPTIONS } from './types'

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

export function getVisualizationEmptyMessage(
  type: ResultVisualizationType,
): string {
  switch (type) {
    case 'bbox':
      return '경계 상자 결과가 없습니다.'
    case 'heatmap':
      return '히트맵 데이터가 없습니다.'
    case 'mask':
      return '마스크 데이터가 없습니다.'
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
