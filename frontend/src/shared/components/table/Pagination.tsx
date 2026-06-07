type PaginationProps = {
  page?: number
  totalPages?: number
}

export function Pagination({
  page = 1,
  totalPages = 1,
}: PaginationProps) {
  return (
    <div className="flex items-center justify-between rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
      <span>
        페이지 {page} / {totalPages}
      </span>
      <div className="flex gap-2">
        <button className="btn btn-secondary" type="button">
          이전
        </button>
        <button className="btn btn-secondary" type="button">
          다음
        </button>
      </div>
    </div>
  )
}
