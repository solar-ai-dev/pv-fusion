import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { usePlants } from '../features/plants/hooks/usePlants'
import {
  ACTION_CANDIDATE_OPTIONS,
  getActionCandidateLabel,
  getResultStatusLabel,
  getResultStatusTone,
  getReviewStatusLabel,
  getReviewStatusTone,
  getSeverityLevelLabel,
  getSeverityLevelTone,
  RESULT_STATUS_OPTIONS,
  REVIEW_STATUS_OPTIONS,
  SEVERITY_LEVEL_OPTIONS,
  type ActionCandidate,
  type AnalysisResultStatus,
  type ResultListParams,
  type ReviewStatus,
  type SeverityLevel,
} from '../features/results/types'
import { getInputTypeShortLabel } from '../features/results/defectTaxonomy'
import { ANALYSIS_INPUT_TYPE_OPTIONS, getAnalysisInputTypeLabel, type AnalysisInputType } from '../features/analysisJobs/types'
import { useResults } from '../features/results/hooks/useResults'
import { useZonesByPlantId } from '../features/zones/hooks/useZones'
import { FormField } from '../shared/components/form/FormField'
import { PageHeader } from '../shared/components/layout/PageHeader'
import { ErrorState } from '../shared/components/state/ErrorState'
import { LoadingState } from '../shared/components/state/LoadingState'
import { StatusBadge } from '../shared/components/state/StatusBadge'
import { DataTable } from '../shared/components/table/DataTable'
import { Pagination } from '../shared/components/table/Pagination'
import { formatTableDateTime, getApiErrorMessage, parsePositiveNumber } from '../shared/utils'

function castOrUndefined<T>(
  value: string | null,
  options: readonly T[],
): T | undefined {
  return options.includes(value as T) ? (value as T) : undefined
}

