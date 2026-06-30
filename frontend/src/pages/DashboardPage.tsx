import { type ReactNode, useMemo, useState } from 'react'
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
  getDashboardIntervalLabel,
  getPriorityReasonLabel,
  type DashboardQueryParams,
  type DashboardTrendInterval,
} from '../features/dashboard/types'
import { getTargetTypeLabel } from '../features/images/types'
import {
  getActionCandidateLabel,
  getPriorityLevelLabel,
  getSeverityLevelLabel,
  getSeverityLevelTone,
} from '../features/results/types'
import { FormField } from '../shared/components/form/FormField'
import { PageHeader } from '../shared/components/layout/PageHeader'
import { EmptyState } from '../shared/components/state/EmptyState'
import { ErrorState } from '../shared/components/state/ErrorState'
import { LoadingState } from '../shared/components/state/LoadingState'
import { StatusBadge } from '../shared/components/state/StatusBadge'
import { DataTable } from '../shared/components/table/DataTable'
import {
  formatCount,
  formatDate,
  formatDateTime,
  getApiErrorMessage,
  parsePositiveNumber,
} from '../shared/utils'

const CHART_COLORS = ['#0f766e', '#0369a1', '#f59e0b', '#dc2626', '#7c3aed']

export function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const role = useAuth((state) => state.user?.role)

  const [plantIdInput, setPlantIdInput] = useState(searchParams.get('plantId') ?? '')
  const [zoneIdInput, setZoneIdInput] = useState(searchParams.get('zoneId') ?? '')
  const [fromInput, setFromInput] = useState(searchParams.get('from') ?? '')
  const [toInput, setToInput] = useState(searchParams.get('to') ?? '')

  const params = useMemo<DashboardQueryParams>(
    () => ({
      plantId: parsePositiveNumber(searchParams.get('plantId') ?? undefined) ?? undefined,
      zoneId: parsePositiveNumber(searchParams.get('zoneId') ?? undefined) ?? undefined,
      from: searchParams.get('from') ?? undefined,
      to: searchParams.get('to') ?? undefined,
    }),
    [searchParams],
  )

  const interval =
    (searchParams.get('interval') as DashboardTrendInterval | null) ?? 'WEEKLY'
  const hasScopedFilter = Boolean(params.plantId || params.zoneId)
  const canQuery = role === 'ADMIN' || hasScopedFilter

  const summaryQuery = useDashboardSummary(params, canQuery)
  const actionStatsQuery = useDashboardActionStats(params, canQuery)
  const severityStatsQuery = useDashboardSeverityStats(params, canQuery)
  const trendQuery = useDashboardTrends({ ...params, interval }, canQuery)

  const summary = summaryQuery.data?.data.summary
  const recentResults = summaryQuery.data?.data.recentResults ?? []
  const priorityTargets = summaryQuery.data?.data.priorityTargets ?? []
  const actionChartData = actionStatsQuery.data?.data.items ?? []
  const severityChartData = severityStatsQuery.data?.data.items ?? []
  const trendChartData = trendQuery.data?.data.points ?? []

  const handleSearch = (formData: FormData) => {
    const next = new URLSearchParams()
    const setIfPresent = (key: string, value: FormDataEntryValue | null) => {
      if (typeof value === 'string' && value.trim()) {
        next.set(key, value.trim())
      }
    }

    setIfPresent('plantId', formData.get('plantId'))
    setIfPresent('zoneId', formData.get('zoneId'))
    setIfPresent('from', formData.get('from'))
    setIfPresent('to', formData.get('to'))
    setIfPresent('interval', formData.get('interval'))
    setSearchParams(next)
  }

  const handleReset = () => {
    setPlantIdInput('')
    setZoneIdInput('')
    setFromInput('')
    setToInput('')
    setSearchParams({})
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="대시보드"
        description="요약, 통계, 추이, 우선 확인 대상을 한 화면에서 확인합니다."
        actions={
          <>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => {
                void summaryQuery.refetch()
                void actionStatsQuery.refetch()
                void severityStatsQuery.refetch()
                void trendQuery.refetch()
              }}
            >
              새로고침
            </button>
            <Link className="btn btn-secondary" to="/tracking">
              변화 추적
            </Link>
            <Link className="btn btn-secondary" to="/results">
              결과 목록
            </Link>
            <Link className="btn btn-secondary" to="/plants">
              발전소 보기
            </Link>
          </>
        }
      />

      <section className="panel stack-md">
        <div>
          <h2 className="panel-title">조회 필터</h2>
          <p className="panel-description">
            일반 사용자는 발전소 ID 또는 구역 ID 범위를 지정해야 대시보드 조회가 가능합니다.
          </p>
        </div>
        <form
          className="stack-md"
          onSubmit={(event) => {
            event.preventDefault()
            handleSearch(new FormData(event.currentTarget))
          }}
        >
          <div className="filter-grid">
            <FormField label="발전소 ID">
              <input
                className="input-field"
                name="plantId"
                value={plantIdInput}
                onChange={(event) => setPlantIdInput(event.target.value)}
              />
            </FormField>
            <FormField label="구역 ID">
              <input
                className="input-field"
                name="zoneId"
                value={zoneIdInput}
                onChange={(event) => setZoneIdInput(event.target.value)}
              />
            </FormField>
            <FormField label="조회 시작일">
              <input
                className="input-field"
                type="date"
                name="from"
                value={fromInput}
                onChange={(event) => setFromInput(event.target.value)}
              />
            </FormField>
            <FormField label="조회 종료일">
              <input
                className="input-field"
                type="date"
                name="to"
                value={toInput}
                onChange={(event) => setToInput(event.target.value)}
              />
            </FormField>
            <FormField label="추이 단위">
              <select className="input-field" name="interval" defaultValue={interval}>
                {DASHBOARD_INTERVAL_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {getDashboardIntervalLabel(option)}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          <div className="inline-actions">
            <button className="btn btn-primary" type="submit">
              조회
            </button>
            <button className="btn btn-secondary" type="button" onClick={handleReset}>
              초기화
            </button>
          </div>
        </form>
      </section>

      {!canQuery ? (
        <EmptyState
          title="먼저 발전소 또는 구역 범위를 지정해 주세요."
          description="현재 backend 구현상 일반 사용자 dashboard 조회는 plantId 또는 zoneId 필터를 요구합니다."
        />
      ) : null}

      {canQuery && summaryQuery.isLoading && !summary ? (
        <LoadingState message="대시보드 요약을 불러오는 중입니다." />
      ) : null}

      {canQuery && summaryQuery.isError ? (
        <ErrorState
          title="대시보드 요약을 불러오지 못했습니다."
          description={getApiErrorMessage(summaryQuery.error)}
        />
      ) : null}

      {summary ? (
        <>
          <section className="kpi-grid">
            <KpiCard label="발전소" value={summary.totalPlantCount} tone="default" />
            <KpiCard label="구역" value={summary.totalZoneCount} tone="default" />
            <KpiCard label="점검" value={summary.totalInspectionCount} tone="default" />
            <KpiCard label="분석 결과" value={summary.totalAnalysisResultCount} tone="default" />
            <KpiCard label="이상 구역" value={summary.anomalyZoneCount} tone="warning" />
            <KpiCard label="높은 우선순위" value={summary.highPriorityCount} tone="danger" />
            <KpiCard label="검토 대기" value={summary.pendingReviewCount} tone="warning" />
            <KpiCard
              label="반복/악화"
              value={summary.repeatedAnomalyCount + summary.worsenedCount}
              tone="danger"
            />
          </section>

          <section className="dashboard-split">
            <div className="panel stack-md">
              <div>
                <h2 className="panel-title">작업 현황</h2>
                <p className="panel-description">
                  점검, 분석 작업, 결과 상태를 summary 응답 기준으로 묶어 보여줍니다.
                </p>
              </div>
              <div className="detail-grid">
                <DetailMetric label="진행 중 점검" value={summary.inProgressInspectionCount} />
                <DetailMetric label="완료 점검" value={summary.completedInspectionCount} />
                <DetailMetric label="대기 작업" value={summary.queuedJobCount} />
                <DetailMetric label="실행 중 작업" value={summary.runningJobCount} />
                <DetailMetric label="성공 작업" value={summary.succeededJobCount} />
                <DetailMetric label="실패 작업" value={summary.failedJobCount} />
                <DetailMetric label="정상 결과" value={summary.normalResultCount} />
                <DetailMetric label="이상 결과" value={summary.anomalyResultCount} />
              </div>
            </div>

            <div className="panel stack-md">
              <div>
                <h2 className="panel-title">자산 현황</h2>
                <p className="panel-description">
                  이미지, 작업, 결과 집계를 현재 조회 범위 기준으로 요약합니다.
                </p>
              </div>
              <div className="detail-grid">
                <DetailMetric label="이미지" value={summary.totalImageCount} />
                <DetailMetric label="분석 작업" value={summary.totalAnalysisJobCount} />
                <DetailMetric label="저신뢰 결과" value={summary.lowConfidenceResultCount} />
                <DetailMetric label="반복 이상" value={summary.repeatedAnomalyCount} />
                <DetailMetric label="악화 대상" value={summary.worsenedCount} />
              </div>
            </div>
          </section>

          <section className="dashboard-split">
            <DashboardChartSection
              title="조치 후보 통계"
              description="`GET /dashboard/action-stats` 응답을 그대로 시각화합니다."
              isLoading={actionStatsQuery.isLoading}
              error={actionStatsQuery.isError ? getApiErrorMessage(actionStatsQuery.error) : null}
              isEmpty={actionChartData.length === 0}
              emptyTitle="조치 후보 통계가 없습니다."
              emptyDescription="현재 범위에서 집계 가능한 actionCandidate 데이터가 없습니다."
            >
              <div className="chart-shell">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={actionChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="actionCandidate"
                      tickFormatter={(value) => getActionCandidateLabel(value)}
                    />
                    <YAxis allowDecimals={false} />
                    <Tooltip
                      formatter={(value) => [`${value}건`, '건수']}
                      labelFormatter={(value) => getActionCandidateLabel(value as never)}
                    />
                    <Bar dataKey="count" radius={[12, 12, 0, 0]}>
                      {actionChartData.map((item, index) => (
                        <Cell
                          key={`${item.actionCandidate}-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </DashboardChartSection>

            <DashboardChartSection
              title="심각도 분포"
              description="`GET /dashboard/severity-stats` 응답을 심각도 단계별 분포로 보여줍니다."
              isLoading={severityStatsQuery.isLoading}
              error={severityStatsQuery.isError ? getApiErrorMessage(severityStatsQuery.error) : null}
              isEmpty={severityChartData.length === 0}
              emptyTitle="심각도 분포가 없습니다."
              emptyDescription="현재 범위에서 severityLevel 집계가 비어 있습니다."
            >
              <div className="chart-shell">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={severityChartData}
                      dataKey="count"
                      nameKey="severityLevel"
                      innerRadius={64}
                      outerRadius={96}
                      paddingAngle={3}
                    >
                      {severityChartData.map((item, index) => (
                        <Cell
                          key={`${item.severityLevel}-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [`${value}건`, '건수']}
                      labelFormatter={(value) => getSeverityLevelLabel(value as never)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="inline-actions">
                {severityChartData.map((item) => (
                  <StatusBadge
                    key={item.severityLevel}
                    label={`${getSeverityLevelLabel(item.severityLevel)} ${item.count}건`}
                    tone={getSeverityLevelTone(item.severityLevel)}
                  />
                ))}
              </div>
            </DashboardChartSection>
          </section>

          <DashboardChartSection
            title="기간별 점검 추이"
            description="`GET /dashboard/trends` 응답에서 점검 수와 이상 수를 함께 비교합니다."
            isLoading={trendQuery.isLoading}
            error={trendQuery.isError ? getApiErrorMessage(trendQuery.error) : null}
            isEmpty={trendChartData.length === 0}
            emptyTitle="추이 데이터가 없습니다."
            emptyDescription="선택한 기간과 범위에서 trend 응답이 비어 있습니다."
          >
            <div className="chart-shell">
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="trendDate"
                    tickFormatter={(value) => formatDate(String(value))}
                  />
                  <YAxis allowDecimals={false} />
                  <Tooltip
                    labelFormatter={(value) => formatDate(String(value))}
                    formatter={(value, name) => [
                      `${value}건`,
                      name === 'inspectionCount' ? '점검 수' : '이상 수',
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="inspectionCount"
                    stroke="#0369a1"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="anomalyCount"
                    stroke="#dc2626"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </DashboardChartSection>

          <section className="dashboard-split">
            <section className="panel stack-md">
              <div>
                <h2 className="panel-title">우선 확인 대상</h2>
                <p className="panel-description">
                  dashboard 응답의 priorityTargets를 우선순위 기준으로 정렬해 보여줍니다.
                </p>
              </div>
              <DataTable
                columns={[
                  {
                    key: 'scope',
                    header: '대상',
                    render: (row) => (
                      <div className="stack-sm">
                        <span className="font-semibold text-slate-900">
                          {getTargetTypeLabel(row.targetType ?? 'ZONE')}
                        </span>
                        <span className="text-xs text-slate-500">
                          {`발전소 ${row.plantId ?? '-'} · 구역 ${row.zoneId ?? '-'} · 설비 ${row.equipmentId ?? '-'}`}
                        </span>
                      </div>
                    ),
                  },
                  {
                    key: 'status',
                    header: '상태',
                    render: (row) => (
                      <div className="stack-sm">
                        <StatusBadge
                          label={getSeverityLevelLabel(row.severityLevel)}
                          tone={getSeverityLevelTone(row.severityLevel)}
                        />
                        <StatusBadge label={getPriorityLevelLabel(row.priorityLevel)} />
                      </div>
                    ),
                  },
                  {
                    key: 'action',
                    header: '조치 후보',
                    render: (row) => getActionCandidateLabel(row.actionCandidate),
                  },
                  {
                    key: 'reason',
                    header: '사유',
                    render: (row) => getPriorityReasonLabel(row.priorityReason),
                  },
                  {
                    key: 'move',
                    header: '이동',
                    render: (row) => (
                      <div className="inline-actions">
                        {row.resultId ? (
                          <Link className="text-button" to={`/results/${row.resultId}`}>
                            결과 상세
                          </Link>
                        ) : (
                          <span className="text-slate-400">결과 없음</span>
                        )}
                        {row.zoneId ? (
                          <Link className="text-button" to={`/zones/${row.zoneId}`}>
                            구역 상세
                          </Link>
                        ) : null}
                      </div>
                    ),
                  },
                ]}
                rows={priorityTargets}
                rowKey={(row) =>
                  `${row.resultId ?? 'none'}-${row.zoneId ?? 'zone'}-${row.equipmentId ?? 'equipment'}`
                }
                emptyTitle="우선 확인 대상이 없습니다."
                emptyDescription="현재 범위에서 반복 이상 또는 악화 대상으로 분류된 항목이 없습니다."
              />
            </section>

            <section className="panel stack-md">
              <div>
                <h2 className="panel-title">최근 분석 결과</h2>
                <p className="panel-description">
                  dashboard 응답의 recentResults를 그대로 표시합니다.
                </p>
              </div>
              <DataTable
                columns={[
                  {
                    key: 'result',
                    header: '결과',
                    render: (row) => (
                      <div className="stack-sm">
                        <span className="font-semibold text-slate-900">
                          {row.inspectionName || `점검 ${row.inspectionId ?? '-'}`}
                        </span>
                        <span className="text-xs text-slate-500">
                          {row.zoneName || `구역 ${row.zoneId ?? '-'}`}
                        </span>
                      </div>
                    ),
                  },
                  {
                    key: 'status',
                    header: '상태',
                    render: (row) => (
                      <div className="stack-sm">
                        <StatusBadge
                          label={getSeverityLevelLabel(row.severityLevel)}
                          tone={getSeverityLevelTone(row.severityLevel)}
                        />
                        <StatusBadge label={getPriorityLevelLabel(row.priorityLevel)} />
                      </div>
                    ),
                  },
                  {
                    key: 'action',
                    header: '조치 후보',
                    render: (row) => getActionCandidateLabel(row.actionCandidate),
                  },
                  {
                    key: 'time',
                    header: '분석 시각',
                    render: (row) => formatDateTime(row.analyzedAt),
                  },
                  {
                    key: 'move',
                    header: '이동',
                    render: (row) => (
                      <div className="inline-actions">
                        {row.resultId ? (
                          <Link className="text-button" to={`/results/${row.resultId}`}>
                            결과 보기
                          </Link>
                        ) : (
                          <span className="text-slate-400">결과 없음</span>
                        )}
                        {row.inspectionId ? (
                          <Link className="text-button" to={`/inspections/${row.inspectionId}`}>
                            점검 보기
                          </Link>
                        ) : null}
                      </div>
                    ),
                  },
                ]}
                rows={recentResults}
                rowKey={(row, index) => row.resultId ?? `recent-${index}`}
                emptyTitle="최근 결과가 없습니다."
                emptyDescription="현재 범위에서 최근 분석 결과를 찾지 못했습니다."
              />
            </section>
          </section>
        </>
      ) : null}
    </section>
  )
}

function KpiCard({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'default' | 'warning' | 'danger'
}) {
  return (
    <article className={`kpi-card kpi-card-${tone}`}>
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className="mt-3 text-3xl font-semibold text-slate-900">{formatCount(value)}</div>
    </article>
  )
}

function DetailMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="detail-item">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{formatCount(value)}건</span>
    </div>
  )
}

function DashboardChartSection({
  title,
  description,
  isLoading,
  error,
  isEmpty,
  emptyTitle,
  emptyDescription,
  children,
}: {
  title: string
  description: string
  isLoading: boolean
  error: string | null
  isEmpty: boolean
  emptyTitle: string
  emptyDescription: string
  children: ReactNode
}) {
  return (
    <section className="panel stack-md">
      <div>
        <h2 className="panel-title">{title}</h2>
        <p className="panel-description">{description}</p>
      </div>
      {isLoading ? <LoadingState message={`${title} 데이터를 불러오는 중입니다.`} /> : null}
      {!isLoading && error ? (
        <ErrorState title={`${title} 조회에 실패했습니다.`} description={error} />
      ) : null}
      {!isLoading && !error && isEmpty ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : null}
      {!isLoading && !error && !isEmpty ? children : null}
    </section>
  )
}
