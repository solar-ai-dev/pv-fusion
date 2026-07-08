import { useEffect, useMemo, useState } from 'react'
import { useImagePreview } from '../../images/hooks/useImages'
import { useResultVisualization } from '../hooks/useResults'
import {
  canShowOriginalImage,
  canShowResultImage,
  defectHasBbox,
  getVisualizationDisabledReason,
  hasVisualizationAsset,
  type ImageViewMode,
} from '../resultViewerUtils'
import type {
  AnalysisResult,
  DetectedDefect,
  ResultVisualizationType,
} from '../types'
import { getVisualizationTypeLabel, VISUALIZATION_TYPE_OPTIONS } from '../types'
import { EmptyState } from '../../../shared/components/state/EmptyState'
import { getApiErrorMessage } from '../../../shared/utils'

type ResultImageViewerProps = {
  result: AnalysisResult
  resultId: number
  selectedDefect: DetectedDefect | null
  viewMode: ImageViewMode
  visualizationType: ResultVisualizationType
  onViewModeChange: (mode: ImageViewMode) => void
  onVisualizationTypeChange: (type: ResultVisualizationType) => void
}

export function ResultImageViewer({
  onViewModeChange,
  onVisualizationTypeChange,
  result,
  resultId,
  selectedDefect,
  viewMode,
  visualizationType,
}: ResultImageViewerProps) {
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })

  const hasOriginal = canShowOriginalImage(result)
  const hasResultViz = canShowResultImage(result, visualizationType)

  const originalPreviewQuery = useImagePreview(
    result.imageId ?? 0,
    hasOriginal && (viewMode === 'original' || viewMode === 'split'),
  )

  const visualizationQuery = useResultVisualization(
    resultId,
    visualizationType,
    hasVisualizationAsset(result, visualizationType) &&
      (viewMode === 'result' || viewMode === 'split'),
  )

  const originalUrl = originalPreviewQuery.data?.data.url ?? null
  const resultUrl = visualizationQuery.data?.data.url ?? null

  const viewModes = useMemo(
    () => [
      {
        key: 'original' as const,
        label: '원본',
        disabled: !hasOriginal,
        reason: hasOriginal ? null : '원본 이미지 없음',
      },
      {
        key: 'result' as const,
        label: '분석 결과',
        disabled: !hasResultViz,
        reason: hasResultViz
          ? null
          : `${getVisualizationTypeLabel(visualizationType)} 결과 없음`,
      },
      {
        key: 'split' as const,
        label: '나란히 보기',
        disabled: !hasOriginal || !hasResultViz,
        reason:
          !hasOriginal && !hasResultViz
            ? '원본·결과 이미지 없음'
            : !hasOriginal
              ? '원본 이미지 없음'
              : !hasResultViz
                ? '결과 이미지 없음'
                : null,
      },
    ],
    [hasOriginal, hasResultViz, visualizationType],
  )

  useEffect(() => {
    const current = viewModes.find((mode) => mode.key === viewMode)
    if (current?.disabled) {
      const fallback = viewModes.find((mode) => !mode.disabled)
      if (fallback) onViewModeChange(fallback.key)
    }
  }, [onViewModeChange, viewMode, viewModes])

  const overlayStyle =
    selectedDefect && defectHasBbox(selectedDefect) && imageSize.width > 0
      ? {
          left: `${(selectedDefect.bboxX! / imageSize.width) * 100}%`,
          top: `${(selectedDefect.bboxY! / imageSize.height) * 100}%`,
          width: `${(selectedDefect.bboxWidth! / imageSize.width) * 100}%`,
          height: `${(selectedDefect.bboxHeight! / imageSize.height) * 100}%`,
        }
      : null

  return (
    <div className="result-image-viewer panel">
      <div className="result-image-viewer-toolbar">
        <div className="result-view-mode-tabs" role="tablist" aria-label="이미지 보기 모드">
          {viewModes.map((mode) => (
            <button
              key={mode.key}
              type="button"
              role="tab"
              aria-selected={viewMode === mode.key}
              className={`result-view-mode-tab ${viewMode === mode.key ? 'result-view-mode-tab-active' : ''}`}
              disabled={mode.disabled}
              title={mode.disabled ? (mode.reason ?? undefined) : undefined}
              onClick={() => onViewModeChange(mode.key)}
            >
              <span>{mode.label}</span>
              {mode.disabled && mode.reason ? (
                <span className="result-view-mode-hint">{mode.reason}</span>
              ) : null}
            </button>
          ))}
        </div>

        <div className="result-viz-toggle-row" role="group" aria-label="시각화 유형">
          {VISUALIZATION_TYPE_OPTIONS.map((type) => {
            const disabled = !hasVisualizationAsset(result, type)
            const reason = getVisualizationDisabledReason(result, type)
            return (
              <button
                key={type}
                type="button"
                className={`result-viz-toggle ${visualizationType === type ? 'result-viz-toggle-active' : ''} ${disabled ? 'result-viz-toggle-disabled' : ''}`}
                disabled={disabled}
                title={disabled ? (reason ?? undefined) : undefined}
                onClick={() => onVisualizationTypeChange(type)}
              >
                <span>{getVisualizationTypeLabel(type)}</span>
                {disabled && reason ? (
                  <span className="result-viz-toggle-hint">{reason}</span>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>

      <div
        className={`result-image-stage-grid ${viewMode === 'split' ? 'result-image-stage-grid-split' : ''}`}
      >
        {viewMode === 'original' || viewMode === 'split' ? (
          <ImageStage
            label="원본 이미지"
            isLoading={originalPreviewQuery.isLoading}
            error={
              originalPreviewQuery.isError
                ? getApiErrorMessage(originalPreviewQuery.error, '원본 이미지를 불러오지 못했습니다.')
                : null
            }
            imageUrl={originalUrl}
            emptyTitle="원본 이미지 없음"
            emptyDescription="연결된 원본 이미지가 없거나 아직 업로드되지 않았습니다."
            overlayStyle={overlayStyle}
            onImageLoad={(width, height) => setImageSize({ width, height })}
          />
        ) : null}

        {viewMode === 'result' || viewMode === 'split' ? (
          <ImageStage
            label={`분석 결과 · ${getVisualizationTypeLabel(visualizationType)}`}
            isLoading={visualizationQuery.isLoading}
            error={
              visualizationQuery.isError
                ? getApiErrorMessage(
                    visualizationQuery.error,
                    '결과 이미지를 불러오지 못했습니다.',
                  )
                : null
            }
            imageUrl={resultUrl}
            emptyTitle="결과 이미지 없음"
            emptyDescription={`${getVisualizationTypeLabel(visualizationType)} 시각화가 생성되지 않았습니다.`}
            overlayStyle={viewMode === 'result' ? overlayStyle : null}
            onImageLoad={(width, height) => {
              if (viewMode === 'result') {
                setImageSize({ width, height })
              }
            }}
          />
        ) : null}
      </div>

      {selectedDefect ? (
        <div className="result-image-selection-hint">
          선택된 결함 후보 영역을 이미지에서 강조합니다.
          {!defectHasBbox(selectedDefect)
            ? ' 좌표 정보가 없어 영역 하이라이트는 표시되지 않습니다.'
            : null}
        </div>
      ) : null}
    </div>
  )
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
            {overlayStyle ? (
              <div className="result-bbox-overlay" style={overlayStyle} />
            ) : null}
          </>
        ) : (
          <EmptyState title={emptyTitle} description={emptyDescription} />
        )}
      </div>
    </article>
  )
}
