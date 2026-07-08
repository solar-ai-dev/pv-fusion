import { ReactNode } from 'react'
import { EmptyState } from '../state/EmptyState'

type DataTableColumn<T> = {
  key: string
  header: string
  render: (row: T) => ReactNode
  className?: string
}

type DataTableProps<T> = {
  columns: DataTableColumn<T>[]
  rows: T[]
  rowKey?: (row: T, rowIndex: number) => string | number
  emptyTitle?: string
  emptyDescription?: string
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  emptyTitle,
  emptyDescription,
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <EmptyState title={emptyTitle} description={emptyDescription} />
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="min-w-[720px] w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-4 py-2.5 font-medium whitespace-nowrap">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={rowKey ? rowKey(row, rowIndex) : rowIndex}
              className="border-t border-slate-100 align-top"
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`px-4 py-2.5 text-slate-700 break-keep ${column.className ?? ''}`}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
