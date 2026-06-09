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
  type AdminUserSummary,
  type OperationLogSummary,
} from '../features/admin/types'
import { useAuth } from '../features/auth/hooks/useAuth'
import { ConfirmModal } from '../shared/components/feedback/ConfirmModal'
import { FormField } from '../shared/components/form/FormField'
import { PageHeader } from '../shared/components/layout/PageHeader'
import { EmptyState } from '../shared/components/state/EmptyState'
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
  parsePositiveNumber,
  toOffsetDateTime,
} from '../shared/utils'

const PENDING_PAGE_SIZE = 5
const USER_PAGE_SIZE = 10
const LOG_PAGE_SIZE = 10

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
    <article className={`kpi-card ${tone === 'warning' ? 'kpi-card-warning' : ''} ${tone === 'danger' ? 'kpi-card-danger' : ''}`}>
      <span className="text-sm text-slate-500">{label}</span>
      <strong className="mt-3 block text-3xl font-semibold text-slate-950">{value}</strong>
    </article>
  )
}

function buildDetailSummary(log: OperationLogSummary) {
  const items = [
    log.targetTable ? `table=${log.targetTable}` : null,
    log.targetId != null ? `targetId=${log.targetId}` : null,
    log.actorUserId != null ? `actor=${log.actorUserId}` : null,
  ]

  return items.filter(Boolean).join(' · ') || '-'
}

