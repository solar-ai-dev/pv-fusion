import { ReactNode } from 'react'
import { PageHeader } from '../shared/components/layout/PageHeader'

type PageScaffoldProps = {
  title: string
  description: string
  highlights: string[]
  actions?: ReactNode
}

export function PageScaffold({
  title,
  description,
  highlights,
  actions,
}: PageScaffoldProps) {
  return (
    <section className="space-y-6">
      <PageHeader title={title} description={description} actions={actions} />
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <article className="panel">
          <h2 className="panel-title">구현 범위</h2>
          <p className="panel-description">
            현재 단계에서 제공하는 화면 목적과 사용자 동선을 요약한 영역입니다.
          </p>
          <ul className="marker-list">
            {highlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
        <article className="panel">
          <h2 className="panel-title">현재 상태</h2>
          <p className="panel-description">
            실제 연동 범위와 후속 구현 예정 영역을 문서 기준으로 구분해 보여줍니다.
          </p>
        </article>
      </div>
    </section>
  )
}
