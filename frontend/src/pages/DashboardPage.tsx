import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
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
  type PriorityTarget,
  type RecentInspectionResult,
} from '../features/dashboard/types'
import { InspectionCreateWizard } from '../features/inspections/components/InspectionCreateWizard'
import { usePlants } from '../features/plants/hooks/usePlants'
import { useResults } from '../features/results/hooks/useResults'
import type { ActionCandidate, PriorityLevel, ReviewStatus, SeverityLevel } from '../features/results/types'
import { useZonesByPlantId } from '../features/zones/hooks/useZones'
import { FormField } from '../shared/components/form/FormField'
import { PageHeader } from '../shared/components/layout/PageHeader'
import { ErrorState } from '../shared/components/state/ErrorState'
import { LoadingState } from '../shared/components/state/LoadingState'
import { StatusBadge } from '../shared/components/state/StatusBadge'
import { formatCount, formatDate, formatDateTime, getApiErrorMessage, parsePositiveNumber } from '../shared/utils'

const CHART_COLORS = ['#0f766e', '#0369a1', '#f59e0b', '#dc2626', '#7c3aed']
const RESULT_PAGE_SIZE = 8
type FocusTaskTone = 'default' | 'success' | 'warning' | 'danger'
type FocusTask = {
  label: string
  count: number
  description: string
  href: string
  actionLabel: string
  tone: FocusTaskTone
}

