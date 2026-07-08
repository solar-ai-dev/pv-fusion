import type { ResultVisualizationType } from '../../../features/results/types'

type VisualizationOverlayViewerProps = {
  activeType: ResultVisualizationType
  availableTypes: ResultVisualizationType[]
  imageUrl?: string | null
  isLoading?: boolean
  error?: string | null
  onTypeChange?: (type: ResultVisualizationType) => void
}

export function VisualizationOverlayViewer({
  activeType,
  availableTypes,
  imageUrl,
  isLoading = false,
  error = null,
  onTypeChange,
}: VisualizationOverlayViewerProps) {
  return (
    <div className="panel stack-md">
      <div className="inline-actions">
        {availableTypes.map((type) => (
          <button
            key={type}
            type="button"
            className={type === activeType ? 'btn btn-primary' : 'btn btn-secondary'}
            onClick={() => onTypeChange?.(type)}
          >
            {getVisualizationButtonLabel(type)}
          </button>
        ))}
      </div>

      {isLoading ? <div className="image-placeholder">시각화 이미지를 불러오는 중입니다.</div> : null}
      {!isLoading && error ? <div className="image-placeholder">{error}</div> : null}

      {!isLoading && !error && imageUrl ? (
        <img className="compare-image" src={imageUrl} alt={`${getVisualizationButtonLabel(activeType)} 시각화`} />
      ) : null}

      {!isLoading && !error && !imageUrl ? (
        <div className="image-placeholder">현재 선택한 시각화 이미지를 표시할 수 없습니다.</div>
      ) : null}
    </div>
  )
}

function getVisualizationButtonLabel(type: ResultVisualizationType) {
  switch (type) {
    case 'bbox':
      return '경계 상자'
    case 'heatmap':
      return '히트맵'
    case 'mask':
      return '마스크'
  }
}
