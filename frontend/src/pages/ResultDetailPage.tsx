import { PageScaffold } from './PageScaffold'

export function ResultDetailPage() {
  return (
    <PageScaffold
      title="결과 상세"
      description="원본과 결과 이미지 비교, 조치 후보, 검토 상태를 확인하는 화면입니다."
      highlights={[
        '시각화 비교 뷰어',
        '결함 후보 요약 패널',
        '조치 후보 및 검토 상태 영역',
      ]}
    />
  )
}
