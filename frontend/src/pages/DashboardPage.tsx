import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../features/auth/hooks/useAuth'
import { useDashboardSummary } from '../features/dashboard/hooks/useDashboard'
import type { DashboardQueryParams, DashboardSummary } from '../features/dashboard/types'
import { InspectionCreateWizard } from '../features/inspections/components/InspectionCreateWizard'
import { useInspections } from '../features/inspections/hooks/useInspections'
import { getInspectionStatusLabel, type InspectionSummary } from '../features/inspections/types'
import { usePlants } from '../features/plants/hooks/usePlants'
import { useResults } from '../features/results/hooks/useResults'
import { getPriorityLevelLabel, getReviewStatusLabel, getSeverityLevelLabel } from '../features/results/types'
import { useZonesByPlantId } from '../features/zones/hooks/useZones'
import { FormField } from '../shared/components/form/FormField'
import { PageHeader } from '../shared/components/layout/PageHeader'
import { EmptyState } from '../shared/components/state/EmptyState'
import { ErrorState } from '../shared/components/state/ErrorState'
import { LoadingState } from '../shared/components/state/LoadingState'
import { StatusBadge } from '../shared/components/state/StatusBadge'
import { formatDateTime, getApiErrorMessage, parsePositiveNumber } from '../shared/utils'

type TaskRow = {
  label: string
  count: number
  description: string
  href: string
  actionLabel: string
  tone: 'default' | 'success' | 'warning' | 'danger'
}