export function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const role = useAuth((state) => state.user?.role)
  const [plantIdInput, setPlantIdInput] = useState(searchParams.get('plantId') ?? '')
  const [zoneIdInput, setZoneIdInput] = useState(searchParams.get('zoneId') ?? '')
  const [fromInput, setFromInput] = useState(searchParams.get('from') ?? '')
  const [toInput, setToInput] = useState(searchParams.get('to') ?? '')
  const [intervalInput, setIntervalInput] = useState<DashboardTrendInterval>(
    toDashboardInterval(searchParams.get('interval')),
  )
  const [isCreateWizardOpen, setIsCreateWizardOpen] = useState(false)

  useEffect(() => {
    setPlantIdInput(searchParams.get('plantId') ?? '')
    setZoneIdInput(searchParams.get('zoneId') ?? '')
    setFromInput(searchParams.get('from') ?? '')
    setToInput(searchParams.get('to') ?? '')
    setIntervalInput(toDashboardInterval(searchParams.get('interval')))
  }, [searchParams])

  const selectedPlantIdForFilter = parsePositiveNumber(plantIdInput) ?? 0
  const params = useMemo<DashboardQueryParams>(
    () => ({
      plantId: parsePositiveNumber(searchParams.get('plantId') ?? undefined) ?? undefined,
      zoneId: parsePositiveNumber(searchParams.get('zoneId') ?? undefined) ?? undefined,
      from: searchParams.get('from') ?? undefined,
      to: searchParams.get('to') ?? undefined,
    }),
    [searchParams],
  )
  const interval = toDashboardInterval(searchParams.get('interval'))
  const hasScopedFilter = Boolean(params.plantId || params.zoneId)
  const canQuery = role === 'ADMIN' || hasScopedFilter

  const plantsQuery = usePlants({ page: 0, size: 100, status: 'ACTIVE' })
  const zonesQuery = useZonesByPlantId(selectedPlantIdForFilter)
  const summaryQuery = useDashboardSummary(params, canQuery)
  const actionStatsQuery = useDashboardActionStats(params, canQuery)
  const severityStatsQuery = useDashboardSeverityStats(params, canQuery)
  const trendQuery = useDashboardTrends({ ...params, interval }, canQuery)
  const recentResultsQuery = useResults(
    { plantId: params.plantId, zoneId: params.zoneId, page: 0, size: RESULT_PAGE_SIZE },
    canQuery,
  )

  const plantOptions = plantsQuery.data?.data.content ?? []
  const zoneOptions = zonesQuery.data?.data ?? []
  const selectedPlant = plantOptions.find((plant) => String(plant.plantId) === plantIdInput) ?? null
  const selectedZone = zoneOptions.find((zone) => String(zone.zoneId) === zoneIdInput) ?? null

  const summary = summaryQuery.data?.data.summary ?? null
  const priorityTargets = useMemo(
    () => summaryQuery.data?.data.priorityTargets ?? [],
    [summaryQuery.data],
  )
  const recentResultSummaries = useMemo(
    () => summaryQuery.data?.data.recentResults ?? [],
    [summaryQuery.data],
  )
  const resultRows = useMemo(
    () => recentResultsQuery.data?.data.content ?? [],
    [recentResultsQuery.data],
  )
  const reviewStatusByResultId = useMemo(
    () => new Map(resultRows.map((row) => [row.resultId, row.reviewStatus ?? null])),
    [resultRows],
  )
  const mergedRecentResults = useMemo(
    () =>
      recentResultSummaries.map((row) => ({
        ...row,
        reviewStatus: row.resultId == null ? null : (reviewStatusByResultId.get(row.resultId) ?? null),
      })),
    [recentResultSummaries, reviewStatusByResultId],
  )
  const pendingReviewResults = useMemo(
    () =>
      mergedRecentResults.filter(
        (row) => row.reviewStatus === 'UNCHECKED' || row.reviewStatus === 'RECHECK_REQUIRED',
      ),
    [mergedRecentResults],
  )

  const actionChartData = actionStatsQuery.data?.data.items ?? []
  const severityChartData = severityStatsQuery.data?.data.items ?? []
  const trendChartData = trendQuery.data?.data.points ?? []
  const hasTrendChartData = trendChartData.length >= 2
  const focusTasks: FocusTask[] = summary
    ? [
        {
          label: '검토 대기 결과',
          count: summary.pendingReviewCount,
          description: summary.pendingReviewCount > 0 ? '결과 검토가 필요합니다.' : '대기 없음',
          href: '/results?reviewStatus=UNCHECKED',
          actionLabel: '결과 검토',
          tone: summary.pendingReviewCount > 0 ? 'warning' : 'default',
        },
        {
          label: '높은 우선순위',
          count: summary.highPriorityCount,
          description: summary.highPriorityCount > 0 ? '먼저 확인할 결과가 있습니다.' : '대기 없음',
          href: '/results',
          actionLabel: '우선 결과 보기',
          tone: summary.highPriorityCount > 0 ? 'danger' : 'default',
        },
        {
          label: '분석 실패',
          count: summary.failedJobCount,
          description: summary.failedJobCount > 0 ? '재요청 또는 재업로드가 필요합니다.' : '대기 없음',
          href: '/inspections',
          actionLabel: '점검 보기',
          tone: summary.failedJobCount > 0 ? 'danger' : 'default',
        },
        {
          label: '진행 중 점검',
          count: summary.inProgressInspectionCount,
          description: summary.inProgressInspectionCount > 0 ? '업로드와 분석 흐름을 이어갈 수 있습니다.' : '진행 중 없음',
          href: '/inspections',
          actionLabel: '점검 목록',
          tone: summary.inProgressInspectionCount > 0 ? 'success' : 'default',
        },
      ]
    : []
  const actionCandidateCount = actionChartData.reduce((sum, item) => sum + item.count, 0)
  const dashboardError =
    getFirstErrorMessage([
      summaryQuery.isError ? getApiErrorMessage(summaryQuery.error) : null,
      actionStatsQuery.isError ? getApiErrorMessage(actionStatsQuery.error) : null,
      severityStatsQuery.isError ? getApiErrorMessage(severityStatsQuery.error) : null,
      trendQuery.isError ? getApiErrorMessage(trendQuery.error) : null,
    ])
  const isDashboardLoading =
    canQuery &&
    (summaryQuery.isLoading || actionStatsQuery.isLoading || severityStatsQuery.isLoading || trendQuery.isLoading)

  const handleSearch = () => {
    const next = new URLSearchParams()
    if (plantIdInput.trim()) next.set('plantId', plantIdInput.trim())
    if (zoneIdInput.trim()) next.set('zoneId', zoneIdInput.trim())
    if (fromInput.trim()) next.set('from', fromInput.trim())
    if (toInput.trim()) next.set('to', toInput.trim())
    next.set('interval', intervalInput)
    setSearchParams(next)
  }

  const handleReset = () => {
    setPlantIdInput('')
    setZoneIdInput('')
    setFromInput('')
    setToInput('')
    setIntervalInput('WEEKLY')
    setSearchParams({})
  }

  const handleRefresh = () => {
    void summaryQuery.refetch()
    void actionStatsQuery.refetch()
    void severityStatsQuery.refetch()
    void trendQuery.refetch()
    void recentResultsQuery.refetch()
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="대시보드"
        description="오늘 확인할 결과와 운영 통계를 함께 봅니다."
        actions={
          <div className="page-actions">
            <button className="btn btn-primary" type="button" onClick={() => setIsCreateWizardOpen(true)}>
              새 점검 시작
            </button>
            <Link className="btn btn-secondary" to="/inspections">
              점검 목록
            </Link>
            <Link className="btn btn-secondary" to="/results">
              결과 보기
            </Link>
            <button className="btn btn-secondary" type="button" onClick={handleRefresh}>
              새로고침
            </button>
          </div>
        }
      />

      <section className="dashboard-home-grid">
        <section className="panel page-hero">
          <div className="eyebrow">운영 홈</div>
          <h2 className="mt-4 text-2xl font-semibold text-slate-950">새 점검 시작과 결과 확인이 먼저 보이도록 정리했습니다.</h2>
          <p className="mt-3 max-w-2xl text-sm text-slate-600">
            점검 생성, 이미지 업로드, 분석 요청, 결과 검토 흐름은 점검 화면에서 이어집니다.
            발전소와 구역 관리는 보조 영역으로 낮췄습니다.
          </p>
          <div className="mt-5 page-actions">
            <button className="btn btn-primary" type="button" onClick={() => setIsCreateWizardOpen(true)}>
              새 점검 시작
            </button>
            <Link className="btn btn-secondary" to="/inspections">
              점검 목록
            </Link>
            <Link className="btn btn-secondary" to="/results">
              결과 보기
            </Link>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <span>구조 관리</span>
            <Link className="text-button" to="/plants">
              발전소 목록
            </Link>
          </div>
        </section>

        <section className="panel stack-md priority-panel">
          <div className="section-header">
            <div>
              <h2 className="panel-title">우선 확인</h2>
              <p className="panel-description">지금 바로 볼 항목만 먼저 모았습니다.</p>
            </div>
            {canQuery ? (
              <StatusBadge label="조회 중" tone="success" />
            ) : (
              <StatusBadge label="범위 선택 필요" tone="warning" />
            )}
          </div>
          {canQuery && focusTasks.length > 0 ? (
            <div className="task-queue-list">
              {focusTasks.map((task) => (
                <article key={task.label} className="task-queue-card task-queue-item">
                  <div>
                    <div className="status-meta-row">
                      <span className="text-sm font-semibold text-slate-900">{task.label}</span>
                      <StatusBadge label={`${formatCount(task.count)}건`} tone={task.tone} />
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{task.description}</p>
                  </div>
                  {task.count > 0 ? (
                    <div className="task-queue-action">
                      <Link className="btn btn-secondary" to={task.href}>
                        {task.actionLabel}
                      </Link>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <CompactEmptyState
              title="먼저 범위를 선택하세요."
              description="발전소 또는 구역을 선택하면 우선 처리 대상과 최근 결과를 바로 볼 수 있습니다."
            />
          )}
        </section>
      </section>

      <details className="panel" open={!canQuery}>
        <summary className="cursor-pointer list-none">
          <div className="toolbar gap-3">
            <div>
              <h2 className="panel-title">통계 범위</h2>
              <p className="panel-description">
                {buildFilterSummary(selectedPlant?.name, selectedZone?.name, fromInput, toInput, intervalInput)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge label={canQuery ? '조회 가능' : '범위 선택 필요'} tone={canQuery ? 'success' : 'warning'} />
              <span className="text-sm text-slate-500">조건 변경</span>
            </div>
          </div>
        </summary>
        <div className="mt-5 space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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
                {plantOptions.map((plant) => (
                  <option key={plant.plantId} value={plant.plantId}>
                    {plant.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="구역">
              <select
                className="input-field"
                value={zoneIdInput}
                onChange={(event) => setZoneIdInput(event.target.value)}
                disabled={!plantIdInput}
              >
                <option value="">{plantIdInput ? '전체' : '발전소를 먼저 선택하세요.'}</option>
                {zoneOptions.map((zone) => (
                  <option key={zone.zoneId} value={zone.zoneId}>
                    {zone.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="조회 시작일">
              <input className="input-field" type="date" value={fromInput} onChange={(event) => setFromInput(event.target.value)} />
            </FormField>
            <FormField label="조회 종료일">
              <input className="input-field" type="date" value={toInput} onChange={(event) => setToInput(event.target.value)} />
            </FormField>
            <FormField label="기간 단위">
              <select
                className="input-field"
                value={intervalInput}
                onChange={(event) => setIntervalInput(toDashboardInterval(event.target.value))}
              >
                {DASHBOARD_INTERVAL_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {getDashboardIntervalLabel(option)}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          <div className="inline-actions">
            <button className="btn btn-primary" type="button" onClick={handleSearch}>
              조회하기
            </button>
            <button className="btn btn-secondary" type="button" onClick={handleReset}>
              초기화
            </button>
          </div>
        </div>
      </details>

      {!canQuery ? (
        <section className="panel">
          <CompactEmptyState
            title="먼저 통계 범위를 선택하세요."
            description="발전소 또는 구역을 선택하면 통계와 최근 분석 결과를 확인할 수 있습니다."
          />
        </section>
      ) : null}

      {isDashboardLoading ? <LoadingState message="대시보드 데이터를 불러오는 중입니다." /> : null}
      {canQuery && dashboardError ? <ErrorState title="대시보드를 불러오지 못했습니다." description={dashboardError} /> : null}

      {canQuery && summary && !dashboardError ? (
        <>
          <section className="panel space-y-5">
            <div className="toolbar gap-3">
              <div>
                <h2 className="panel-title">주요 지표</h2>
                <p className="panel-description">현재 범위의 점검과 분석 현황을 빠르게 확인합니다.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge label={`검토 대기 ${formatCount(summary.pendingReviewCount)}`} tone={summary.pendingReviewCount > 0 ? 'warning' : 'default'} />
                <StatusBadge label={`높은 우선순위 ${formatCount(summary.highPriorityCount)}`} tone={summary.highPriorityCount > 0 ? 'danger' : 'default'} />
                <StatusBadge label={`분석 실패 ${formatCount(summary.failedJobCount)}`} tone={summary.failedJobCount > 0 ? 'danger' : 'default'} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <KpiCard label="발전소 수" value={summary.totalPlantCount} />
              <KpiCard label="구역 수" value={summary.totalZoneCount} />
              <KpiCard label="점검 수" value={summary.totalInspectionCount} />
              <KpiCard label="분석 결과 수" value={summary.totalAnalysisResultCount} />
              <KpiCard label="조치 후보 수" value={actionCandidateCount || summary.anomalyResultCount} />
              <KpiCard label="높은 우선순위 수" value={summary.highPriorityCount} tone={summary.highPriorityCount > 0 ? 'danger' : 'default'} />
              <KpiCard label="분석 실패 수" value={summary.failedJobCount} tone={summary.failedJobCount > 0 ? 'danger' : 'default'} />
              <KpiCard label="검토 대기 수" value={summary.pendingReviewCount} tone={summary.pendingReviewCount > 0 ? 'warning' : 'default'} />
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
            <DashboardChartSection
              title="조치 후보 통계"
              description="어떤 후속 조치가 많이 필요한지 확인합니다."
              isLoading={actionStatsQuery.isLoading}
              error={actionStatsQuery.isError ? getApiErrorMessage(actionStatsQuery.error) : null}
              isEmpty={actionChartData.length === 0}
              emptyTitle="등록된 조치 후보 통계가 없습니다."
              emptyDescription="분석 결과가 누적되면 조치 후보 분포를 확인할 수 있습니다."
            >
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={actionChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="actionCandidate" tickFormatter={getActionCandidateLabel} stroke="#64748b" />
                    <YAxis allowDecimals={false} stroke="#64748b" />
                    <Tooltip formatter={(value: number) => [`${value}건`, '건수']} labelFormatter={(value) => getActionCandidateLabel(value as ActionCandidate)} />
                    <Bar dataKey="count" radius={[10, 10, 0, 0]} fill="#0f766e" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </DashboardChartSection>

            <DashboardChartSection
              title="심각도 분포"
              description="높은 심각도 결과가 얼마나 있는지 확인합니다."
              isLoading={severityStatsQuery.isLoading}
              error={severityStatsQuery.isError ? getApiErrorMessage(severityStatsQuery.error) : null}
              isEmpty={severityChartData.length === 0}
              emptyTitle="등록된 심각도 데이터가 없습니다."
              emptyDescription="분석 결과가 누적되면 심각도 분포를 확인할 수 있습니다."
            >
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={severityChartData} dataKey="count" nameKey="severityLevel" innerRadius={62} outerRadius={96} paddingAngle={4}>
                      {severityChartData.map((item, index) => (
                        <Cell key={item.severityLevel} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`${value}건`, '건수']} labelFormatter={(value) => getSeverityLevelLabel(value as SeverityLevel)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-2">
                {severityChartData.map((item) => (
                  <StatusBadge
                    key={item.severityLevel}
                    label={`${getSeverityLevelLabel(item.severityLevel)} ${formatCount(item.count)}`}
                    tone={getSeverityLevelTone(item.severityLevel)}
                  />
                ))}
              </div>
            </DashboardChartSection>

            <DashboardChartSection
              title="기간별 점검 추이"
              description="같은 범위에서 점검 수와 이상 결과 수의 변화를 확인합니다."
              isLoading={trendQuery.isLoading}
              error={trendQuery.isError ? getApiErrorMessage(trendQuery.error) : null}
              isEmpty={!hasTrendChartData}
              emptyTitle="아직 추이를 표시할 데이터가 부족합니다."
              emptyDescription="같은 구역의 결과가 누적되면 기간별 변화를 확인할 수 있습니다."
            >
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="trendDate" tickFormatter={formatDate} stroke="#64748b" />
                    <YAxis allowDecimals={false} stroke="#64748b" />
                    <Tooltip labelFormatter={(value) => formatDate(String(value))} />
                    <Line type="monotone" dataKey="inspectionCount" name="점검 수" stroke="#0f766e" strokeWidth={3} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="anomalyCount" name="이상 결과 수" stroke="#dc2626" strokeWidth={3} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </DashboardChartSection>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <section className="panel stack-md">
              <div className="toolbar gap-3">
                <div>
                  <h2 className="panel-title">최근 분석 결과</h2>
                  <p className="panel-description">가장 최근 분석된 결과를 확인합니다.</p>
                </div>
                <Link className="btn btn-secondary" to="/results">
                  결과 목록
                </Link>
              </div>
              {mergedRecentResults.length > 0 ? (
                <div className="space-y-3">
                  {mergedRecentResults.map((result) => (
                    <RecentResultCard key={buildRecentResultKey(result)} result={result} />
                  ))}
                </div>
              ) : (
                <CompactEmptyState
                  title="최근 분석 결과가 없습니다."
                  description="점검 상세에서 이미지를 등록하고 분석을 요청하면 결과가 표시됩니다."
                />
              )}
            </section>

            <section className="panel stack-md">
              <div className="toolbar gap-3">
                <div>
                  <h2 className="panel-title">우선 확인 결과</h2>
                  <p className="panel-description">우선순위가 높은 결과를 먼저 확인합니다.</p>
                </div>
                <Link className="btn btn-secondary" to="/results">
                  결과 검토
                </Link>
              </div>
              {priorityTargets.length > 0 ? (
                <div className="space-y-3">
                  {priorityTargets.slice(0, 5).map((target) => (
                    <PriorityTargetCard key={buildPriorityTargetKey(target)} target={target} />
                  ))}
                </div>
              ) : (
                <CompactEmptyState
                  title="우선 확인할 결과가 없습니다."
                  description="높은 우선순위 결과가 생기면 이 영역에 먼저 표시됩니다."
                />
              )}
            </section>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
            <section className="panel stack-md">
              <div className="toolbar gap-3">
                <div>
                  <h2 className="panel-title">검토 대기 결과</h2>
                  <p className="panel-description">검토가 필요한 결과만 모아 보여줍니다.</p>
                </div>
                <Link className="btn btn-secondary" to="/results?reviewStatus=UNCHECKED">
                  결과 검토
                </Link>
              </div>
              {pendingReviewResults.length > 0 ? (
                <div className="space-y-3">
                  {pendingReviewResults.slice(0, 5).map((result) => (
                    <RecentResultCard key={`pending-${buildRecentResultKey(result)}`} result={result} />
                  ))}
                </div>
              ) : (
                <CompactEmptyState title="검토 대기 결과가 없습니다." description="검토가 필요한 결과가 생기면 이 영역에 표시됩니다." />
              )}
            </section>

            <section className="panel stack-md">
              <div>
                <h2 className="panel-title">보조 통계</h2>
                <p className="panel-description">운영 상태를 요약해 보여줍니다.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <MiniMetric label="진행 중 점검" value={summary.inProgressInspectionCount} />
                <MiniMetric label="완료 점검" value={summary.completedInspectionCount} />
                <MiniMetric label="등록 이미지" value={summary.totalImageCount} />
                <MiniMetric label="분석 작업" value={summary.totalAnalysisJobCount} />
                <MiniMetric label="분석 대기" value={summary.queuedJobCount} />
                <MiniMetric label="분석 중" value={summary.runningJobCount} />
                <MiniMetric label="분석 완료" value={summary.succeededJobCount} />
                <MiniMetric label="이상 구역" value={summary.anomalyZoneCount} />
              </div>
            </section>
          </section>

          <section className="panel stack-md">
            <div className="section-header">
              <div>
                <h2 className="panel-title">관리 바로가기</h2>
                <p className="panel-description">발전소와 구역 관리는 운영 흐름 뒤에서 이어갑니다.</p>
              </div>
            </div>
            <div className="inline-actions">
              <Link className="btn btn-secondary" to="/plants">
                발전소 보기
              </Link>
              <Link className="btn btn-secondary" to="/inspections">
                점검 보기
              </Link>
              <Link className="btn btn-secondary" to="/results">
                결과 보기
              </Link>
            </div>
          </section>
        </>
      ) : null}

      <InspectionCreateWizard isOpen={isCreateWizardOpen} onClose={() => setIsCreateWizardOpen(false)} />
    </section>
  )
}

function KpiCard({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: number
  tone?: 'default' | 'warning' | 'danger'
}) {
  const valueClassName =
    tone === 'danger'
      ? 'text-rose-700'
      : tone === 'warning'
        ? 'text-amber-700'
        : 'text-slate-900'

  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${valueClassName}`}>{formatCount(value)}</p>
    </article>
  )
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-900">{formatCount(value)}</p>
    </article>
  )
}

function DashboardChartSection({
  title,
  description,
  children,
  isLoading,
  error,
  isEmpty,
  emptyTitle,
  emptyDescription,
}: {
  title: string
  description: string
  children: ReactNode
  isLoading: boolean
  error: string | null
  isEmpty: boolean
  emptyTitle: string
  emptyDescription: string
}) {
  return (
    <section className="panel stack-md">
      <div>
        <h2 className="panel-title">{title}</h2>
        <p className="panel-description">{description}</p>
      </div>
      {isLoading ? <LoadingState message={`${title} 데이터를 불러오는 중입니다.`} /> : null}
      {error ? <ErrorState title={`${title} 데이터를 불러오지 못했습니다.`} description={error} /> : null}
      {!isLoading && !error && isEmpty ? (
        <CompactEmptyState title={emptyTitle} description={emptyDescription} />
      ) : null}
      {!isLoading && !error && !isEmpty ? children : null}
    </section>
  )
}

function CompactEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-6">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  )
}

function RecentResultCard({ result }: { result: RecentInspectionResult & { reviewStatus?: ReviewStatus | null } }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              label={getSeverityLevelLabel(result.severityLevel)}
              tone={getSeverityLevelTone(result.severityLevel)}
            />
            {result.priorityLevel ? (
              <StatusBadge label={getPriorityLevelLabel(result.priorityLevel)} tone={getPriorityLevelTone(result.priorityLevel)} />
            ) : null}
            {result.reviewStatus ? (
              <StatusBadge label={getReviewStatusLabel(result.reviewStatus)} tone={getReviewStatusTone(result.reviewStatus)} />
            ) : null}
          </div>
          <h3 className="mt-3 text-base font-semibold text-slate-900">{result.inspectionName ?? '점검 정보 확인 필요'}</h3>
          <p className="mt-1 text-sm text-slate-600">
            {[result.plantName, result.zoneName].filter(Boolean).join(' · ') || '위치 정보 없음'}
          </p>
          <div className="mt-3 grid gap-2 text-sm text-slate-500 sm:grid-cols-2">
            <InfoBlock label="조치 후보" value={getActionCandidateLabel(result.actionCandidate)} />
            <InfoBlock label="분석 시각" value={formatDateTime(result.analyzedAt)} />
          </div>
        </div>
        {result.resultId ? (
          <Link className="btn btn-secondary" to={`/results/${result.resultId}`}>
            결과 보기
          </Link>
        ) : null}
      </div>
    </article>
  )
}

function PriorityTargetCard({ target }: { target: PriorityTarget }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {target.priorityLevel ? (
              <StatusBadge label={getPriorityLevelLabel(target.priorityLevel)} tone={getPriorityLevelTone(target.priorityLevel)} />
            ) : null}
            {target.severityLevel ? (
              <StatusBadge label={getSeverityLevelLabel(target.severityLevel)} tone={getSeverityLevelTone(target.severityLevel)} />
            ) : null}
          </div>
          <h3 className="mt-3 text-base font-semibold text-slate-900">{getTargetTypeLabel(target.targetType)}</h3>
          <p className="mt-1 text-sm text-slate-600">{getPriorityReasonLabel(target.priorityReason)}</p>
          <div className="mt-3 grid gap-2 text-sm text-slate-500 sm:grid-cols-2">
            <InfoBlock label="조치 후보" value={getActionCandidateLabel(target.actionCandidate)} />
            <InfoBlock label="확인 위치" value={target.zoneId ? '구역 상세에서 확인' : '전체'} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {target.resultId ? (
            <Link className="btn btn-secondary" to={`/results/${target.resultId}`}>
              결과 보기
            </Link>
          ) : null}
          {target.zoneId ? (
            <Link className="btn btn-secondary" to={`/zones/${target.zoneId}`}>
              구역 보기
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  )
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-700">{value}</p>
    </div>
  )
}

function buildRecentResultKey(result: RecentInspectionResult) {
  return [result.resultId ?? 'result', result.inspectionId ?? 'inspection', result.analyzedAt ?? 'time'].join('-')
}

function buildPriorityTargetKey(target: PriorityTarget) {
  return [target.resultId ?? 'result', target.zoneId ?? 'zone', target.equipmentId ?? 'equipment'].join('-')
}

function buildFilterSummary(
  plantName?: string | null,
  zoneName?: string | null,
  from?: string,
  to?: string,
  interval?: DashboardTrendInterval,
) {
  const scope = [plantName, zoneName].filter(Boolean).join(' · ') || '전체 범위'
  const dateRange = from || to ? `${from || '시작일 미설정'} ~ ${to || '종료일 미설정'}` : '기간 제한 없음'
  return `${scope} · ${dateRange} · ${getDashboardIntervalLabel(interval ?? 'WEEKLY')}`
}

function getFirstErrorMessage(messages: Array<string | null>) {
  return messages.find(Boolean) ?? null
}

function toDashboardInterval(value?: string | null): DashboardTrendInterval {
  return DASHBOARD_INTERVAL_OPTIONS.includes(value as DashboardTrendInterval)
    ? (value as DashboardTrendInterval)
    : 'WEEKLY'
}

function getDashboardIntervalLabel(interval: DashboardTrendInterval) {
  switch (interval) {
    case 'DAILY':
      return '일간'
    case 'WEEKLY':
      return '주간'
    case 'MONTHLY':
      return '월간'
  }
}

function getTargetTypeLabel(targetType?: PriorityTarget['targetType']) {
  switch (targetType) {
    case 'ZONE':
      return '구역'
    case 'ARRAY':
      return '설비 위치'
    case 'PANEL':
      return '패널'
    case 'MODULE':
      return '모듈'
    default:
      return '점검 대상'
  }
}

function getActionCandidateLabel(actionCandidate?: ActionCandidate | null) {
  switch (actionCandidate) {
    case 'CLEANING':
      return '청소'
    case 'RETAKE':
      return '재촬영'
    case 'FIELD_INSPECTION':
      return '현장 점검'
    case 'REPLACEMENT_REVIEW':
      return '교체 검토'
    default:
      return '-'
  }
}

function getSeverityLevelLabel(severityLevel?: SeverityLevel | null) {
  switch (severityLevel) {
    case 'LOW':
      return '낮음'
    case 'MEDIUM':
      return '보통'
    case 'HIGH':
      return '높음'
    case 'CRITICAL':
      return '치명적'
    default:
      return '-'
  }
}

function getSeverityLevelTone(severityLevel?: SeverityLevel | null) {
  switch (severityLevel) {
    case 'LOW':
      return 'default'
    case 'MEDIUM':
      return 'warning'
    case 'HIGH':
    case 'CRITICAL':
      return 'danger'
    default:
      return 'default'
  }
}

function getPriorityLevelLabel(priorityLevel?: PriorityLevel | null) {
  switch (priorityLevel) {
    case 'LOW':
      return '낮음'
    case 'MEDIUM':
      return '보통'
    case 'HIGH':
      return '높음'
    case 'URGENT':
      return '긴급'
    default:
      return '-'
  }
}

function getPriorityLevelTone(priorityLevel?: PriorityLevel | null) {
  switch (priorityLevel) {
    case 'LOW':
      return 'default'
    case 'MEDIUM':
      return 'warning'
    case 'HIGH':
    case 'URGENT':
      return 'danger'
    default:
      return 'default'
  }
}

function getReviewStatusLabel(reviewStatus?: ReviewStatus | null) {
  switch (reviewStatus) {
    case 'UNCHECKED':
      return '미검토'
    case 'CONFIRMED':
      return '확인 완료'
    case 'RECHECK_REQUIRED':
      return '재확인 필요'
    case 'ACTION_COMPLETED':
      return '조치 완료'
    default:
      return '-'
  }
}

function getReviewStatusTone(reviewStatus?: ReviewStatus | null) {
  switch (reviewStatus) {
    case 'UNCHECKED':
      return 'warning'
    case 'RECHECK_REQUIRED':
      return 'danger'
    case 'CONFIRMED':
    case 'ACTION_COMPLETED':
      return 'success'
    default:
      return 'default'
  }
}

function getPriorityReasonLabel(reason?: string | null) {
  switch (reason) {
    case 'worsened and repeated anomaly':
      return '반복 이상이면서 악화된 결과입니다.'
    case 'worsened tracking result':
      return '이전 점검 대비 악화된 결과입니다.'
    case 'repeated anomaly':
      return '반복적으로 이상이 확인된 결과입니다.'
    case 'tracked anomaly':
      return '추적 중인 이상 결과입니다.'
    case 'severity level increased':
      return '심각도 등급이 상승했습니다.'
    case 'severity score increased':
      return '심각도 점수가 상승했습니다.'
    case 'anomaly count increased':
      return '이상 개수가 증가했습니다.'
    case 'new high severity defect detected':
      return '고심각 결함이 새로 감지됐습니다.'
    case 'no priority escalation':
      return '우선 확인 사유가 없습니다.'
    default:
      return reason?.trim() || '-'
  }
}
