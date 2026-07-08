import { useState } from 'react'
import { useResultVisualization } from '../hooks/useResults'
import { defectHasBbox, getVisualizationEmptyMessage, hasVisualizationAsset } from '../resultViewerUtils'
import type { AnalysisResult, DetectedDefect, ResultVisualizationType } from '../types'
import { getVisualizationTypeLabel, VISUALIZATION_TYPE_OPTIONS } from '../types'
import { EmptyState } from '../../../shared/components/state/EmptyState'
import { getApiErrorMessage } from '../../../shared/utils'

type ResultImageViewerProps = {
  result: AnalysisResult
  resultId: number
  selectedDefect: DetectedDefect | null
  visualizationType: ResultVisualizationType
  onVisualizationTypeChange: (type: ResultVisualizationType) => void
}

export function ResultImageViewer({
  onVisualizationTypeChange,
  result,
  resultId,
  selectedDefect,
  visualizationType,
}: ResultImageViewerProps) {
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })

  const visualizationQuery = useResultVisualization(
    resultId,
    visualizationType,
    hasVisualizationAsset(result, visualizationType),
  )

  const resultUrl = visualizationQuery.data?.data.url ?? null
  const overlayStyle =
    visualizationType !== 'bbox' &&
    selectedDefect &&
    defectHasBbox(selectedDefect) &&
    imageSize.width > 0 &&
    imageSize.height > 0
      ? createClampedOverlayStyle(selectedDefect, imageSize)
      : null

  return (
    <div className="result-image-viewer panel">
      <div className="result-image-viewer-toolbar">
        <div className="result-viewer-header-copy">
          <div className="result-viewer-title">분석 결과 시각화</div>
          <div className="result-viewer-description">
            원본이나 비교 화면 없이 현재 선택한 AI 결과 시각화만 표시합니다.
          </div>
        </div>

        <div className="result-viz-toggle-row" role="group" aria-label="시각화 유형">
          {VISUALIZATION_TYPE_OPTIONS.map((type) => {
            const disabled = !hasVisualizationAsset(result, type)
            return (
              <button
                key={type}
                type="button"
                className={`result-viz-toggle ${visualizationType === type ? 'result-viz-toggle-active' : ''} ${disabled ? 'result-viz-toggle-disabled' : ''}`}
                disabled={disabled}
                onClick={() => onVisualizationTypeChange(type)}
              >
                <span>{getVisualizationTypeLabel(type)}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="result-image-stage-grid">
        <ImageStage
          label={`${getVisualizationTypeLabel(visualizationType)} 결과`}
          isLoading={visualizationQuery.isLoading}
          error={
            visualizationQuery.isError
              ? getApiErrorMessage(visualizationQuery.error, '결과 이미지를 불러오지 못했습니다.')
              : null
          }
          imageUrl={resultUrl}
          emptyTitle="결과 이미지 없음"
          emptyDescription={getVisualizationEmptyMessage(visualizationType)}
          overlayStyle={overlayStyle}
          onImageLoad={(width, height) => setImageSize({ width, height })}
        />
      </div>

      {selectedDefect ? (
        <div className="result-image-selection-hint">
          {visualizationType === 'bbox'
            ? '경계 상자 탭에서는 저장된 bbox 시각화 이미지만 표시합니다.'
            : '선택한 결함 후보 영역을 현재 결과 이미지에서 강조합니다.'}
          {visualizationType !== 'bbox' && !defectHasBbox(selectedDefect)
            ? ' 좌표 정보가 없어 영역 하이라이트는 표시되지 않습니다.'
            : null}
        </div>
      ) : null}
    </div>
  )
}

function createClampedOverlayStyle(
  defect: DetectedDefect,
  imageSize: { width: number; height: number },
) {
  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

  const left = clamp(defect.bboxX ?? 0, 0, imageSize.width)
  const top = clamp(defect.bboxY ?? 0, 0, imageSize.height)
  const right = clamp((defect.bboxX ?? 0) + (defect.bboxWidth ?? 0), 0, imageSize.width)
  const bottom = clamp((defect.bboxY ?? 0) + (defect.bboxHeight ?? 0), 0, imageSize.height)

  return {
    left: `${(left / imageSize.width) * 100}%`,
    top: `${(top / imageSize.height) * 100}%`,
    width: `${(Math.max(0, right - left) / imageSize.width) * 100}%`,
    height: `${(Math.max(0, bottom - top) / imageSize.height) * 100}%`,
  }
}

function ImageStage({
  emptyDescription,
  emptyTitle,
  error,
  imageUrl,
  isLoading,
  label,
  onImageLoad,
  overlayStyle,
}: {
  label: string
  isLoading: boolean
  error: string | null
  imageUrl: string | null
  emptyTitle: string
  emptyDescription: string
  overlayStyle: {
    left: string
    top: string
    width: string
    height: string
  } | null
  onImageLoad: (width: number, height: number) => void
}) {
  return (
    <article className="result-image-stage-wrap">
      <div className="result-image-stage-label">{label}</div>
      <div className="result-image-stage">
        {isLoading ? (
          <div className="image-placeholder">이미지를 불러오는 중입니다.</div>
        ) : error ? (
          <div className="image-placeholder image-placeholder-error">{error}</div>
        ) : imageUrl ? (
          <>
            <img
              className="result-image-stage-img"
              src={imageUrl}
              alt={label}
              onLoad={(event) => {
                const img = event.currentTarget
                onImageLoad(img.naturalWidth, img.naturalHeight)
              }}
            />
            {overlayStyle ? <div className="result-bbox-overlay" style={overlayStyle} /> : null}
          </>
        ) : (
          <EmptyState title={emptyTitle} description={emptyDescription} />
        )}
      </div>
    </article>
  )
}
