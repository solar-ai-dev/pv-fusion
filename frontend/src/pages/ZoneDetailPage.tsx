import { PageScaffold } from './PageScaffold'

export function ZoneDetailPage() {
  return (
    <PageScaffold
      title="구역 상세"
      description="구역 정보, 설비 구조, 점검 이력, 변경 추적 요약"
      highlights={[
        'Array / Panel / Module 구조 표시',
        '설비 등록 및 비활성화 진입',
        '결과 화면 및 점검 등록 이동',
      ]}
    />
  )
}
