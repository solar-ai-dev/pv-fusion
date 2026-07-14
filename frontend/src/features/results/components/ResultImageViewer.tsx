import { useState } from 'react'
import { useResultVisualization } from '../hooks/useResults'
import { defectHasBbox, getVisualizationEmptyMessage, hasVisualizationAsset } from '../resultViewerUtils'
import { getRgbLegendEntries, isRgbResult } from '../rgbClassPalette'
import type { AnalysisResult, DetectedDefect, ResultVisualizationType } from '../types'
import { getVisualizationTypeLabel, VISUALIZATION_TYPE_OPTIONS } from '../types'
import { useImagePreview } from '../../images/hooks/useImages'
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
  const hasVisualization = hasVisualizationAsset(result, visualizationType)
  const canUseOriginalFallback = result.imageId != null && result.imageId > 0

  const visualizationQuery = useResultVisualization(
    resultId,
    visualizationType,
    hasVisualization,
  )
  const imagePreviewQuery = useImagePreview(
    result.imageId ?? 0,
    !hasVisualization && canUseOriginalFallback,
  )

  const isUsingOriginalFallback = !hasVisualization && canUseOriginalFallback
  const resultUrl = isUsingOriginalFallback
    ? imagePreviewQuery.data?.data.url ?? null
    : visualizationQuery.data?.data.url ?? null
  const suppressSelectionOverlay =
    isUsingOriginalFallback ||
    visualizationType === 'bbox' ||
    (visualizationType === 'mask' && isRgbResult(result))
  const overlayStyle =
    !suppressSelectionOverlay &&
    selectedDefect &&
    defectHasBbox(selectedDefect) &&
    imageSize.width > 0 &&
    imageSize.height > 0
      ? createClampedOverlayStyle(selectedDefect, imageSize)
      : null
  const showRgbLegend = isRgbResult(result) && visualizationType === 'mask' && hasVisualization
  const stageLabel = isUsingOriginalFallback
    ? '원본 이미지'
    : `${getVisualizationTypeLabel(visualizationType)} 결과`
  const stageError = isUsingOriginalFallback
    ? imagePreviewQuery.isError
      ? getApiErrorMessage(imagePreviewQuery.error, '원본 이미지를 불러오지 못했습니다.')
      : null
    : visualizationQuery.isError
      ? getApiErrorMessage(visualizationQuery.error, '결과 이미지를 불러오지 못했습니다.')
      : null
  const fallbackMessage =
    isUsingOriginalFallback && result.detections.length === 0
      ? '탐지된 이상 후보가 없어 원본 이미지를 표시합니다.'
      : isUsingOriginalFallback
        ? '시각화 산출물이 없어 원본 이미지를 표시합니다.'
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
            const disabled = !hasVisualizationAsset(result, type) && !canUseOriginalFallback
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

      {showRgbLegend ? (
        <div className="result-rgb-legend">
          <div className="result-rgb-legend-title">RGB 클래스 범례</div>
          <div className="result-rgb-legend-items">
            {getRgbLegendEntries().map((entry) => (
              <div key={entry.className} className="result-rgb-legend-item">
                <span
                  className="result-rgb-legend-swatch"
                  style={{ backgroundColor: entry.hex }}
                  aria-hidden="true"
                />
                <span className="result-rgb-legend-label">{entry.label}</span>
              </div>
            ))}
          </div>
          <div className="result-rgb-legend-note">
            후보 카드의 `외관 이상`은 현재 Public API에 원본 RGB class가 없어 파손/누락이 함께 표시될 수 있습니다.
          </div>
        </div>
      ) : null}

      <div className="result-image-stage-grid">
        <ImageStage
          label={stageLabel}
          isLoading={isUsingOriginalFallback ? imagePreviewQuery.isLoading : visualizationQuery.isLoading}
          error={stageError}
          imageUrl={resultUrl}
          emptyTitle={isUsingOriginalFallback ? '원본 이미지 없음' : '결과 이미지 없음'}
          emptyDescription={
            isUsingOriginalFallback
              ? '원본 이미지 미리보기를 사용할 수 없습니다.'
              : getVisualizationEmptyMessage(visualizationType)
          }
          overlayStyle={overlayStyle}
          onImageLoad={(width, height) => setImageSize({ width, height })}
        />
      </div>

      {fallbackMessage ? (
        <div className="result-image-selection-hint">{fallbackMessage}</div>
      ) : null}

      {selectedDefect ? (
        <div className="result-image-selection-hint">
          {visualizationType === 'bbox'
            ? '경계 상자 탭에서는 저장된 bbox 시각화 이미지만 표시합니다.'
            : visualizationType === 'mask' && isRgbResult(result)
              ? 'RGB 마스크 탭에서는 선택한 후보를 카드 선택 상태로만 표시합니다.'
            : '선택한 결함 후보 영역을 현재 결과 이미지에서 강조합니다.'}
          {!suppressSelectionOverlay && !defectHasBbox(selectedDefect)
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
