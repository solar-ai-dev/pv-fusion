import type { ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { useForm, type UseFormReturn } from 'react-hook-form'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { EquipmentTree } from '../features/equipments/components/EquipmentTree'
import {
  useCreateEquipment,
  useDeactivateEquipment,
  useEquipments,
  useUpdateEquipment,
} from '../features/equipments/hooks/useEquipments'
import {
  EQUIPMENT_TYPE_OPTIONS,
  flattenEquipmentTree,
  getEquipmentTypeLabel,
  type CreateEquipmentRequest,
  type EquipmentListParams,
  type EquipmentTreeNode,
  type EquipmentType,
  type UpdateEquipmentRequest,
} from '../features/equipments/types'
import {
  getResourceStatusLabel,
  getResourceStatusTone,
  RESOURCE_STATUS_OPTIONS,
  type ResourceStatus,
} from '../features/plants/types'
import {
  useDeactivateZone,
  useUpdateZone,
  useZone,
} from '../features/zones/hooks/useZones'
import type { UpdateZoneRequest } from '../features/zones/types'
import { ConfirmModal } from '../shared/components/feedback/ConfirmModal'
import { FormField } from '../shared/components/form/FormField'
import { PageHeader } from '../shared/components/layout/PageHeader'
import { EmptyState } from '../shared/components/state/EmptyState'
import { ErrorState } from '../shared/components/state/ErrorState'
import { LoadingState } from '../shared/components/state/LoadingState'
import { StatusBadge } from '../shared/components/state/StatusBadge'
import { useToast } from '../shared/hooks/useToast'
import {
  formatDateTime,
  getApiErrorMessage,
  parsePositiveNumber,
} from '../shared/utils'

const zoneFormSchema = z.object({
  name: z.string().trim().min(1, '구역 이름은 필수입니다.'),
  location: z.string().trim().optional(),
  description: z.string().trim().optional(),
})

const equipmentFormSchema = z.object({
  parentEquipmentId: z.string().optional(),
  equipmentType: z.enum(EQUIPMENT_TYPE_OPTIONS),
  name: z.string().trim().min(1, '장비 이름은 필수입니다.'),
  positionCode: z.string().trim().optional(),
})

type ZoneFormValues = z.infer<typeof zoneFormSchema>
type EquipmentFormValues = z.infer<typeof equipmentFormSchema>

export function ZoneDetailPage() {
  const params = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const toast = useToast()
  const zoneId = parsePositiveNumber(params.zoneId)

  const [isEditZoneModalOpen, setIsEditZoneModalOpen] = useState(false)
  const [isCreateEquipmentModalOpen, setIsCreateEquipmentModalOpen] = useState(false)
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentTreeNode | null>(
    null,
  )
  const [isDeactivateZoneModalOpen, setIsDeactivateZoneModalOpen] = useState(false)
  const [equipmentToDeactivate, setEquipmentToDeactivate] =
    useState<EquipmentTreeNode | null>(null)

  const statusParam = searchParams.get('status')
  const typeParam = searchParams.get('equipmentType')

  const equipmentFilters: EquipmentListParams = {
    status: RESOURCE_STATUS_OPTIONS.includes(statusParam as ResourceStatus)
      ? (statusParam as ResourceStatus)
      : undefined,
    equipmentType: EQUIPMENT_TYPE_OPTIONS.includes(typeParam as EquipmentType)
      ? (typeParam as EquipmentType)
      : undefined,
  }

  const zoneQuery = useZone(zoneId ?? 0)
  const equipmentsQuery = useEquipments(zoneId ?? 0, equipmentFilters)
  const updateZoneMutation = useUpdateZone(zoneId ?? 0)
  const deactivateZoneMutation = useDeactivateZone(zoneId ?? 0)
  const createEquipmentMutation = useCreateEquipment(zoneId ?? 0, equipmentFilters)
  const updateEquipmentMutation = useUpdateEquipment(zoneId ?? 0, equipmentFilters)
  const deactivateEquipmentMutation = useDeactivateEquipment(zoneId ?? 0, equipmentFilters)

  const zoneForm = useForm<ZoneFormValues>({
    resolver: zodResolver(zoneFormSchema),
    values: {
      name: zoneQuery.data?.data.name ?? '',
      location: zoneQuery.data?.data.location ?? '',
      description: zoneQuery.data?.data.description ?? '',
    },
  })

  const createEquipmentForm = useForm<EquipmentFormValues>({
    resolver: zodResolver(equipmentFormSchema),
    defaultValues: {
      parentEquipmentId: '',
      equipmentType: 'ARRAY',
      name: '',
      positionCode: '',
    },
  })

  const editEquipmentForm = useForm<EquipmentFormValues>({
    resolver: zodResolver(equipmentFormSchema),
    values: {
      parentEquipmentId: selectedEquipment?.parentEquipmentId
        ? String(selectedEquipment.parentEquipmentId)
        : '',
      equipmentType: selectedEquipment?.equipmentType ?? 'ARRAY',
      name: selectedEquipment?.name ?? '',
      positionCode: selectedEquipment?.positionCode ?? '',
    },
  })

  const flattenedEquipments = useMemo(
    () => flattenEquipmentTree(equipmentsQuery.data?.data ?? []),
    [equipmentsQuery.data],
  )

  if (!zoneId) {
    return (
      <ErrorState
        title="잘못된 구역 ID입니다."
        description="URL의 zoneId가 숫자인지 확인해 주세요."
      />
    )
  }

  const handleUpdateZone = zoneForm.handleSubmit(async (values) => {
    const payload: UpdateZoneRequest = {
      name: values.name.trim(),
      location: values.location?.trim() || null,
      description: values.description?.trim() || null,
    }

    try {
      const response = await updateZoneMutation.mutateAsync(payload)
      toast.push(response.message || '구역 정보를 수정했습니다.')
      setIsEditZoneModalOpen(false)
    } catch (error) {
      toast.push(getApiErrorMessage(error, '구역 수정에 실패했습니다.'))
    }
  })

  const handleCreateEquipment = createEquipmentForm.handleSubmit(async (values) => {
    const payload: CreateEquipmentRequest = {
      parentEquipmentId: values.parentEquipmentId
        ? Number(values.parentEquipmentId)
        : null,
      equipmentType: values.equipmentType,
      name: values.name.trim(),
      positionCode: values.positionCode?.trim() || null,
    }

    try {
      const response = await createEquipmentMutation.mutateAsync(payload)
      toast.push(response.message || '장비를 등록했습니다.')
      createEquipmentForm.reset()
      setIsCreateEquipmentModalOpen(false)
    } catch (error) {
      toast.push(getApiErrorMessage(error, '장비 등록에 실패했습니다.'))
    }
  })

  const handleUpdateEquipment = editEquipmentForm.handleSubmit(async (values) => {
    if (!selectedEquipment) {
      return
    }

    const payload: UpdateEquipmentRequest = {
      parentEquipmentId: values.parentEquipmentId
        ? Number(values.parentEquipmentId)
        : null,
      equipmentType: values.equipmentType,
      name: values.name.trim(),
      positionCode: values.positionCode?.trim() || null,
    }

    try {
      const response = await updateEquipmentMutation.mutateAsync({
        equipmentId: selectedEquipment.equipmentId,
        payload,
      })
      toast.push(response.message || '장비를 수정했습니다.')
      setSelectedEquipment(null)
    } catch (error) {
      toast.push(getApiErrorMessage(error, '장비 수정에 실패했습니다.'))
    }
  })

  const handleDeactivateZone = async () => {
    try {
      const response = await deactivateZoneMutation.mutateAsync()
      toast.push(response.message || '구역을 비활성화했습니다.')
      setIsDeactivateZoneModalOpen(false)
    } catch (error) {
      toast.push(getApiErrorMessage(error, '구역 비활성화에 실패했습니다.'))
    }
  }

  const handleDeactivateEquipment = async () => {
    if (!equipmentToDeactivate) {
      return
    }

    try {
      const response = await deactivateEquipmentMutation.mutateAsync(
        equipmentToDeactivate.equipmentId,
      )
      toast.push(response.message || '장비를 비활성화했습니다.')
      setEquipmentToDeactivate(null)
    } catch (error) {
      toast.push(getApiErrorMessage(error, '장비 비활성화에 실패했습니다.'))
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="구역 상세"
        description="구역 기본 정보와 장비 트리를 backend 실제 응답 구조에 맞춰 제공합니다."
        actions={
          <>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => setIsEditZoneModalOpen(true)}
            >
              구역 수정
            </button>
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => {
                createEquipmentForm.reset()
                setIsCreateEquipmentModalOpen(true)
              }}
            >
              장비 등록
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => setIsDeactivateZoneModalOpen(true)}
            >
              구역 비활성화
            </button>
          </>
        }
      />

      {zoneQuery.isLoading ? <LoadingState message="구역 정보를 불러오는 중입니다." /> : null}
      {zoneQuery.isError ? (
        <ErrorState
          title="구역 상세 조회에 실패했습니다."
          description={getApiErrorMessage(zoneQuery.error)}
        />
      ) : null}

      {zoneQuery.data ? (
        <section className="panel stack-md">
          <div className="toolbar">
            <div className="stack-sm">
              <div className="inline-actions">
                <StatusBadge
                  label={getResourceStatusLabel(zoneQuery.data.data.status)}
                  tone={getResourceStatusTone(zoneQuery.data.data.status)}
                />
                <StatusBadge label={`Array ${zoneQuery.data.data.arrayCount}개`} />
                <StatusBadge label={`Panel ${zoneQuery.data.data.panelCount}개`} />
              </div>
              <div>
                <h2 className="panel-title">{zoneQuery.data.data.name}</h2>
                <p className="panel-description">
                  {zoneQuery.data.data.location || '위치 정보 없음'}
                </p>
              </div>
            </div>
            <div className="inline-actions">
              <Link className="btn btn-secondary" to={`/plants/${zoneQuery.data.data.plantId}`}>
                상위 발전소
              </Link>
              <Link className="btn btn-secondary" to="/results">
                결과 목록
              </Link>
            </div>
          </div>
          <div className="detail-grid">
            <DetailItem label="설명" value={zoneQuery.data.data.description || '-'} />
            <DetailItem label="우선순위" value={zoneQuery.data.data.priorityLevel || '-'} />
            <DetailItem
              label="조치 후보"
              value={zoneQuery.data.data.topActionCandidate || '-'}
            />
            <DetailItem
              label="후보 이상"
              value={`${zoneQuery.data.data.anomalyCandidateCount}건`}
            />
            <DetailItem
              label="최근 점검"
              value={formatDateTime(zoneQuery.data.data.latestInspectionAt)}
            />
            <DetailItem label="생성자" value={String(zoneQuery.data.data.createdByUserId)} />
          </div>
        </section>
      ) : null}

      <section className="panel stack-md">
        <div className="toolbar">
          <div>
            <h2 className="panel-title">장비 트리</h2>
            <p className="panel-description">
              equipmentType / status 필터를 걸어 트리 응답을 직접 렌더합니다.
            </p>
          </div>
          <div className="inline-actions text-sm text-slate-500">
            <span>총 {flattenedEquipments.length}개 노드</span>
          </div>
        </div>
        <div className="filter-grid">
          <FormField label="장비 유형">
            <select
              className="input-field"
              value={equipmentFilters.equipmentType ?? ''}
              onChange={(event) => updateEquipmentFilter('equipmentType', event.target.value)}
            >
              <option value="">전체</option>
              {EQUIPMENT_TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>
                  {getEquipmentTypeLabel(type)}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="상태">
            <select
              className="input-field"
              value={equipmentFilters.status ?? ''}
              onChange={(event) => updateEquipmentFilter('status', event.target.value)}
            >
              <option value="">전체</option>
              {RESOURCE_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {getResourceStatusLabel(status)}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        {equipmentsQuery.isLoading ? <LoadingState message="장비 트리를 불러오는 중입니다." /> : null}
        {equipmentsQuery.isError ? (
          <ErrorState
            title="장비 트리 조회에 실패했습니다."
            description={getApiErrorMessage(equipmentsQuery.error)}
          />
        ) : null}

        {equipmentsQuery.data ? (
          equipmentsQuery.data.data.length > 0 ? (
            <EquipmentTree
              nodes={equipmentsQuery.data.data}
              onEdit={(node) => setSelectedEquipment(node)}
              onDeactivate={(node) => setEquipmentToDeactivate(node)}
            />
          ) : (
            <EmptyState
              title="등록된 장비가 없습니다."
              description="Array, Panel, Module 장비를 순차적으로 추가할 수 있습니다."
            />
          )
        ) : null}
      </section>

      <EntityModal
        isOpen={isEditZoneModalOpen}
        title="구역 정보 수정"
        description="PATCH /api/v1/zones/{zoneId} 요청 형식입니다."
        onClose={() => setIsEditZoneModalOpen(false)}
      >
        <form className="stack-md" onSubmit={handleUpdateZone}>
          <FormField
            label="이름"
            error={zoneForm.formState.errors.name?.message}
            {...zoneForm.register('name')}
          />
          <FormField
            label="위치"
            error={zoneForm.formState.errors.location?.message}
            {...zoneForm.register('location')}
          />
          <FormField
            label="설명"
            error={zoneForm.formState.errors.description?.message}
          >
            <textarea
              className="input-field textarea-field"
              {...zoneForm.register('description')}
            />
          </FormField>
          <ModalActions
            isSubmitting={updateZoneMutation.isPending}
            onCancel={() => setIsEditZoneModalOpen(false)}
          />
        </form>
      </EntityModal>

      <EntityModal
        isOpen={isCreateEquipmentModalOpen}
        title="장비 등록"
        description="POST /api/v1/zones/{zoneId}/equipments 요청 형식입니다."
        onClose={() => {
          createEquipmentForm.reset()
          setIsCreateEquipmentModalOpen(false)
        }}
      >
        <form className="stack-md" onSubmit={handleCreateEquipment}>
          <EquipmentFormFields
            form={createEquipmentForm}
            parentOptions={flattenedEquipments}
          />
          <ModalActions
            isSubmitting={createEquipmentMutation.isPending}
            onCancel={() => {
              createEquipmentForm.reset()
              setIsCreateEquipmentModalOpen(false)
            }}
            submitText="등록"
          />
        </form>
      </EntityModal>

      <EntityModal
        isOpen={Boolean(selectedEquipment)}
        title="장비 수정"
        description="PATCH /api/v1/equipments/{equipmentId} 요청 형식입니다."
        onClose={() => setSelectedEquipment(null)}
      >
        <form className="stack-md" onSubmit={handleUpdateEquipment}>
          <EquipmentFormFields
            form={editEquipmentForm}
            parentOptions={flattenedEquipments.filter(
              (equipment) => equipment.equipmentId !== selectedEquipment?.equipmentId,
            )}
          />
          <ModalActions
            isSubmitting={updateEquipmentMutation.isPending}
            onCancel={() => setSelectedEquipment(null)}
          />
        </form>
      </EntityModal>

      <ConfirmModal
        isOpen={isDeactivateZoneModalOpen}
        title="구역 비활성화"
        description="실제 backend는 200 본문을 반환하며, 구역 상세와 장비 트리를 다시 조회합니다."
        confirmText="비활성화"
        cancelText="취소"
        isConfirming={deactivateZoneMutation.isPending}
        onConfirm={handleDeactivateZone}
        onCancel={() => setIsDeactivateZoneModalOpen(false)}
      />

      <ConfirmModal
        isOpen={Boolean(equipmentToDeactivate)}
        title="장비 비활성화"
        description={
          equipmentToDeactivate
            ? `${equipmentToDeactivate.name} 장비를 비활성화합니다.`
            : '선택한 장비를 비활성화합니다.'
        }
        confirmText="비활성화"
        cancelText="취소"
        isConfirming={deactivateEquipmentMutation.isPending}
        onConfirm={handleDeactivateEquipment}
        onCancel={() => setEquipmentToDeactivate(null)}
      />
    </section>
  )

  function updateEquipmentFilter(
    key: 'equipmentType' | 'status',
    value: string,
  ) {
    const nextParams = new URLSearchParams(searchParams)

    if (value) {
      nextParams.set(key, value)
    } else {
      nextParams.delete(key)
    }

    setSearchParams(nextParams)
  }
}

function EquipmentFormFields({
  form,
  parentOptions,
}: {
  form: UseFormReturn<EquipmentFormValues>
  parentOptions: Array<EquipmentTreeNode & { depth: number }>
}) {
  return (
    <>
      <FormField
        label="장비 이름"
        error={form.formState.errors.name?.message}
        {...form.register('name')}
      />
      <FormField label="장비 유형" error={form.formState.errors.equipmentType?.message}>
        <select className="input-field" {...form.register('equipmentType')}>
          {EQUIPMENT_TYPE_OPTIONS.map((type) => (
            <option key={type} value={type}>
              {getEquipmentTypeLabel(type)}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label="상위 장비">
        <select className="input-field" {...form.register('parentEquipmentId')}>
          <option value="">최상위 장비</option>
          {parentOptions.map((equipment) => (
            <option key={equipment.equipmentId} value={equipment.equipmentId}>
              {'-'.repeat(equipment.depth)} {equipment.name}
            </option>
          ))}
        </select>
      </FormField>
      <FormField
        label="위치 코드"
        hint="예: A-01-P02"
        error={form.formState.errors.positionCode?.message}
        {...form.register('positionCode')}
      />
    </>
  )
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-item">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value}</span>
    </div>
  )
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
