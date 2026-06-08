type ErrorStateProps = {
  title?: string
  description?: string
}

export function ErrorState({
  title = '문제가 발생했습니다.',
  description = '요청 상태를 확인한 뒤 잠시 후 다시 시도해 주세요.',
}: ErrorStateProps) {
  return (
    <div className="state-card state-card-error">
      <h2 className="panel-title">{title}</h2>
      <p className="panel-description">{description}</p>
    </div>
  )
}
