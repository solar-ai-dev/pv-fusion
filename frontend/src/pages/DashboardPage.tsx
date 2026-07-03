
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
  type DashboardSummary,
  type PriorityTarget,
  type RecentInspectionResult,
} from '../features/dashboard/types'
import { InspectionCreateWizard } from '../features/inspections/components/InspectionCreateWizard'
import { useInspection, useInspections } from '../features/inspections/hooks/useInspections'
import type { InspectionStatus, InspectionSummary } from '../features/inspections/types'
import { usePlant, usePlants } from '../features/plants/hooks/usePlants'
import { useResults } from '../features/results/hooks/useResults'
import type { ActionCandidate, PriorityLevel, ReviewStatus, SeverityLevel } from '../features/results/types'
import { useZone, useZonesByPlantId } from '../features/zones/hooks/useZones'
import { FormField } from '../shared/components/form/FormField'
import { PageHeader } from '../shared/components/layout/PageHeader'
import { ErrorState } from '../shared/components/state/ErrorState'
import { LoadingState } from '../shared/components/state/LoadingState'
import { StatusBadge } from '../shared/components/state/StatusBadge'
import { formatCount, formatDate, formatDateTime, getApiErrorMessage, parsePositiveNumber } from '../shared/utils'

const CHART_COLORS = ['#0f766e', '#0369a1', '#f59e0b', '#dc2626', '#7c3aed']
const RECENT_PAGE_SIZE = 5

