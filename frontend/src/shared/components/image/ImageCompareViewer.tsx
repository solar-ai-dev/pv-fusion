type ImageCompareViewerProps = {
  leftLabel?: string
  rightLabel?: string
}

export function ImageCompareViewer({
  leftLabel = '원본 이미지',
  rightLabel = '결과 이미지',
}: ImageCompareViewerProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="image-placeholder">{leftLabel}</div>
      <div className="image-placeholder">{rightLabel}</div>
    </div>
  )
}
