const modes = ['BBOX', 'HEATMAP', 'MASK']

export function VisualizationOverlayViewer() {
  return (
    <div className="panel">
      <div className="flex flex-wrap gap-2">
        {modes.map((mode) => (
          <button key={mode} type="button" className="btn btn-secondary">
            {mode}
          </button>
        ))}
      </div>
      <div className="image-placeholder mt-4">시각화 오버레이 뷰어</div>
    </div>
  )
}