export function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const role = useAuth((state) => state.user?.role)
  const [plantIdInput, setPlantIdInput] = useState(searchParams.get('plantId') ?? '')
  const [zoneIdInput, setZoneIdInput] = useState(searchParams.get('zoneId') ?? '')
  const [fromInput, setFromInput] = useState(searchParams.get('from') ?? '')
  const [toInput, setToInput] = useState(searchParams.get('to') ?? '')
  const [intervalInput, setIntervalInput] = useState<DashboardTrendInterval>(toDashboardInterval(searchParams.get('interval'))) 
  const [isCreateWizardOpen, setIsCreateWizardOpen] = useState(false)

  useEffect(() => {
    setPlantIdInput(searchParams.get('plantId') ?? '')
    setZoneIdInput(searchParams.get('zoneId') ?? '')
    setFromInput(searchParams.get('from') ?? '')
    setToInput(searchParams.get('to') ?? '')
    setIntervalInput(toDashboardInterval(searchParams.get('interval')))
  }, [searchParams])

  const selectedPlantIdForFilter = parsePositiveNumber(plantIdInput) ?? 0
  const params = useMemo<DashboardQueryParams>(() => ({
    plantId: parsePositiveNumber(searchParams.get('plantId') ?? undefined) ?? undefined,
    zoneId: parsePositiveNumber(searchParams.get('zoneId') ?? undefined) ?? undefined,
    from: searchParams.get('from') ?? undefined,
    to: searchParams.get('to') ?? undefined,
  }), [searchParams])
  const interval = toDashboardInterval(searchParams.get('interval'))
  const hasScopedFilter = Boolean(params.plantId || params.zoneId)
  const canQuery = role === 'ADMIN' || hasScopedFilter

  const plantsQuery = usePlants({ page: 0, size: 100, status: 'ACTIVE' })
  const filterZonesQuery = useZonesByPlantId(selectedPlantIdForFilter)
  const recentInspectionsQuery = useInspections({ plantId: params.plantId, zoneId: params.zoneId, page: 0, size: RECENT_PAGE_SIZE }, canQuery)
  const recentResultsQuery = useResults({ plantId: params.plantId, zoneId: params.zoneId, page: 0, size: RECENT_PAGE_SIZE }, canQuery)
  const summaryQuery = useDashboardSummary(params, canQuery)
  const actionStatsQuery = useDashboardActionStats(params, canQuery)
  const severityStatsQuery = useDashboardSeverityStats(params, canQuery)
  const trendQuery = useDashboardTrends({ ...params, interval }, canQuery)

  const summary = summaryQuery.data?.data.summary
  const priorityTargets = useMemo(
    () => summaryQuery.data?.data.priorityTargets ?? [],
    [summaryQuery.data],
  )
  const recentResultSummaries = useMemo(
    () => summaryQuery.data?.data.recentResults ?? [],
    [summaryQuery.data],
  )
  const recentInspectionRows = useMemo(
    () => recentInspectionsQuery.data?.data.content ?? [],
    [recentInspectionsQuery.data],
  )
  const resultRows = useMemo(
    () => recentResultsQuery.data?.data.content ?? [],
    [recentResultsQuery.data],
  )
  const actionChartData = actionStatsQuery.data?.data.items ?? []
  const severityChartData = severityStatsQuery.data?.data.items ?? []
  const trendChartData = trendQuery.data?.data.points ?? []
  const hasTrendChartData = trendChartData.length >= 2
  const plantOptions = plantsQuery.data?.data.content ?? []
  const zoneOptions = filterZonesQuery.data?.data ?? []
  const selectedPlant = plantOptions.find((plant) => String(plant.plantId) === plantIdInput) ?? null
  const selectedZone = zoneOptions.find((zone) => String(zone.zoneId) === zoneIdInput) ?? null

  const reviewStatusByResultId = useMemo(() => new Map(resultRows.map((row) => [row.resultId, row.reviewStatus ?? null])), [resultRows])
  const mergedRecentResults = useMemo(
    () =>
      recentResultSummaries.map((row) => ({
        ...row,
        reviewStatus:
          row.resultId == null
            ? null
            : (reviewStatusByResultId.get(row.resultId) ?? null),
      })),
    [recentResultSummaries, reviewStatusByResultId],
  )
  const continueInspection = recentInspectionRows.find((inspection) => inspection.inspectionStatus !== 'COMPLETED') ?? recentInspectionRows[0] ?? null
  const currentInspectionDetailQuery = useInspection(continueInspection?.inspectionId ?? 0)
  const topPriorityTarget = priorityTargets[0] ?? null
  const uploadPendingInspections = useMemo(
    () =>
      recentInspectionRows.filter(
        (inspection) => inspection.inspectionStatus === 'READY' || inspection.inspectionStatus === 'UPLOADING',
      ),
    [recentInspectionRows],
  )
  const failedInspections = useMemo(
    () => recentInspectionRows.filter((inspection) => inspection.inspectionStatus === 'FAILED'),
    [recentInspectionRows],
  )
  const hasTaskCounts = Boolean(
    summary &&
      (summary.pendingReviewCount > 0 ||
        summary.failedJobCount > 0 ||
        summary.highPriorityCount > 0 ||
        summary.inProgressInspectionCount > 0 ||
        recentInspectionRows.length > 0),
  )
  const taskQueue = useMemo(
    () =>
      buildTaskQueue({
        summary,
        uploadPendingCount: uploadPendingInspections.length,
        analysisPendingCount: summary?.queuedJobCount ?? 0,
        failedInspectionCount: failedInspections.length,
        topPriorityTarget,
        continueInspection,
      }),
    [continueInspection, failedInspections.length, summary, topPriorityTarget, uploadPendingInspections],
  )
  const dashboardFocus = useMemo(
    () => buildDashboardFocus(summary, continueInspection, topPriorityTarget),
    [continueInspection, summary, topPriorityTarget],
  )
  const currentInspectionResult = useMemo(
    () =>
      continueInspection
        ? mergedRecentResults.find((result) => result.inspectionId === continueInspection.inspectionId) ?? null
        : null,
    [continueInspection, mergedRecentResults],
  )

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
    void recentInspectionsQuery.refetch()
    void recentResultsQuery.refetch()
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="운영 홈"
        description="오늘 처리할 작업을 먼저 확인하세요."
        actions={
          <div className="page-actions">
            <button className="btn btn-primary" type="button" onClick={() => setIsCreateWizardOpen(true)}>새 점검 시작</button>
            <Link className="btn btn-secondary" to="/inspections">점검 목록</Link>
            <Link className="btn btn-secondary" to="/results">결과 검토</Link>
            <button className="btn btn-secondary" type="button" onClick={handleRefresh}>새로고침</button>
          </div>
        }
      />

      <details className="panel" open={!canQuery}>
        <summary className="cursor-pointer list-none">
          <div className="toolbar gap-3">
            <div>
              <h2 className="panel-title">작업 범위</h2>
              <p className="panel-description">{buildFilterSummary(selectedPlant?.name, selectedZone?.name, fromInput, toInput, intervalInput)}</p>
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
              <select className="input-field" value={plantIdInput} onChange={(event) => { setPlantIdInput(event.target.value); setZoneIdInput('') }}>
                <option value="">전체</option>
                {plantOptions.map((plant) => <option key={plant.plantId} value={plant.plantId}>{plant.name}</option>)}
              </select>
            </FormField>
            <FormField label="점검 영역">
              <select className="input-field" value={zoneIdInput} onChange={(event) => setZoneIdInput(event.target.value)} disabled={!plantIdInput}>
                <option value="">{plantIdInput ? '전체' : '발전소를 먼저 선택하세요.'}</option>
                {zoneOptions.map((zone) => <option key={zone.zoneId} value={zone.zoneId}>{zone.name}</option>)}
              </select>
            </FormField>
            <FormField label="조회 시작일"><input className="input-field" type="date" value={fromInput} onChange={(event) => setFromInput(event.target.value)} /></FormField>
            <FormField label="조회 종료일"><input className="input-field" type="date" value={toInput} onChange={(event) => setToInput(event.target.value)} /></FormField>
            <FormField label="기간 단위">
              <select className="input-field" value={intervalInput} onChange={(event) => setIntervalInput(toDashboardInterval(event.target.value))}>
                {DASHBOARD_INTERVAL_OPTIONS.map((option) => <option key={option} value={option}>{getDashboardIntervalLabel(option)}</option>)}
              </select>
            </FormField>
          </div>
          <div className="inline-actions">
            <button className="btn btn-primary" type="button" onClick={handleSearch}>조회하기</button>
            <button className="btn btn-secondary" type="button" onClick={handleReset}>초기화</button>
          </div>
        </div>
      </details>

      {!canQuery ? (
        <section className="panel space-y-4">
          <CompactEmptyState
            title="먼저 확인할 범위를 선택하세요."
            description="발전소 또는 점검 영역을 선택하세요."
            action={<Link className="btn btn-secondary" to="/plants">발전소 보기</Link>}
          />
        </section>
      ) : null}

      {canQuery && summaryQuery.isLoading && !summary ? <LoadingState message="대시보드를 불러오는 중입니다." /> : null}
      {canQuery && summaryQuery.isError && !summary ? <ErrorState title="대시보드를 불러오지 못했습니다." description={getApiErrorMessage(summaryQuery.error)} /> : null}

      {canQuery && summary ? (
        <>
          <section className="dashboard-home-grid">
            <section className="panel space-y-4">
              <div>
                <h2 className="panel-title">작업 범위</h2>
                <p className="panel-description">현재 범위</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <ScopeInfoItem label="현재 범위" value={getScopeLabel(selectedPlant, selectedZone)} />
                <ScopeInfoItem label="발전소" value={selectedPlant?.name ?? '전체 발전소'} />
                <ScopeInfoItem label="점검 영역" value={selectedZone?.name ?? '전체 점검 영역'} />
                <ScopeInfoItem label="현재 점검" value={continueInspection?.name ?? '선택된 점검 없음'} />
              </div>
              {!continueInspection ? (
                <CompactEmptyState
                  title="선택된 점검이 없습니다."
                  description="새 점검을 시작하세요."
                  action={<Link className="btn btn-secondary" to="/inspections">점검 목록</Link>}
                  compact
                />
              ) : null}
            </section>

            <section className="panel space-y-4">
              <div>
                <h2 className="panel-title">현재 작업</h2>
                <p className="panel-description">가장 먼저 이어갈 점검입니다.</p>
              </div>
              <CurrentWorkCard
                inspection={continueInspection}
                inspectionDetail={currentInspectionDetailQuery.data?.data ?? null}
                result={currentInspectionResult}
                fallback={dashboardFocus}
              />
            </section>
          </section>

          <section className="panel space-y-4">
            <div>
              <h2 className="panel-title">오늘 우선 작업</h2>
              <p className="panel-description">처리할 작업만 표시합니다.</p>
            </div>
            {hasTaskCounts ? (
              <div className="task-queue-list">
                {taskQueue.map((task) => (
                  <TaskQueueCard key={task.title} task={task} />
                ))}
              </div>
            ) : (
              <CompactEmptyState
                title="우선 작업이 없습니다."
                description="새 점검 시작 또는 결과 검토를 진행하세요."
                action={<Link className="btn btn-secondary" to="/results">최근 결과 보기</Link>}
                compact
              />
            )}
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <section className="panel space-y-5">
              <div className="toolbar gap-3">
                <div>
                  <h2 className="panel-title">새 점검 시작</h2>
                  <p className="panel-description">발전소와 점검 영역을 선택해 점검을 시작합니다.</p>
                </div>
              </div>
              <div className="dashboard-start-card">
                <div>
                  <div className="text-lg font-semibold text-slate-950">새 점검을 시작할 준비가 되어 있습니다.</div>
                  <p className="mt-2 text-sm text-slate-600">발전소와 점검 영역을 선택해 점검을 시작합니다.</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button className="btn btn-primary" type="button" onClick={() => setIsCreateWizardOpen(true)}>새 점검 시작</button>
                  <Link className="btn btn-secondary" to="/plants">발전소 보기</Link>
                </div>
              </div>
            </section>

            <section className="panel space-y-5">
              <div>
                <h2 className="panel-title">진행 중 점검</h2>
                <p className="panel-description">이어갈 점검</p>
              </div>
              {continueInspection ? (
                <div className="space-y-4">
                  <ContinueInspectionCard inspection={continueInspection} />
                  {recentInspectionRows.length > 1 ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {recentInspectionRows.slice(1, 3).map((inspection) => (
                        <RecentInspectionCompactCard key={inspection.inspectionId} inspection={inspection} />
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <CompactEmptyState
                  title="진행 중인 점검이 없습니다."
                  description="새 점검을 시작하세요."
                  action={<button className="btn btn-secondary" type="button" onClick={() => setIsCreateWizardOpen(true)}>새 점검 시작</button>}
                  compact
                />
              )}
            </section>
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <section className="panel space-y-5">
              <div className="toolbar gap-3">
                <div>
                  <h2 className="panel-title">분석·결과 처리</h2>
                  <p className="panel-description">실패한 분석과 검토 대기 결과를 확인합니다.</p>
                </div>
                <Link className="btn btn-secondary" to="/results">결과 목록</Link>
              </div>
              {(summary.failedJobCount > 0 || summary.pendingReviewCount > 0 || summary.highPriorityCount > 0 || mergedRecentResults.length > 0 || priorityTargets.length > 0) ? (
                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <CompactStatusPill label="분석 실패" value={`${formatCount(summary.failedJobCount)}건`} tone={summary.failedJobCount > 0 ? 'danger' : 'default'} />
                    <CompactStatusPill label="결과 검토 대기" value={`${formatCount(summary.pendingReviewCount)}건`} tone={summary.pendingReviewCount > 0 ? 'warning' : 'default'} />
                    <CompactStatusPill label="높은 우선순위" value={`${formatCount(summary.highPriorityCount)}건`} tone={summary.highPriorityCount > 0 ? 'danger' : 'default'} />
                  </div>

                  {topPriorityTarget ? <PriorityTargetCard target={topPriorityTarget} compact /> : null}

                  {mergedRecentResults.length > 0 ? (
                    <div className="grid gap-4 lg:grid-cols-2">
                      {mergedRecentResults.slice(0, 2).map((result, index) => (
                        <RecentResultCard key={result.resultId ?? `recent-result-${index}`} result={result} compact />
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <CompactEmptyState
                  title="등록된 분석 결과가 없습니다."
                  description="이미지를 등록하면 분석을 요청할 수 있습니다."
                  action={<Link className="btn btn-secondary" to="/inspections">점검 목록 보기</Link>}
                  compact
                />
              )}
            </section>

            <section className="panel space-y-5">
              <div>
                <h2 className="panel-title">보조 통계</h2>
                <p className="panel-description">운영 수치</p>
              </div>
              <div className="dashboard-kpi-grid">
                <KpiCard label="발전소" value={summary.totalPlantCount} compact />
                <KpiCard label="점검 영역" value={summary.totalZoneCount} compact />
                <KpiCard label="점검" value={summary.totalInspectionCount} compact />
                <KpiCard label="분석 결과" value={summary.totalAnalysisResultCount} compact />
                <KpiCard label="진행 중 점검" value={summary.inProgressInspectionCount} tone={summary.inProgressInspectionCount > 0 ? 'warning' : 'default'} compact />
                <KpiCard label="대기 작업" value={summary.queuedJobCount + summary.runningJobCount} tone={(summary.queuedJobCount + summary.runningJobCount) > 0 ? 'warning' : 'default'} compact />
              </div>
            </section>
          </section>

          <details className="panel" open={false}>
            <summary className="cursor-pointer list-none">
              <div className="toolbar gap-3">
                <div>
                  <h2 className="panel-title">추가 통계 보기</h2>
                  <p className="panel-description">필요할 때만 펼쳐 확인합니다.</p>
                </div>
                <StatusBadge label="보조 정보" tone="default" />
              </div>
            </summary>
            <div className="mt-5 space-y-6">
              <section className="grid gap-6 xl:grid-cols-2">
                <DashboardChartSection title="조치 후보 통계" description="최근 분석 결과에서 어떤 후속 조치가 필요한지 요약합니다." isLoading={actionStatsQuery.isLoading} error={actionStatsQuery.isError ? getApiErrorMessage(actionStatsQuery.error) : null} isEmpty={actionChartData.length === 0} emptyTitle="조치 후보 통계가 없습니다." emptyDescription="분석 결과가 쌓이면 후속 조치 분포를 확인할 수 있습니다." compactWhenEmpty>
                  <div className="chart-shell">
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={actionChartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="actionCandidate" tickFormatter={(value) => getActionCandidateLabel(value)} />
                        <YAxis allowDecimals={false} />
                        <Tooltip formatter={(value) => [`${value}건`, '건수']} labelFormatter={(value) => getActionCandidateLabel(value as ActionCandidate)} />
                        <Bar dataKey="count" radius={[12, 12, 0, 0]}>
                          {actionChartData.map((item, index) => <Cell key={`${item.actionCandidate}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </DashboardChartSection>

                <DashboardChartSection title="심각도 분포" description="완료된 분석 결과의 위험 수준을 확인합니다." isLoading={severityStatsQuery.isLoading} error={severityStatsQuery.isError ? getApiErrorMessage(severityStatsQuery.error) : null} isEmpty={severityChartData.length === 0} emptyTitle="심각도 분포가 없습니다." emptyDescription="분석이 완료되면 심각도 분포를 확인할 수 있습니다." compactWhenEmpty>
                  <div className="chart-shell">
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie data={severityChartData} dataKey="count" nameKey="severityLevel" innerRadius={60} outerRadius={92} paddingAngle={3}>
                          {severityChartData.map((item, index) => <Cell key={`${item.severityLevel}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value}건`, '건수']} labelFormatter={(value) => getSeverityLevelLabel(value as SeverityLevel)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="inline-actions">
                    {severityChartData.map((item) => <StatusBadge key={item.severityLevel} label={`${getSeverityLevelLabel(item.severityLevel)} ${item.count}건`} tone={getSeverityLevelTone(item.severityLevel)} />)}
                  </div>
                </DashboardChartSection>
              </section>

              <DashboardChartSection title="기간별 점검 추이" description="같은 범위에서 점검 수와 이상 결과 수의 변화 흐름을 확인합니다." isLoading={trendQuery.isLoading} error={trendQuery.isError ? getApiErrorMessage(trendQuery.error) : null} isEmpty={!hasTrendChartData} emptyTitle="아직 추이를 표시할 데이터가 부족합니다." emptyDescription="같은 점검 영역의 결과가 누적되면 기간별 변화를 확인할 수 있습니다." compactWhenEmpty>
                <div className="chart-shell">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={trendChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="trendDate" tickFormatter={(value) => formatDate(String(value))} />
                      <YAxis allowDecimals={false} />
                      <Tooltip labelFormatter={(value) => formatDate(String(value))} formatter={(value, name) => [`${value}건`, name === 'inspectionCount' ? '점검 수' : '이상 결과 수']} />
                      <Line type="monotone" dataKey="inspectionCount" stroke="#0369a1" strokeWidth={3} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="anomalyCount" stroke="#dc2626" strokeWidth={3} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </DashboardChartSection>

              <section className="grid gap-6 xl:grid-cols-2">
                <section className="panel space-y-4">
                  <div>
                    <h3 className="panel-title">우선 확인 대상</h3>
                    <p className="panel-description">우선순위가 높은 점검 영역을 확인합니다.</p>
                  </div>
                  {priorityTargets.length > 0 ? (
                    <div className="space-y-3">
                      {priorityTargets.slice(0, 3).map((target, index) => (
                        <PriorityTargetCard key={buildPriorityTargetKey(target, index)} target={target} compact />
                      ))}
                    </div>
                  ) : (
                    <CompactEmptyState title="우선 확인 대상이 없습니다." description="분석 결과가 누적되면 우선 확인 대상이 표시됩니다." compact />
                  )}
                </section>

                <section className="panel space-y-4">
                  <div>
                    <h3 className="panel-title">운영 요약</h3>
                    <p className="panel-description">현재 범위의 진행 현황을 간단히 확인합니다.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <MiniMetric label="완료 점검" value={summary.completedInspectionCount} />
                    <MiniMetric label="전체 이미지" value={summary.totalImageCount} />
                    <MiniMetric label="분석 작업" value={summary.totalAnalysisJobCount} />
                    <MiniMetric label="정상 결과" value={summary.normalResultCount} />
                    <MiniMetric label="이상 결과" value={summary.anomalyResultCount} />
                    <MiniMetric label="반복 또는 악화" value={summary.repeatedAnomalyCount + summary.worsenedCount} />
                  </div>
                </section>
              </section>
            </div>
          </details>
        </>
      ) : null}

      <InspectionCreateWizard
        isOpen={isCreateWizardOpen}
        onClose={() => setIsCreateWizardOpen(false)}
        initialPlantId={params.plantId}
        initialZoneId={params.zoneId}
      />
    </section>
  )
}

function KpiCard({ label, value, tone = 'default', compact = false }: { label: string; value: number; tone?: 'default' | 'warning' | 'danger'; compact?: boolean }) {
  return <article className={`kpi-card kpi-card-${tone} ${compact ? 'kpi-card-compact' : ''}`}><div className="text-sm font-medium text-slate-500">{label}</div><div className={`mt-3 font-semibold text-slate-900 ${compact ? 'text-2xl' : 'text-3xl'}`}>{formatCount(value)}</div></article>
}

type TaskQueueItem = {
  title: string
  count: number
  description: string
  href: string
  actionLabel: string
  tone: 'default' | 'warning' | 'danger'
}

type DashboardFocus = {
  title: string
  description: string
  badge: string
  tone: 'default' | 'success' | 'warning' | 'danger'
  primaryLabel: string
  primaryHref: string
  secondaryLabel?: string
  secondaryHref?: string
}

function TaskQueueCard({ task }: { task: TaskQueueItem }) {
  const hasAction = task.count > 0
  const badgeTone = hasAction ? task.tone : 'default'

  return (
    <article className={`task-queue-card task-queue-item ${hasAction ? `task-queue-card-${task.tone}` : ''}`}>
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-950">{task.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{task.description}</p>
          </div>
          <StatusBadge label={`${task.count}건`} tone={badgeTone} />
        </div>
      </div>
      {hasAction ? (
        <div className="task-queue-action">
          <Link className="btn btn-secondary" to={task.href}>{task.actionLabel}</Link>
        </div>
      ) : (
        <div className="text-sm text-slate-500">없음</div>
      )}
    </article>
  )
}

function ScopeInfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</div>
      <div className="mt-2 text-sm font-medium text-slate-900">{value}</div>
    </div>
  )
}

function CurrentWorkCard({
  inspection,
  inspectionDetail,
  result,
  fallback,
}: {
  inspection: InspectionSummary | null
  inspectionDetail: { images: { imageId: number }[]; analysisJobIds: number[] } | null
  result: (RecentInspectionResult & { reviewStatus: ReviewStatus | null }) | null
  fallback: DashboardFocus
}) {
  if (!inspection) {
    return (
      <article className="workflow-focus-card dashboard-focus-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-sky-700">현재 작업 없음</div>
            <h3 className="mt-2 text-2xl font-semibold text-slate-950">{fallback.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{fallback.description}</p>
          </div>
          <StatusBadge label={fallback.badge} tone={fallback.tone} />
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link className="btn btn-primary" to={fallback.primaryHref}>{fallback.primaryLabel}</Link>
          {fallback.secondaryHref ? <Link className="btn btn-secondary" to={fallback.secondaryHref}>{fallback.secondaryLabel}</Link> : null}
        </div>
      </article>
    )
  }

  const imageCount = inspectionDetail?.images.length ?? 0
  const analysisJobCount = inspectionDetail?.analysisJobIds.length ?? 0
  const resultStatus = result ? getReviewStatusLabel(result.reviewStatus) : '결과 없음'
  const nextAction = getCurrentWorkNextAction(inspection.inspectionStatus, Boolean(result))

  return (
    <article className="workflow-focus-card dashboard-focus-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-sky-700">선택된 점검</div>
          <h3 className="mt-2 text-2xl font-semibold text-slate-950">{inspection.name}</h3>
          <p className="mt-2 text-sm text-slate-600">{nextAction.description}</p>
        </div>
        <StatusBadge label={getInspectionStatusLabel(inspection.inspectionStatus)} tone={getInspectionStatusTone(inspection.inspectionStatus)} />
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ScopeInfoItem label="다음 작업" value={nextAction.label} />
        <ScopeInfoItem label="업로드 이미지 수" value={`${formatCount(imageCount)}건`} />
        <ScopeInfoItem label="분석 상태" value={getInspectionProgressText(inspection.inspectionStatus)} />
        <ScopeInfoItem label="결과 상태" value={resultStatus} />
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link className="btn btn-primary" to={`/inspections/${inspection.inspectionId}`}>{nextAction.primaryLabel}</Link>
        {result?.resultId ? <Link className="btn btn-secondary" to={`/results/${result.resultId}`}>결과 보기</Link> : null}
        {!result?.resultId ? <Link className="btn btn-secondary" to="/inspections">점검 목록</Link> : null}
      </div>
      <div className="mt-4 text-sm text-slate-500">
        촬영 시각 {inspection.capturedAt ? formatDateTime(inspection.capturedAt) : '-'} · 분석 작업 {formatCount(analysisJobCount)}건
      </div>
    </article>
  )
}

function ContinueInspectionCard({ inspection }: { inspection: InspectionSummary }) {
  const plantQuery = usePlant(inspection.plantId ?? 0)
  const zoneQuery = useZone(inspection.zoneId)
  const plantName = plantQuery.data?.data.name ?? '발전소 확인 필요'
  const zoneName = zoneQuery.data?.data.name ?? '점검 영역 확인 필요'

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold text-slate-950">{inspection.name}</div>
          <p className="mt-1 text-sm text-slate-600">{plantName} · {zoneName}</p>
        </div>
        <StatusBadge label={getInspectionStatusLabel(inspection.inspectionStatus)} tone={getInspectionStatusTone(inspection.inspectionStatus)} />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <InfoBlock label="촬영 시각" value={inspection.capturedAt ? formatDateTime(inspection.capturedAt) : '-'} />
        <InfoBlock label="진행 상태" value={getInspectionProgressText(inspection.inspectionStatus)} />
        <InfoBlock label="등록 시각" value={formatDateTime(inspection.createdAt)} />
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link className="btn btn-primary" to={`/inspections/${inspection.inspectionId}`}>이어가기</Link>
        <Link className="btn btn-secondary" to="/inspections">점검 목록</Link>
      </div>
    </article>
  )
}

function CompactStatusPill({ label, value, tone }: { label: string; value: string; tone: 'default' | 'warning' | 'danger' }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</div>
      <div className="mt-2 flex items-center gap-2">
        <div className="text-lg font-semibold text-slate-950">{value}</div>
        <StatusBadge label={label} tone={tone} />
      </div>
    </div>
  )
}

function RecentInspectionCompactCard({ inspection }: { inspection: InspectionSummary }) {
  const zoneQuery = useZone(inspection.zoneId)

  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-950">{inspection.name}</div>
          <p className="mt-1 text-sm text-slate-600">{zoneQuery.data?.data.name ?? '점검 영역 확인 중'}</p>
        </div>
        <StatusBadge label={getInspectionStatusLabel(inspection.inspectionStatus)} tone={getInspectionStatusTone(inspection.inspectionStatus)} />
      </div>
      <div className="mt-3">
        <Link className="btn btn-secondary" to={`/inspections/${inspection.inspectionId}`}>열기</Link>
      </div>
    </article>
  )
}
function MiniMetric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</div><div className="mt-2 text-xl font-semibold text-slate-900">{formatCount(value)}건</div></div>
}

function CompactEmptyState({ title, description, action, compact = false }: { title: string; description: string; action?: ReactNode; compact?: boolean }) {
  return <div className={`compact-empty ${compact ? 'p-4' : ''}`}><div className="text-base font-semibold text-slate-900">{title}</div><p className="mt-2 text-sm text-slate-600">{description}</p>{action ? <div className="mt-4">{action}</div> : null}</div>
}

function DashboardChartSection({ title, description, isLoading, error, isEmpty, emptyTitle, emptyDescription, emptyAction, compactWhenEmpty = false, children }: { title: string; description: string; isLoading: boolean; error: string | null; isEmpty: boolean; emptyTitle: string; emptyDescription: string; emptyAction?: ReactNode; compactWhenEmpty?: boolean; children: ReactNode }) {
  return <section className={`panel ${isEmpty && !isLoading && !error && compactWhenEmpty ? 'space-y-4' : 'space-y-5'}`}><div><h2 className="panel-title">{title}</h2><p className="panel-description">{description}</p></div>{isLoading ? <LoadingState message={`${title} 데이터를 불러오는 중입니다.`} /> : null}{!isLoading && error ? <ErrorState title={`${title} 조회에 실패했습니다.`} description={error} /> : null}{!isLoading && !error && isEmpty ? <CompactEmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} compact={compactWhenEmpty} /> : null}{!isLoading && !error && !isEmpty ? children : null}</section>
}

function PriorityTargetCard({ target, compact = false }: { target: PriorityTarget; compact?: boolean }) {
  const plantQuery = usePlant(target.plantId ?? 0)
  const zoneQuery = useZone(target.zoneId ?? 0)
  const plantName = plantQuery.data?.data.name ?? '발전소 확인 필요'
  const zoneName = zoneQuery.data?.data.name ?? '점검 영역 확인 필요'

  return (
    <article className={`rounded-3xl border border-slate-200 bg-white shadow-sm ${compact ? 'p-4' : 'p-5'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-slate-950">{plantName}</div>
          <p className="mt-1 text-sm text-slate-600">{zoneName} · {getTargetTypeLabel(target.targetType)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge label={getPriorityLevelLabel(target.priorityLevel)} tone={getPriorityLevelTone(target.priorityLevel)} />
          <StatusBadge label={getSeverityLevelLabel(target.severityLevel)} tone={getSeverityLevelTone(target.severityLevel)} />
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <InfoBlock label="조치 후보" value={getActionCandidateLabel(target.actionCandidate)} />
        <InfoBlock label="우선 확인 사유" value={getPriorityReasonLabel(target.priorityReason)} />
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        {target.resultId ? <Link className="btn btn-secondary" to={`/results/${target.resultId}`}>결과 보기</Link> : null}
        {target.zoneId ? <Link className="btn btn-secondary" to={`/zones/${target.zoneId}`}>점검 영역 보기</Link> : null}
      </div>
    </article>
  )
}

function RecentResultCard({ result, compact = false }: { result: RecentInspectionResult & { reviewStatus: ReviewStatus | null }; compact?: boolean }) {
  return (
    <article className={`rounded-3xl border border-slate-200 bg-white shadow-sm ${compact ? 'p-4' : 'p-5'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-slate-950">{result.inspectionName || '결과 확인 필요'}</div>
          <p className="mt-1 text-sm text-slate-600">{[result.plantName, result.zoneName].filter(Boolean).join(' · ') || '점검 위치 확인 필요'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge label={getSeverityLevelLabel(result.severityLevel)} tone={getSeverityLevelTone(result.severityLevel)} />
          <StatusBadge label={getPriorityLevelLabel(result.priorityLevel)} tone={getPriorityLevelTone(result.priorityLevel)} />
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <InfoBlock label="조치 후보" value={getActionCandidateLabel(result.actionCandidate)} />
        <InfoBlock label="검토 상태" value={getReviewStatusLabel(result.reviewStatus)} />
        <InfoBlock label="분석 시각" value={result.analyzedAt ? formatDateTime(result.analyzedAt) : '-'} />
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        {result.resultId ? <Link className="btn btn-secondary" to={`/results/${result.resultId}`}>결과 보기</Link> : null}
        {result.inspectionId ? <Link className="btn btn-secondary" to={`/inspections/${result.inspectionId}`}>점검 보기</Link> : null}
      </div>
    </article>
  )
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return <div><div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</div><div className="mt-1 text-sm text-slate-900">{value}</div></div>
}

function buildPriorityTargetKey(target: PriorityTarget, index: number) {
  return `${target.resultId ?? 'result'}-${target.zoneId ?? 'zone'}-${index}`
}

function getScopeLabel(
  selectedPlant: { name: string } | null,
  selectedZone: { name: string } | null,
) {
  if (selectedZone) {
    return '점검 영역 기준'
  }
  if (selectedPlant) {
    return '발전소 기준'
  }
  return '전체 범위'
}

function buildTaskQueue({
  summary,
  uploadPendingCount,
  analysisPendingCount,
  failedInspectionCount,
  topPriorityTarget,
  continueInspection,
}: {
  summary?: DashboardSummary
  uploadPendingCount: number
  analysisPendingCount: number
  failedInspectionCount: number
  topPriorityTarget: PriorityTarget | null
  continueInspection: InspectionSummary | null
}): TaskQueueItem[] {
  if (!summary) {
    return []
  }

  return [
    {
      title: '이미지 등록 대기',
      count: uploadPendingCount,
      description: uploadPendingCount > 0 ? '등록 필요' : '없음',
      href: continueInspection ? `/inspections/${continueInspection.inspectionId}` : '/inspections',
      actionLabel: '점검 이어가기',
      tone: uploadPendingCount > 0 ? 'warning' : 'default',
    },
    {
      title: '분석 요청 대기',
      count: analysisPendingCount,
      description: analysisPendingCount > 0 ? '요청 대기' : '없음',
      href: continueInspection ? `/inspections/${continueInspection.inspectionId}` : '/inspections',
      actionLabel: '점검 이어가기',
      tone: analysisPendingCount > 0 ? 'warning' : 'default',
    },
    {
      title: '분석 실패',
      count: summary.failedJobCount,
      description: summary.failedJobCount > 0 ? '재확인 필요' : '없음',
      href:
        failedInspectionCount > 0 && continueInspection
          ? `/inspections/${continueInspection.inspectionId}`
          : '/inspections',
      actionLabel: '점검 이어가기',
      tone: summary.failedJobCount > 0 ? 'danger' : 'default',
    },
    {
      title: '결과 검토 대기',
      count: summary.pendingReviewCount,
      description: summary.pendingReviewCount > 0 ? '검토 필요' : '없음',
      href: '/results',
      actionLabel: '결과 검토',
      tone: summary.pendingReviewCount > 0 ? 'warning' : 'default',
    },
    {
      title: '높은 우선순위',
      count: summary.highPriorityCount,
      description: summary.highPriorityCount > 0 ? '우선 확인' : '없음',
      href: topPriorityTarget?.resultId ? `/results/${topPriorityTarget.resultId}` : '/results',
      actionLabel: '우선 결과 보기',
      tone: summary.highPriorityCount > 0 ? 'danger' : 'default',
    },
  ]
}

function buildDashboardFocus(
  summary: DashboardSummary | undefined,
  continueInspection: InspectionSummary | null,
  topPriorityTarget: PriorityTarget | null,
): DashboardFocus {
  if (!summary) {
    return {
      title: '운영 상태를 불러오는 중입니다.',
      description: '잠시 후 다시 확인하세요.',
      badge: '대기 중',
      tone: 'default' as const,
      primaryLabel: '새 점검 시작',
      primaryHref: '/inspections',
      secondaryLabel: '결과 검토',
      secondaryHref: '/results',
    }
  }

  if (summary.highPriorityCount > 0 && topPriorityTarget?.resultId) {
    return {
      title: '우선 확인이 필요한 결과가 있습니다.',
      description: '결과 검토가 필요합니다.',
      badge: `${formatCount(summary.highPriorityCount)}건`,
      tone: 'danger' as const,
      primaryLabel: '우선 결과 보기',
      primaryHref: `/results/${topPriorityTarget.resultId}`,
      secondaryLabel: '결과 목록',
      secondaryHref: '/results',
    }
  }

  if (summary.pendingReviewCount > 0) {
    return {
      title: '검토가 필요한 결과가 남아 있습니다.',
      description: '결과 검토를 진행하세요.',
      badge: `${formatCount(summary.pendingReviewCount)}건`,
      tone: 'warning' as const,
      primaryLabel: '결과 검토',
      primaryHref: '/results',
      secondaryLabel: '새 점검 시작',
      secondaryHref: '/inspections',
    }
  }

  if (continueInspection) {
    return {
      title: `${continueInspection.name} 점검을 이어서 진행하세요.`,
      description: '남은 작업을 이어가세요.',
      badge: getInspectionStatusLabel(continueInspection.inspectionStatus),
      tone: continueInspection.inspectionStatus === 'FAILED' ? 'danger' : 'warning',
      primaryLabel: '점검 이어가기',
      primaryHref: `/inspections/${continueInspection.inspectionId}`,
      secondaryLabel: '새 점검 시작',
      secondaryHref: '/inspections',
    }
  }

  return {
    title: '오늘 점검을 새로 시작할 수 있습니다.',
    description: '새 점검을 시작하세요.',
    badge: '준비 완료',
    tone: 'success' as const,
    primaryLabel: '새 점검 시작',
    primaryHref: '/inspections',
    secondaryLabel: '발전소 보기',
    secondaryHref: '/plants',
  }
}

function getCurrentWorkNextAction(
  status: InspectionStatus,
  hasResult: boolean,
): {
  label: string
  primaryLabel: string
  description: string
} {
  switch (status) {
    case 'READY':
      return {
        label: '이미지 업로드',
        primaryLabel: '이미지 업로드',
        description: '다음 작업: 이미지 업로드',
      }
    case 'UPLOADING':
      return {
        label: '이미지 확인',
        primaryLabel: '점검 이어가기',
        description: '다음 작업: 이미지 확인',
      }
    case 'ANALYZING':
      return {
        label: '분석 상태 확인',
        primaryLabel: '분석 상태 확인',
        description: '다음 작업: 분석 상태 확인',
      }
    case 'FAILED':
      return {
        label: '실패 확인',
        primaryLabel: '실패 확인',
        description: '다음 작업: 실패 확인',
      }
    case 'COMPLETED':
      return {
        label: hasResult ? '결과 검토' : '점검 확인',
        primaryLabel: hasResult ? '결과 검토' : '점검 확인',
        description: hasResult ? '다음 작업: 결과 검토' : '다음 작업: 점검 확인',
      }
  }
}

function buildFilterSummary(plantName?: string | null, zoneName?: string | null, from?: string, to?: string, interval?: DashboardTrendInterval) {
  const scope = [plantName, zoneName].filter(Boolean).join(' · ') || '전체 범위'
  const dateRange = from || to ? `${from || '시작일 미설정'} ~ ${to || '종료일 미설정'}` : '기간 제한 없음'
  return `${scope} · ${dateRange} · ${getDashboardIntervalLabel(interval ?? 'WEEKLY')}`
}

function toDashboardInterval(value?: string | null): DashboardTrendInterval {
  return DASHBOARD_INTERVAL_OPTIONS.includes(value as DashboardTrendInterval) ? (value as DashboardTrendInterval) : 'WEEKLY'
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
      return '전체 영역'
    case 'ARRAY':
      return 'Array'
    case 'PANEL':
      return 'Panel'
    case 'MODULE':
      return 'Module'
    default:
      return '점검 대상'
  }
}
function getInspectionStatusLabel(status: InspectionStatus) {
  switch (status) {
    case 'READY':
      return '준비'
    case 'UPLOADING':
      return '업로드 중'
    case 'ANALYZING':
      return '분석 중'
    case 'COMPLETED':
      return '완료'
    case 'FAILED':
      return '실패'
  }
}

function getInspectionStatusTone(status: InspectionStatus) {
  switch (status) {
    case 'READY':
      return 'default'
    case 'UPLOADING':
    case 'ANALYZING':
      return 'warning'
    case 'COMPLETED':
      return 'success'
    case 'FAILED':
      return 'danger'
  }
}

function getInspectionProgressText(status: InspectionStatus) {
  switch (status) {
    case 'READY':
      return '이미지 업로드 대기'
    case 'UPLOADING':
      return '이미지 업로드 진행 중'
    case 'ANALYZING':
      return '분석 요청 진행 중'
    case 'COMPLETED':
      return '결과 확인 가능'
    case 'FAILED':
      return '실패 내역 확인 필요'
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

function getPriorityReasonLabel(reason?: string | null) {
  switch (reason) {
    case 'worsened and repeated anomaly':
      return '반복 이상이면서 악화된 대상입니다.'
    case 'worsened tracking result':
      return '이전 점검 대비 악화된 대상입니다.'
    case 'repeated anomaly':
      return '반복적으로 이상이 관찰된 대상입니다.'
    case 'tracked anomaly':
      return '추적 중인 이상 대상입니다.'
    case 'severity level increased':
      return '심각도 등급이 상승했습니다.'
    case 'severity score increased':
      return '심각도 점수가 상승했습니다.'
    case 'anomaly count increased':
      return '이상 개수가 증가했습니다.'
    case 'new high severity defect detected':
      return '고심각 결함이 새로 감지됐습니다.'
    case 'no priority escalation':
      return '우선순위 상승 사유는 없습니다.'
    default:
      return reason?.trim() || '-'
  }
}



