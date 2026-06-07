import { PageScaffold } from './PageScaffold'

export function DashboardPage() {
  return (
    <PageScaffold
      title="대시보드"
      description="접근 가능한 발전소, 구역, 점검, 이상 알림 현황 요약"
      highlights={[
        'KPI 요약 카드',
        '조치 후보와 심각도 통계 차트',
        '최근 점검 및 분석 결과 목록',
      ]}
    />
  )
}
