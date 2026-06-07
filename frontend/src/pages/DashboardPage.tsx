import { PageScaffold } from './PageScaffold'

export function DashboardPage() {
  return (
    <PageScaffold
      title="대시보드"
      description="접근 가능한 발전소, 구역, 점검, 이상 현황을 한 화면에서 요약합니다."
      highlights={[
        'KPI 요약 카드',
        '조치 후보와 상태 통계 차트',
        '최근 점검 및 분석 결과 목록',
      ]}
    />
  )
}
