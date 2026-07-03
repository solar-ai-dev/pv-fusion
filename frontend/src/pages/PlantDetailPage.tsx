
import type { ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import {
  useDeactivatePlant,
  usePlant,
  useUpdatePlant,
} from '../features/plants/hooks/usePlants'
import {
  getResourceStatusLabel,
  getResourceStatusTone,
  type UpdatePlantRequest,
} from '../features/plants/types'
import {
  useCreateZone,
  useDeactivateZone,
  useZone,
  useUpdateZone,
  useZonesByPlantId,
} from '../features/zones/hooks/useZones'
import type {
  CreateZoneRequest,
  UpdateZoneRequest,
  ZoneSummary,
} from '../features/zones/types'
import { InspectionCreateWizard } from '../features/inspections/components/InspectionCreateWizard'
import { ConfirmModal } from '../shared/components/feedback/ConfirmModal'
import { FormField } from '../shared/components/form/FormField'
import { PageHeader } from '../shared/components/layout/PageHeader'
import { EmptyState } from '../shared/components/state/EmptyState'
import { ErrorState } from '../shared/components/state/ErrorState'
import { LoadingState } from '../shared/components/state/LoadingState'
import { StatusBadge } from '../shared/components/state/StatusBadge'
import { useToast } from '../shared/hooks/useToast'
import { formatDateTime, getApiErrorMessage, parsePositiveNumber } from '../shared/utils'

const plantFormSchema = z.object({
  name: z.string().trim().min(1, '발전소 이름을 입력해 주세요.'),
  location: z.string().trim().optional(),
  description: z.string().trim().optional(),
})

const zoneFormSchema = z.object({
  name: z.string().trim().min(1, '구역 이름을 입력해 주세요.'),
  location: z.string().trim().optional(),
  description: z.string().trim().optional(),
})

type PlantFormValues = z.infer<typeof plantFormSchema>
type ZoneFormValues = z.infer<typeof zoneFormSchema>

export function PlantDetailPage() {
  const params = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const plantId = parsePositiveNumber(params.plantId)

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isCreateZoneModalOpen, setIsCreateZoneModalOpen] = useState(false)
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false)
  const [selectedZone, setSelectedZone] = useState<ZoneSummary | null>(null)
  const [zoneToDeactivate, setZoneToDeactivate] = useState<ZoneSummary | null>(null)
  const [isCreateInspectionWizardOpen, setIsCreateInspectionWizardOpen] = useState(false)
  const [initialZoneIdForWizard, setInitialZoneIdForWizard] = useState<number | null>(null)

  const plantQuery = usePlant(plantId ?? 0)
  const zonesQuery = useZonesByPlantId(plantId ?? 0)
  const selectedZoneQuery = useZone(selectedZone?.zoneId ?? 0)
  const updatePlantMutation = useUpdatePlant(plantId ?? 0)
  const deactivatePlantMutation = useDeactivatePlant(plantId ?? 0)
  const createZoneMutation = useCreateZone(plantId ?? 0)
  const updateZoneMutation = useUpdateZone(selectedZone?.zoneId ?? 0)
  const deactivateZoneMutation = useDeactivateZone(zoneToDeactivate?.zoneId ?? 0)

  const plantForm = useForm<PlantFormValues>({
    resolver: zodResolver(plantFormSchema),
    defaultValues: {
      name: '',
      location: '',
      description: '',
    },
  })

  const zoneForm = useForm<ZoneFormValues>({
    resolver: zodResolver(zoneFormSchema),
    defaultValues: {
      name: '',
      location: '',
      description: '',
    },
  })

  useEffect(() => {
    if (!plantQuery.data) {
      return
    }

    plantForm.reset({
      name: plantQuery.data.data.name,
      location: plantQuery.data.data.location ?? '',
      description: plantQuery.data.data.description ?? '',
    })
  }, [plantForm, plantQuery.data])

  useEffect(() => {
    if (!selectedZoneQuery.data?.data) {
      return
    }

    zoneForm.reset({
      name: selectedZoneQuery.data.data.name,
      location: selectedZoneQuery.data.data.location ?? '',
      description: selectedZoneQuery.data.data.description ?? '',
    })
  }, [selectedZoneQuery.data, zoneForm])

  const plant = plantQuery.data?.data
  const zones = useMemo(() => zonesQuery.data?.data ?? [], [zonesQuery.data])
  const latestInspectionAt = useMemo(
    () =>
      [plant?.latestInspectionAt, ...zones.map((zone) => zone.latestInspectionAt)]
        .filter(Boolean)
        .sort((left, right) => String(right).localeCompare(String(left)))[0] ?? null,
    [plant?.latestInspectionAt, zones],
  )
  const totalAnomalyCount = useMemo(
    () => zones.reduce((sum, zone) => sum + zone.anomalyCandidateCount, 0),
    [zones],
  )
  const highPriorityCount = useMemo(
    () => zones.filter((zone) => isHighPriority(zone.priorityLevel)).length,
    [zones],
  )

  if (!plantId) {
    return (
      <ErrorState
        title="올바르지 않은 발전소 정보입니다."
        description="주소의 발전소 정보를 다시 확인해 주세요."
      />
    )
  }

  const handleUpdatePlant = plantForm.handleSubmit(async (values) => {
    const payload: UpdatePlantRequest = {
      name: values.name.trim(),
      location: values.location?.trim() || null,
      description: values.description?.trim() || null,
    }

    try {
      await updatePlantMutation.mutateAsync(payload)
      toast.push('변경사항이 저장되었습니다.')
      setIsEditModalOpen(false)
    } catch (error) {
      toast.push(getApiErrorMessage(error, '발전소 수정에 실패했습니다.'))
    }
  })

  const handleCreateZone = zoneForm.handleSubmit(async (values) => {
    const payload: CreateZoneRequest = {
      name: values.name.trim(),
      location: values.location?.trim() || null,
      description: values.description?.trim() || null,
    }

    try {
      await createZoneMutation.mutateAsync(payload)
      toast.push('구역이 등록되었습니다.')
      zoneForm.reset()
      setIsCreateZoneModalOpen(false)
    } catch (error) {
      toast.push(getApiErrorMessage(error, '구역 등록에 실패했습니다.'))
    }
  })

  const handleUpdateZone = zoneForm.handleSubmit(async (values) => {
    if (!selectedZone) {
      return
    }

    const payload: UpdateZoneRequest = {
      name: values.name.trim(),
      location: values.location?.trim() || null,
      description: values.description?.trim() || null,
    }

    try {
      await updateZoneMutation.mutateAsync(payload)
      toast.push('구역 정보가 저장되었습니다.')
      setSelectedZone(null)
    } catch (error) {
      toast.push(getApiErrorMessage(error, '구역 수정에 실패했습니다.'))
    }
  })

  const handleDeactivatePlant = async () => {
    try {
      await deactivatePlantMutation.mutateAsync()
      toast.push('비활성화되었습니다.')
      setIsDeactivateModalOpen(false)
      navigate('/plants')
    } catch (error) {
      toast.push(getApiErrorMessage(error, '발전소 비활성화에 실패했습니다.'))
    }
  }

  const handleDeactivateZone = async () => {
    if (!zoneToDeactivate) {
      return
    }

    try {
      await deactivateZoneMutation.mutateAsync()
      toast.push('구역이 비활성화되었습니다.')
      setZoneToDeactivate(null)
    } catch (error) {
      toast.push(getApiErrorMessage(error, '구역 비활성화에 실패했습니다.'))
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title={plant?.name ?? '발전소 상세'}
        description="발전소 정보를 확인하고 구역별 점검을 바로 시작하세요."
        actions={
          <div className="page-actions">
            <button className="btn btn-primary" type="button" onClick={() => {
              zoneForm.reset()
              setIsCreateZoneModalOpen(true)
            }}>
              구역 등록
            </button>
            <Link className="btn btn-secondary" to="/inspections">점검 목록</Link>
            <Link className="btn btn-secondary" to="/results">결과 보기</Link>
          </div>
        }
      />

      {plantQuery.isLoading ? <LoadingState message="발전소 정보를 불러오는 중입니다." /> : null}
      {plantQuery.isError ? (
        <ErrorState title="발전소 상세를 불러오지 못했습니다." description={getApiErrorMessage(plantQuery.error)} />
      ) : null}

      {plant ? (
        <section className="panel space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge label={getResourceStatusLabel(plant.status)} tone={getResourceStatusTone(plant.status)} />
                <StatusBadge label={`구역 ${plant.zoneCount}개`} />
                {highPriorityCount > 0 ? <StatusBadge label={`우선 확인 ${highPriorityCount}개`} tone="danger" /> : null}
              </div>
              <div>
                <h2 className="panel-title">{plant.name}</h2>
                <p className="panel-description">{plant.location || '위치 정보가 없습니다.'}</p>
              </div>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="상태" value={getResourceStatusLabel(plant.status)} />
            <SummaryCard label="구역 수" value={`${plant.zoneCount}개`} />
            <SummaryCard label="최근 점검" value={formatDateTime(latestInspectionAt)} />
            <SummaryCard label="이상 후보" value={`${totalAnomalyCount}건`} />
            <SummaryCard label="우선 확인" value={highPriorityCount > 0 ? `${highPriorityCount}개 구역` : '없음'} />
            <SummaryCard label="설명" value={plant.description || '-'} />
            <SummaryCard label="등록 시각" value={formatDateTime(plant.createdAt)} />
            <SummaryCard label="수정 시각" value={formatDateTime(plant.updatedAt)} />
          </div>
        </section>
      ) : null}

      {plant ? (
        <section className="panel space-y-4">
          <div>
            <h2 className="panel-title">발전소 관리</h2>
            <p className="panel-description">발전소 정보 수정과 비활성화는 필요할 때만 여기에서 진행하세요.</p>
          </div>
          <div className="management-actions">
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => {
                zoneForm.reset()
                setIsCreateZoneModalOpen(true)
              }}
            >
              구역 등록
            </button>
            <button className="btn btn-secondary" type="button" onClick={() => setIsEditModalOpen(true)}>
              정보 수정
            </button>
            <button className="btn btn-secondary" type="button" onClick={() => setIsDeactivateModalOpen(true)}>
              비활성화
            </button>
          </div>
        </section>
      ) : null}

      <section className="panel space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="panel-title">구역</h2>
            <p className="panel-description">구역을 등록하고 각 구역에서 바로 점검을 시작할 수 있습니다.</p>
          </div>
          <div className="inline-actions">
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => {
                zoneForm.reset()
                setIsCreateZoneModalOpen(true)
              }}
            >
              새 구역 등록
            </button>
          </div>
        </div>

        {zonesQuery.isLoading ? <LoadingState message="구역 목록을 불러오는 중입니다." /> : null}
        {zonesQuery.isError ? (
          <ErrorState title="구역 목록을 불러오지 못했습니다." description={getApiErrorMessage(zonesQuery.error)} />
        ) : null}

        {zonesQuery.data ? (
          zones.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {zones.map((zone) => (
                <ZoneEntryCard
                  key={zone.zoneId}
                  zone={zone}
                  onStartInspection={(selectedZoneId) => {
                    setInitialZoneIdForWizard(selectedZoneId)
                    setIsCreateInspectionWizardOpen(true)
                  }}
                  onEdit={(selectedZone) => setSelectedZone(selectedZone)}
                  onDeactivate={(selectedZone) => setZoneToDeactivate(selectedZone)}
                />
              ))}
            </div>
          ) : (
            <div className="state-card space-y-4">
                <EmptyState
                title="아직 구역이 없습니다."
                description="등록된 구역이 없습니다. 첫 구역을 추가하세요."
                />
              <div className="flex justify-center">
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={() => {
                    zoneForm.reset()
                    setIsCreateZoneModalOpen(true)
                  }}
                >
                  구역 등록
                </button>
              </div>
            </div>
          )
        ) : null}
      </section>

      <EntityModal
        isOpen={isEditModalOpen}
        title="발전소 정보 수정"
        description="점검에 필요한 발전소 기본 정보를 수정하세요."
        onClose={() => setIsEditModalOpen(false)}
      >
        <form className="stack-md" onSubmit={handleUpdatePlant}>
          <FormField label="발전소 이름 *" error={plantForm.formState.errors.name?.message}>
            <input className="input-field" {...plantForm.register('name')} />
          </FormField>
          <FormField label="위치" error={plantForm.formState.errors.location?.message}>
            <input className="input-field" {...plantForm.register('location')} />
          </FormField>
          <FormField label="설명" error={plantForm.formState.errors.description?.message}>
            <textarea className="input-field textarea-field" {...plantForm.register('description')} />
          </FormField>
          <ModalActions isSubmitting={updatePlantMutation.isPending} onCancel={() => setIsEditModalOpen(false)} submitText="저장" />
        </form>
      </EntityModal>

      <EntityModal
        isOpen={isCreateZoneModalOpen}
        title="구역 등록"
        description="이 발전소에 새 구역을 추가합니다."
        onClose={() => {
          zoneForm.reset()
          setIsCreateZoneModalOpen(false)
        }}
      >
        <form className="stack-md" onSubmit={handleCreateZone}>
          <FormField label="구역 이름 *" error={zoneForm.formState.errors.name?.message}>
            <input className="input-field" {...zoneForm.register('name')} />
          </FormField>
          <FormField label="위치" error={zoneForm.formState.errors.location?.message}>
            <input className="input-field" {...zoneForm.register('location')} />
          </FormField>
          <FormField label="설명" error={zoneForm.formState.errors.description?.message}>
            <textarea className="input-field textarea-field" {...zoneForm.register('description')} />
          </FormField>
          <ModalActions isSubmitting={createZoneMutation.isPending} onCancel={() => { zoneForm.reset(); setIsCreateZoneModalOpen(false) }} submitText="구역 등록" />
        </form>
      </EntityModal>

      <EntityModal
        isOpen={Boolean(selectedZone)}
        title="구역 수정"
        description="구역 이름과 기본 정보를 수정합니다."
        onClose={() => setSelectedZone(null)}
      >
        <form className="stack-md" onSubmit={handleUpdateZone}>
          <FormField label="구역 이름 *" error={zoneForm.formState.errors.name?.message}>
            <input className="input-field" {...zoneForm.register('name')} />
          </FormField>
          <FormField label="위치" error={zoneForm.formState.errors.location?.message}>
            <input className="input-field" {...zoneForm.register('location')} />
          </FormField>
          <FormField label="설명" error={zoneForm.formState.errors.description?.message}>
            <textarea className="input-field textarea-field" {...zoneForm.register('description')} />
          </FormField>
          <ModalActions isSubmitting={updateZoneMutation.isPending} onCancel={() => setSelectedZone(null)} submitText="저장" />
        </form>
      </EntityModal>

      <ConfirmModal
        isOpen={isDeactivateModalOpen}
        title="발전소 비활성화"
        description="이 발전소를 비활성화하면 점검을 시작하기 전에 상태를 다시 확인해야 합니다. 계속할까요?"
        confirmText="비활성화"
        cancelText="취소"
        isConfirming={deactivatePlantMutation.isPending}
        onConfirm={handleDeactivatePlant}
        onCancel={() => setIsDeactivateModalOpen(false)}
      />
      <ConfirmModal
        isOpen={Boolean(zoneToDeactivate)}
        title="구역 비활성화"
        description={zoneToDeactivate ? `${zoneToDeactivate.name} 구역을 비활성화할까요? 이후 점검 시작 전에 상태를 다시 확인해야 합니다.` : '선택한 구역을 비활성화할까요?'}
        confirmText="비활성화"
        cancelText="취소"
        isConfirming={deactivateZoneMutation.isPending}
        onConfirm={handleDeactivateZone}
        onCancel={() => setZoneToDeactivate(null)}
      />
      <InspectionCreateWizard
        isOpen={isCreateInspectionWizardOpen}
        onClose={() => {
          setIsCreateInspectionWizardOpen(false)
          setInitialZoneIdForWizard(null)
        }}
        initialPlantId={plantId}
        initialZoneId={initialZoneIdForWizard}
      />
    </section>
  )
}

