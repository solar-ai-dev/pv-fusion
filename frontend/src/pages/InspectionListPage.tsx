import type { ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import {
  CAPTURE_METHOD_OPTIONS,
  INSPECTION_STATUS_OPTIONS,
  getCaptureMethodLabel,
  getInspectionStatusLabel,
  getInspectionStatusTone,
  type CreateInspectionRequest,
  type InspectionListParams,
  type InspectionStatus,
} from '../features/inspections/types'
import {
  useCreateInspection,
  useInspections,
} from '../features/inspections/hooks/useInspections'
import { usePlants } from '../features/plants/hooks/usePlants'
import { useZonesByPlantId } from '../features/zones/hooks/useZones'
import { FormField } from '../shared/components/form/FormField'
import { PageHeader } from '../shared/components/layout/PageHeader'
import { EmptyState } from '../shared/components/state/EmptyState'
import { ErrorState } from '../shared/components/state/ErrorState'
import { LoadingState } from '../shared/components/state/LoadingState'
import { StatusBadge } from '../shared/components/state/StatusBadge'
import { DataTable } from '../shared/components/table/DataTable'
import { Pagination } from '../shared/components/table/Pagination'
import { useToast } from '../shared/hooks/useToast'
import {
  formatDateTime,
  getApiErrorMessage,
  parsePositiveNumber,
  toOffsetDateTime,
} from '../shared/utils'

const createInspectionSchema = z.object({
  plantId: z.string().min(1, '발전소를 선택해 주세요.'),
  zoneId: z.string().min(1, '구역을 선택해 주세요.'),
  name: z.string().trim().min(1, '점검명을 입력해 주세요.'),
  capturedAt: z.string().optional(),
  captureMethod: z.enum(CAPTURE_METHOD_OPTIONS),
  inspectorName: z.string().optional(),
  memo: z.string().optional(),
})

type CreateInspectionFormValues = z.infer<typeof createInspectionSchema>

const DEFAULT_PAGE = 1
const DEFAULT_SIZE = 20

export function InspectionListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const toast = useToast()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const plantId = parsePositiveNumber(searchParams.get('plantId') ?? undefined)
  const zoneId = parsePositiveNumber(searchParams.get('zoneId') ?? undefined)
  const statusParam = searchParams.get('inspectionStatus')
  const inspectionStatus = INSPECTION_STATUS_OPTIONS.includes(
    statusParam as InspectionStatus,
  )
    ? (statusParam as InspectionStatus)
    : undefined
  const from = searchParams.get('from') || undefined
  const to = searchParams.get('to') || undefined
  const page = Math.max(
    parsePositiveNumber(searchParams.get('page') ?? undefined) ?? DEFAULT_PAGE,
    DEFAULT_PAGE,
  )
  const size = Math.max(
    parsePositiveNumber(searchParams.get('size') ?? undefined) ?? DEFAULT_SIZE,
    1,
  )

  const inspectionParams = useMemo<InspectionListParams>(
    () => ({
      plantId: plantId ?? undefined,
      zoneId: zoneId ?? undefined,
      inspectionStatus,
      from,
      to,
      page: page - 1,
      size,
    }),
    [from, inspectionStatus, page, plantId, size, to, zoneId],
  )

  const inspectionsQuery = useInspections(inspectionParams)
  const plantsQuery = usePlants({ page: 0, size: 100, status: 'ACTIVE' })
  const filterZonesQuery = useZonesByPlantId(plantId ?? 0)
  const createInspectionMutation = useCreateInspection()

  const createForm = useForm<CreateInspectionFormValues>({
    resolver: zodResolver(createInspectionSchema),
    defaultValues: {
      plantId: plantId ? String(plantId) : '',
      zoneId: zoneId ? String(zoneId) : '',
      name: '',
      capturedAt: '',
      captureMethod: 'DRONE',
      inspectorName: '',
      memo: '',
    },
  })

  const createPlantId = parsePositiveNumber(createForm.watch('plantId'))
  const createZonesQuery = useZonesByPlantId(createPlantId ?? 0)

  if (inspectionsQuery.isError && !inspectionsQuery.data) {
    return (
      <section className="space-y-6">
        <PageHeader
          title="점검 관리"
          description="실제 backend 점검 목록 API를 기준으로 필터와 등록 흐름을 구성했습니다."
          actions={
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => openCreateModal()}
            >
              점검 등록
            </button>
          }
        />
        <ErrorState
          title="점검 목록을 불러오지 못했습니다."
          description={getApiErrorMessage(inspectionsQuery.error)}
        />
      </section>
    )
  }

  const handleCreateInspection = createForm.handleSubmit(async (values) => {
    const payload: CreateInspectionRequest = {
      zoneId: Number(values.zoneId),
      name: values.name.trim(),
      capturedAt: toOffsetDateTime(values.capturedAt),
      captureMethod: values.captureMethod,
      inspectorName: values.inspectorName?.trim() || null,
      memo: values.memo?.trim() || null,
    }

    try {
      const response = await createInspectionMutation.mutateAsync(payload)
      toast.push(response.message || '점검을 등록했습니다.')
      setIsCreateModalOpen(false)
      createForm.reset({
        plantId: values.plantId,
        zoneId: values.zoneId,
        name: '',
        capturedAt: '',
        captureMethod: values.captureMethod,
        inspectorName: '',
        memo: '',
      })
      setSearchParams((current) => {
        const next = new URLSearchParams(current)
        next.set('zoneId', String(response.data.zoneId))
        next.set('page', String(DEFAULT_PAGE))
        return next
      })
    } catch (error) {
      toast.push(getApiErrorMessage(error, '점검 등록에 실패했습니다.'))
    }
  })

  const rows = inspectionsQuery.data?.data.content ?? []

  return (
    <section className="space-y-6">
      <PageHeader
        title="점검 관리"
        description="GET /api/v1/inspections와 POST /api/v1/inspections를 기준으로 목록과 생성 흐름을 연결했습니다."
        actions={
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => openCreateModal()}
          >
            점검 등록
          </button>
        }
      />

      <section className="panel stack-md">
        <div>
          <h2 className="panel-title">조회 필터</h2>
          <p className="panel-description">
            비관리자 계정은 backend 정책상 zoneId가 있어야 점검 목록을 조회할 수 있습니다.
          </p>
        </div>
        <div className="filter-grid">
          <FormField label="발전소">
            <select
              className="input-field"
              value={plantId ? String(plantId) : ''}
              onChange={(event) => {
                const nextPlantId = event.target.value
                updateSearchParams({
                  plantId: nextPlantId,
                  zoneId: '',
                  page: String(DEFAULT_PAGE),
                })
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
              value={zoneId ? String(zoneId) : ''}
              onChange={(event) =>
                updateSearchParams({
                  zoneId: event.target.value,
                  page: String(DEFAULT_PAGE),
                })
              }
              disabled={!plantId}
            >
              <option value="">{plantId ? '전체' : '발전소를 먼저 선택하세요'}</option>
              {filterZonesQuery.data?.data.map((zone) => (
                <option key={zone.zoneId} value={zone.zoneId}>
                  {zone.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="상태">
            <select
              className="input-field"
              value={inspectionStatus ?? ''}
              onChange={(event) =>
                updateSearchParams({
                  inspectionStatus: event.target.value,
                  page: String(DEFAULT_PAGE),
                })
              }
            >
              <option value="">전체</option>
              {INSPECTION_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {getInspectionStatusLabel(status)}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="시작일">
            <input
              className="input-field"
              type="date"
              value={from ?? ''}
              onChange={(event) =>
                updateSearchParams({ from: event.target.value, page: String(DEFAULT_PAGE) })
              }
            />
          </FormField>
          <FormField label="종료일">
            <input
              className="input-field"
              type="date"
              value={to ?? ''}
              onChange={(event) =>
                updateSearchParams({ to: event.target.value, page: String(DEFAULT_PAGE) })
              }
            />
          </FormField>
          <FormField label="페이지 크기">
            <select
              className="input-field"
              value={String(size)}
              onChange={(event) =>
                updateSearchParams({
                  size: event.target.value,
                  page: String(DEFAULT_PAGE),
                })
              }
            >
              {[10, 20, 50].map((option) => (
                <option key={option} value={option}>
                  {option}건
                </option>
              ))}
            </select>
          </FormField>
        </div>
        <div className="inline-actions">
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => setSearchParams(new URLSearchParams())}
          >
            필터 초기화
          </button>
        </div>
      </section>

      <section className="panel stack-md">
        <div className="toolbar">
          <div>
            <h2 className="panel-title">점검 목록</h2>
            <p className="panel-description">
              plantId, zoneId, 상태, 기간 조건으로 backend 페이지네이션 결과를 그대로 표시합니다.
            </p>
          </div>
          {inspectionsQuery.isLoading ? (
            <span className="text-sm text-slate-500">목록을 불러오는 중입니다.</span>
          ) : null}
        </div>

        {inspectionsQuery.isLoading && !inspectionsQuery.data ? (
          <LoadingState message="점검 목록을 불러오는 중입니다." />
        ) : null}

        {inspectionsQuery.data ? (
          rows.length > 0 ? (
            <>
              <DataTable
                columns={[
                  {
                    key: 'name',
                    header: '점검명',
                    render: (inspection) => (
                      <div className="stack-sm">
                        <Link
                          className="text-base font-semibold text-sky-700"
                          to={`/inspections/${inspection.inspectionId}`}
                        >
                          {inspection.name}
                        </Link>
                        <span className="text-xs text-slate-500">
                          점검 ID {inspection.inspectionId}
                        </span>
                      </div>
                    ),
                  },
                  {
                    key: 'scope',
                    header: '대상',
                    render: (inspection) => (
                      <div className="stack-sm text-sm">
                        <span>발전소 {inspection.plantId ?? '-'}</span>
                        <span>구역 {inspection.zoneId}</span>
                      </div>
                    ),
                  },
                  {
                    key: 'captureMethod',
                    header: '촬영 방식',
                    render: (inspection) => getCaptureMethodLabel(inspection.captureMethod),
                  },
                  {
                    key: 'status',
                    header: '상태',
                    render: (inspection) => (
                      <StatusBadge
                        label={getInspectionStatusLabel(inspection.inspectionStatus)}
                        tone={getInspectionStatusTone(inspection.inspectionStatus)}
                      />
                    ),
                  },
                  {
                    key: 'capturedAt',
                    header: '촬영 시각',
                    render: (inspection) => formatDateTime(inspection.capturedAt),
                  },
                  {
                    key: 'createdAt',
                    header: '등록 시각',
                    render: (inspection) => formatDateTime(inspection.createdAt),
                  },
                ]}
                rows={rows}
                rowKey={(inspection) => inspection.inspectionId}
              />
              <Pagination
                page={(inspectionsQuery.data.data.page ?? 0) + 1}
                totalPages={inspectionsQuery.data.data.totalPages}
                totalElements={inspectionsQuery.data.data.totalElements}
                onPageChange={(nextPage) =>
                  updateSearchParams({ page: String(Math.max(nextPage, DEFAULT_PAGE)) })
                }
              />
            </>
          ) : (
            <EmptyState
              title="조회된 점검이 없습니다."
              description="필터를 조정하거나 새 점검을 등록해 주세요."
            />
          )
        ) : null}
      </section>

      <EntityModal
        isOpen={isCreateModalOpen}
        title="점검 등록"
        description="구역을 선택한 뒤 점검 기본 정보를 입력하면 READY 상태로 생성됩니다."
        onClose={() => setIsCreateModalOpen(false)}
      >
        <form className="stack-md" onSubmit={handleCreateInspection}>
          <FormField label="발전소" error={createForm.formState.errors.plantId?.message}>
            <select className="input-field" {...createForm.register('plantId')}>
              <option value="">발전소를 선택하세요</option>
              {plantsQuery.data?.data.content.map((plant) => (
                <option key={plant.plantId} value={plant.plantId}>
                  {plant.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="구역" error={createForm.formState.errors.zoneId?.message}>
            <select
              className="input-field"
              {...createForm.register('zoneId')}
              disabled={!createPlantId}
            >
              <option value="">
                {createPlantId ? '구역을 선택하세요' : '발전소를 먼저 선택하세요'}
              </option>
              {createZonesQuery.data?.data.map((zone) => (
                <option key={zone.zoneId} value={zone.zoneId}>
                  {zone.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="점검명" error={createForm.formState.errors.name?.message}>
            <input className="input-field" {...createForm.register('name')} />
          </FormField>
          <FormField
            label="촬영 방식"
            error={createForm.formState.errors.captureMethod?.message}
          >
            <select className="input-field" {...createForm.register('captureMethod')}>
              {CAPTURE_METHOD_OPTIONS.map((method) => (
                <option key={method} value={method}>
                  {getCaptureMethodLabel(method)}
                </option>
              ))}
            </select>
          </FormField>
          <FormField
            label="촬영 시각"
            hint="비워 두면 backend에 null로 전달됩니다."
            error={createForm.formState.errors.capturedAt?.message}
          >
            <input
              className="input-field"
              type="datetime-local"
              {...createForm.register('capturedAt')}
            />
          </FormField>
          <FormField
            label="점검자"
            error={createForm.formState.errors.inspectorName?.message}
          >
            <input className="input-field" {...createForm.register('inspectorName')} />
          </FormField>
          <FormField label="메모" error={createForm.formState.errors.memo?.message}>
            <textarea className="input-field textarea-field" {...createForm.register('memo')} />
          </FormField>
          <ModalActions
            isSubmitting={createInspectionMutation.isPending}
            onCancel={() => setIsCreateModalOpen(false)}
            submitText="등록"
          />
        </form>
      </EntityModal>
    </section>
  )

  function updateSearchParams(nextValues: Record<string, string>) {
    const next = new URLSearchParams(searchParams)

    Object.entries(nextValues).forEach(([key, value]) => {
      if (value) {
        next.set(key, value)
      } else {
        next.delete(key)
      }
    })

    setSearchParams(next)
  }

  function openCreateModal() {
    createForm.reset({
      plantId: plantId ? String(plantId) : '',
      zoneId: zoneId ? String(zoneId) : '',
      name: '',
      capturedAt: '',
      captureMethod: 'DRONE',
      inspectorName: '',
      memo: '',
    })
    setIsCreateModalOpen(true)
  }
}

function EntityModal({
  isOpen,
  title,
  description,
  children,
  onClose,
}: {
  isOpen: boolean
  title: string
  description: string
  children: ReactNode
  onClose: () => void
}) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="modal-card" onClick={(event) => event.stopPropagation()}>
        <h2 className="panel-title">{title}</h2>
        <p className="panel-description">{description}</p>
        <div className="mt-6">{children}</div>
      </section>
    </div>
  )
}

function ModalActions({
  isSubmitting,
  onCancel,
  submitText = '저장',
}: {
  isSubmitting: boolean
  onCancel: () => void
  submitText?: string
}) {
  return (
    <div className="flex justify-end gap-3">
      <button className="btn btn-secondary" type="button" onClick={onCancel}>
        취소
      </button>
      <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
        {submitText}
      </button>
    </div>
  )
}
