
import type { ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { useForm, type UseFormReturn } from 'react-hook-form'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
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
import { usePlant } from '../features/plants/hooks/usePlants'
import {
  getResourceStatusLabel,
  getResourceStatusTone,
  RESOURCE_STATUS_OPTIONS,
  type ResourceStatus,
} from '../features/plants/types'
import { useTracking } from '../features/tracking/hooks/useTracking'
import {
  useDeleteZone,
  useDeactivateZone,
  useZoneDeleteImpact,
  useUpdateZone,
  useZone,
} from '../features/zones/hooks/useZones'
import type { UpdateZoneRequest } from '../features/zones/types'
import { ConfirmModal } from '../shared/components/feedback/ConfirmModal'
import { DeleteImpactSummary } from '../shared/components/feedback/DeleteImpactSummary'
import { FormField } from '../shared/components/form/FormField'
import { PageHeader } from '../shared/components/layout/PageHeader'
import { InspectionCreateWizard } from '../features/inspections/components/InspectionCreateWizard'
import { ErrorState } from '../shared/components/state/ErrorState'
import { LoadingState } from '../shared/components/state/LoadingState'
import { StatusBadge } from '../shared/components/state/StatusBadge'
import { useToast } from '../shared/hooks/useToast'
import {
  formatCount,
  formatDateTime,
  formatRatioPercent,
  getApiErrorMessage,
  parsePositiveNumber,
} from '../shared/utils'

const zoneFormSchema = z.object({
  name: z.string().trim().min(1, '구역 이름을 입력해 주세요.'),
  location: z.string().trim().optional(),
  description: z.string().trim().optional(),
})

const equipmentFormSchema = z.object({
  parentEquipmentId: z.string().optional(),
  equipmentType: z.enum(EQUIPMENT_TYPE_OPTIONS),
  name: z.string().trim().min(1, '설비 위치 이름을 입력해 주세요.'),
  positionCode: z.string().trim().optional(),
})

type ZoneFormValues = z.infer<typeof zoneFormSchema>
type EquipmentFormValues = z.infer<typeof equipmentFormSchema>

export function ZoneDetailPage() {
  const params = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const toast = useToast()
  const zoneId = parsePositiveNumber(params.zoneId)

  const [isEditZoneModalOpen, setIsEditZoneModalOpen] = useState(false)
  const [isCreateEquipmentModalOpen, setIsCreateEquipmentModalOpen] = useState(false)
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentTreeNode | null>(null)
  const [isDeactivateZoneModalOpen, setIsDeactivateZoneModalOpen] = useState(false)
  const [isDeleteZoneModalOpen, setIsDeleteZoneModalOpen] = useState(false)
  const [isCreateInspectionWizardOpen, setIsCreateInspectionWizardOpen] = useState(false)
  const [equipmentToDeactivate, setEquipmentToDeactivate] = useState<EquipmentTreeNode | null>(null)

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
  const plantQuery = usePlant(zoneQuery.data?.data.plantId ?? 0)
  const equipmentsQuery = useEquipments(zoneId ?? 0, equipmentFilters)
  const trackingQuery = useTracking({ zoneId: zoneId ?? undefined }, Boolean(zoneId))
  const updateZoneMutation = useUpdateZone(zoneId ?? 0)
  const deactivateZoneMutation = useDeactivateZone(zoneId ?? 0)
  const deleteZoneMutation = useDeleteZone(zoneId ?? 0)
  const createEquipmentMutation = useCreateEquipment(zoneId ?? 0, equipmentFilters)
  const updateEquipmentMutation = useUpdateEquipment(zoneId ?? 0, equipmentFilters)
  const deactivateEquipmentMutation = useDeactivateEquipment(zoneId ?? 0, equipmentFilters)
  const zoneDeleteImpactQuery = useZoneDeleteImpact(zoneId ?? 0, isDeleteZoneModalOpen)

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
      parentEquipmentId: selectedEquipment?.parentEquipmentId ? String(selectedEquipment.parentEquipmentId) : '',
      equipmentType: selectedEquipment?.equipmentType ?? 'ARRAY',
      name: selectedEquipment?.name ?? '',
      positionCode: selectedEquipment?.positionCode ?? '',
    },
  })

  const flattenedEquipments = useMemo(() => flattenEquipmentTree(equipmentsQuery.data?.data ?? []), [equipmentsQuery.data])
  const trackingItems = trackingQuery.data?.data.items ?? []
  const latestTracking = [...trackingItems].filter((item) => item.analyzedAt).sort((left, right) => String(right.analyzedAt).localeCompare(String(left.analyzedAt)))[0]
  const repeatedCount = trackingItems.filter((item) => item.repeated).length
  const worsenedCount = trackingItems.filter((item) => item.worsened).length
  const equipmentCount = flattenedEquipments.length
  const zone = zoneQuery.data?.data
  const plantName = plantQuery.data?.data.name ?? '발전소 확인 필요'

  if (!zoneId) {
    return <ErrorState title="올바르지 않은 구역 정보입니다." description="주소의 구역 정보를 다시 확인해 주세요." />
  }

  const handleUpdateZone = zoneForm.handleSubmit(async (values) => {
    const payload: UpdateZoneRequest = {
      name: values.name.trim(),
      location: values.location?.trim() || null,
      description: values.description?.trim() || null,
    }

    try {
      await updateZoneMutation.mutateAsync(payload)
      toast.push('구역 정보가 저장되었습니다.')
      setIsEditZoneModalOpen(false)
    } catch (error) {
      toast.push(getApiErrorMessage(error, '구역 수정에 실패했습니다.'))
    }
  })

  const handleCreateEquipment = createEquipmentForm.handleSubmit(async (values) => {
    const payload: CreateEquipmentRequest = {
      parentEquipmentId: values.parentEquipmentId ? Number(values.parentEquipmentId) : null,
      equipmentType: values.equipmentType,
      name: values.name.trim(),
      positionCode: values.positionCode?.trim() || null,
    }

    try {
      await createEquipmentMutation.mutateAsync(payload)
      toast.push('설비 위치가 등록되었습니다.')
      createEquipmentForm.reset()
      setIsCreateEquipmentModalOpen(false)
    } catch (error) {
      toast.push(getApiErrorMessage(error, '설비 위치 등록에 실패했습니다.'))
    }
  })

  const handleUpdateEquipment = editEquipmentForm.handleSubmit(async (values) => {
    if (!selectedEquipment) return

    const payload: UpdateEquipmentRequest = {
      parentEquipmentId: values.parentEquipmentId ? Number(values.parentEquipmentId) : null,
      equipmentType: values.equipmentType,
      name: values.name.trim(),
      positionCode: values.positionCode?.trim() || null,
    }

    try {
      await updateEquipmentMutation.mutateAsync({ equipmentId: selectedEquipment.equipmentId, payload })
      toast.push('변경사항이 저장되었습니다.')
      setSelectedEquipment(null)
    } catch (error) {
      toast.push(getApiErrorMessage(error, '설비 위치 수정에 실패했습니다.'))
    }
  })

  const handleDeactivateZone = async () => {
    try {
      await deactivateZoneMutation.mutateAsync()
      toast.push('구역이 비활성화되었습니다.')
      setIsDeactivateZoneModalOpen(false)
    } catch (error) {
      toast.push(getApiErrorMessage(error, '구역 비활성화에 실패했습니다.'))
    }
  }

  const handleDeactivateEquipment = async () => {
    if (!equipmentToDeactivate) return

    try {
      await deactivateEquipmentMutation.mutateAsync(equipmentToDeactivate.equipmentId)
      toast.push('비활성화되었습니다.')
      setEquipmentToDeactivate(null)
    } catch (error) {
      toast.push(getApiErrorMessage(error, '설비 위치 비활성화에 실패했습니다.'))
    }
  }

  const handleDeleteZone = async () => {
    if (!zoneDeleteImpactQuery.data?.data) {
      toast.push('삭제 영향 범위를 불러온 뒤 다시 시도해 주세요.')
      return
    }

    try {
      await deleteZoneMutation.mutateAsync()
      toast.push('구역이 삭제되었습니다.')
      setIsDeleteZoneModalOpen(false)
      navigate(zone?.plantId ? `/plants/${zone.plantId}` : '/plants')
    } catch (error) {
      toast.push(getApiErrorMessage(error, '구역 삭제에 실패했습니다.'))
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title={zone?.name ?? '구역 상세'}
        description="이 구역의 최근 상태를 확인하고 바로 점검, 결과 검토, 변화 추적으로 이어가세요."
        actions={
          <div className="inline-actions">
            <button className="btn btn-primary" type="button" onClick={() => setIsCreateInspectionWizardOpen(true)}>
              이 구역 점검 시작
            </button>
            <Link className="btn btn-secondary" to={`/results?zoneId=${zoneId}`}>
              결과 보기
            </Link>
            <Link className="btn btn-secondary" to={`/tracking?zoneId=${zoneId}`}>
              변화 추적
            </Link>
          </div>
        }
      />

      {zoneQuery.isLoading ? <LoadingState message="구역 정보를 불러오는 중입니다." /> : null}
      {zoneQuery.isError ? <ErrorState title="구역 상세를 불러오지 못했습니다." description={getApiErrorMessage(zoneQuery.error)} /> : null}

      {zone ? (
        <section className="panel space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge label={getResourceStatusLabel(zone.status)} tone={getResourceStatusTone(zone.status)} />
                {zone.priorityLevel ? <StatusBadge label={getPriorityLabel(zone.priorityLevel)} tone={getPriorityTone(zone.priorityLevel)} /> : null}
                <StatusBadge label={`이상 후보 ${zone.anomalyCandidateCount}건`} tone={zone.anomalyCandidateCount > 0 ? 'warning' : 'default'} />
              </div>
              <div>
                <h2 className="panel-title">{zone.name}</h2>
                <p className="panel-description">{zone.location || '위치 정보가 없습니다.'}</p>
              </div>
            </div>
            <Link className="text-button" to={`/plants/${zone.plantId}`}>발전소 상세</Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="발전소" value={plantName} />
            <SummaryCard label="상태" value={getResourceStatusLabel(zone.status)} />
            <SummaryCard label="최근 점검" value={formatDateTime(zone.latestInspectionAt)} />
            <SummaryCard label="이상 후보" value={`${zone.anomalyCandidateCount}건`} />
            <SummaryCard label="우선순위" value={getPriorityLabel(zone.priorityLevel)} />
            <SummaryCard label="변화 추적 대상" value={`${trackingItems.length}건`} />
            <SummaryCard label="설비 위치 수" value={`${equipmentCount}개`} />
            <SummaryCard label="설명" value={zone.description || '-'} />
          </div>
        </section>
      ) : null}

      <section className="panel space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="panel-title">변화 추적 요약</h2>
            <p className="panel-description">같은 구역의 이전 결과와 비교해 반복 이상과 악화 여부를 확인하세요.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link className="btn btn-secondary" to={`/tracking?zoneId=${zoneId}`}>변화 추적 보기</Link>
            <Link className="btn btn-secondary" to={`/results?zoneId=${zoneId}`}>결과 보기</Link>
          </div>
        </div>

        {trackingQuery.isLoading ? <LoadingState message="변화 추적 요약을 불러오는 중입니다." /> : null}
        {trackingQuery.isError ? <ErrorState title="변화 추적 요약을 불러오지 못했습니다." description={getApiErrorMessage(trackingQuery.error)} /> : null}
        {trackingQuery.data ? (
          trackingItems.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard label="추적 대상" value={`${formatCount(trackingItems.length)}건`} />
              <SummaryCard label="반복 이상" value={`${formatCount(repeatedCount)}건`} />
              <SummaryCard label="악화 대상" value={`${formatCount(worsenedCount)}건`} />
              <SummaryCard label="최근 분석 시각" value={formatDateTime(latestTracking?.analyzedAt)} />
              <SummaryCard label="최근 면적 비율" value={formatRatioPercent(latestTracking?.currentAreaRatio)} />
              <SummaryCard label="최근 심각도 점수" value={latestTracking?.currentSeverityScore ?? '-'} />
              <SummaryCard label="조치 후보" value={getActionCandidateText(latestTracking?.actionCandidate ?? null)} />
              <SummaryCard label="우선순위" value={getPriorityLabel(latestTracking?.priorityLevel ?? null)} />
            </div>
          ) : (
            <CompactEmptyState
              title="아직 비교할 이전 점검 결과가 없습니다."
              description="같은 구역의 결과가 2회 이상 누적되면 반복 이상과 악화 여부를 확인할 수 있습니다."
              action={<Link className="btn btn-secondary" to={`/results?zoneId=${zoneId}`}>결과 보기</Link>}
            />
          )
        ) : null}
      </section>

      {zone ? (
        <section className="panel space-y-4">
          <div>
            <h2 className="panel-title">관리 작업</h2>
            <p className="panel-description">설정 변경과 설비 위치 등록, 삭제 같은 관리 작업은 아래에서 진행하세요.</p>
          </div>
          <div className="management-actions management-actions-muted">
            <button className="btn btn-secondary" type="button" onClick={() => { createEquipmentForm.reset(); setIsCreateEquipmentModalOpen(true) }}>
              하위 설비 추가
            </button>
            <button className="text-button" type="button" onClick={() => setIsEditZoneModalOpen(true)}>
              구역 수정
            </button>
            <button className="text-button text-button-danger muted-action" type="button" onClick={() => setIsDeactivateZoneModalOpen(true)}>
              비활성화
            </button>
            <button className="text-button text-button-danger muted-action" type="button" onClick={() => setIsDeleteZoneModalOpen(true)}>
              삭제
            </button>
          </div>
        </section>
      ) : null}

      <details className="panel" open={false}>
        <summary className="cursor-pointer list-none">
          <div className="toolbar gap-3">
            <div>
              <h2 className="panel-title">설비 위치 구조</h2>
              <p className="panel-description">선택 사항입니다. Array, Panel, Module 단위로 더 세밀하게 관리할 때 사용합니다.</p>
            </div>
            <span className="text-sm text-slate-500">열어 보기</span>
          </div>
        </summary>
        <div className="mt-5 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">설비 위치 목록</h3>
              <p className="mt-1 text-sm text-slate-600">필요한 경우에만 설비 위치를 추가해 더 세밀한 점검 범위를 관리하세요.</p>
            </div>
            <button className="btn btn-secondary" type="button" onClick={() => { createEquipmentForm.reset(); setIsCreateEquipmentModalOpen(true) }}>
              하위 설비 추가
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="설비 위치 유형">
              <select className="input-field" value={equipmentFilters.equipmentType ?? ''} onChange={(event) => updateEquipmentFilter('equipmentType', event.target.value)}>
                <option value="">전체</option>
                {EQUIPMENT_TYPE_OPTIONS.map((type) => <option key={type} value={type}>{getEquipmentTypeLabel(type)}</option>)}
              </select>
            </FormField>
            <FormField label="상태">
              <select className="input-field" value={equipmentFilters.status ?? ''} onChange={(event) => updateEquipmentFilter('status', event.target.value)}>
                <option value="">전체</option>
                {RESOURCE_STATUS_OPTIONS.map((status) => <option key={status} value={status}>{getResourceStatusLabel(status)}</option>)}
              </select>
            </FormField>
          </div>

          {equipmentsQuery.isLoading ? <LoadingState message="설비 위치 구조를 불러오는 중입니다." /> : null}
          {equipmentsQuery.isError ? <ErrorState title="설비 위치 구조를 불러오지 못했습니다." description={getApiErrorMessage(equipmentsQuery.error)} /> : null}
          {equipmentsQuery.data ? (
            equipmentsQuery.data.data.length > 0 ? (
              <EquipmentTree nodes={equipmentsQuery.data.data} onEdit={(node) => setSelectedEquipment(node)} onDeactivate={(node) => setEquipmentToDeactivate(node)} />
            ) : (
              <CompactEmptyState title="등록된 설비 위치가 없습니다." description="더 세밀한 관리가 필요할 때만 설비 위치를 추가하세요." action={<button className="btn btn-secondary" type="button" onClick={() => { createEquipmentForm.reset(); setIsCreateEquipmentModalOpen(true) }}>하위 설비 추가</button>} />
            )
          ) : null}
        </div>
      </details>

      <EntityModal isOpen={isEditZoneModalOpen} title="구역 수정" description="점검에 필요한 구역 기본 정보를 수정하세요." onClose={() => setIsEditZoneModalOpen(false)}>
        <form className="stack-md" onSubmit={handleUpdateZone}>
          <FormField label="구역 이름 *" error={zoneForm.formState.errors.name?.message}><input className="input-field" {...zoneForm.register('name')} /></FormField>
          <FormField label="위치" error={zoneForm.formState.errors.location?.message}><input className="input-field" {...zoneForm.register('location')} /></FormField>
          <FormField label="설명" error={zoneForm.formState.errors.description?.message}><textarea className="input-field textarea-field" {...zoneForm.register('description')} /></FormField>
          <ModalActions isSubmitting={updateZoneMutation.isPending} onCancel={() => setIsEditZoneModalOpen(false)} submitText="저장" />
        </form>
      </EntityModal>

      <EntityModal isOpen={isCreateEquipmentModalOpen} title="하위 설비 추가" description="이 구역 안에서 더 세밀하게 관리할 설비 위치를 추가하세요." onClose={() => { createEquipmentForm.reset(); setIsCreateEquipmentModalOpen(false) }}>
        <form className="stack-md" onSubmit={handleCreateEquipment}>
          <EquipmentFormFields form={createEquipmentForm} parentOptions={flattenedEquipments} />
          <ModalActions isSubmitting={createEquipmentMutation.isPending} onCancel={() => { createEquipmentForm.reset(); setIsCreateEquipmentModalOpen(false) }} submitText="추가" />
        </form>
      </EntityModal>

      <EntityModal isOpen={Boolean(selectedEquipment)} title="설비 위치 수정" description="설비 위치 이름과 구조를 수정하세요." onClose={() => setSelectedEquipment(null)}>
        <form className="stack-md" onSubmit={handleUpdateEquipment}>
          <EquipmentFormFields form={editEquipmentForm} parentOptions={flattenedEquipments.filter((equipment) => equipment.equipmentId !== selectedEquipment?.equipmentId)} />
          <ModalActions isSubmitting={updateEquipmentMutation.isPending} onCancel={() => setSelectedEquipment(null)} submitText="저장" />
        </form>
      </EntityModal>

      <ConfirmModal isOpen={isDeactivateZoneModalOpen} title="구역 비활성화" description="이 구역을 비활성화하면 이후 점검 시작 전에 상태를 다시 확인해야 합니다. 계속할까요?" confirmText="비활성화" cancelText="취소" isConfirming={deactivateZoneMutation.isPending} onConfirm={handleDeactivateZone} onCancel={() => setIsDeactivateZoneModalOpen(false)} />
      <ConfirmModal
        isOpen={isDeleteZoneModalOpen}
        title="구역 삭제"
        description="이 구역을 삭제하면 연결된 점검, 이미지, 분석 데이터가 함께 삭제됩니다."
        confirmText="삭제"
        cancelText="취소"
        isConfirming={deleteZoneMutation.isPending}
        confirmDisabled={zoneDeleteImpactQuery.isLoading || !zoneDeleteImpactQuery.data?.data}
        onConfirm={handleDeleteZone}
        onCancel={() => setIsDeleteZoneModalOpen(false)}
      >
        <DeleteImpactSummary
          impact={zoneDeleteImpactQuery.data?.data}
          isLoading={zoneDeleteImpactQuery.isLoading}
          errorMessage={
            zoneDeleteImpactQuery.isError
              ? getApiErrorMessage(zoneDeleteImpactQuery.error, '삭제 영향 범위를 불러오지 못했습니다.')
              : null
          }
        />
      </ConfirmModal>
      <ConfirmModal isOpen={Boolean(equipmentToDeactivate)} title="설비 위치 비활성화" description={equipmentToDeactivate ? `${equipmentToDeactivate.name} 설비 위치를 비활성화할까요?` : '선택한 설비 위치를 비활성화할까요?'} confirmText="비활성화" cancelText="취소" isConfirming={deactivateEquipmentMutation.isPending} onConfirm={handleDeactivateEquipment} onCancel={() => setEquipmentToDeactivate(null)} />
      <InspectionCreateWizard
        isOpen={isCreateInspectionWizardOpen}
        onClose={() => setIsCreateInspectionWizardOpen(false)}
        initialPlantId={zone?.plantId ?? null}
        initialZoneId={zoneId}
      />
    </section>
  )

  function updateEquipmentFilter(key: 'equipmentType' | 'status', value: string) {
    const nextParams = new URLSearchParams(searchParams)
    if (value) nextParams.set(key, value)
    else nextParams.delete(key)
    setSearchParams(nextParams)
  }
}