function ZoneEntryCard({
  zone,
  onStartInspection,
  onEdit,
  onDeactivate,
}: {
  zone: ZoneSummary
  onStartInspection: (zoneId: number) => void
  onEdit: (zone: ZoneSummary) => void
  onDeactivate: (zone: ZoneSummary) => void
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">{zone.name}</h3>
          <p className="mt-1 text-sm text-slate-600">{zone.latestInspectionAt ? `최근 점검 ${formatDateTime(zone.latestInspectionAt)}` : '최근 점검 이력이 없습니다.'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge label={zone.priorityLevel ? getPriorityLabel(zone.priorityLevel) : '일반'} tone={getPriorityTone(zone.priorityLevel)} />
          <StatusBadge label={zone.anomalyCandidateCount > 0 ? `이상 후보 ${zone.anomalyCandidateCount}건` : '이상 후보 없음'} tone={zone.anomalyCandidateCount > 0 ? 'warning' : 'default'} />
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <MiniInfo label="최근 점검" value={formatDateTime(zone.latestInspectionAt)} />
        <MiniInfo label="설비 위치" value={`Array ${zone.arrayCount}개 · Panel ${zone.panelCount}개`} />
        <MiniInfo label="조치 후보" value={getActionCandidateText(zone.topActionCandidate)} />
        <MiniInfo label="점검 준비" value={zone.latestInspectionAt ? '이전 점검 이어서 확인 가능' : '첫 점검을 시작할 수 있습니다.'} />
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <button className="btn btn-primary" type="button" onClick={() => onStartInspection(zone.zoneId)}>
          이 구역 점검 시작
        </button>
        <Link className="btn btn-secondary" to={`/zones/${zone.zoneId}`}>
          상세 보기
        </Link>
      </div>
      <div className="mt-3 flex flex-wrap gap-3">
        <button className="btn btn-secondary" type="button" onClick={() => onEdit(zone)}>
          구역 수정
        </button>
        <button className="btn btn-secondary" type="button" onClick={() => onDeactivate(zone)}>
          구역 비활성화
        </button>
        <Link className="btn btn-secondary" to={`/results?zoneId=${zone.zoneId}`}>
          결과 보기
        </Link>
      </div>
    </article>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</div><div className="mt-2 text-sm font-medium text-slate-900">{value}</div></div>
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return <div><div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</div><div className="mt-1 text-sm text-slate-900">{value}</div></div>
}

function EntityModal({ isOpen, title, description, children, onClose }: { isOpen: boolean; title: string; description: string; children: ReactNode; onClose: () => void }) {
  if (!isOpen) return null
  return <div className="modal-backdrop" onClick={onClose}><section className="modal-card max-h-[calc(100vh-3rem)] overflow-y-auto" onClick={(event) => event.stopPropagation()}><h2 className="panel-title">{title}</h2><p className="panel-description">{description}</p><div className="mt-6">{children}</div></section></div>
}

function ModalActions({ isSubmitting, onCancel, submitText = '저장' }: { isSubmitting: boolean; onCancel: () => void; submitText?: string }) {
  return <div className="flex justify-end gap-3"><button className="btn btn-secondary" type="button" onClick={onCancel}>취소</button><button className="btn btn-primary" type="submit" disabled={isSubmitting}>{submitText}</button></div>
}


function isHighPriority(priorityLevel: string | null) {
  return priorityLevel === 'HIGH' || priorityLevel === 'URGENT'
}

function getPriorityLabel(priorityLevel: string | null) {
  switch (priorityLevel) {
    case 'LOW': return '낮음'
    case 'MEDIUM': return '보통'
    case 'HIGH': return '높음'
    case 'URGENT': return '긴급'
    default: return '일반'
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



