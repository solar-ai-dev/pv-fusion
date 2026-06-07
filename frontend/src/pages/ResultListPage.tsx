import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  getAnalysisInputTypeLabel,
  getAnalysisJobStatusLabel,
  getAnalysisJobStatusTone,
  getAnalysisModelTypeLabel,
} from '../features/analysisJobs/types'
import {
  ACTION_CANDIDATE_OPTIONS,
  REVIEW_STATUS_OPTIONS,
  RESULT_STATUS_OPTIONS,
  SEVERITY_LEVEL_OPTIONS,
  getActionCandidateLabel,
  getPriorityLevelLabel,
  getResultStatusLabel,
  getResultStatusTone,
  getReviewStatusLabel,
  getReviewStatusTone,
  getSeverityLevelLabel,
  getSeverityLevelTone,
  type ResultListParams,
} from '../features/results/types'
import { useResults } from '../features/results/hooks/useResults'
import { TARGET_TYPE_OPTIONS, getTargetTypeLabel } from '../features/images/types'
import { ANALYSIS_INPUT_TYPE_OPTIONS } from '../features/analysisJobs/types'
import { FormField } from '../shared/components/form/FormField'
import { PageHeader } from '../shared/components/layout/PageHeader'
import { EmptyState } from '../shared/components/state/EmptyState'
import { ErrorState } from '../shared/components/state/ErrorState'
import { LoadingState } from '../shared/components/state/LoadingState'
import { StatusBadge } from '../shared/components/state/StatusBadge'
import { DataTable } from '../shared/components/table/DataTable'
import { Pagination } from '../shared/components/table/Pagination'
import { formatDateTime, getApiErrorMessage, parsePositiveNumber } from '../shared/utils'

const PAGE_SIZE = 20

