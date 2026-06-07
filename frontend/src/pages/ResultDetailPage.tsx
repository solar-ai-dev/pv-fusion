import { PageScaffold } from './PageScaffold'

export function ResultDetailPage() {
  return (
    <PageScaffold
      title="결과 상세"
      description="원본/결과 이미지 비교, bbox/heatmap/mask, 조치 후보, 검토 상태 변경"
      highlights={[
        '시각화 토글 뷰어',
        '결함 후보 요약 패널',
        '조치 후보 및 검토 상태 변경 영역',
      ]}
    />
  )
}