export function AdminPage() {
  const toast = useToast()
  const currentUserId = useAuth((state) => state.user?.userId ?? null)

  const [pendingPage, setPendingPage] = useState(1)
  const [userPage, setUserPage] = useState(1)
  const [logPage, setLogPage] = useState(1)

  const [keywordInput, setKeywordInput] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [logKeywordInput, setLogKeywordInput] = useState('')
  const [actorUserIdInput, setActorUserIdInput] = useState('')
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
      actorUserId: parsePositiveNumber(actorUserIdInput) ?? undefined,
      eventCategory:
        (logCategoryFilter || undefined) as
          | 'AUTH'
          | 'IMAGE'
          | 'PAIR'
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
    [
      actorUserIdInput,
      logCategoryFilter,
      logFromInput,
      logKeywordInput,
      logPage,
      logToInput,
      logTypeFilter,
    ],
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

  const handleApprove = async () => {
    if (!approveTarget) {
      return
    }

    try {
      const response = await approveUserMutation.mutateAsync()
      toast.push(response.message || '사용자 승인을 완료했습니다.')
      setApproveTarget(null)
      setSelectedUserId(approveTarget.userId)
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
    setActorUserIdInput('')
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
        description="실제 backend 관리자 계약 기준으로 승인 대기 사용자, 전체 사용자, 권한 변경, 비활성화, 운영 로그 조회를 연결했습니다."
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

      <section className="kpi-grid">
        <KpiCard
          label="승인 대기 사용자"
          value={formatCount(pendingUsersQuery.data?.data.totalElements ?? 0)}
          tone="warning"
        />
        <KpiCard
          label="전체 사용자 조회 결과"
          value={formatCount(usersQuery.data?.data.totalElements ?? 0)}
        />
        <KpiCard
          label="검토 대기 결과"
          value={formatCount(dashboardQuery.data?.data.summary.pendingReviewCount ?? 0)}
          tone="warning"
        />
        <KpiCard
          label="실패 분석 작업"
          value={formatCount(dashboardQuery.data?.data.summary.failedJobCount ?? 0)}
          tone="danger"
        />
      </section>

      <section className="panel stack-md">
        <div>
          <h2 className="panel-title">관리자 개요</h2>
          <p className="panel-description">
            `GET /api/v1/dashboard` 요약 값을 관리자 화면 상단 카드에 재사용합니다.
          </p>
        </div>
        {dashboardQuery.isLoading && !dashboardQuery.data ? (
          <LoadingState message="관리자 개요를 불러오는 중입니다." />
        ) : null}
        {dashboardQuery.isError ? (
          <ErrorState
            title="관리자 개요를 불러오지 못했습니다."
            description={getApiErrorMessage(dashboardQuery.error)}
          />
        ) : null}
        {dashboardQuery.data ? (
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">발전소 수</span>
              <span className="detail-value">
                {formatCount(dashboardQuery.data.data.summary.totalPlantCount)}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">이미지 수</span>
              <span className="detail-value">
                {formatCount(dashboardQuery.data.data.summary.totalImageCount)}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">분석 작업 수</span>
              <span className="detail-value">
                {formatCount(dashboardQuery.data.data.summary.totalAnalysisJobCount)}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">분석 결과 수</span>
              <span className="detail-value">
                {formatCount(dashboardQuery.data.data.summary.totalAnalysisResultCount)}
              </span>
            </div>
          </div>
        ) : null}
      </section>

      <section className="dashboard-split">
        <section className="panel stack-md">
          <div className="toolbar">
            <div>
              <h2 className="panel-title">승인 대기 사용자</h2>
              <p className="panel-description">
                실제 backend `GET /api/v1/admin/users/pending` 목록입니다.
              </p>
            </div>
          </div>

          {pendingUsersQuery.isLoading && !pendingUsersQuery.data ? (
            <LoadingState message="승인 대기 사용자를 불러오는 중입니다." />
          ) : null}

          {pendingUsersQuery.isError ? (
            <ErrorState
              title="승인 대기 사용자 목록을 불러오지 못했습니다."
              description={getApiErrorMessage(pendingUsersQuery.error)}
            />
          ) : null}

          {pendingUsersQuery.data ? (
            <>
              <DataTable
                columns={[
                  {
                    key: 'user',
                    header: '사용자',
                    render: (row) => (
                      <div className="stack-sm">
                        <strong className="text-slate-900">{row.name}</strong>
                        <span className="text-xs text-slate-500">{row.email}</span>
                      </div>
                    ),
                  },
                  {
                    key: 'status',
                    header: '상태',
                    render: (row) => (
                      <div className="stack-sm">
                        <StatusBadge
                          label={getUserRoleLabel(row.role)}
                          tone={getUserRoleTone(row.role)}
                        />
                        <StatusBadge
                          label={getAccountStatusLabel(row.accountStatus)}
                          tone={getAccountStatusTone(row.accountStatus)}
                        />
                      </div>
                    ),
                  },
                  {
                    key: 'lastLoginAt',
                    header: '마지막 로그인',
                    render: (row) => formatDateTime(row.lastLoginAt),
                  },
                  {
                    key: 'actions',
                    header: '동작',
                    render: (row) => (
                      <div className="inline-actions">
                        <button
                          className="text-button"
                          type="button"
                          onClick={() => setSelectedUserId(row.userId)}
                        >
                          상세 보기
                        </button>
                        <button
                          className="text-button"
                          type="button"
                          onClick={() => setApproveTarget(row)}
                        >
                          승인
                        </button>
                      </div>
                    ),
                  },
                ]}
                rows={pendingUsersQuery.data.data.content}
                rowKey={(row) => row.userId}
                emptyTitle="승인 대기 사용자가 없습니다."
                emptyDescription="현재 대기 중인 계정이 없으면 이 영역은 비어 있습니다."
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

        <section className="panel stack-md">
          <div>
            <h2 className="panel-title">선택 사용자 상세</h2>
            <p className="panel-description">
              실제 backend `GET /api/v1/admin/users/{'{userId}'}` 응답을 기준으로 표시합니다.
            </p>
          </div>

          {!selectedUserId ? (
            <EmptyState
              title="사용자를 먼저 선택해 주세요."
              description="승인 대기 목록 또는 전체 사용자 목록에서 상세 보기를 누르면 이 영역이 채워집니다."
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
                <div className="detail-item">
                  <span className="detail-label">이름</span>
                  <span className="detail-value">{selectedUser.name}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">이메일</span>
                  <span className="detail-value">{selectedUser.email}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">권한</span>
                  <span className="detail-value">{getUserRoleLabel(selectedUser.role)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">계정 상태</span>
                  <span className="detail-value">
                    {getAccountStatusLabel(selectedUser.accountStatus)}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">마지막 로그인</span>
                  <span className="detail-value">
                    {formatDateTime(selectedUser.lastLoginAt)}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">생성 시각</span>
                  <span className="detail-value">
                    {formatDateTime(selectedUser.createdAt)}
                  </span>
                </div>
              </div>

              <div className="stack-md">
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
                <div className="inline-actions">
                  <button
                    className="btn btn-primary"
                    type="button"
                    disabled={
                      changeRoleMutation.isPending ||
                      !selectedUserId ||
                      roleDraft === selectedUser.role
                    }
                    onClick={() => void handleRoleChange()}
                  >
                    권한 저장
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
                    사용자 비활성화
                  </button>
                </div>
              </div>

              <div className="stack-sm rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="font-semibold text-slate-900">발전소 멤버 정보</h3>
                {selectedUser.plantMembers.length === 0 ? (
                  <p className="text-sm text-slate-600">
                    현재 backend 관리자 사용자 상세 응답은 `plantMembers`를 비워서 반환합니다.
                  </p>
                ) : (
                  <ul className="marker-list">
                    {selectedUser.plantMembers.map((member) => (
                      <li key={member.plantMemberId}>
                        {`Plant #${member.plantId} · ${getPlantMemberRoleLabel(member.memberRole)} · ${getResourceStatusLabel(member.status)}`}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : null}
        </section>
      </section>

      <section className="panel stack-md">
        <div className="toolbar">
          <div>
            <h2 className="panel-title">전체 사용자</h2>
            <p className="panel-description">
              실제 backend `GET /api/v1/admin/users` 필터와 페이지네이션을 사용합니다.
            </p>
          </div>
        </div>

        <div className="filter-grid">
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
          <LoadingState message="전체 사용자 목록을 불러오는 중입니다." />
        ) : null}

        {usersQuery.isError ? (
          <ErrorState
            title="전체 사용자 목록을 불러오지 못했습니다."
            description={getApiErrorMessage(usersQuery.error)}
          />
        ) : null}

        {usersQuery.data ? (
          <>
            <DataTable
              columns={[
                {
                  key: 'user',
                  header: '사용자',
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
                    <StatusBadge
                      label={getUserRoleLabel(row.role)}
                      tone={getUserRoleTone(row.role)}
                    />
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
                  header: '마지막 로그인',
                  render: (row) => formatDateTime(row.lastLoginAt),
                },
                {
                  key: 'actions',
                  header: '동작',
                  render: (row) => (
                    <div className="inline-actions">
                      <button
                        className="text-button"
                        type="button"
                        onClick={() => setSelectedUserId(row.userId)}
                      >
                        상세 보기
                      </button>
                      {row.accountStatus === 'PENDING' ? (
                        <button
                          className="text-button"
                          type="button"
                          onClick={() => setApproveTarget(row)}
                        >
                          승인
                        </button>
                      ) : null}
                    </div>
                  ),
                },
              ]}
              rows={usersQuery.data.data.content}
              rowKey={(row) => row.userId}
              emptyTitle="검색 조건에 맞는 사용자가 없습니다."
              emptyDescription="검색어 또는 상태 필터를 조정해 주세요."
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

      <section className="panel stack-md">
        <div>
          <h2 className="panel-title">운영 로그</h2>
          <p className="panel-description">
            실제 backend `GET /api/v1/admin/operation-logs` 필터를 그대로 사용합니다.
          </p>
        </div>

        <div className="filter-grid">
          <FormField label="행위 사용자 ID">
            <input
              className="input-field"
              value={actorUserIdInput}
              onChange={(event) => {
                setActorUserIdInput(event.target.value)
                setLogPage(1)
              }}
            />
          </FormField>
          <FormField label="이벤트 분류">
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
          <FormField label="이벤트 타입">
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
          <FormField label="키워드">
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
                  header: '시각',
                  render: (row) => formatDateTime(row.createdAt),
                },
                {
                  key: 'actor',
                  header: '행위자',
                  render: (row) => (
                    <div className="stack-sm">
                      <span>{row.actorEmail ?? '시스템'}</span>
                      <span className="text-xs text-slate-500">
                        {row.actorRole ?? '-'}
                      </span>
                    </div>
                  ),
                },
                {
                  key: 'category',
                  header: '분류',
                  render: (row) => (
                    <div className="stack-sm">
                      <StatusBadge label={getOperationEventCategoryLabel(row.eventCategory)} />
                      <span className="text-xs text-slate-500">
                        {getOperationEventTypeLabel(row.eventType)}
                      </span>
                    </div>
                  ),
                },
                {
                  key: 'message',
                  header: '메시지',
                  render: (row) => (
                    <div className="stack-sm">
                      <span>{row.message ?? '-'}</span>
                      <span className="text-xs text-slate-500">
                        {buildDetailSummary(row)}
                      </span>
                    </div>
                  ),
                },
              ]}
              rows={operationLogsQuery.data.data.content}
              rowKey={(row) => row.operationLogId}
              emptyTitle="조건에 맞는 운영 로그가 없습니다."
              emptyDescription="시간 범위 또는 이벤트 필터를 조정해 주세요."
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

      <section className="panel stack-md">
        <div>
          <h2 className="panel-title">확인 필요 API</h2>
          <p className="panel-description">
            아래 관리자 전용 목록 API는 현재 실제 backend controller에서 확인되지 않아 연결하지 않았습니다.
          </p>
        </div>
        <ul className="marker-list">
          <li>`GET /api/v1/admin/plants`</li>
          <li>`GET /api/v1/admin/images`</li>
          <li>`GET /api/v1/admin/analysis-jobs`</li>
          <li>`GET /api/v1/admin/results`</li>
        </ul>
      </section>

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
