import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../features/auth/hooks/useAuth'
import { useDashboardSummary } from '../features/dashboard/hooks/useDashboard'
import type { DashboardQueryParams } from '../features/dashboard/types'
import { InspectionCreateWizard } from '../features/inspections/components/InspectionCreateWizard'
import { useInspections } from '../features/inspections/hooks/useInspections'
import { getInspectionStatusLabel, type InspectionSummary } from '../features/inspections/types'
import { useResults } from '../features/results/hooks/useResults'
import { getPriorityLevelLabel, getReviewStatusLabel, getSeverityLevelLabel } from '../features/results/types'
import { PageHeader } from '../shared/components/layout/PageHeader'
import { EmptyState } from '../shared/components/state/EmptyState'
import { ErrorState } from '../shared/components/state/ErrorState'
import { LoadingState } from '../shared/components/state/LoadingState'
import { StatusBadge } from '../shared/components/state/StatusBadge'
import { formatDateTime, getApiErrorMessage, parsePositiveNumber } from '../shared/utils'

export function DashboardPage() {
  const [searchParams] = useSearchParams()
  const role = useAuth((state) => state.user?.role)
  const [isCreateWizardOpen, setIsCreateWizardOpen] = useState(false)

  const params = useMemo<DashboardQueryParams>(
    () => ({
      plantId: parsePositiveNumber(searchParams.get('plantId') ?? undefined) ?? undefined,
      zoneId: parsePositiveNumber(searchParams.get('zoneId') ?? undefined) ?? undefined,
    }),
    [searchParams],
  )
  const hasScopedFilter = Boolean(params.plantId || params.zoneId)
  const canQuery = role === 'ADMIN' || hasScopedFilter

  const summaryQuery = useDashboardSummary(params, canQuery)
  const inspectionsQuery = useInspections(
    { plantId: params.plantId, zoneId: params.zoneId, page: 0, size: 5 },
    canQuery,
  )
  const resultsQuery = useResults(
    { plantId: params.plantId, zoneId: params.zoneId, page: 0, size: 5 },
    canQuery,
  )

  const summary = summaryQuery.data?.data.summary ?? null
  const recentInspections = inspectionsQuery.data?.data.content ?? []
  const recentResults = resultsQuery.data?.data.content ?? []
  const attentionResults = recentResults.filter(
    (result) =>
      result.reviewStatus === 'UNCHECKED' ||
      result.reviewStatus === 'RECHECK_REQUIRED' ||
      result.priorityLevel === 'HIGH' ||
      result.priorityLevel === 'URGENT' ||
      result.severityLevel === 'HIGH' ||
      result.severityLevel === 'CRITICAL',
  )
  const prioritizedResults = attentionResults.length > 0 ? attentionResults : recentResults

  return (
    <section className="space-y-6">
      <PageHeader
        title="홈"
        description="오늘 확인할 점검과 결과를 한 곳에서 봅니다."
        actions={
          <div className="page-actions">
            <button className="btn btn-primary" type="button" onClick={() => setIsCreateWizardOpen(true)}>
              새 점검 시작
            </button>
            <Link className="btn btn-secondary" to="/inspections">
              점검 목록
            </Link>
            <Link className="text-button" to="/results">
              결과 보기
            </Link>
          </div>
        }
      />

      {!canQuery ? (
        <section className="panel">
          <EmptyState
            title="먼저 현장을 선택하세요."
            description="현장을 선택하면 최근 점검과 확인할 결과를 볼 수 있습니다."
            action={
              <div className="page-actions">
                <Link className="btn btn-secondary" to="/assets">
                  현장 보기
                </Link>
                <button className="btn btn-primary" type="button" onClick={() => setIsCreateWizardOpen(true)}>
                  새 점검 시작
                </button>
              </div>
            }
          />
        </section>
      ) : null}

      {canQuery && (summaryQuery.isLoading || inspectionsQuery.isLoading || resultsQuery.isLoading) && !summary ? (
        <LoadingState message="홈 화면을 불러오는 중입니다." />
      ) : null}
      {canQuery && summaryQuery.isError ? (
        <ErrorState title="홈 화면을 불러오지 못했습니다." description={getApiErrorMessage(summaryQuery.error)} />
      ) : null}

      {canQuery && summary ? (
        <>
          <section className="workspace-grid home-workspace-grid">
            <section className="panel stack-md home-primary-panel">
              <div className="section-header">
                <div>
                  <h2 className="panel-title">최근 점검</h2>
                  <p className="panel-description">가장 최근 점검을 바로 열 수 있습니다.</p>
                </div>
              </div>
              {recentInspections.length > 0 ? (
                <div className="workspace-list">
                  {recentInspections.map((inspection) => (
                    <InspectionRow key={inspection.inspectionId} inspection={inspection} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="진행 중인 점검이 없습니다."
                  description="새 점검을 시작하면 이곳에 최근 점검이 표시됩니다."
                  action={
                    <button className="btn btn-primary" type="button" onClick={() => setIsCreateWizardOpen(true)}>
                      새 점검 시작
                    </button>
                  }
                />
              )}
            </section>

            <section className="panel stack-md home-secondary-panel">
              <div className="section-header">
                <div>
                  <h2 className="panel-title">확인 필요한 결과</h2>
                  <p className="panel-description">검토 대기, 실패, 높은 우선순위 결과를 먼저 보여줍니다.</p>
                </div>
              </div>
              {prioritizedResults.length > 0 ? (
                <div className="workspace-list">
                  {prioritizedResults.map((result) => (
                    <article key={result.resultId} className="workspace-row">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge label={getReviewStatusLabel(result.reviewStatus)} tone="default" />
                          <StatusBadge
                            label={getSeverityLevelLabel(result.severityLevel)}
                            tone={
                              result.severityLevel === 'HIGH' || result.severityLevel === 'CRITICAL'
                                ? 'danger'
                                : 'default'
                            }
                          />
                        </div>
                        <h3 className="mt-3 text-base font-semibold text-slate-950">결과 #{result.resultId}</h3>
                        <p className="mt-1 text-sm text-slate-600">
                          분석 시각 {formatDateTime(result.analyzedAt)} · 우선순위 {getPriorityLevelLabel(result.priorityLevel)}
                        </p>
                      </div>
                      <Link className="text-button" to={`/results/${result.resultId}`}>
                        보기
                      </Link>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="확인할 결과가 없습니다."
                  description="분석 결과가 생성되면 이곳에서 바로 확인할 수 있습니다."
                  action={
                    <Link className="btn btn-secondary" to="/results">
                      결과 보기
                    </Link>
                  }
                />
              )}
            </section>
          </section>

          <section className="panel stack-md home-summary-panel">
            <div className="section-header">
              <div>
                <h2 className="panel-title">현장 요약</h2>
                <p className="panel-description">발전소와 구역 수만 간단히 보여줍니다.</p>
              </div>
              <Link className="text-button" to="/assets">
                현장 보기
              </Link>
            </div>
            <div className="asset-summary-grid home-summary-grid">
              <SummaryItem label="발전소" value={`${summary.totalPlantCount}개`} />
              <SummaryItem label="구역" value={`${summary.totalZoneCount}개`} />
            </div>
          </section>
        </>
      ) : null}

      <InspectionCreateWizard isOpen={isCreateWizardOpen} onClose={() => setIsCreateWizardOpen(false)} />
    </section>
  )
}

function InspectionRow({ inspection }: { inspection: InspectionSummary }) {
  return (
    <article className="workspace-row">
      <div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge
            label={getInspectionStatusLabel(inspection.inspectionStatus)}
            tone={
              inspection.inspectionStatus === 'FAILED'
                ? 'danger'
                : inspection.inspectionStatus === 'COMPLETED'
                  ? 'success'
                  : 'warning'
            }
          />
        </div>
        <h3 className="mt-3 text-base font-semibold text-slate-950">{inspection.name}</h3>
        <p className="mt-1 text-sm text-slate-600">
          촬영 시각 {formatDateTime(inspection.capturedAt)} · 등록 {formatDateTime(inspection.createdAt)}
        </p>
      </div>
      <Link className="text-button" to={`/inspections/${inspection.inspectionId}`}>
        보기
      </Link>
    </article>
  )
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="asset-summary-item">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value}</span>
    </div>
  )
}
