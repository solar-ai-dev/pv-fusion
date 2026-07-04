import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../features/auth/hooks/useAuth'
import {
  useDashboardActionStats,
  useDashboardSeverityStats,
  useDashboardSummary,
  useDashboardTrends,
} from '../features/dashboard/hooks/useDashboard'
import {
  DASHBOARD_INTERVAL_OPTIONS,
  type DashboardQueryParams,
  type DashboardTrendInterval,
  type DashboardTrendPoint,
} from '../features/dashboard/types'
import { usePlants } from '../features/plants/hooks/usePlants'
import { getPriorityLevelLabel, getSeverityLevelLabel } from '../features/results/types'
import { useZonesByPlantId } from '../features/zones/hooks/useZones'
import { FormField } from '../shared/components/form/FormField'
import { PageHeader } from '../shared/components/layout/PageHeader'
import { EmptyState } from '../shared/components/state/EmptyState'
import { ErrorState } from '../shared/components/state/ErrorState'
import { LoadingState } from '../shared/components/state/LoadingState'
import { formatDateTime, getApiErrorMessage, parsePositiveNumber } from '../shared/utils'

export function DashboardOverviewPage() {
  const role = useAuth((state) => state.user?.role)
  const [searchParams, setSearchParams] = useSearchParams()

  const plantId = parsePositiveNumber(searchParams.get('plantId') ?? undefined)
  const zoneId = parsePositiveNumber(searchParams.get('zoneId') ?? undefined)
  const from = searchParams.get('from') ?? ''
  const to = searchParams.get('to') ?? ''
  const interval = toInterval(searchParams.get('interval'))

  const params = useMemo<DashboardQueryParams>(
    () => ({
      plantId: plantId ?? undefined,
      zoneId: zoneId ?? undefined,
      from: from || undefined,
      to: to || undefined,
    }),
    [from, plantId, to, zoneId],
  )
  const hasScopedFilter = Boolean(params.plantId || params.zoneId)
  const canQuery = role === 'ADMIN' || hasScopedFilter

  const plantsQuery = usePlants({ page: 0, size: 100, status: 'ACTIVE' })
  const zonesQuery = useZonesByPlantId(plantId ?? 0)
  const summaryQuery = useDashboardSummary(params, canQuery)
  const actionStatsQuery = useDashboardActionStats(params, canQuery)
  const severityStatsQuery = useDashboardSeverityStats(params, canQuery)
  const trendsQuery = useDashboardTrends({ ...params, interval }, canQuery)

  const summary = summaryQuery.data?.data.summary ?? null
  const recentResults = summaryQuery.data?.data.recentResults ?? []
  const priorityTargets = summaryQuery.data?.data.priorityTargets ?? []
  const trendPoints = trendsQuery.data?.data.points ?? []
  const trendMax = Math.max(...trendPoints.map((item) => Math.max(item.inspectionCount, item.anomalyCount)), 1)
  const actionMax = Math.max(...(actionStatsQuery.data?.data.items ?? []).map((item) => item.count), 1)
  const severityMax = Math.max(...(severityStatsQuery.data?.data.items ?? []).map((item) => item.count), 1)
  const scopeChips = [
    plantId ? `발전소 #${plantId}` : '전체 발전소',
    zoneId ? `구역 #${zoneId}` : '전체 구역',
    `${getIntervalLabel(interval)} 기준`,
  ]

  return (
    <section className="dashboard-shell">
      <section className="panel dashboard-hero-panel">
        <div className="dashboard-hero-main">
          <PageHeader
            title="대시보드"
            description="기간과 대상을 선택해 점검 및 분석 결과 추이를 확인합니다."
          />
          <div className="dashboard-chip-row">
            {scopeChips.map((chip) => (
              <span key={chip} className="dashboard-chip">
                {chip}
              </span>
            ))}
          </div>
        </div>
        <div className="dashboard-highlight-grid">
          <DashboardHighlightCard label="분석 대기" value={`${summary?.queuedJobCount ?? 0}건`} />
          <DashboardHighlightCard label="분석 중" value={`${summary?.runningJobCount ?? 0}건`} tone="warning" />
          <DashboardHighlightCard label="실패" value={`${summary?.failedJobCount ?? 0}건`} tone="danger" />
        </div>
      </section>

      <section className="panel dashboard-filter-panel">
        <div className="dashboard-filter-grid">
          <FormField label="기간">
            <select
              className="input-field"
              value={interval}
              onChange={(event) => {
                const next = new URLSearchParams(searchParams)
                next.set('interval', event.target.value)
                setSearchParams(next)
              }}
            >
              {DASHBOARD_INTERVAL_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {getIntervalLabel(option)}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="발전소">
            <select
              className="input-field"
              value={plantId ? String(plantId) : ''}
              onChange={(event) => {
                const next = new URLSearchParams(searchParams)
                if (event.target.value) next.set('plantId', event.target.value)
                else next.delete('plantId')
                next.delete('zoneId')
                setSearchParams(next)
              }}
            >
              <option value="">전체</option>
              {plantsQuery.data?.data.content.map((plant) => (
                <option key={plant.plantId} value={plant.plantId}>
                  {plant.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="구역">
            <select
              className="input-field"
              disabled={!plantId}
              value={zoneId ? String(zoneId) : ''}
              onChange={(event) => {
                const next = new URLSearchParams(searchParams)
                if (event.target.value) next.set('zoneId', event.target.value)
                else next.delete('zoneId')
                setSearchParams(next)
              }}
            >
              <option value="">{plantId ? '전체' : '발전소를 먼저 선택하세요.'}</option>
              {zonesQuery.data?.data.map((zone) => (
                <option key={zone.zoneId} value={zone.zoneId}>
                  {zone.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="시작일">
            <input
              className="input-field"
              type="date"
              value={from}
              onChange={(event) => {
                const next = new URLSearchParams(searchParams)
                if (event.target.value) next.set('from', event.target.value)
                else next.delete('from')
                setSearchParams(next)
              }}
            />
          </FormField>
          <FormField label="종료일">
            <input
              className="input-field"
              type="date"
              value={to}
              onChange={(event) => {
                const next = new URLSearchParams(searchParams)
                if (event.target.value) next.set('to', event.target.value)
                else next.delete('to')
                setSearchParams(next)
              }}
            />
          </FormField>
        </div>
      </section>

      {!canQuery ? (
        <section className="panel">
          <EmptyState
            title="먼저 발전소 또는 구역을 선택하세요."
            description="범위를 정하면 점검 추세, 이상 분포, 최근 결과 요약이 한 화면에 표시됩니다."
            action={
              <Link className="btn btn-secondary" to="/plants">
                발전소 보기
              </Link>
            }
          />
        </section>
      ) : null}

      {canQuery &&
      (summaryQuery.isLoading || actionStatsQuery.isLoading || severityStatsQuery.isLoading || trendsQuery.isLoading) &&
      !summary ? <LoadingState message="대시보드를 불러오는 중입니다." /> : null}

      {canQuery && (summaryQuery.isError || actionStatsQuery.isError || severityStatsQuery.isError || trendsQuery.isError) ? (
        <ErrorState
          title="대시보드를 불러오지 못했습니다."
          description={getApiErrorMessage(
            summaryQuery.error ??
              actionStatsQuery.error ??
              severityStatsQuery.error ??
              trendsQuery.error,
          )}
        />
      ) : null}

      {canQuery && summary ? (
        <>
          <section className="dashboard-kpi-row">
            <SummaryCard
              label="점검 건수"
              value={`전체 ${summary.totalInspectionCount}건`}
              description={`진행 중 ${summary.inProgressInspectionCount}건 · 완료 ${summary.completedInspectionCount}건`}
            />
            <SummaryCard
              label="분석 결과"
              value={`전체 ${summary.totalAnalysisResultCount}건`}
              description={`정상 ${summary.normalResultCount}건 · 이상 ${summary.anomalyResultCount}건`}
            />
            <SummaryCard
              label="이상 후보"
              value={`${summary.anomalyZoneCount}개 구역`}
              description={`고우선순위 ${summary.highPriorityCount}건 · 악화 ${summary.worsenedCount}건`}
            />
            <SummaryCard
              label="검토 대기"
              value={`${summary.pendingReviewCount}건`}
              description={`저신뢰 ${summary.lowConfidenceResultCount}건 · 반복 이상 ${summary.repeatedAnomalyCount}건`}
            />
          </section>

          <section className="dashboard-main-grid">
            <article className="panel stack-md dashboard-chart-panel">
              <div className="section-header">
                <div>
                  <h2 className="panel-title">점검 추세</h2>
                  <p className="panel-description">기간별 점검 수와 이상 발생 수를 함께 봅니다.</p>
                </div>
              </div>
              {trendPoints.length > 0 ? (
                <div className="trend-chart">
                  {trendPoints.map((point) => (
                    <TrendBarGroup key={point.trendDate} max={trendMax} point={point} />
                  ))}
                </div>
              ) : (
                <SingleEmptyMessage
                  title="선택한 조건에 표시할 추이 데이터가 없습니다."
                  description="점검과 분석 결과가 쌓이면 추세 그래프가 표시됩니다."
                />
              )}
              <div className="dashboard-trend-footer">
                <MiniInsight label="완료 점검" value={`${summary.completedInspectionCount}건`} />
                <MiniInsight label="분석 성공" value={`${summary.succeededJobCount}건`} />
                <MiniInsight label="이상 결과" value={`${summary.anomalyResultCount}건`} />
              </div>
            </article>

            <article className="panel stack-md dashboard-compact-panel">
              <div className="section-header">
                <div>
                  <h2 className="panel-title">이상 심각도 분포</h2>
                  <p className="panel-description">현재 범위에서 많이 나타나는 심각도를 확인합니다.</p>
                </div>
              </div>
              <div className="stat-stack">
                {(severityStatsQuery.data?.data.items ?? []).map((item) => (
                  <StatBar
                    key={item.severityLevel}
                    label={getSeverityLevelLabel(item.severityLevel)}
                    value={item.count}
                    max={severityMax}
                    tone="danger"
                  />
                ))}
              </div>
              <div className="dashboard-snapshot-list">
                <SnapshotRow label="분석 작업" value={`${summary.totalAnalysisJobCount}건`} />
                <SnapshotRow label="처리 대기" value={`${summary.queuedJobCount}건`} />
                <SnapshotRow label="처리 중" value={`${summary.runningJobCount}건`} />
                <SnapshotRow label="실패" value={`${summary.failedJobCount}건`} tone="danger" />
              </div>
            </article>
          </section>

          <section className="dashboard-bottom-grid">
            <article className="panel stack-md dashboard-compact-panel">
              <div className="section-header">
                <div>
                  <h2 className="panel-title">권장 조치 분포</h2>
                  <p className="panel-description">어떤 조치 후보가 많이 발생하는지 빠르게 파악합니다.</p>
                </div>
              </div>
              <div className="stat-stack">
                {(actionStatsQuery.data?.data.items ?? []).map((item) => (
                  <StatBar
                    key={item.actionCandidate}
                    label={item.actionCandidate}
                    value={item.count}
                    max={actionMax}
                    tone="sky"
                  />
                ))}
              </div>
            </article>

            <article className="panel stack-md dashboard-summary-panel">
              <div className="section-header">
                <div>
                  <h2 className="panel-title">최근 요약</h2>
                  <p className="panel-description">최근 분석 결과와 우선 확인 대상을 짧게 정리합니다.</p>
                </div>
              </div>
              <div className="dashboard-summary-columns">
                <div className="stack-sm">
                  <span className="dashboard-section-label">우선 확인 대상</span>
                  {priorityTargets.slice(0, 4).map((target, index) => (
                    <article key={`${target.resultId}-${index}`} className="workspace-row dashboard-summary-row">
                      <div>
                        <h3 className="text-base font-semibold text-slate-950">
                          {`우선 확인 대상 ${index + 1}`}
                        </h3>
                        <p className="mt-1 text-sm text-slate-600">
                          {`결과 #${target.resultId ?? '-'} · 우선순위 ${getPriorityLevelLabel(target.priorityLevel)}`}
                        </p>
                      </div>
                      {target.resultId ? (
                        <Link className="text-button" to={`/results/${target.resultId}`}>
                          결과 보기
                        </Link>
                      ) : null}
                    </article>
                  ))}
                  {priorityTargets.length === 0 ? (
                    <SingleEmptyMessage
                      title="우선 확인 대상이 없습니다."
                      description="현재 조건에서 즉시 확인할 결과가 없습니다."
                    />
                  ) : null}
                </div>
                <div className="stack-sm">
                  <span className="dashboard-section-label">최근 분석 결과</span>
                  {recentResults.slice(0, 4).map((result) => (
                    <article
                      key={result.resultId ?? result.inspectionId ?? 'recent'}
                      className="workspace-row dashboard-summary-row"
                    >
                      <div>
                        <h3 className="text-base font-semibold text-slate-950">
                          {result.inspectionName ?? `결과 #${result.resultId ?? '-'}`}
                        </h3>
                        <p className="mt-1 text-sm text-slate-600">
                          {`최근 분석 ${formatDateTime(result.analyzedAt)} · 우선순위 ${getPriorityLevelLabel(result.priorityLevel)}`}
                        </p>
                      </div>
                      {result.resultId ? (
                        <Link className="text-button" to={`/results/${result.resultId}`}>
                          결과 보기
                        </Link>
                      ) : null}
                    </article>
                  ))}
                  {recentResults.length === 0 ? (
                    <SingleEmptyMessage
                      title="최근 분석 결과가 없습니다."
                      description="분석이 완료되면 최근 결과가 이 영역에 표시됩니다."
                    />
                  ) : null}
                </div>
              </div>
            </article>
          </section>
        </>
      ) : null}
    </section>
  )
}

function SummaryCard({
  description,
  label,
  value,
}: {
  description: string
  label: string
  value: string
}) {
  return (
    <article className="summary-card">
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className="mt-2 text-lg font-semibold text-slate-950">{value}</div>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
    </article>
  )
}

function DashboardHighlightCard({
  label,
  tone = 'default',
  value,
}: {
  label: string
  tone?: 'default' | 'warning' | 'danger'
  value: string
}) {
  return (
    <article className={`dashboard-highlight dashboard-highlight-${tone}`}>
      <span className="dashboard-highlight-label">{label}</span>
      <strong className="dashboard-highlight-value">{value}</strong>
    </article>
  )
}

function MiniInsight({ label, value }: { label: string; value: string }) {
  return (
    <div className="dashboard-mini-insight">
      <span className="dashboard-mini-insight-label">{label}</span>
      <strong className="dashboard-mini-insight-value">{value}</strong>
    </div>
  )
}

function SnapshotRow({
  label,
  tone = 'default',
  value,
}: {
  label: string
  tone?: 'default' | 'danger'
  value: string
}) {
  return (
    <div className="dashboard-snapshot-row">
      <span className={`dashboard-snapshot-label dashboard-snapshot-label-${tone}`}>{label}</span>
      <strong className="dashboard-snapshot-value">{value}</strong>
    </div>
  )
}

function SingleEmptyMessage({
  description,
  title,
}: {
  description: string
  title: string
}) {
  return (
    <div className="compact-empty">
      <div className="text-base font-semibold text-slate-900">{title}</div>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
    </div>
  )
}

function StatBar({
  label,
  max,
  tone,
  value,
}: {
  label: string
  max: number
  tone: 'danger' | 'sky'
  value: number
}) {
  return (
    <div className="stat-bar">
      <div className="stat-bar-header">
        <span>{label}</span>
        <strong>{`${value}건`}</strong>
      </div>
      <div className="stat-bar-track">
        <div
          className={`stat-bar-fill stat-bar-fill-${tone}`}
          style={{ width: `${Math.max((value / max) * 100, value > 0 ? 8 : 0)}%` }}
        />
      </div>
    </div>
  )
}

function TrendBarGroup({ max, point }: { max: number; point: DashboardTrendPoint }) {
  return (
    <div className="trend-group">
      <div className="trend-bars">
        <div
          className="trend-bar trend-bar-primary"
          style={{ height: `${Math.max((point.inspectionCount / max) * 180, point.inspectionCount > 0 ? 12 : 0)}px` }}
          title={`점검 ${point.inspectionCount}건`}
        />
        <div
          className="trend-bar trend-bar-danger"
          style={{ height: `${Math.max((point.anomalyCount / max) * 180, point.anomalyCount > 0 ? 12 : 0)}px` }}
          title={`이상 ${point.anomalyCount}건`}
        />
      </div>
      <div className="trend-meta">
        <strong>{point.trendDate}</strong>
        <span>{`점검 ${point.inspectionCount} · 이상 ${point.anomalyCount}`}</span>
      </div>
    </div>
  )
}

function toInterval(value: string | null): DashboardTrendInterval {
  if (value === 'WEEKLY' || value === 'MONTHLY') {
    return value
  }

  return 'DAILY'
}

function getIntervalLabel(interval: DashboardTrendInterval) {
  switch (interval) {
    case 'DAILY':
      return '일간'
    case 'WEEKLY':
      return '주간'
    case 'MONTHLY':
      return '월간'
  }
}