function EquipmentFormFields({ form, parentOptions }: { form: UseFormReturn<EquipmentFormValues>; parentOptions: Array<EquipmentTreeNode & { depth: number }> }) {
  return (
    <>
      <FormField label="설비 위치 이름" error={form.formState.errors.name?.message}><input className="input-field" {...form.register('name')} /></FormField>
      <FormField label="설비 위치 유형" error={form.formState.errors.equipmentType?.message}>
        <select className="input-field" {...form.register('equipmentType')}>
          {EQUIPMENT_TYPE_OPTIONS.map((type) => <option key={type} value={type}>{getEquipmentTypeLabel(type)}</option>)}
        </select>
      </FormField>
      <FormField label="상위 설비 위치" hint="최상위 설비 위치로 두려면 비워 두세요.">
        <select className="input-field" {...form.register('parentEquipmentId')}>
          <option value="">최상위 설비 위치</option>
          {parentOptions.map((equipment) => <option key={equipment.equipmentId} value={equipment.equipmentId}>{`${'· '.repeat(equipment.depth)}${equipment.name}`}</option>)}
        </select>
      </FormField>
      <FormField label="위치 코드" hint="예: A-01-P02" error={form.formState.errors.positionCode?.message}><input className="input-field" {...form.register('positionCode')} /></FormField>
    </>
  )
}
function SummaryCard({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</div><div className="mt-2 text-sm font-medium text-slate-900">{value}</div></div>
}

function CompactEmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="compact-empty"><div className="text-base font-semibold text-slate-900">{title}</div><p className="mt-2 text-sm text-slate-600">{description}</p>{action ? <div className="mt-4">{action}</div> : null}</div>
}

