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
            실제 데이터 연동 전 단계의 플레이스홀더 화면입니다. 문서 기준의
            페이지 책임과 동선을 먼저 고정합니다.
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
            API 호출 함수와 레이아웃 골격은 준비되어 있으며, 상세 UI와 실제
            요청 연결은 이후 단계에서 확장합니다.
          </p>
        </article>
      </div>
    </section>
  )
}
