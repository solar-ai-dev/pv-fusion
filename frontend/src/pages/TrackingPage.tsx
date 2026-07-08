import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { usePlants } from '../features/plants/hooks/usePlants'
import {
  getActionCandidateLabel,
  getPriorityLevelLabel,
  getSeverityLevelLabel,
  getSeverityLevelTone,
} from '../features/results/types'
import { useTracking } from '../features/tracking/hooks/useTracking'
import type { TrackingListParams } from '../features/tracking/types'
import { useZonesByPlantId } from '../features/zones/hooks/useZones'
import { FormField } from '../shared/components/form/FormField'
import { PageHeader } from '../shared/components/layout/PageHeader'
import { EmptyState } from '../shared/components/state/EmptyState'
import { ErrorState } from '../shared/components/state/ErrorState'
import { LoadingState } from '../shared/components/state/LoadingState'
import { StatusBadge } from '../shared/components/state/StatusBadge'
import { DataTable } from '../shared/components/table/DataTable'
import { formatTableDateTime, getApiErrorMessage, parsePositiveNumber } from '../shared/utils'

export function TrackingPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const plantId = parsePositiveNumber(searchParams.get('plantId') ?? undefined)
  const zoneId = parsePositiveNumber(searchParams.get('zoneId') ?? undefined)
  const from = searchParams.get('from') ?? undefined
  const to = searchParams.get('to') ?? undefined

  const plantsQuery = usePlants({ page: 0, size: 100, status: 'ACTIVE' })
  const zonesQuery = useZonesByPlantId(plantId ?? 0)

  const params = useMemo<TrackingListParams>(
    () => ({
      plantId: plantId ?? undefined,
      zoneId: zoneId ?? undefined,
      from: from || undefined,
      to: to || undefined,
    }),
    [plantId, zoneId, from, to],
  )

  const trackingQuery = useTracking(params, true)
  const rows = trackingQuery.data?.data.items ?? []

  const repeated = rows.filter((r) => r.repeated).length
  const worsened = rows.filter((r) => r.worsened).length
  const highPriority = rows.filter(
    (r) => r.priorityLevel === 'HIGH' || r.priorityLevel === 'URGENT',
  ).length

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next)
  }

  const setParams = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setSearchParams(next)
  }

  const hasFilter = Boolean(plantId || zoneId || from || to)

  const selectedPlantName = plantId
    ? (plantsQuery.data?.data.content.find((p) => p.plantId === plantId)?.name ?? `발전소 #${plantId}`)
    : null
  const selectedZoneName = zoneId
    ? (zonesQuery.data?.data.find((z) => z.zoneId === zoneId)?.name ?? `구역 #${zoneId}`)
    : null

  const activeChips: Array<{ key: string; label: string; removeKey: string | string[] }> = [
    ...(selectedPlantName ? [{ key: 'plant', label: `발전소: ${selectedPlantName}`, removeKey: ['plantId', 'zoneId'] as string[] }] : []),
    ...(selectedZoneName ? [{ key: 'zone', label: `구역: ${selectedZoneName}`, removeKey: 'zoneId' }] : []),
    ...(from ? [{ key: 'from', label: `시작: ${from}`, removeKey: 'from' }] : []),
    ...(to ? [{ key: 'to', label: `종료: ${to}`, removeKey: 'to' }] : []),
  ]

  const removeChip = (removeKey: string | string[]) => {
    const next = new URLSearchParams(searchParams)
    const keys = Array.isArray(removeKey) ? removeKey : [removeKey]
    for (const k of keys) next.delete(k)
    setSearchParams(next)
  }

  return (
    <section className="page-shell">
      <PageHeader
        title="변화 추적"
        description="반복 이상·악화 대상을 기간별로 비교하고 우선 관리 후보를 확인합니다."
      />

      {/* 필터 */}
      <section className="filter-section">
        <div className="filter-row">
          <div className="filter-field">
            <FormField label="발전소">
              <select
                className="input-field"
                value={plantId ? String(plantId) : ''}
                onChange={(e) => {
                  setParams({ plantId: e.target.value || null, zoneId: null })
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
          </div>
          <div className="filter-field">
            <FormField label="구역">
              <select
                className="input-field"
                disabled={!plantId}
                value={zoneId ? String(zoneId) : ''}
                onChange={(e) => setParam('zoneId', e.target.value || null)}
              >
                <option value="">{plantId ? '전체' : '발전소 먼저 선택'}</option>
                {zonesQuery.data?.data.map((zone) => (
                  <option key={zone.zoneId} value={zone.zoneId}>
                    {zone.name}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          <div className="filter-field">
            <FormField label="시작일">
              <input
                className="input-field"
                type="date"
                value={from ?? ''}
                onChange={(e) => setParam('from', e.target.value || null)}
              />
            </FormField>
          </div>
          <div className="filter-field">
            <FormField label="종료일">
              <input
                className="input-field"
                type="date"
                value={to ?? ''}
                onChange={(e) => setParam('to', e.target.value || null)}
              />
            </FormField>
          </div>
        </div>
        {activeChips.length > 0 ? (
          <div className="filter-chip-row">
            {activeChips.map((chip) => (
              <span key={chip.key} className="filter-chip">
                {chip.label}
                <button
                  type="button"
                  className="filter-chip-remove"
                  onClick={() => removeChip(chip.removeKey)}
                  aria-label={`${chip.label} 필터 제거`}
                >
                  ×
                </button>
              </span>
            ))}
            {hasFilter ? (
              <button type="button" className="filter-chip-reset" onClick={() => setSearchParams({})}>
                전체 초기화
              </button>
            ) : null}
          </div>
        ) : null}
      </section>

      {trackingQuery.isLoading && !trackingQuery.data ? (
        <LoadingState message="변화 추적 데이터를 불러오는 중입니다." />
      ) : null}

      {trackingQuery.isError ? (
        <ErrorState
          title="변화 추적 데이터를 불러오지 못했습니다."
          description={getApiErrorMessage(trackingQuery.error)}
        />
      ) : null}

      {!trackingQuery.isLoading && rows.length > 0 ? (
        <>
          {/* KPI 요약 */}
          <div className="tracking-kpi-row">
            <article className="tracking-kpi-card">
              <div className="tracking-kpi-label">반복 이상</div>
              <div className="tracking-kpi-value">{repeated}건</div>
            </article>
            <article className="tracking-kpi-card">
              <div className="tracking-kpi-label">악화 감지</div>
              <div className="tracking-kpi-value">{worsened}건</div>
            </article>
            <article className="tracking-kpi-card">
              <div className="tracking-kpi-label">우선 관리 대상</div>
              <div className="tracking-kpi-value">{highPriority}건</div>
            </article>
            <article className="tracking-kpi-card">
              <div className="tracking-kpi-label">전체</div>
              <div className="tracking-kpi-value">{rows.length}건</div>
            </article>
          </div>

          {/* 목록 */}
          <section className="table-panel">
            <div className="table-panel-header">
              <span className="table-panel-title">변화 추적 목록</span>
            </div>
            <DataTable
              rows={rows}
              rowKey={(row, i) => `${row.currentResultId ?? 'none'}-${i}`}
              columns={[
                {
                  key: 'result',
                  header: '현재 결과',
                  render: (row) => (
                    <span className="font-mono text-xs text-slate-500">
                      #{row.currentResultId ?? '-'}
                    </span>
                  ),
                },
                {
                  key: 'repeated',
                  header: '반복',
                  render: (row) =>
                    row.repeated ? (
                      <StatusBadge label="반복 이상" tone="warning" />
                    ) : (
                      <span className="text-slate-400 text-xs">-</span>
                    ),
                },
                {
                  key: 'worsened',
                  header: '악화',
                  render: (row) =>
                    row.worsened ? (
                      <StatusBadge label="악화" tone="danger" />
                    ) : (
                      <span className="text-slate-400 text-xs">-</span>
                    ),
                },
                {
                  key: 'severity',
                  header: '심각도',
                  render: (row) => (
                    <StatusBadge
                      label={getSeverityLevelLabel(row.severityLevel)}
                      tone={getSeverityLevelTone(row.severityLevel)}
                    />
                  ),
                },
                {
                  key: 'priority',
                  header: '우선순위',
                  render: (row) => (
                    <span className="text-slate-600 text-sm">
                      {getPriorityLevelLabel(row.priorityLevel)}
                    </span>
                  ),
                },
                {
                  key: 'action',
                  header: '조치 후보',
                  render: (row) => (
                    <span className="text-slate-600 text-sm">
                      {getActionCandidateLabel(row.actionCandidate)}
                    </span>
                  ),
                },
                {
                  key: 'analyzedAt',
                  header: '분석 시각',
                  render: (row) => (
                    <span className="text-slate-400 text-xs whitespace-nowrap">
                      {formatTableDateTime(row.analyzedAt)}
                    </span>
                  ),
                },
                {
                  key: 'link',
                  header: '',
                  render: (row) =>
                    row.currentResultId ? (
                      <Link
                        to={`/results/${row.currentResultId}`}
                        className="text-button text-sm"
                      >
                        결과 보기
                      </Link>
                    ) : null,
                },
              ]}
            />
          </section>
        </>
      ) : null}

      {!trackingQuery.isLoading && !trackingQuery.isError && rows.length === 0 ? (
        <section className="panel">
          <EmptyState
            title="아직 변화 추적 데이터가 없습니다."
            description="같은 구역에서 결과가 여러 번 쌓이면 비교할 수 있습니다."
          />
        </section>
      ) : null}
    </section>
  )
}
