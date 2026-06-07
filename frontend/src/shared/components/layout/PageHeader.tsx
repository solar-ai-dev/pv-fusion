import { ReactNode } from 'react'

type PageHeaderProps = {
  title: string
  description: string
  actions?: ReactNode
}

export function PageHeader({
  title,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <header className="page-header">
      <div>
        <h1 className="text-3xl font-semibold text-slate-950">{title}</h1>
        <p className="mt-2 text-sm text-slate-600">{description}</p>
      </div>
      {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
    </header>
  )
}
