type PaginationProps = {
  page: number
  totalPages: number
  totalElements?: number
  onPageChange?: (nextPage: number) => void
}

export function Pagination({
  page,
  totalPages,
  totalElements,
  onPageChange,
}: PaginationProps) {
  const normalizedPage = Math.max(page, 1)
  const normalizedTotalPages = Math.max(totalPages, 1)
  const isFirstPage = normalizedPage <= 1
  const isLastPage = normalizedPage >= normalizedTotalPages

  return (
    <div className="flex items-center justify-between rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
      <span>
        페이지 {normalizedPage} / {normalizedTotalPages}
        {typeof totalElements === 'number' ? ` · 총 ${totalElements}건` : ''}
      </span>
      <div className="flex gap-2">
        <button
          className="btn btn-secondary"
          type="button"
          disabled={isFirstPage}
          onClick={() => onPageChange?.(normalizedPage - 1)}
        >
          이전
        </button>
        <button
          className="btn btn-secondary"
          type="button"
          disabled={isLastPage}
          onClick={() => onPageChange?.(normalizedPage + 1)}
        >
          다음
        </button>
      </div>
    </div>
  )
}
