type EmptyStateProps = {
  title?: string
  description?: string
}

export function EmptyState({
  title = '표시할 데이터가 없습니다.',
  description = '필터 조건을 조정하거나 데이터를 등록한 뒤 다시 확인해 주세요.',
}: EmptyStateProps) {
  return (
    <div className="state-card">
      <h2 className="panel-title">{title}</h2>
      <p className="panel-description">{description}</p>
    </div>
  )
}
