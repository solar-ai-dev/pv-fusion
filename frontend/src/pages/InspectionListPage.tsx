import type { ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { useAuth } from '../features/auth/hooks/useAuth'
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
  zoneId: z.string().min(1, '점검 영역을 선택해 주세요.'),
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
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuth()
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
    defaultValues: getCreateFormDefaults({
      plantId,
      zoneId,
      inspectorName: user?.name,
    }),
  })

  const createPlantId = parsePositiveNumber(createForm.watch('plantId'))
  const createZoneId = parsePositiveNumber(createForm.watch('zoneId'))
  const createZonesQuery = useZonesByPlantId(createPlantId ?? 0)
  const selectedPlant = plantsQuery.data?.data.content.find(
    (plant) => plant.plantId === createPlantId,
  )
  const selectedZone = createZonesQuery.data?.data.find((zone) => zone.zoneId === createZoneId)

  useEffect(() => {
    if (!isCreateModalOpen) {
      return
    }

    const currentPlantId = createForm.getValues('plantId')

    if (!currentPlantId && plantsQuery.data?.data.content.length === 1) {
      createForm.setValue('plantId', String(plantsQuery.data.data.content[0].plantId), {
        shouldDirty: false,
        shouldTouch: false,
      })
    }
  }, [createForm, isCreateModalOpen, plantsQuery.data])

  useEffect(() => {
    if (!isCreateModalOpen) {
      return
    }

    const zones = createZonesQuery.data?.data ?? []
    const currentZoneId = createForm.getValues('zoneId')

    if (
      createPlantId &&
      zones.length === 1 &&
      !currentZoneId &&
      !createForm.formState.dirtyFields.zoneId
    ) {
      createForm.setValue('zoneId', String(zones[0].zoneId), {
        shouldDirty: false,
        shouldTouch: false,
      })
    }
  }, [
    createForm,
    createForm.formState.dirtyFields.zoneId,
    createPlantId,
    createZonesQuery.data,
    isCreateModalOpen,
  ])

  useEffect(() => {
    if (!isCreateModalOpen) {
      return
    }

    const hasManualName = createForm.formState.dirtyFields.name
    const currentName = createForm.getValues('name').trim()

    if (hasManualName && currentName) {
      return
    }

    createForm.setValue(
      'name',
      buildInspectionName(selectedPlant?.name, selectedZone?.name),
      { shouldDirty: false, shouldTouch: false },
    )
  }, [
    createForm,
    createForm.formState.dirtyFields.name,
    isCreateModalOpen,
    selectedPlant?.name,
    selectedZone?.name,
  ])

  if (inspectionsQuery.isError && !inspectionsQuery.data) {
    return (
      <section className="space-y-6">
        <PageHeader
          title="점검"
          description="등록된 점검을 확인하고 이미지 업로드와 분석 흐름을 이어서 진행하세요."
          actions={
            <button className="btn btn-primary" type="button" onClick={() => openCreateModal()}>
              새 점검 시작
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
      toast.push(response.message || '점검을 생성했습니다. 이미지 업로드 화면으로 이동합니다.')
      setIsCreateModalOpen(false)
      navigate(`/inspections/${response.data.inspectionId}`)
    } catch (error) {
      toast.push(getApiErrorMessage(error, '점검 생성에 실패했습니다.'))
    }
  })

  const rows = inspectionsQuery.data?.data.content ?? []
  const createZones = createZonesQuery.data?.data ?? []
  const hasPlants = (plantsQuery.data?.data.content.length ?? 0) > 0
  const hasCreateZones = createZones.length > 0

  return (
    <section className="space-y-6">
      <PageHeader
        title="점검"
        description="점검을 시작하고 업로드, 분석, 결과 확인까지 한 흐름으로 이어서 관리하세요."
        actions={
          <button className="btn btn-primary" type="button" onClick={() => openCreateModal()}>
            새 점검 시작
          </button>
        }
      />

      <section className="panel stack-md">
        <div className="toolbar">
          <div>
            <h2 className="panel-title">조회 조건</h2>
            <p className="panel-description">
              기본 조건만 노출하고, 범위나 기간은 필요할 때만 조정할 수 있게 유지했습니다.
            </p>
          </div>
          <div className="inline-actions">
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => setSearchParams(new URLSearchParams())}
            >
              초기화
            </button>
          </div>
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
          <FormField label="점검 영역">
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
              <option value="">{plantId ? '전체' : '발전소를 먼저 선택해 주세요.'}</option>
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
                  {option}개
                </option>
              ))}
            </select>
          </FormField>
        </div>
      </section>

      <section className="panel stack-md">
        <div className="toolbar">
          <div>
            <h2 className="panel-title">점검 목록</h2>
            <p className="panel-description">
              진행 중인 점검을 이어가거나 완료된 점검의 촬영 시각과 상태를 빠르게 확인할 수 있습니다.
            </p>
          </div>
          {inspectionsQuery.isLoading ? (
            <span className="text-sm text-slate-500">점검 목록을 불러오는 중입니다.</span>
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
                        <span className="text-sm text-slate-500">
                          {getCaptureMethodLabel(inspection.captureMethod)} 촬영
                        </span>
                      </div>
                    ),
                  },
                  {
                    key: 'scope',
                    header: '연결 대상',
                    render: (inspection) => (
                      <div className="stack-sm text-sm text-slate-600">
                        <span>{inspection.plantId ? '발전소 연결됨' : '발전소 정보 없음'}</span>
                        <span>점검 영역 연결됨</span>
                      </div>
                    ),
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
                  {
                    key: 'actions',
                    header: '이동',
                    render: (inspection) => (
                      <Link className="text-button" to={`/inspections/${inspection.inspectionId}`}>
                        이어서 보기
                      </Link>
                    ),
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
            <div className="state-card">
              <EmptyState
                title="아직 등록된 점검이 없습니다."
                description="상단의 새 점검 시작 버튼으로 촬영과 분석 흐름을 시작해 주세요."
              />
            </div>
          )
        ) : null}
      </section>

      <EntityModal
        isOpen={isCreateModalOpen}
        title="새 점검 시작"
        description="발전소와 점검 영역을 선택하고 기본 정보를 입력하면 이미지 업로드 단계로 바로 이동합니다."
        onClose={() => setIsCreateModalOpen(false)}
      >
        {!hasPlants ? (
          <div className="space-y-4">
            <EmptyState
              title="등록된 발전소가 없습니다."
              description="점검을 시작하려면 먼저 발전소를 등록해 주세요."
            />
            <div className="inline-actions justify-end">
              <Link className="btn btn-secondary" to="/plants">
                발전소 화면으로 이동
              </Link>
            </div>
          </div>
        ) : (
          <form className="stack-md" onSubmit={handleCreateInspection}>
            <FormField label="발전소 *" error={createForm.formState.errors.plantId?.message}>
              <select className="input-field" {...createForm.register('plantId')}>
                <option value="">발전소를 선택해 주세요.</option>
                {plantsQuery.data?.data.content.map((plant) => (
                  <option key={plant.plantId} value={plant.plantId}>
                    {plant.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField
              label="점검 영역 *"
              hint={
                createPlantId
                  ? '점검할 영역을 선택해 주세요.'
                  : '발전소를 먼저 선택하면 영역 목록이 열립니다.'
              }
              error={createForm.formState.errors.zoneId?.message}
            >
              <select
                className="input-field"
                {...createForm.register('zoneId')}
                disabled={!createPlantId || !hasCreateZones}
              >
                <option value="">
                  {!createPlantId
                    ? '발전소를 먼저 선택해 주세요.'
                    : hasCreateZones
                      ? '점검 영역을 선택해 주세요.'
                      : '등록된 점검 영역이 없습니다.'}
                </option>
                {createZones.map((zone) => (
                  <option key={zone.zoneId} value={zone.zoneId}>
                    {zone.name}
                  </option>
                ))}
              </select>
            </FormField>

            {createPlantId && !createZonesQuery.isLoading && !createZonesQuery.isError && !hasCreateZones ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p>선택한 발전소에 등록된 점검 영역이 없습니다. 먼저 발전소 상세에서 영역을 추가해 주세요.</p>
                <div className="mt-3 inline-actions justify-end">
                  <Link className="btn btn-secondary" to={`/plants/${createPlantId}`}>
                    발전소 상세 보기
                  </Link>
                </div>
              </div>
            ) : null}

            <FormField
              label="점검명 *"
              hint="발전소와 점검 영역을 고르면 기본 점검명이 자동으로 채워집니다."
              error={createForm.formState.errors.name?.message}
            >
              <input
                className="input-field"
                placeholder="예: 부천 발전소 정기 점검"
                {...createForm.register('name')}
              />
            </FormField>

            <FormField
              label="촬영 방식 *"
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
              hint="정확한 시각을 모르면 비워 둘 수 있습니다."
              error={createForm.formState.errors.capturedAt?.message}
            >
              <input
                className="input-field"
                type="datetime-local"
                {...createForm.register('capturedAt')}
              />
            </FormField>

            <FormField label="점검자" error={createForm.formState.errors.inspectorName?.message}>
              <input
                className="input-field"
                placeholder="예: 홍길동"
                {...createForm.register('inspectorName')}
              />
            </FormField>

            <FormField label="메모" error={createForm.formState.errors.memo?.message}>
              <textarea
                className="input-field textarea-field"
                placeholder="특이사항이나 촬영 조건이 있으면 적어 주세요."
                {...createForm.register('memo')}
              />
            </FormField>

            <ModalActions
              isSubmitting={createInspectionMutation.isPending}
              onCancel={() => setIsCreateModalOpen(false)}
              submitText="점검 시작"
            />
          </form>
        )}
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
    createForm.reset(
      getCreateFormDefaults({
        plantId,
        zoneId,
        inspectorName: user?.name,
      }),
    )
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
      <section
        className="modal-card max-h-[calc(100vh-3rem)] overflow-y-auto"
        onClick={(event) => event.stopPropagation()}
      >
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
  submitText = '등록',
}: {
  isSubmitting: boolean
  onCancel: () => void
  submitText?: string
}) {
  return (
    <div className="inline-actions justify-end">
      <button className="btn btn-secondary" type="button" onClick={onCancel}>
        취소
      </button>
      <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
        {submitText}
      </button>
    </div>
  )
}

function getCreateFormDefaults({
  plantId,
  zoneId,
  inspectorName,
}: {
  plantId: number | null
  zoneId: number | null
  inspectorName?: string
}): CreateInspectionFormValues {
  return {
    plantId: plantId ? String(plantId) : '',
    zoneId: zoneId ? String(zoneId) : '',
    name: '',
    capturedAt: dayjs().format('YYYY-MM-DDTHH:mm'),
    captureMethod: 'DRONE',
    inspectorName: inspectorName ?? '',
    memo: '',
  }
}

function buildInspectionName(plantName?: string | null, zoneName?: string | null) {
  const baseName = zoneName || plantName || '새 점검'
  return `${baseName} 점검 - ${dayjs().format('YYYY.MM.DD')}`
}
