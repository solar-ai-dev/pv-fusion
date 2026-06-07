import { PageScaffold } from './PageScaffold'

export function PendingApprovalPage() {
  return (
    <PageScaffold
      title="승인 대기"
      description="관리자 승인 전 사용자를 안내하는 대기 화면입니다."
      highlights={[
        '현재 계정 상태 안내',
        '승인 상태 재확인 버튼 배치 예정',
        '로그아웃 동선 유지',
      ]}
    />
  )
}