export function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const role = useAuth((state) => state.user?.role)
  const [plantIdInput, setPlantIdInput] = useState(searchParams.get('plantId') ?? '')
  const [zoneIdInput, setZoneIdInput] = useState(searchParams.get('zoneId') ?? '')
  const [isCreateWizardOpen, setIsCreateWizardOpen] = useState(false)

  useEffect(() => {
    setPlantIdInput(searchParams.get('plantId') ?? '')
    setZoneIdInput(searchParams.get('zoneId') ?? '')
  }, [searchParams])

  const selectedPlantIdForFilter = parsePositiveNumber(plantIdInput) ?? 0
  const params = useMemo<DashboardQueryParams>(
    () => ({
      plantId: parsePositiveNumber(searchParams.get('plantId') ?? undefined) ?? undefined,
      zoneId: parsePositiveNumber(searchParams.get('zoneId') ?? undefined) ?? undefined,
    }),
    [searchParams],
  )
  const hasScopedFilter = Boolean(params.plantId || params.zoneId)
  const canQuery = role === 'ADMIN' || hasScopedFilter

  const plantsQuery = usePlants({ page: 0, size: 100, status: 'ACTIVE' })
  const zonesQuery = useZonesByPlantId(selectedPlantIdForFilter)
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
  const plants = plantsQuery.data?.data.content ?? []
  const zones = zonesQuery.data?.data ?? []
  const recentInspections = inspectionsQuery.data?.data.content ?? []
  const recentResults = resultsQuery.data?.data.content ?? []
  const taskRows = buildTaskRows(summary)
  const activeTaskRows = taskRows.filter((task) => task.count > 0)
  const highlightedTask = activeTaskRows[0] ?? null
  const selectedPlantName = plants.find((plant) => plant.plantId === params.plantId)?.name ?? null
  const selectedZoneName = zones.find((zone) => zone.zoneId === params.zoneId)?.name ?? null

  const handleApplyScope = () => {
    const next = new URLSearchParams()
    if (plantIdInput.trim()) next.set('plantId', plantIdInput.trim())
    if (zoneIdInput.trim()) next.set('zoneId', zoneIdInput.trim())
    setSearchParams(next)
  }

  const handleResetScope = () => {
    setPlantIdInput('')
    setZoneIdInput('')
    setSearchParams({})
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="홈"
        description="오늘 처리할 점검과 확인이 필요한 결과를 먼저 보여줍니다."
        actions={
          <button className="btn btn-primary" type="button" onClick={() => setIsCreateWizardOpen(true)}>
            새 점검 시작
          </button>
        }
      />

      <section className="panel stack-md page-hero">
        <div className="eyebrow">운영 시작</div>
        <h2 className="mt-3 text-2xl font-semibold text-slate-950">
          {highlightedTask
            ? `${highlightedTask.label} ${highlightedTask.count}건을 먼저 확인하세요.`
            : '새 점검을 시작하고 최근 결과를 확인하세요.'}
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          오늘 필요한 작업과 최근 상태를 먼저 확인하세요.
        </p>
        <div className="mt-4 page-actions">
          <button className="btn btn-primary" type="button" onClick={() => setIsCreateWizardOpen(true)}>
            새 점검 시작
          </button>
          <Link className="text-button" to="/results">
            결과 보기
          </Link>
        </div>
      </section>

      <details className="panel" open={!canQuery}>
        <summary className="cursor-pointer list-none">
          <div className="toolbar gap-3">
            <div>
              <h2 className="panel-title">조회 범위</h2>
              <p className="panel-description">
                {canQuery
                  ? [selectedPlantName, selectedZoneName].filter(Boolean).join(' · ') || '전체 범위'
                  : '발전소나 구역을 선택하면 점검과 결과를 확인할 수 있습니다.'}
              </p>
            </div>
            <StatusBadge
              label={canQuery ? '조회 가능' : '범위 선택 필요'}
              tone={canQuery ? 'success' : 'warning'}
            />
          </div>
        </summary>
        <div className="mt-5 stack-md">
          <div className="filter-grid">
            <FormField label="발전소">
              <select
                className="input-field"
                value={plantIdInput}
                onChange={(event) => {
                  setPlantIdInput(event.target.value)
                  setZoneIdInput('')
                }}
              >
                <option value="">전체</option>
                {plants.map((plant) => (
                  <option key={plant.plantId} value={plant.plantId}>
                    {plant.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="구역">
              <select
                className="input-field"
                disabled={!plantIdInput}
                value={zoneIdInput}
                onChange={(event) => setZoneIdInput(event.target.value)}
              >
                <option value="">{plantIdInput ? '전체' : '발전소를 먼저 선택하세요.'}</option>
                {zones.map((zone) => (
                  <option key={zone.zoneId} value={zone.zoneId}>
                    {zone.name}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          <div className="inline-actions">
            <button className="btn btn-primary" type="button" onClick={handleApplyScope}>
              적용
            </button>
            <button className="btn btn-secondary" type="button" onClick={handleResetScope}>
              초기화
            </button>
          </div>
        </div>
      </details>

      {!canQuery ? (
        <EmptyState
          title="표시할 범위가 없습니다."
          description="자산을 선택하거나 새 점검을 시작하면 이곳에 최근 상태가 표시됩니다."
          action={
            <div className="page-actions">
              <button className="btn btn-primary" type="button" onClick={() => setIsCreateWizardOpen(true)}>
                새 점검 시작
              </button>
              <Link className="text-button" to="/assets">
                자산 보기
              </Link>
            </div>
          }
        />
      ) : null}

      {canQuery && (summaryQuery.isLoading || inspectionsQuery.isLoading || resultsQuery.isLoading) && !summary ? (
        <LoadingState message="홈 화면을 불러오는 중입니다." />
      ) : null}
      {canQuery && summaryQuery.isError ? (
        <ErrorState title="홈 화면을 불러오지 못했습니다." description={getApiErrorMessage(summaryQuery.error)} />
      ) : null}

      {canQuery && summary ? (
        <section className="workspace-grid home-workspace-grid">
          <div className="stack-md">
            <section className="panel stack-md">
              <div className="section-header">
                <div>
                  <h2 className="panel-title">오늘 확인할 일</h2>
                  <p className="panel-description">우선 확인할 항목만 표시합니다.</p>
                </div>
              </div>
              {activeTaskRows.length > 0 ? (
                <div className="task-queue-list">
                  {activeTaskRows.map((task) => (
                    <article key={task.label} className="task-queue-card task-queue-item">
                      <div>
                        <div className="status-meta-row">
                          <span className="text-sm font-semibold text-slate-900">{task.label}</span>
                          <StatusBadge label={`${task.count}건`} tone={task.tone} />
                        </div>
                        <p className="mt-2 text-sm text-slate-600">{task.description}</p>
                      </div>
                      <Link className="btn btn-secondary" to={task.href}>
                        {task.actionLabel}
                      </Link>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="현재 처리할 항목이 없습니다."
                  description="새 점검을 시작하거나 최근 결과를 확인하세요."
                  action={
                    <div className="page-actions">
                      <button className="btn btn-primary" type="button" onClick={() => setIsCreateWizardOpen(true)}>
                        새 점검 시작
                      </button>
                      <Link className="text-button" to="/results">
                        결과 보기
                      </Link>
                    </div>
                  }
                />
              )}
            </section>

            <section className="panel stack-md">
              <div className="section-header">
                <div>
                  <h2 className="panel-title">최근 점검</h2>
                  <p className="panel-description">이어갈 점검을 바로 열 수 있습니다.</p>
                </div>
                <Link className="text-button" to="/inspections">
                  전체 점검
                </Link>
              </div>
              {recentInspections.length > 0 ? (
                <div className="workspace-list">
                  {recentInspections.map((inspection) => (
                    <InspectionRow key={inspection.inspectionId} inspection={inspection} />
                  ))}
                </div>
              ) : (
                <div className="compact-empty">
                  <div className="text-base font-semibold text-slate-900">진행 중인 점검이 없습니다.</div>
                  <p className="mt-2 text-sm text-slate-600">
                    새 점검을 시작하면 이곳에 최근 점검이 표시됩니다.
                  </p>
                </div>
              )}
            </section>
          </div>

          <div className="stack-md">
            <section className="panel stack-md">
              <div className="section-header">
                <div>
                  <h2 className="panel-title">최근 결과</h2>
                  <p className="panel-description">최근 분석 결과와 검토 대기 상태를 확인합니다.</p>
                </div>
                <Link className="text-button" to="/results">
                  결과 보기
                </Link>
              </div>
              {recentResults.length > 0 ? (
                <div className="workspace-list">
                  {recentResults.map((result) => (
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
                        <h3 className="mt-3 text-base font-semibold text-slate-950">
                          결과 #{result.resultId}
                        </h3>
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
                <div className="compact-empty">
                  <div className="text-base font-semibold text-slate-900">최근 결과가 없습니다.</div>
                  <p className="mt-2 text-sm text-slate-600">
                    점검 상세에서 이미지를 업로드하고 분석을 요청하세요.
                  </p>
                </div>
              )}
            </section>

            <section className="panel stack-md">
              <div className="section-header">
                <div>
                  <h2 className="panel-title">자산 요약</h2>
                  <p className="panel-description">발전소와 구역 현황만 간단히 보여줍니다.</p>
                </div>
                <Link className="text-button" to="/assets">
                  자산 보기
                </Link>
              </div>
              <div className="asset-summary-grid">
                <SummaryItem label="발전소" value={`${summary.totalPlantCount}개`} />
                <SummaryItem label="구역" value={`${summary.totalZoneCount}개`} />
                <SummaryItem label="점검" value={`${summary.totalInspectionCount}건`} />
                <SummaryItem label="결과" value={`${summary.totalAnalysisResultCount}건`} />
              </div>
            </section>
          </div>
        </section>
      ) : null}

      <InspectionCreateWizard isOpen={isCreateWizardOpen} onClose={() => setIsCreateWizardOpen(false)} />
    </section>
  )
}

function buildTaskRows(summary: DashboardSummary | null): TaskRow[] {
  if (!summary) {
    return []
  }

  return [
    {
      label: '검토 대기 결과',
      count: summary.pendingReviewCount,
      description: '결과 화면에서 먼저 확인할 결과입니다.',
      href: '/results?tab=review',
      actionLabel: '결과 보기',
      tone: 'warning',
    },
    {
      label: '분석 실패',
      count: summary.failedJobCount,
      description: '재확인이나 재요청이 필요한 항목입니다.',
      href: '/inspections?view=failed',
      actionLabel: '점검 보기',
      tone: 'danger',
    },
    {
      label: '높은 우선순위',
      count: summary.highPriorityCount,
      description: '우선 확인이 필요한 결과입니다.',
      href: '/results?tab=priority',
      actionLabel: '우선 결과',
      tone: 'danger',
    },
    {
      label: '진행 중 점검',
      count: summary.inProgressInspectionCount,
      description: '이미지 업로드나 분석 요청을 이어갈 수 있습니다.',
      href: '/inspections?view=in-progress',
      actionLabel: '이어가기',
      tone: 'success',
    },
  ]
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