function EntityModal({ isOpen, title, description, children, onClose }: { isOpen: boolean; title: string; description: string; children: ReactNode; onClose: () => void }) {
  if (!isOpen) return null
  return <div className="modal-backdrop" onClick={onClose}><section className="modal-card max-h-[calc(100vh-3rem)] overflow-y-auto" onClick={(event) => event.stopPropagation()}><h2 className="panel-title">{title}</h2><p className="panel-description">{description}</p><div className="mt-6">{children}</div></section></div>
}

function ModalActions({ isSubmitting, onCancel, submitText = '저장' }: { isSubmitting: boolean; onCancel: () => void; submitText?: string }) {
  return <div className="flex justify-end gap-3"><button className="btn btn-secondary" type="button" onClick={onCancel}>취소</button><button className="btn btn-primary" type="submit" disabled={isSubmitting}>{submitText}</button></div>
}

function getPriorityLabel(priorityLevel: string | null) {
  switch (priorityLevel) {
    case 'LOW': return '낮음'
    case 'MEDIUM': return '보통'
    case 'HIGH': return '높음'
    case 'URGENT': return '긴급'
    default: return '-'
  }
}

function getPriorityTone(priorityLevel: string | null): 'default' | 'warning' | 'danger' {
  switch (priorityLevel) {
    case 'MEDIUM': return 'warning'
    case 'HIGH':
    case 'URGENT':
      return 'danger'
    default:
      return 'default'
  }
}

function getActionCandidateText(value: string | null) {
  if (!value) return '조치 후보 없음'
  if (value === 'CLEANING') return '청소'
  if (value === 'RETAKE') return '재촬영'
  if (value === 'FIELD_INSPECTION') return '현장 점검'
  if (value === 'REPLACEMENT_REVIEW') return '교체 검토'
  return value
}