export function ResultListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [plantIdInput, setPlantIdInput] = useState(searchParams.get('plantId') ?? '')
  const [zoneIdInput, setZoneIdInput] = useState(searchParams.get('zoneId') ?? '')
  const [inspectionIdInput, setInspectionIdInput] = useState(
    searchParams.get('inspectionId') ?? '',
  )
  const [equipmentIdInput, setEquipmentIdInput] = useState(
    searchParams.get('equipmentId') ?? '',
  )

  const page = Math.max(Number(searchParams.get('page') ?? '1'), 1)
  const params = useMemo<ResultListParams>(
    () => ({
      plantId: parsePositiveNumber(searchParams.get('plantId') ?? undefined) ?? undefined,
      zoneId: parsePositiveNumber(searchParams.get('zoneId') ?? undefined) ?? undefined,
      inspectionId:
        parsePositiveNumber(searchParams.get('inspectionId') ?? undefined) ?? undefined,
      equipmentId:
        parsePositiveNumber(searchParams.get('equipmentId') ?? undefined) ?? undefined,
      targetType: (searchParams.get('targetType') as ResultListParams['targetType']) ?? undefined,
      inputType: (searchParams.get('inputType') as ResultListParams['inputType']) ?? undefined,
      modelType: (searchParams.get('modelType') as ResultListParams['modelType']) ?? undefined,
      jobStatus: (searchParams.get('jobStatus') as ResultListParams['jobStatus']) ?? undefined,
      resultStatus:
        (searchParams.get('resultStatus') as ResultListParams['resultStatus']) ?? undefined,
      actionCandidate:
        (searchParams.get('actionCandidate') as ResultListParams['actionCandidate']) ??
        undefined,
      severityLevel:
        (searchParams.get('severityLevel') as ResultListParams['severityLevel']) ??
        undefined,
      reviewStatus:
        (searchParams.get('reviewStatus') as ResultListParams['reviewStatus']) ?? undefined,
      page: page - 1,
      size: PAGE_SIZE,
    }),
    [page, searchParams],
  )

  const hasScopedFilter = Boolean(
    params.plantId || params.zoneId || params.inspectionId || params.equipmentId,
  )
  const resultsQuery = useResults(params, hasScopedFilter)
  const rows = resultsQuery.data?.data.content ?? []

  const handleSearch = (formData: FormData) => {
    const next = new URLSearchParams()
    const setIfPresent = (key: string, value: FormDataEntryValue | null) => {
      if (typeof value === 'string' && value.trim()) {
        next.set(key, value.trim())
      }
    }

    setIfPresent('plantId', formData.get('plantId'))
    setIfPresent('zoneId', formData.get('zoneId'))
    setIfPresent('inspectionId', formData.get('inspectionId'))
    setIfPresent('equipmentId', formData.get('equipmentId'))
    setIfPresent('targetType', formData.get('targetType'))
    setIfPresent('inputType', formData.get('inputType'))
    setIfPresent('modelType', formData.get('modelType'))
    setIfPresent('jobStatus', formData.get('jobStatus'))
    setIfPresent('resultStatus', formData.get('resultStatus'))
    setIfPresent('actionCandidate', formData.get('actionCandidate'))
    setIfPresent('severityLevel', formData.get('severityLevel'))
    setIfPresent('reviewStatus', formData.get('reviewStatus'))
    next.set('page', '1')
    setSearchParams(next)
  }

  const resetFilters = () => {
    setPlantIdInput('')
    setZoneIdInput('')
    setInspectionIdInput('')
    setEquipmentIdInput('')
    setSearchParams({})
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="분석 결과 목록"
        description="실제 backend가 지원하는 범위에서 inspection, 장비, 상태 기준으로 결과를 검색하고 상세 화면으로 이동합니다."
      />

      <section className="panel stack-md">
        <div>
          <h2 className="panel-title">검색 필터</h2>
          <p className="panel-description">
            일반 사용자는 plant, zone, inspection, equipment 중 하나 이상의 scope 필터가 필요합니다.
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
            <FormField label="Plant ID">
              <input
                className="input-field"
                name="plantId"
                value={plantIdInput}
                onChange={(event) => setPlantIdInput(event.target.value)}
              />
            </FormField>
            <FormField label="Zone ID">
              <input
                className="input-field"
                name="zoneId"
                value={zoneIdInput}
                onChange={(event) => setZoneIdInput(event.target.value)}
              />
            </FormField>
            <FormField label="Inspection ID">
              <input
                className="input-field"
                name="inspectionId"
                value={inspectionIdInput}
                onChange={(event) => setInspectionIdInput(event.target.value)}
              />
            </FormField>
            <FormField label="Equipment ID">
              <input
                className="input-field"
                name="equipmentId"
                value={equipmentIdInput}
                onChange={(event) => setEquipmentIdInput(event.target.value)}
              />
            </FormField>
            <FormField label="Target Type">
              <select
                className="input-field"
                name="targetType"
                defaultValue={searchParams.get('targetType') ?? ''}
              >
                <option value="">전체</option>
                {TARGET_TYPE_OPTIONS.map((targetType) => (
                  <option key={targetType} value={targetType}>
                    {getTargetTypeLabel(targetType)}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Input Type">
              <select
                className="input-field"
                name="inputType"
                defaultValue={searchParams.get('inputType') ?? ''}
              >
                <option value="">전체</option>
                {ANALYSIS_INPUT_TYPE_OPTIONS.map((inputType) => (
                  <option key={inputType} value={inputType}>
                    {getAnalysisInputTypeLabel(inputType)}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Model Type">
              <select
                className="input-field"
                name="modelType"
                defaultValue={searchParams.get('modelType') ?? ''}
              >
                <option value="">전체</option>
                <option value="RGB_ONLY">RGB 전용</option>
                <option value="THERMAL_ONLY">열화상 전용</option>
                <option value="FUSION">Fusion</option>
              </select>
            </FormField>
            <FormField label="Job Status">
              <select
                className="input-field"
                name="jobStatus"
                defaultValue={searchParams.get('jobStatus') ?? ''}
              >
                <option value="">전체</option>
                <option value="QUEUED">대기 중</option>
                <option value="RUNNING">실행 중</option>
                <option value="SUCCEEDED">성공</option>
                <option value="FAILED">실패</option>
              </select>
            </FormField>
            <FormField label="Result Status">
              <select
                className="input-field"
                name="resultStatus"
                defaultValue={searchParams.get('resultStatus') ?? ''}
              >
                <option value="">전체</option>
                {RESULT_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {getResultStatusLabel(status)}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Action Candidate">
              <select
                className="input-field"
                name="actionCandidate"
                defaultValue={searchParams.get('actionCandidate') ?? ''}
              >
                <option value="">전체</option>
                {ACTION_CANDIDATE_OPTIONS.map((action) => (
                  <option key={action} value={action}>
                    {getActionCandidateLabel(action)}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Severity">
              <select
                className="input-field"
                name="severityLevel"
                defaultValue={searchParams.get('severityLevel') ?? ''}
              >
                <option value="">전체</option>
                {SEVERITY_LEVEL_OPTIONS.map((severity) => (
                  <option key={severity} value={severity}>
                    {getSeverityLevelLabel(severity)}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Review Status">
              <select
                className="input-field"
                name="reviewStatus"
                defaultValue={searchParams.get('reviewStatus') ?? ''}
              >
                <option value="">전체</option>
                {REVIEW_STATUS_OPTIONS.map((reviewStatus) => (
                  <option key={reviewStatus} value={reviewStatus}>
                    {getReviewStatusLabel(reviewStatus)}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          <div className="inline-actions">
            <button className="btn btn-primary" type="submit">
              검색
            </button>
            <button className="btn btn-secondary" type="button" onClick={resetFilters}>
              초기화
            </button>
          </div>
        </form>
      </section>

      {!hasScopedFilter ? (
        <EmptyState
          title="먼저 scope 필터를 입력해 주세요."
          description="inspectionId, zoneId, plantId, equipmentId 중 하나를 넣으면 결과 목록을 조회할 수 있습니다."
        />
      ) : null}

      {hasScopedFilter && resultsQuery.isLoading && !resultsQuery.data ? (
        <LoadingState message="결과 목록을 불러오는 중입니다." />
      ) : null}

      {hasScopedFilter && resultsQuery.isError ? (
        <ErrorState
          title="결과 목록을 불러오지 못했습니다."
          description={getApiErrorMessage(resultsQuery.error)}
        />
      ) : null}

      {hasScopedFilter && resultsQuery.data ? (
        <section className="panel stack-md">
          <div>
            <h2 className="panel-title">결과 목록</h2>
            <p className="panel-description">
              결과 ID와 분석 작업, 검토 상태, 조치 후보를 확인하고 상세 화면으로 이동할 수 있습니다.
            </p>
          </div>
          <DataTable
            columns={[
              {
                key: 'result',
                header: '결과',
                render: (row) => (
                  <div className="stack-sm">
                    <span className="font-semibold text-slate-900">{`Result #${row.resultId}`}</span>
                    <span className="text-xs text-slate-500">{`Job #${row.jobId}`}</span>
                  </div>
                ),
              },
              {
                key: 'scope',
                header: '대상',
                render: (row) => (
                  <div className="stack-sm text-sm">
                    <span>{`Plant ${row.plantId ?? '-'}`}</span>
                    <span>{`Zone ${row.zoneId ?? '-'}`}</span>
                    <span>{`Inspection ${row.inspectionId ?? '-'}`}</span>
                  </div>
                ),
              },
              {
                key: 'types',
                header: '유형',
                render: (row) => (
                  <div className="stack-sm">
                    <StatusBadge label={getAnalysisInputTypeLabel(row.inputType!)} />
                    <StatusBadge label={getAnalysisModelTypeLabel(row.modelType)} tone="default" />
                  </div>
                ),
              },
              {
                key: 'status',
                header: '상태',
                render: (row) => (
                  <div className="stack-sm">
                    <StatusBadge
                      label={getAnalysisJobStatusLabel(row.jobStatus!)}
                      tone={getAnalysisJobStatusTone(row.jobStatus!)}
                    />
                    <StatusBadge
                      label={getResultStatusLabel(row.resultStatus)}
                      tone={getResultStatusTone(row.resultStatus)}
                    />
                  </div>
                ),
              },
              {
                key: 'review',
                header: '검토/조치',
                render: (row) => (
                  <div className="stack-sm">
                    <StatusBadge
                      label={getReviewStatusLabel(row.reviewStatus)}
                      tone={getReviewStatusTone(row.reviewStatus)}
                    />
                    <StatusBadge label={getActionCandidateLabel(row.actionCandidate)} />
                  </div>
                ),
              },
              {
                key: 'severity',
                header: '심각도',
                render: (row) => (
                  <div className="stack-sm">
                    <StatusBadge
                      label={getSeverityLevelLabel(row.severityLevel)}
                      tone={getSeverityLevelTone(row.severityLevel)}
                    />
                    <span className="text-xs text-slate-500">
                      {getPriorityLevelLabel(row.priorityLevel)}
                    </span>
                  </div>
                ),
              },
              {
                key: 'analyzedAt',
                header: '분석 시각',
                render: (row) => formatDateTime(row.analyzedAt),
              },
              {
                key: 'actions',
                header: '동작',
                render: (row) => (
                  <div className="inline-actions">
                    <Link className="text-button" to={`/results/${row.resultId}`}>
                      상세 보기
                    </Link>
                    {row.inspectionId ? (
                      <Link className="text-button" to={`/inspections/${row.inspectionId}`}>
                        점검 상세
                      </Link>
                    ) : null}
                  </div>
                ),
              },
            ]}
            rows={rows}
            rowKey={(row) => row.resultId}
            emptyTitle="검색 조건에 맞는 결과가 없습니다."
            emptyDescription="필터를 조정하거나 다른 inspection 범위를 선택해 보세요."
          />
          <Pagination
            page={(resultsQuery.data.data.page ?? 0) + 1}
            totalPages={resultsQuery.data.data.totalPages}
            totalElements={resultsQuery.data.data.totalElements}
            onPageChange={(nextPage) => {
              const next = new URLSearchParams(searchParams)
              next.set('page', String(nextPage))
              setSearchParams(next)
            }}
          />
        </section>
      ) : null}
    </section>
  )
}
