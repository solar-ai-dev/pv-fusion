import type { ReactNode } from 'react'

type EmptyStateProps = {
  title?: string
  description?: string
  action?: ReactNode
}

export function EmptyState({
  title = '표시할 내용이 없습니다.',
  description = '조건을 바꾸거나 데이터를 추가한 뒤 다시 확인해 주세요.',
  action,
}: EmptyStateProps) {
  return (
    <div className="state-card">
      <h2 className="panel-title">{title}</h2>
      <p className="panel-description">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
