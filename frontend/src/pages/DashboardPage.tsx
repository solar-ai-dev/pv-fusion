
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
  const topPriorityTarget = priorityTargets[0] ?? null
  const hasTaskCounts = Boolean(summary && (summary.pendingReviewCount > 0 || summary.failedJobCount > 0 || summary.highPriorityCount > 0 || summary.inProgressInspectionCount > 0 || recentInspectionRows.length > 0))

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
        title="대시보드"
        description="오늘 확인할 점검과 분석 결과를 한눈에 확인하세요."
        actions={
          <div className="page-actions">
            <Link className="btn btn-primary" to="/inspections">새 점검 시작</Link>
            <Link className="btn btn-secondary" to="/results">결과 검토</Link>
            <button className="btn btn-secondary" type="button" onClick={handleRefresh}>새로고침</button>
          </div>
        }
      />

      <details className="panel" open={!canQuery}>
        <summary className="cursor-pointer list-none">
          <div className="toolbar gap-3">
            <div>
              <h2 className="panel-title">조회 조건</h2>
              <p className="panel-description">{buildFilterSummary(selectedPlant?.name, selectedZone?.name, fromInput, toInput, intervalInput)}</p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge label={canQuery ? '조회 가능' : '범위 선택 필요'} tone={canQuery ? 'success' : 'warning'} />
              <span className="text-sm text-slate-500">열어 변경</span>
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
            description="발전소 또는 점검 영역을 선택하면 오늘 처리할 항목과 최근 진행 상황을 바로 확인할 수 있습니다."
            action={<Link className="btn btn-secondary" to="/plants">발전소 보기</Link>}
          />
        </section>
      ) : null}

      {canQuery && summaryQuery.isLoading && !summary ? <LoadingState message="대시보드를 불러오는 중입니다." /> : null}
      {canQuery && summaryQuery.isError && !summary ? <ErrorState title="대시보드를 불러오지 못했습니다." description={getApiErrorMessage(summaryQuery.error)} /> : null}

      {canQuery && summary ? (
        <>
          <section className="panel space-y-5">
            <div>
              <h2 className="panel-title">오늘 할 일</h2>
              <p className="panel-description">검토 대기, 분석 실패, 높은 우선순위, 진행 중 점검을 먼저 확인하세요.</p>
            </div>
            {hasTaskCounts ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <TodayTaskCard title="검토 대기 결과" count={summary.pendingReviewCount} description={summary.pendingReviewCount > 0 ? '확인하지 않은 분석 결과가 있습니다.' : '지금은 검토 대기 결과가 없습니다.'} href="/results" actionLabel="결과 검토" tone={summary.pendingReviewCount > 0 ? 'warning' : 'default'} />
                <TodayTaskCard title="분석 실패 작업" count={summary.failedJobCount} description={summary.failedJobCount > 0 ? '실패한 분석 작업을 다시 확인하세요.' : '지금은 실패한 분석 작업이 없습니다.'} href={continueInspection ? `/inspections/${continueInspection.inspectionId}` : '/inspections'} actionLabel="이어하기" tone={summary.failedJobCount > 0 ? 'danger' : 'default'} />
                <TodayTaskCard title="높은 우선순위" count={summary.highPriorityCount} description={summary.highPriorityCount > 0 ? '우선 확인이 필요한 결과가 있습니다.' : '긴급하게 확인할 결과는 없습니다.'} href={topPriorityTarget?.resultId ? `/results/${topPriorityTarget.resultId}` : '/results'} actionLabel="우선 결과 보기" tone={summary.highPriorityCount > 0 ? 'danger' : 'default'} />
                <TodayTaskCard title="진행 중 점검" count={summary.inProgressInspectionCount} description={summary.inProgressInspectionCount > 0 ? '이미지 업로드나 분석 요청을 이어서 진행하세요.' : '현재 진행 중인 점검은 없습니다.'} href={continueInspection ? `/inspections/${continueInspection.inspectionId}` : '/inspections'} actionLabel="이어하기" tone={summary.inProgressInspectionCount > 0 ? 'warning' : 'default'} />
                <TodayTaskCard title="최근 점검" count={recentInspectionRows.length} description={continueInspection ? `${continueInspection.name} 점검으로 바로 이동할 수 있습니다.` : '최근 점검이 없으면 새 점검부터 시작하세요.'} href={continueInspection ? `/inspections/${continueInspection.inspectionId}` : '/inspections'} actionLabel={continueInspection ? '최근 점검 열기' : '새 점검 시작'} tone="default" />
              </div>
            ) : (
              <CompactEmptyState title="오늘 처리할 긴급 항목이 없습니다." description="상단의 새 점검 시작 또는 결과 검토로 다음 작업을 이어가세요." action={<Link className="btn btn-secondary" to="/results">최근 결과 확인</Link>} />
            )}
          </section>

          <section className="panel space-y-5">
            <div>
              <h2 className="panel-title">빠른 시작</h2>
              <p className="panel-description">자주 쓰는 흐름으로 바로 이동해 다음 작업을 이어가세요.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <QuickStartCard title="새 점검 시작" description="발전소와 점검 영역을 선택해 새 점검을 시작합니다." href="/inspections" actionLabel="새 점검 시작" tone="primary" />
              <QuickStartCard title="진행 중 점검 이어하기" description="이미지 업로드나 분석 요청이 남은 점검을 이어서 진행합니다." href={continueInspection ? `/inspections/${continueInspection.inspectionId}` : '/inspections'} actionLabel="이어하기" />
              <QuickStartCard title="결과 검토" description="분석이 완료된 결과의 조치 후보와 검토 상태를 확인합니다." href="/results" actionLabel="결과 검토" />
              <QuickStartCard title="발전소 보기" description="등록된 발전소와 점검 영역을 확인합니다." href="/plants" actionLabel="발전소 보기" />
            </div>
          </section>
          <section className="kpi-grid">
            <KpiCard label="발전소" value={summary.totalPlantCount} />
            <KpiCard label="점검 영역" value={summary.totalZoneCount} />
            <KpiCard label="점검" value={summary.totalInspectionCount} />
            <KpiCard label="분석 결과" value={summary.totalAnalysisResultCount} />
            <KpiCard label="검토 대기" value={summary.pendingReviewCount} tone={summary.pendingReviewCount > 0 ? 'warning' : 'default'} />
            <KpiCard label="높은 우선순위" value={summary.highPriorityCount} tone={summary.highPriorityCount > 0 ? 'danger' : 'default'} />
            <KpiCard label="분석 실패" value={summary.failedJobCount} tone={summary.failedJobCount > 0 ? 'danger' : 'default'} />
            <KpiCard label="대기 작업" value={summary.queuedJobCount} tone={summary.queuedJobCount > 0 ? 'warning' : 'default'} />
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <DashboardChartSection title="조치 후보 통계" description="최근 분석 결과에서 어떤 후속 조치가 필요한지 요약합니다." isLoading={actionStatsQuery.isLoading} error={actionStatsQuery.isError ? getApiErrorMessage(actionStatsQuery.error) : null} isEmpty={actionChartData.length === 0} emptyTitle="아직 조치 후보 통계가 없습니다." emptyDescription="분석 결과가 쌓이면 청소, 재촬영, 현장 점검, 교체 검토 후보가 표시됩니다." compactWhenEmpty>
              <div className="chart-shell">
                <ResponsiveContainer width="100%" height={280}>
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

            <DashboardChartSection title="심각도 분포" description="완료된 분석 결과의 위험 수준을 빠르게 확인합니다." isLoading={severityStatsQuery.isLoading} error={severityStatsQuery.isError ? getApiErrorMessage(severityStatsQuery.error) : null} isEmpty={severityChartData.length === 0} emptyTitle="아직 심각도 분포가 없습니다." emptyDescription="분석이 완료되면 심각도 분포를 확인할 수 있습니다." emptyAction={<Link className="btn btn-secondary" to="/results">결과 목록 보기</Link>} compactWhenEmpty>
              <div className="chart-shell">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={severityChartData} dataKey="count" nameKey="severityLevel" innerRadius={64} outerRadius={96} paddingAngle={3}>
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
              <ResponsiveContainer width="100%" height={320}>
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
            <section className="panel space-y-5">
              <div>
                <h2 className="panel-title">우선 확인 대상</h2>
                <p className="panel-description">우선순위가 높은 결과와 점검 영역을 먼저 확인하세요.</p>
              </div>
              {priorityTargets.length > 0 ? <div className="space-y-4">{priorityTargets.slice(0, 5).map((target, index) => <PriorityTargetCard key={buildPriorityTargetKey(target, index)} target={target} />)}</div> : <CompactEmptyState title="우선 확인 대상이 없습니다." description="분석 결과가 누적되면 우선 확인할 점검 영역이 표시됩니다." />}
            </section>

            <section className="panel space-y-5">
              <div>
                <h2 className="panel-title">최근 분석 결과</h2>
                <p className="panel-description">최근 완료된 결과를 빠르게 검토하고 필요한 조치를 이어가세요.</p>
              </div>
              {mergedRecentResults.length > 0 ? <div className="space-y-4">{mergedRecentResults.map((result, index) => <RecentResultCard key={result.resultId ?? `recent-result-${index}`} result={result} />)}</div> : <CompactEmptyState title="아직 분석 결과가 없습니다." description="분석이 완료되면 결과와 조치 후보가 표시됩니다." action={<Link className="btn btn-secondary" to="/inspections">점검 목록 보기</Link>} />}
            </section>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <section className="panel space-y-5">
              <div>
                <h2 className="panel-title">최근 점검</h2>
                <p className="panel-description">최근 등록한 점검을 이어서 진행하거나 상태를 확인하세요.</p>
              </div>
              {recentInspectionsQuery.isLoading && recentInspectionRows.length === 0 ? <LoadingState message="최근 점검을 불러오는 중입니다." /> : null}
              {recentInspectionsQuery.isError ? <ErrorState title="최근 점검을 불러오지 못했습니다." description={getApiErrorMessage(recentInspectionsQuery.error)} /> : null}
              {!recentInspectionsQuery.isLoading && !recentInspectionsQuery.isError && recentInspectionRows.length > 0 ? <div className="space-y-4">{recentInspectionRows.map((inspection) => <RecentInspectionCard key={inspection.inspectionId} inspection={inspection} />)}</div> : null}
              {!recentInspectionsQuery.isLoading && !recentInspectionsQuery.isError && recentInspectionRows.length === 0 ? <CompactEmptyState title="아직 등록된 점검이 없습니다." description="상단의 새 점검 시작으로 첫 점검을 등록해 보세요." /> : null}
            </section>

            <section className="panel space-y-5">
              <div>
                <h2 className="panel-title">운영 요약</h2>
                <p className="panel-description">현재 범위에서 점검과 분석이 어디까지 진행됐는지 빠르게 확인합니다.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <MiniMetric label="진행 중 점검" value={summary.inProgressInspectionCount} />
                <MiniMetric label="완료 점검" value={summary.completedInspectionCount} />
                <MiniMetric label="전체 이미지" value={summary.totalImageCount} />
                <MiniMetric label="분석 작업" value={summary.totalAnalysisJobCount} />
                <MiniMetric label="정상 결과" value={summary.normalResultCount} />
                <MiniMetric label="이상 결과" value={summary.anomalyResultCount} />
                <MiniMetric label="낮은 신뢰도" value={summary.lowConfidenceResultCount} />
                <MiniMetric label="반복 또는 악화" value={summary.repeatedAnomalyCount + summary.worsenedCount} />
              </div>
            </section>
          </section>
        </>
      ) : null}
    </section>
  )
}