export function ResultListPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const plantId = parsePositiveNumber(searchParams.get('plantId') ?? undefined)
  const zoneId = parsePositiveNumber(searchParams.get('zoneId') ?? undefined)
  const from = searchParams.get('from') ?? undefined
  const to = searchParams.get('to') ?? undefined
  const resultStatus = castOrUndefined<AnalysisResultStatus>(
    searchParams.get('resultStatus'),
    RESULT_STATUS_OPTIONS,
  )
  const reviewStatus = castOrUndefined<ReviewStatus>(
    searchParams.get('reviewStatus'),
    REVIEW_STATUS_OPTIONS,
  )
  const severityLevel = castOrUndefined<SeverityLevel>(
    searchParams.get('severityLevel'),
    SEVERITY_LEVEL_OPTIONS,
  )
  const actionCandidate = castOrUndefined<ActionCandidate>(
    searchParams.get('actionCandidate'),
    ACTION_CANDIDATE_OPTIONS,
  )
  const inputType = castOrUndefined<AnalysisInputType>(
    searchParams.get('inputType'),
    ANALYSIS_INPUT_TYPE_OPTIONS,
  )
  const page = Math.max(parsePositiveNumber(searchParams.get('page') ?? undefined) ?? 1, 1)

  const plantsQuery = usePlants({ page: 0, size: 100, status: 'ACTIVE' })
  const zonesQuery = useZonesByPlantId(plantId ?? 0)

  const plantMap = useMemo(() => {
    const map = new Map<number, string>()
    for (const plant of plantsQuery.data?.data.content ?? []) {
      map.set(plant.plantId, plant.name)
    }
    return map
  }, [plantsQuery.data])

  const params = useMemo<ResultListParams>(
    () => ({
      plantId: plantId ?? undefined,
      zoneId: zoneId ?? undefined,
      inputType: inputType ?? undefined,
      resultStatus,
      reviewStatus,
      severityLevel,
      actionCandidate,
      from: from || undefined,
      to: to || undefined,
      page: page - 1,
      size: 20,
    }),
    [plantId, zoneId, inputType, resultStatus, reviewStatus, severityLevel, actionCandidate, from, to, page],
  )

  const resultsQuery = useResults(params)
  const rows = resultsQuery.data?.data.content ?? []

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams)
    if (value) {
      next.set(key, value)
    } else {
      next.delete(key)
    }
    next.delete('page')
    setSearchParams(next)
  }

  const setParams = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    next.delete('page')
    setSearchParams(next)
  }

  const hasFilter =
    plantId || zoneId || inputType || resultStatus || reviewStatus || severityLevel || actionCandidate || from || to

  const selectedPlantName = plantId
    ? (plantsQuery.data?.data.content.find((p) => p.plantId === plantId)?.name ?? `발전소 #${plantId}`)
    : null
  const selectedZoneName = zoneId
    ? (zonesQuery.data?.data.find((z) => z.zoneId === zoneId)?.name ?? `구역 #${zoneId}`)
    : null

  const activeChips: Array<{ key: string; label: string; removeKey: string | string[] }> = [
    ...(selectedPlantName ? [{ key: 'plant', label: `발전소: ${selectedPlantName}`, removeKey: ['plantId', 'zoneId'] as string[] }] : []),
    ...(selectedZoneName ? [{ key: 'zone', label: `구역: ${selectedZoneName}`, removeKey: 'zoneId' }] : []),
    ...(resultStatus ? [{ key: 'resultStatus', label: `결과: ${getResultStatusLabel(resultStatus)}`, removeKey: 'resultStatus' }] : []),
    ...(severityLevel ? [{ key: 'severity', label: `심각도: ${getSeverityLevelLabel(severityLevel)}`, removeKey: 'severityLevel' }] : []),
    ...(actionCandidate ? [{ key: 'action', label: `조치: ${getActionCandidateLabel(actionCandidate)}`, removeKey: 'actionCandidate' }] : []),
    ...(inputType ? [{ key: 'inputType', label: `유형: ${getAnalysisInputTypeLabel(inputType)}`, removeKey: 'inputType' }] : []),
    ...(reviewStatus ? [{ key: 'review', label: `검토: ${getReviewStatusLabel(reviewStatus)}`, removeKey: 'reviewStatus' }] : []),
    ...(from ? [{ key: 'from', label: `시작: ${from}`, removeKey: 'from' }] : []),
    ...(to ? [{ key: 'to', label: `종료: ${to}`, removeKey: 'to' }] : []),
  ]

  const removeChip = (removeKey: string | string[]) => {
    const next = new URLSearchParams(searchParams)
    const keys = Array.isArray(removeKey) ? removeKey : [removeKey]
    for (const k of keys) next.delete(k)
    next.delete('page')
    setSearchParams(next)
  }

  return (
    <section className="page-shell">
      <PageHeader
        title="결과"
        description="분석 결과를 조회하고 검토 상태를 관리합니다."
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
            <FormField label="결과 상태">
              <select
                className="input-field"
                value={resultStatus ?? ''}
                onChange={(e) => setParam('resultStatus', e.target.value || null)}
              >
                <option value="">전체</option>
                {RESULT_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {getResultStatusLabel(s)}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          <div className="filter-field">
            <FormField label="심각도">
              <select
                className="input-field"
                value={severityLevel ?? ''}
                onChange={(e) => setParam('severityLevel', e.target.value || null)}
              >
                <option value="">전체</option>
                {SEVERITY_LEVEL_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {getSeverityLevelLabel(s)}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          <div className="filter-field">
            <FormField label="조치 후보">
              <select
                className="input-field"
                value={actionCandidate ?? ''}
                onChange={(e) => setParam('actionCandidate', e.target.value || null)}
              >
                <option value="">전체</option>
                {ACTION_CANDIDATE_OPTIONS.map((a) => (
                  <option key={a} value={a}>
                    {getActionCandidateLabel(a)}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          <div className="filter-field">
            <FormField label="이미지 유형">
              <select
                className="input-field"
                value={inputType ?? ''}
                onChange={(e) => setParam('inputType', e.target.value || null)}
              >
                <option value="">전체</option>
                {ANALYSIS_INPUT_TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {getAnalysisInputTypeLabel(t)}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          <div className="filter-field">
            <FormField label="검토 상태">
              <select
                className="input-field"
                value={reviewStatus ?? ''}
                onChange={(e) => setParam('reviewStatus', e.target.value || null)}
              >
                <option value="">전체</option>
                {REVIEW_STATUS_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {getReviewStatusLabel(r)}
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

      {/* 테이블 */}
      {resultsQuery.isLoading && !resultsQuery.data ? (
        <LoadingState message="분석 결과를 불러오는 중입니다." />
      ) : null}

      {resultsQuery.isError ? (
        <ErrorState
          title="분석 결과를 불러오지 못했습니다."
          description={getApiErrorMessage(resultsQuery.error)}
        />
      ) : null}

      {!resultsQuery.isLoading && !resultsQuery.isError ? (
        <section className="table-panel">
          <div className="table-panel-header">
            <span className="table-panel-title">분석 결과 목록</span>
            <span className="table-panel-count">
              총 {resultsQuery.data?.data.totalElements ?? 0}건
            </span>
          </div>
          <DataTable
            rows={rows}
            rowKey={(row) => row.resultId}
            emptyTitle="조건에 맞는 결과가 없습니다."
            emptyDescription={
              hasFilter
                ? '기간이나 발전소·구역·상태 조건을 변경해 보세요.'
                : '분석이 완료되면 결과가 표시됩니다.'
            }
            columns={[
              {
                key: 'id',
                header: '결과 / 점검',
                render: (row) => (
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <StatusBadge
                        label={getResultStatusLabel(row.resultStatus)}
                        tone={getResultStatusTone(row.resultStatus)}
                      />
                      <span className="text-xs text-slate-400">#{row.resultId}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {row.plantId ? (plantMap.get(row.plantId) ?? `발전소 #${row.plantId}`) : '-'}
                      {row.inspectionId ? ` · 점검 #${row.inspectionId}` : ''}
                    </div>
                  </div>
                ),
              },
              {
                key: 'imageType',
                header: '유형',
                render: (row) => (
                  <span className="text-slate-600 text-sm whitespace-nowrap">
                    {getInputTypeShortLabel(row.inputType)}
                  </span>
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
                key: 'anomalyCount',
                header: '이상 수',
                render: (row) => (
                  <span className={row.anomalyCount ? 'font-semibold text-rose-600' : 'text-slate-400'}>
                    {row.anomalyCount != null ? `${row.anomalyCount}건` : '-'}
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
                key: 'review',
                header: '검토 상태',
                render: (row) => (
                  <StatusBadge
                    label={getReviewStatusLabel(row.reviewStatus)}
                    tone={getReviewStatusTone(row.reviewStatus)}
                  />
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
                render: (row) => (
                  <Link to={`/results/${row.resultId}`} className="text-button text-sm whitespace-nowrap">
                    결과 보기
                  </Link>
                ),
              },
            ]}
          />
          <div className="p-3">
            <Pagination
              page={page}
              totalPages={resultsQuery.data?.data.totalPages ?? 0}
              totalElements={resultsQuery.data?.data.totalElements ?? 0}
              onPageChange={(nextPage) => {
                const next = new URLSearchParams(searchParams)
                next.set('page', String(nextPage))
                setSearchParams(next)
              }}
            />
          </div>
        </section>
      ) : null}
    </section>
  )
}
