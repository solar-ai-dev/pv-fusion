import { useEffect, useMemo, useState } from 'react'
import { useDashboardSummary } from '../features/dashboard/hooks/useDashboard'
import {
  useAdminUser,
  useAdminUsers,
  useApproveAdminUser,
  useChangeAdminUserRole,
  useDeactivateAdminUser,
  useOperationLogs,
  usePendingAdminUsers,
} from '../features/admin/hooks/useAdmin'
import {
  ACCOUNT_STATUS_OPTIONS,
  OPERATION_EVENT_CATEGORY_OPTIONS,
  OPERATION_EVENT_TYPE_OPTIONS,
  USER_ROLE_OPTIONS,
  getAccountStatusLabel,
  getAccountStatusTone,
  getOperationEventCategoryLabel,
  getOperationEventTypeLabel,
  getPlantMemberRoleLabel,
  getResourceStatusLabel,
  getUserRoleLabel,
  getUserRoleTone,
  type AdminUser,
  type AdminUserSummary,
  type OperationLogSummary,
} from '../features/admin/types'
import { useAuth } from '../features/auth/hooks/useAuth'
import { ConfirmModal } from '../shared/components/feedback/ConfirmModal'
import { FormField } from '../shared/components/form/FormField'
import { PageHeader } from '../shared/components/layout/PageHeader'
import { ErrorState } from '../shared/components/state/ErrorState'
import { LoadingState } from '../shared/components/state/LoadingState'
import { StatusBadge } from '../shared/components/state/StatusBadge'
import { DataTable } from '../shared/components/table/DataTable'
import { Pagination } from '../shared/components/table/Pagination'
import { useToast } from '../shared/hooks/useToast'
import {
  formatCount,
  formatDateTime,
  getApiErrorMessage,
  toOffsetDateTime,
} from '../shared/utils'

type AdminTab = 'pending' | 'users' | 'logs' | 'status'

const PENDING_PAGE_SIZE = 5
const USER_PAGE_SIZE = 10
const LOG_PAGE_SIZE = 10

const ADMIN_TABS: Array<{ id: AdminTab; label: string }> = [
  { id: 'pending', label: '승인 대기' },
  { id: 'users', label: '사용자 관리' },
  { id: 'logs', label: '운영 로그' },
  { id: 'status', label: '시스템 상태' },
]

function KpiCard({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: string
  tone?: 'default' | 'warning' | 'danger'
}) {
  return (
    <article className={`kpi-card kpi-card-${tone}`}>
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className="mt-3 text-2xl font-semibold text-slate-900">{value}</div>
    </article>
  )
}

function CompactState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="compact-empty">
      <div className="text-base font-semibold text-slate-900">{title}</div>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
    </div>
  )
}

function TabButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean
  label: string
  count?: number
  onClick: () => void
}) {
  return (
    <button
      className={`tab-button ${active ? 'btn btn-primary' : 'btn btn-secondary'}`}
      type="button"
      onClick={onClick}
    >
      {label}
      {typeof count === 'number' ? ` ${formatCount(count)}건` : ''}
    </button>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-item">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value}</span>
    </div>
  )
}

function buildMembershipSummary(user: AdminUser) {
  if (user.plantMembers.length === 0) {
    return '할당된 발전소 권한이 없습니다.'
  }

  const roleCounts = user.plantMembers.reduce<Record<string, number>>((acc, member) => {
    const key = getPlantMemberRoleLabel(member.memberRole)
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})

  const statusCounts = user.plantMembers.reduce<Record<string, number>>((acc, member) => {
    const key = getResourceStatusLabel(member.status)
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})

  const roleText = Object.entries(roleCounts)
    .map(([label, count]) => `${label} ${formatCount(count)}건`)
    .join(' · ')
  const statusText = Object.entries(statusCounts)
    .map(([label, count]) => `${label} ${formatCount(count)}건`)
    .join(' · ')

  return `운영 대상 권한 ${formatCount(user.plantMembers.length)}건 · ${roleText}${statusText ? ` · ${statusText}` : ''}`
}

function buildOperationTargetLabel(log: OperationLogSummary) {
  switch (log.eventCategory) {
    case 'AUTH':
      return '인증 활동'
    case 'IMAGE':
      return '이미지 작업'
    case 'ANALYSIS':
      return '분석 작업'
    case 'RESULT':
      return '결과 검토'
    case 'ADMIN':
      return '관리 작업'
  }
}