function KpiCard({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'warning' | 'danger' }) {
  return <article className={`kpi-card kpi-card-${tone}`}><div className="text-sm font-medium text-slate-500">{label}</div><div className="mt-3 text-3xl font-semibold text-slate-900">{formatCount(value)}</div></article>
}

function TodayTaskCard({ title, count, description, href, actionLabel, tone }: { title: string; count: number; description: string; href: string; actionLabel: string; tone: 'default' | 'warning' | 'danger' }) {
  const hasAction = count > 0
  const badgeTone = hasAction ? tone : 'default'

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-950">{title}</h3>
          <p className="mt-2 text-sm text-slate-600">{description}</p>
        </div>
        <StatusBadge label={`${count}건`} tone={badgeTone} />
      </div>
      {hasAction ? (
        <div className="mt-4">
          <Link className="btn btn-secondary" to={href}>{actionLabel}</Link>
        </div>
      ) : (
        <div className="mt-4 text-sm text-slate-500">지금은 처리할 항목이 없습니다.</div>
      )}
    </article>
  )
}

function QuickStartCard({ title, description, href, actionLabel, tone = 'secondary' }: { title: string; description: string; href: string; actionLabel: string; tone?: 'primary' | 'secondary' }) {
  return <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="text-lg font-semibold text-slate-950">{title}</h3><p className="mt-2 text-sm text-slate-600">{description}</p><div className="mt-4"><Link className={tone === 'primary' ? 'btn btn-primary' : 'btn btn-secondary'} to={href}>{actionLabel}</Link></div></article>
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

function PriorityTargetCard({ target }: { target: PriorityTarget }) {
  const plantQuery = usePlant(target.plantId ?? 0)
  const zoneQuery = useZone(target.zoneId ?? 0)
  const plantName = plantQuery.data?.data.name ?? '발전소 확인 필요'
  const zoneName = zoneQuery.data?.data.name ?? '점검 영역 확인 필요'

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
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

function RecentInspectionCard({ inspection }: { inspection: InspectionSummary }) {
  const plantQuery = usePlant(inspection.plantId ?? 0)
  const zoneQuery = useZone(inspection.zoneId)
  const inspectionDetailQuery = useInspection(inspection.inspectionId)
  const plantName = plantQuery.data?.data.name ?? '발전소 확인 필요'
  const zoneName = zoneQuery.data?.data.name ?? '점검 영역 확인 필요'
  const imageCount = inspectionDetailQuery.data?.data.images.length ?? 0

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-slate-950">{inspection.name}</div>
          <p className="mt-1 text-sm text-slate-600">{plantName} · {zoneName}</p>
        </div>
        <StatusBadge label={getInspectionStatusLabel(inspection.inspectionStatus)} tone={getInspectionStatusTone(inspection.inspectionStatus)} />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <InfoBlock label="촬영 시각" value={inspection.capturedAt ? formatDateTime(inspection.capturedAt) : '-'} />
        <InfoBlock label="업로드 이미지 수" value={`${formatCount(imageCount)}건`} />
        <InfoBlock label="분석 상태" value={getInspectionProgressText(inspection.inspectionStatus)} />
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link className="btn btn-secondary" to={`/inspections/${inspection.inspectionId}`}>이어하기</Link>
      </div>
    </article>
  )
}

function RecentResultCard({ result }: { result: RecentInspectionResult & { reviewStatus: ReviewStatus | null } }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
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
