import { PageScaffold } from './PageScaffold'

export function PlantDetailPage() {
  return (
    <PageScaffold
      title="발전소 상세"
      description="발전소 상세 정보, 구역 목록, 비활성화와 편집 진입 영역"
      highlights={[
        '발전소 기본 정보 카드',
        '구역 목록 및 등록 동선',
        '점검 등록으로 이어지는 링크 영역',
      ]}
    />
  )
}