function buildOperationMessage(log: OperationLogSummary) {
  switch (log.eventType) {
    case 'LOGIN':
      return '사용자가 로그인했습니다.'
    case 'LOGOUT':
      return '사용자가 로그아웃했습니다.'
    case 'USER_APPROVED':
      return '사용자 승인이 처리되었습니다.'
    case 'USER_ROLE_CHANGED':
      return '사용자 권한이 변경되었습니다.'
    case 'USER_DEACTIVATED':
      return '사용자 계정이 비활성화되었습니다.'
    case 'PLANT_CREATED':
      return '발전소가 등록되었습니다.'
    case 'PLANT_UPDATED':
      return '발전소 정보가 수정되었습니다.'
    case 'PLANT_DEACTIVATED':
      return '발전소가 비활성화되었습니다.'
    case 'PLANT_ACCESS_GRANTED':
      return '발전소 접근 권한이 부여되었습니다.'
    case 'PLANT_MEMBER_ROLE_CHANGED':
      return '발전소 멤버 권한이 변경되었습니다.'
    case 'PLANT_MEMBER_DEACTIVATED':
      return '발전소 멤버가 비활성화되었습니다.'
    case 'ZONE_CREATED':
      return '점검 영역이 등록되었습니다.'
    case 'ZONE_UPDATED':
      return '점검 영역 정보가 수정되었습니다.'
    case 'ZONE_DEACTIVATED':
      return '점검 영역이 비활성화되었습니다.'
    case 'EQUIPMENT_CREATED':
      return '설비가 등록되었습니다.'
    case 'EQUIPMENT_UPDATED':
      return '설비 정보가 수정되었습니다.'
    case 'EQUIPMENT_DEACTIVATED':
      return '설비가 비활성화되었습니다.'
    case 'IMAGE_UPLOADED':
      return '이미지가 업로드되었습니다.'
    case 'ANALYSIS_REQUESTED':
      return '분석 요청이 접수되었습니다.'
    case 'RESULT_REVIEW_STATUS_CHANGED':
      return '결과 검토 상태가 변경되었습니다.'
    case 'RESULT_ACTION_CANDIDATE_CHANGED':
      return '조치 후보가 변경되었습니다.'
    case 'SYSTEM_ERROR':
      return '처리 중 오류가 발생했습니다.'
  }
}

function getLogResultLabel(log: OperationLogSummary) {
  return log.eventType === 'SYSTEM_ERROR' ? '오류' : '처리됨'
}

function getLogResultTone(log: OperationLogSummary) {
  return log.eventType === 'SYSTEM_ERROR' ? 'danger' : 'default'
}

function getActorRoleLabel(role?: string | null) {
  if (role === 'ADMIN' || role === 'USER') {
    return getUserRoleLabel(role)
  }

  return '-'
}

