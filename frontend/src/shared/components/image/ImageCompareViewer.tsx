type ImageCompareViewerProps = {
  leftLabel?: string
  rightLabel?: string
  leftImageUrl?: string | null
  rightImageUrl?: string | null
  leftDescription?: string
  rightDescription?: string
}

export function ImageCompareViewer({
  leftLabel = '원본 이미지',
  rightLabel = '결과 이미지',
  leftImageUrl,
  rightImageUrl,
  leftDescription,
  rightDescription,
}: ImageCompareViewerProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ImagePane
        label={leftLabel}
        imageUrl={leftImageUrl}
        description={leftDescription}
      />
      <ImagePane
        label={rightLabel}
        imageUrl={rightImageUrl}
        description={rightDescription}
      />
    </div>
  )
}

function ImagePane({
  label,
  imageUrl,
  description,
}: {
  label: string
  imageUrl?: string | null
  description?: string
}) {
  return (
    <article className="compare-pane">
      <div className="compare-pane-header">
        <h3 className="text-base font-semibold text-slate-900">{label}</h3>
        {description ? <p className="text-sm text-slate-500">{description}</p> : null}
      </div>
      {imageUrl ? (
        <img className="compare-image" src={imageUrl} alt={label} />
      ) : (
        <div className="image-placeholder">표시할 이미지가 없습니다.</div>
      )}
    </article>
  )
}
