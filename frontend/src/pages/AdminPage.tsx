import { PageScaffold } from './PageScaffold'

export function AdminPage() {
  return (
    <PageScaffold
      title="관리자"
      description="사용자 승인, 권한 관리, 운영 로그 확인을 위한 관리자 영역입니다."
      highlights={[
        '승인 대기 사용자 목록',
        '사용자 역할 변경과 비활성화',
        '운영 로그 및 전체 현황 조회',
      ]}
    />
  )
}