export function AdminPage() {
  const toast = useToast()
  const currentUserId = useAuth((state) => state.user?.userId ?? null)

  const [activeTab, setActiveTab] = useState<AdminTab>('pending')
  const [pendingPage, setPendingPage] = useState(1)
  const [userPage, setUserPage] = useState(1)
  const [logPage, setLogPage] = useState(1)

  const [keywordInput, setKeywordInput] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [logKeywordInput, setLogKeywordInput] = useState('')
  const [logCategoryFilter, setLogCategoryFilter] = useState('')
  const [logTypeFilter, setLogTypeFilter] = useState('')
  const [logFromInput, setLogFromInput] = useState('')
  const [logToInput, setLogToInput] = useState('')

  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [roleDraft, setRoleDraft] = useState<'USER' | 'ADMIN'>('USER')
  const [approveTarget, setApproveTarget] = useState<AdminUserSummary | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<AdminUserSummary | null>(null)

  const pendingParams = useMemo(
    () => ({
      page: pendingPage - 1,
      size: PENDING_PAGE_SIZE,
    }),
    [pendingPage],
  )

  const userParams = useMemo(
    () => ({
      keyword: keywordInput.trim() || undefined,
      role: (roleFilter || undefined) as 'USER' | 'ADMIN' | undefined,
      accountStatus:
        (statusFilter || undefined) as 'PENDING' | 'APPROVED' | 'INACTIVE' | undefined,
      page: userPage - 1,
      size: USER_PAGE_SIZE,
    }),
    [keywordInput, roleFilter, statusFilter, userPage],
  )

  const logParams = useMemo(
    () => ({
      eventCategory:
        (logCategoryFilter || undefined) as
          | 'AUTH'
          | 'IMAGE'
          | 'ANALYSIS'
          | 'RESULT'
          | 'ADMIN'
          | undefined,
      eventType: (logTypeFilter || undefined) as
        | undefined
        | 'LOGIN'
        | 'LOGOUT'
        | 'USER_APPROVED'
        | 'USER_ROLE_CHANGED'
        | 'USER_DEACTIVATED'
        | 'PLANT_CREATED'
        | 'PLANT_UPDATED'
        | 'PLANT_DEACTIVATED'
        | 'PLANT_ACCESS_GRANTED'
        | 'PLANT_MEMBER_ROLE_CHANGED'
        | 'PLANT_MEMBER_DEACTIVATED'
        | 'ZONE_CREATED'
        | 'ZONE_UPDATED'
        | 'ZONE_DEACTIVATED'
        | 'EQUIPMENT_CREATED'
        | 'EQUIPMENT_UPDATED'
        | 'EQUIPMENT_DEACTIVATED'
        | 'IMAGE_UPLOADED'
        | 'ANALYSIS_REQUESTED'
        | 'RESULT_REVIEW_STATUS_CHANGED'
        | 'RESULT_ACTION_CANDIDATE_CHANGED'
        | 'SYSTEM_ERROR',
      from: toOffsetDateTime(logFromInput) ?? undefined,
      to: toOffsetDateTime(logToInput) ?? undefined,
      keyword: logKeywordInput.trim() || undefined,
      page: logPage - 1,
      size: LOG_PAGE_SIZE,
      sort: 'createdAt,DESC',
    }),
    [logCategoryFilter, logFromInput, logKeywordInput, logPage, logToInput, logTypeFilter],
  )

  const dashboardQuery = useDashboardSummary({})
  const pendingUsersQuery = usePendingAdminUsers(pendingParams)
  const usersQuery = useAdminUsers(userParams)
  const selectedUserQuery = useAdminUser(selectedUserId)
  const operationLogsQuery = useOperationLogs(logParams)

  const approveUserMutation = useApproveAdminUser(approveTarget?.userId ?? 0)
  const changeRoleMutation = useChangeAdminUserRole(selectedUserId ?? 0)
  const deactivateUserMutation = useDeactivateAdminUser(deactivateTarget?.userId ?? 0)

  useEffect(() => {
    if (selectedUserQuery.data?.data.role) {
      setRoleDraft(selectedUserQuery.data.data.role)
    }
  }, [selectedUserQuery.data?.data.role])

  const selectedUser = selectedUserQuery.data?.data ?? null
  const summary = dashboardQuery.data?.data.summary
  const pendingCount = pendingUsersQuery.data?.data.totalElements ?? 0
  const totalUserCount = usersQuery.data?.data.totalElements ?? 0
  const logCount = operationLogsQuery.data?.data.totalElements ?? 0
  const attentionCount = (summary?.failedJobCount ?? 0) + (summary?.pendingReviewCount ?? 0)
  const trackingAttentionCount = (summary?.worsenedCount ?? 0) + (summary?.repeatedAnomalyCount ?? 0)

  const handleApprove = async () => {
    if (!approveTarget) {
      return
    }

    try {
      const response = await approveUserMutation.mutateAsync()
      toast.push(response.message || '사용자 승인을 완료했습니다.')
      setApproveTarget(null)
      setSelectedUserId(approveTarget.userId)
      setActiveTab('users')
    } catch (error) {
      toast.push(getApiErrorMessage(error, '사용자 승인에 실패했습니다.'))
    }
  }

  const handleRoleChange = async () => {
    if (!selectedUserId) {
      return
    }

    try {
      const response = await changeRoleMutation.mutateAsync({ role: roleDraft })
      toast.push(response.message || '사용자 권한을 변경했습니다.')
    } catch (error) {
      toast.push(getApiErrorMessage(error, '사용자 권한 변경에 실패했습니다.'))
    }
  }

  const handleDeactivate = async () => {
    if (!deactivateTarget) {
      return
    }

    try {
      const response = await deactivateUserMutation.mutateAsync()
      toast.push(response.message || '사용자를 비활성화했습니다.')
      setDeactivateTarget(null)
      setSelectedUserId(deactivateTarget.userId)
    } catch (error) {
      toast.push(getApiErrorMessage(error, '사용자 비활성화에 실패했습니다.'))
    }
  }

  const handleUserSearchReset = () => {
    setKeywordInput('')
    setRoleFilter('')
    setStatusFilter('')
    setUserPage(1)
  }

  const handleLogSearchReset = () => {
    setLogKeywordInput('')
    setLogCategoryFilter('')
    setLogTypeFilter('')
    setLogFromInput('')
    setLogToInput('')
    setLogPage(1)
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="관리자"
        description="사용자 승인, 권한 관리, 운영 로그를 확인합니다."
        actions={
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => {
              void dashboardQuery.refetch()
              void pendingUsersQuery.refetch()
              void usersQuery.refetch()
              if (selectedUserId) {
                void selectedUserQuery.refetch()
              }
              void operationLogsQuery.refetch()
            }}
          >
            새로고침
          </button>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="승인 대기"
          value={`${formatCount(pendingCount)}건`}
          tone={pendingCount > 0 ? 'warning' : 'default'}
        />
        <KpiCard label="전체 사용자" value={`${formatCount(totalUserCount)}명`} />
        <KpiCard label="운영 로그" value={`${formatCount(logCount)}건`} />
        <KpiCard
          label="확인 필요"
          value={`${formatCount(attentionCount)}건`}
          tone={attentionCount > 0 ? 'danger' : 'default'}
        />
      </section>

      <section className="panel space-y-5">
        <div>
          <h2 className="panel-title">관리 업무</h2>
          <p className="panel-description">
            승인 대기, 사용자 관리, 운영 로그, 시스템 상태를 목적별 탭으로 나눠 확인하세요.
          </p>
        </div>
        <div className="tab-strip">
          {ADMIN_TABS.map((tab) => (
            <TabButton
              key={tab.id}
              active={activeTab === tab.id}
              label={tab.label}
              count={tab.id === 'pending' ? pendingCount : tab.id === 'users' ? totalUserCount : tab.id === 'logs' ? logCount : undefined}
              onClick={() => setActiveTab(tab.id)}
            />
          ))}
        </div>
      </section>

      {activeTab === 'pending' ? (
        <section className="panel space-y-5">
          <div>
            <h2 className="panel-title">승인 대기</h2>
            <p className="panel-description">새로 가입한 사용자의 접근 권한을 확인하세요.</p>
          </div>

          {pendingUsersQuery.isLoading && !pendingUsersQuery.data ? (
            <LoadingState message="승인 대기 사용자를 불러오는 중입니다." />
          ) : null}

          {pendingUsersQuery.isError ? (
            <ErrorState
              title="승인 대기 사용자를 불러오지 못했습니다."
              description={getApiErrorMessage(pendingUsersQuery.error)}
            />
          ) : null}

          {pendingUsersQuery.data ? (
            <>
              <DataTable
                columns={[
                  {
                    key: 'user',
                    header: '이름',
                    render: (row) => (
                      <div className="stack-sm">
                        <strong className="text-slate-900">{row.name}</strong>
                        <span className="text-xs text-slate-500">{row.email}</span>
                      </div>
                    ),
                  },
                  {
                    key: 'role',
                    header: '권한',
                    render: (row) => (
                      <StatusBadge label={getUserRoleLabel(row.role)} tone={getUserRoleTone(row.role)} />
                    ),
                  },
                  {
                    key: 'status',
                    header: '현재 상태',
                    render: (row) => (
                      <StatusBadge
                        label={getAccountStatusLabel(row.accountStatus)}
                        tone={getAccountStatusTone(row.accountStatus)}
                      />
                    ),
                  },
                  {
                    key: 'lastLoginAt',
                    header: '최근 로그인',
                    render: (row) => formatDateTime(row.lastLoginAt),
                  },
                  {
                    key: 'actions',
                    header: '작업',
                    render: (row) => (
                      <div className="inline-actions">
                        <button
                          className="text-button"
                          type="button"
                          onClick={() => {
                            setSelectedUserId(row.userId)
                            setActiveTab('users')
                          }}
                        >
                          상세 보기
                        </button>
                        <button className="text-button" type="button" onClick={() => setApproveTarget(row)}>
                          승인
                        </button>
                      </div>
                    ),
                  },
                ]}
                rows={pendingUsersQuery.data.data.content}
                rowKey={(row) => row.userId}
                emptyTitle="승인 대기 사용자가 없습니다."
                emptyDescription="새 가입 요청이 생기면 이 영역에서 바로 확인할 수 있습니다."
              />
              <Pagination
                page={(pendingUsersQuery.data.data.page ?? 0) + 1}
                totalPages={pendingUsersQuery.data.data.totalPages}
                totalElements={pendingUsersQuery.data.data.totalElements}
                onPageChange={setPendingPage}
              />
            </>
          ) : null}
        </section>
      ) : null}

      {activeTab === 'users' ? (
        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="panel space-y-5">
            <div>
              <h2 className="panel-title">사용자 관리</h2>
              <p className="panel-description">사용자 권한과 계정 상태를 확인하고 필요한 조치를 진행하세요.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <FormField label="검색어" hint="이름 또는 이메일">
                <input
                  className="input-field"
                  value={keywordInput}
                  onChange={(event) => {
                    setKeywordInput(event.target.value)
                    setUserPage(1)
                  }}
                />
              </FormField>
              <FormField label="권한">
                <select
                  className="input-field"
                  value={roleFilter}
                  onChange={(event) => {
                    setRoleFilter(event.target.value)
                    setUserPage(1)
                  }}
                >
                  <option value="">전체</option>
                  {USER_ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {getUserRoleLabel(role)}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="계정 상태">
                <select
                  className="input-field"
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value)
                    setUserPage(1)
                  }}
                >
                  <option value="">전체</option>
                  {ACCOUNT_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {getAccountStatusLabel(status)}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            <div className="inline-actions">
              <button className="btn btn-secondary" type="button" onClick={handleUserSearchReset}>
                필터 초기화
              </button>
            </div>

            {usersQuery.isLoading && !usersQuery.data ? (
              <LoadingState message="사용자 목록을 불러오는 중입니다." />
            ) : null}

            {usersQuery.isError ? (
              <ErrorState
                title="사용자 목록을 불러오지 못했습니다."
                description={getApiErrorMessage(usersQuery.error)}
              />
            ) : null}

            {usersQuery.data ? (
              <>
                <DataTable
                  columns={[
                    {
                      key: 'user',
                      header: '이름',
                      render: (row) => (
                        <div className="stack-sm">
                          <strong className="text-slate-900">{row.name}</strong>
                          <span className="text-xs text-slate-500">{row.email}</span>
                        </div>
                      ),
                    },
                    {
                      key: 'role',
                      header: '권한',
                      render: (row) => (
                        <StatusBadge label={getUserRoleLabel(row.role)} tone={getUserRoleTone(row.role)} />
                      ),
                    },
                    {
                      key: 'status',
                      header: '계정 상태',
                      render: (row) => (
                        <StatusBadge
                          label={getAccountStatusLabel(row.accountStatus)}
                          tone={getAccountStatusTone(row.accountStatus)}
                        />
                      ),
                    },
                    {
                      key: 'lastLoginAt',
                      header: '최근 로그인',
                      render: (row) => formatDateTime(row.lastLoginAt),
                    },
                    {
                      key: 'actions',
                      header: '작업',
                      render: (row) => (
                        <div className="inline-actions">
                          <button className="text-button" type="button" onClick={() => setSelectedUserId(row.userId)}>
                            상세 보기
                          </button>
                          {row.accountStatus === 'PENDING' ? (
                            <button className="text-button" type="button" onClick={() => setApproveTarget(row)}>
                              승인
                            </button>
                          ) : null}
                        </div>
                      ),
                    },
                  ]}
                  rows={usersQuery.data.data.content}
                  rowKey={(row) => row.userId}
                  emptyTitle="조건에 맞는 사용자가 없습니다."
                  emptyDescription="검색어나 필터를 조정해 보세요."
                />
                <Pagination
                  page={(usersQuery.data.data.page ?? 0) + 1}
                  totalPages={usersQuery.data.data.totalPages}
                  totalElements={usersQuery.data.data.totalElements}
                  onPageChange={setUserPage}
                />
              </>
            ) : null}
          </section>

          <section className="panel space-y-5">
            <div>
              <h2 className="panel-title">사용자 상세</h2>
              <p className="panel-description">선택한 사용자의 상태와 권한을 확인하고 필요한 조치를 진행하세요.</p>
            </div>

            {!selectedUserId ? (
              <CompactState
                title="사용자를 선택하세요."
                description="왼쪽 목록에서 상세 보기를 누르면 이 영역에 정보가 표시됩니다."
              />
            ) : null}

            {selectedUserId && selectedUserQuery.isLoading && !selectedUserQuery.data ? (
              <LoadingState message="사용자 상세를 불러오는 중입니다." />
            ) : null}

            {selectedUserId && selectedUserQuery.isError ? (
              <ErrorState
                title="사용자 상세를 불러오지 못했습니다."
                description={getApiErrorMessage(selectedUserQuery.error)}
              />
            ) : null}

            {selectedUser ? (
              <>
                <div className="detail-grid">
                  <SummaryRow label="이름" value={selectedUser.name} />
                  <SummaryRow label="이메일" value={selectedUser.email} />
                  <SummaryRow label="권한" value={getUserRoleLabel(selectedUser.role)} />
                  <SummaryRow label="계정 상태" value={getAccountStatusLabel(selectedUser.accountStatus)} />
                  <SummaryRow label="등록 시각" value={formatDateTime(selectedUser.createdAt)} />
                  <SummaryRow label="최근 로그인" value={formatDateTime(selectedUser.lastLoginAt)} />
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-medium text-slate-700">운영 대상 권한</div>
                  <p className="mt-2 text-sm text-slate-600">{buildMembershipSummary(selectedUser)}</p>
                </div>

                <FormField label="권한 변경">
                  <select
                    className="input-field"
                    value={roleDraft}
                    onChange={(event) => setRoleDraft(event.target.value as 'USER' | 'ADMIN')}
                  >
                    {USER_ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>
                        {getUserRoleLabel(role)}
                      </option>
                    ))}
                  </select>
                </FormField>

                <div className="flex flex-wrap gap-3">
                  {selectedUser.accountStatus === 'PENDING' ? (
                    <button className="btn btn-primary" type="button" onClick={() => setApproveTarget(selectedUser)}>
                      승인
                    </button>
                  ) : null}
                  <button
                    className="btn btn-secondary"
                    type="button"
                    disabled={
                      changeRoleMutation.isPending ||
                      !selectedUserId ||
                      roleDraft === selectedUser.role
                    }
                    onClick={() => void handleRoleChange()}
                  >
                    권한 변경
                  </button>
                  <button
                    className="btn btn-secondary"
                    type="button"
                    disabled={
                      selectedUser.accountStatus === 'INACTIVE' ||
                      selectedUser.userId === currentUserId
                    }
                    onClick={() =>
                      setDeactivateTarget({
                        userId: selectedUser.userId,
                        email: selectedUser.email,
                        name: selectedUser.name,
                        role: selectedUser.role,
                        accountStatus: selectedUser.accountStatus,
                        lastLoginAt: selectedUser.lastLoginAt,
                      })
                    }
                  >
                    비활성화
                  </button>
                </div>
              </>
            ) : null}
          </section>
        </section>
      ) : null}

      {activeTab === 'logs' ? (
        <section className="panel space-y-5">
          <div>
            <h2 className="panel-title">운영 로그</h2>
            <p className="panel-description">사용자 활동과 주요 작업 이력을 확인합니다.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <FormField label="작업 분류">
              <select
                className="input-field"
                value={logCategoryFilter}
                onChange={(event) => {
                  setLogCategoryFilter(event.target.value)
                  setLogPage(1)
                }}
              >
                <option value="">전체</option>
                {OPERATION_EVENT_CATEGORY_OPTIONS.map((category) => (
                  <option key={category} value={category}>
                    {getOperationEventCategoryLabel(category)}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="작업 유형">
              <select
                className="input-field"
                value={logTypeFilter}
                onChange={(event) => {
                  setLogTypeFilter(event.target.value)
                  setLogPage(1)
                }}
              >
                <option value="">전체</option>
                {OPERATION_EVENT_TYPE_OPTIONS.map((type) => (
                  <option key={type} value={type}>
                    {getOperationEventTypeLabel(type)}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="시작 시각">
              <input
                className="input-field"
                type="datetime-local"
                value={logFromInput}
                onChange={(event) => {
                  setLogFromInput(event.target.value)
                  setLogPage(1)
                }}
              />
            </FormField>
            <FormField label="종료 시각">
              <input
                className="input-field"
                type="datetime-local"
                value={logToInput}
                onChange={(event) => {
                  setLogToInput(event.target.value)
                  setLogPage(1)
                }}
              />
            </FormField>
            <FormField label="검색어" hint="이메일 또는 작업 관련 키워드">
              <input
                className="input-field"
                value={logKeywordInput}
                onChange={(event) => {
                  setLogKeywordInput(event.target.value)
                  setLogPage(1)
                }}
              />
            </FormField>
          </div>

          <div className="inline-actions">
            <button className="btn btn-secondary" type="button" onClick={handleLogSearchReset}>
              필터 초기화
            </button>
          </div>

          {operationLogsQuery.isLoading && !operationLogsQuery.data ? (
            <LoadingState message="운영 로그를 불러오는 중입니다." />
          ) : null}

          {operationLogsQuery.isError ? (
            <ErrorState
              title="운영 로그를 불러오지 못했습니다."
              description={getApiErrorMessage(operationLogsQuery.error)}
            />
          ) : null}

          {operationLogsQuery.data ? (
            <>
              <DataTable
                columns={[
                  {
                    key: 'createdAt',
                    header: '발생 시각',
                    render: (row) => formatDateTime(row.createdAt),
                  },
                  {
                    key: 'actor',
                    header: '사용자',
                    render: (row) => (
                      <div className="stack-sm">
                        <span>{row.actorEmail ?? '시스템'}</span>
                        <span className="text-xs text-slate-500">{getActorRoleLabel(row.actorRole)}</span>
                      </div>
                    ),
                  },
                  {
                    key: 'type',
                    header: '작업 유형',
                    render: (row) => (
                      <div className="stack-sm">
                        <span>{getOperationEventTypeLabel(row.eventType)}</span>
                        <span className="text-xs text-slate-500">{getOperationEventCategoryLabel(row.eventCategory)}</span>
                      </div>
                    ),
                  },
                  {
                    key: 'target',
                    header: '대상',
                    render: (row) => buildOperationTargetLabel(row),
                  },
                  {
                    key: 'result',
                    header: '결과',
                    render: (row) => <StatusBadge label={getLogResultLabel(row)} tone={getLogResultTone(row)} />,
                  },
                  {
                    key: 'message',
                    header: '메시지',
                    render: (row) => buildOperationMessage(row),
                  },
                ]}
                rows={operationLogsQuery.data.data.content}
                rowKey={(row) => row.operationLogId}
                emptyTitle="아직 운영 로그가 없습니다."
                emptyDescription="주요 작업 이력이 쌓이면 이 영역에서 확인할 수 있습니다."
              />
              <Pagination
                page={(operationLogsQuery.data.data.page ?? 0) + 1}
                totalPages={operationLogsQuery.data.data.totalPages}
                totalElements={operationLogsQuery.data.data.totalElements}
                onPageChange={setLogPage}
              />
            </>
          ) : null}
        </section>
      ) : null}

      {activeTab === 'status' ? (
        <section className="space-y-6">
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="분석 실패"
              value={`${formatCount(summary?.failedJobCount ?? 0)}건`}
              tone={(summary?.failedJobCount ?? 0) > 0 ? 'danger' : 'default'}
            />
            <KpiCard
              label="검토 대기"
              value={`${formatCount(summary?.pendingReviewCount ?? 0)}건`}
              tone={(summary?.pendingReviewCount ?? 0) > 0 ? 'warning' : 'default'}
            />
            <KpiCard
              label="진행 중 분석"
              value={`${formatCount((summary?.queuedJobCount ?? 0) + (summary?.runningJobCount ?? 0))}건`}
            />
            <KpiCard
              label="추적 필요"
              value={`${formatCount(trackingAttentionCount)}건`}
              tone={trackingAttentionCount > 0 ? 'warning' : 'default'}
            />
          </section>

          <section className="panel space-y-5">
            <div>
              <h2 className="panel-title">시스템 상태</h2>
              <p className="panel-description">현재 운영 중 확인이 필요한 항목을 요약했습니다.</p>
            </div>

            {dashboardQuery.isLoading && !dashboardQuery.data ? (
              <LoadingState message="시스템 상태를 불러오는 중입니다." />
            ) : null}

            {dashboardQuery.isError ? (
              <ErrorState
                title="시스템 상태를 불러오지 못했습니다."
                description={getApiErrorMessage(dashboardQuery.error)}
              />
            ) : null}

            {dashboardQuery.data ? (
              attentionCount === 0 && trackingAttentionCount === 0 ? (
                <CompactState
                  title="현재 확인이 필요한 시스템 알림이 없습니다."
                  description="분석 실패, 검토 대기, 변화 추적 주의 항목이 생기면 이곳에서 먼저 확인할 수 있습니다."
                />
              ) : (
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-left">
                      <th className="py-2 pr-4 font-semibold text-slate-600">항목</th>
                      <th className="py-2 pr-4 font-semibold text-slate-600">건수</th>
                      <th className="py-2 font-semibold text-slate-600">설명</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(summary?.failedJobCount ?? 0) > 0 ? (
                      <tr className="border-b border-slate-100">
                        <td className="py-2 pr-4 font-medium text-rose-600">분석 실패</td>
                        <td className="py-2 pr-4 font-semibold text-rose-600">{formatCount(summary?.failedJobCount ?? 0)}건</td>
                        <td className="py-2 text-slate-600">실패한 분석 작업이 남아 있으면 원인 확인이 필요합니다.</td>
                      </tr>
                    ) : null}
                    {(summary?.pendingReviewCount ?? 0) > 0 ? (
                      <tr className="border-b border-slate-100">
                        <td className="py-2 pr-4 font-medium text-amber-600">검토 대기</td>
                        <td className="py-2 pr-4 font-semibold text-amber-600">{formatCount(summary?.pendingReviewCount ?? 0)}건</td>
                        <td className="py-2 text-slate-600">분석 결과 검토가 남아 있는 항목입니다.</td>
                      </tr>
                    ) : null}
                    {(summary?.highPriorityCount ?? 0) > 0 ? (
                      <tr className="border-b border-slate-100">
                        <td className="py-2 pr-4 font-medium text-amber-600">높은 우선순위</td>
                        <td className="py-2 pr-4 font-semibold text-amber-600">{formatCount(summary?.highPriorityCount ?? 0)}건</td>
                        <td className="py-2 text-slate-600">우선 확인이 필요한 결과 수입니다.</td>
                      </tr>
                    ) : null}
                    {trackingAttentionCount > 0 ? (
                      <tr className="border-b border-slate-100">
                        <td className="py-2 pr-4 font-medium text-amber-600">변화 추적 주의</td>
                        <td className="py-2 pr-4 font-semibold text-amber-600">{formatCount(trackingAttentionCount)}건</td>
                        <td className="py-2 text-slate-600">악화 또는 반복 이상으로 분류된 대상입니다.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              )
            ) : null}
          </section>
        </section>
      ) : null}

      <ConfirmModal
        isOpen={Boolean(approveTarget)}
        title="사용자 승인"
        description={
          approveTarget
            ? `${approveTarget.name} 사용자를 승인하시겠습니까?`
            : '선택한 사용자를 승인합니다.'
        }
        confirmText="승인"
        cancelText="취소"
        isConfirming={approveUserMutation.isPending}
        onCancel={() => setApproveTarget(null)}
        onConfirm={() => void handleApprove()}
      />

      <ConfirmModal
        isOpen={Boolean(deactivateTarget)}
        title="사용자 비활성화"
        description={
          deactivateTarget
            ? `${deactivateTarget.name} 사용자를 비활성화하시겠습니까?`
            : '선택한 사용자를 비활성화합니다.'
        }
        confirmText="비활성화"
        cancelText="취소"
        isConfirming={deactivateUserMutation.isPending}
        onCancel={() => setDeactivateTarget(null)}
        onConfirm={() => void handleDeactivate()}
      />
    </section>
  )
}
