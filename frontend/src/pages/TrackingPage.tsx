import { PageScaffold } from './PageScaffold'

export function TrackingPage() {
  return (
    <PageScaffold
      title="변경 추적"
      description="반복 이상과 악화 대상을 추적하는 화면 골격입니다."
      highlights={[
        '구역별 추적 요약',
        '이전 점검과의 비교 뷰',
        '결과 상세로 이동하는 링크',
      ]}
    />
  )
}
