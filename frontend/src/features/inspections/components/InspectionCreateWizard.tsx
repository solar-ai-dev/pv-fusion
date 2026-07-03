import { zodResolver } from '@hookform/resolvers/zod'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useAuth } from '../../auth/hooks/useAuth'
import { usePlants } from '../../plants/hooks/usePlants'
import { useZonesByPlantId } from '../../zones/hooks/useZones'
import { FormField } from '../../../shared/components/form/FormField'
import { EmptyState } from '../../../shared/components/state/EmptyState'
import { useToast } from '../../../shared/hooks/useToast'
import { getApiErrorMessage, toOffsetDateTime } from '../../../shared/utils'
import { useCreateInspection } from '../hooks/useInspections'
import {
  CAPTURE_METHOD_OPTIONS,
  getCaptureMethodLabel,
  type CreateInspectionRequest,
} from '../types'

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
type WizardStep = 1 | 2 | 3

const WIZARD_STEPS: Array<{ step: WizardStep; label: string }> = [
  { step: 1, label: '발전소 선택' },
  { step: 2, label: '점검 영역 선택' },
  { step: 3, label: '점검 정보 입력' },
]

type InspectionCreateWizardProps = {
  isOpen: boolean
  onClose: () => void
  initialPlantId?: number | null
  initialZoneId?: number | null
}

export function InspectionCreateWizard({
  isOpen,
  onClose,
  initialPlantId,
  initialZoneId,
}: InspectionCreateWizardProps) {
  const navigate = useNavigate()
  const toast = useToast()
  const userName = useAuth((state) => state.user?.name)
  const [currentStep, setCurrentStep] = useState<WizardStep>(1)

  const plantsQuery = usePlants({ page: 0, size: 100, status: 'ACTIVE' })
  const createInspectionMutation = useCreateInspection()

  const form = useForm<CreateInspectionFormValues>({
    resolver: zodResolver(createInspectionSchema),
    defaultValues: getCreateFormDefaults({
      plantId: initialPlantId ?? null,
      zoneId: initialZoneId ?? null,
      inspectorName: userName,
    }),
  })

  const selectedPlantId = parsePositiveInteger(form.watch('plantId'))
  const selectedZoneId = parsePositiveInteger(form.watch('zoneId'))
  const zonesQuery = useZonesByPlantId(selectedPlantId ?? 0)
  const plants = useMemo(() => plantsQuery.data?.data.content ?? [], [plantsQuery.data])
  const zones = useMemo(() => zonesQuery.data?.data ?? [], [zonesQuery.data])
  const selectedPlant = plants.find((plant) => plant.plantId === selectedPlantId) ?? null
  const selectedZone = zones.find((zone) => zone.zoneId === selectedZoneId) ?? null
  const hasPlants = plants.length > 0
  const hasZones = zones.length > 0

  useEffect(() => {
    if (!isOpen) {
      return
    }

    form.reset(
      getCreateFormDefaults({
        plantId: initialPlantId ?? null,
        zoneId: initialZoneId ?? null,
        inspectorName: userName,
      }),
    )
    setCurrentStep(getInitialStep(initialPlantId ?? null, initialZoneId ?? null))
  }, [form, initialPlantId, initialZoneId, isOpen, userName])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    if (!form.getValues('plantId') && plants.length === 1) {
      form.setValue('plantId', String(plants[0].plantId), {
        shouldDirty: false,
        shouldTouch: false,
      })
      setCurrentStep((step) => (step < 2 ? 2 : step))
    }
  }, [form, isOpen, plants])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const currentZoneId = form.getValues('zoneId')

    if (selectedPlantId && zones.length === 1 && !currentZoneId) {
      form.setValue('zoneId', String(zones[0].zoneId), {
        shouldDirty: false,
        shouldTouch: false,
      })
      setCurrentStep((step) => (step < 3 ? 3 : step))
    }
  }, [form, isOpen, selectedPlantId, zones])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const currentPlantId = form.getValues('plantId')
    const currentZoneId = form.getValues('zoneId')

    if (!currentPlantId) {
      if (currentZoneId) {
        form.setValue('zoneId', '', { shouldDirty: false, shouldTouch: false })
      }
      return
    }

    if (currentZoneId && !zones.some((zone) => String(zone.zoneId) === currentZoneId)) {
      form.setValue('zoneId', '', { shouldDirty: false, shouldTouch: false })
    }
  }, [form, isOpen, zones])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const hasManualName = form.formState.dirtyFields.name
    const currentName = form.getValues('name').trim()

    if (hasManualName && currentName) {
      return
    }

    form.setValue('name', buildInspectionName(selectedPlant?.name, selectedZone?.name), {
      shouldDirty: false,
      shouldTouch: false,
    })
  }, [
    form,
    form.formState.dirtyFields.name,
    isOpen,
    selectedPlant?.name,
    selectedZone?.name,
  ])

  if (!isOpen) {
    return null
  }

  const submitCreateInspection = form.handleSubmit(async (values) => {
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
      toast.push(response.message || '점검을 생성했습니다.')
      onClose()
      navigate(`/inspections/${response.data.inspectionId}`)
    } catch (error) {
      toast.push(getApiErrorMessage(error, '점검 생성에 실패했습니다.'))
    }
  })

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="modal-card wizard-modal" onClick={(event) => event.stopPropagation()}>
        <div className="wizard-header">
          <h2 className="panel-title">새 점검 시작</h2>
          <p className="panel-description">
            발전소와 점검 영역을 선택한 뒤 점검을 생성하면 상세 화면으로 이동합니다.
          </p>
        </div>

        <div className="wizard-step-strip">
          {WIZARD_STEPS.map((stepItem) => (
            <button
              key={stepItem.step}
              className={`wizard-step-chip ${
                currentStep === stepItem.step ? 'wizard-step-chip-active' : ''
              }`}
              type="button"
              onClick={() => {
                if (canMoveToStep(stepItem.step, form.getValues('plantId'), form.getValues('zoneId'))) {
                  setCurrentStep(stepItem.step)
                }
              }}
            >
              <span>{stepItem.step}</span>
              <span>{stepItem.label}</span>
            </button>
          ))}
        </div>

        <form className="wizard-body stack-md" onSubmit={submitCreateInspection}>
          {currentStep === 1 ? (
            hasPlants ? (
              <div className="stack-md">
                <FormField label="발전소" error={form.formState.errors.plantId?.message}>
                  <select
                    className="input-field"
                    {...form.register('plantId')}
                    onChange={(event) => {
                      form.setValue('plantId', event.target.value, {
                        shouldDirty: true,
                        shouldTouch: true,
                      })
                      form.setValue('zoneId', '', {
                        shouldDirty: false,
                        shouldTouch: false,
                      })
                    }}
                  >
                    <option value="">발전소를 선택해 주세요.</option>
                    {plants.map((plant) => (
                      <option key={plant.plantId} value={plant.plantId}>
                        {plant.name}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>
            ) : (
              <div className="stack-md">
                <EmptyState
                  title="등록된 발전소가 없습니다."
                  description="먼저 발전소를 등록하세요."
                />
                <div className="wizard-footer">
                  <Link className="btn btn-secondary" to="/plants">
                    발전소 보기
                  </Link>
                </div>
              </div>
            )
          ) : null}

          {currentStep === 2 ? (
            hasZones ? (
              <div className="stack-md">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  {selectedPlant
                    ? `선택한 발전소: ${selectedPlant.name}`
                    : '발전소를 먼저 선택해 주세요.'}
                </div>
                <FormField label="점검 영역" error={form.formState.errors.zoneId?.message}>
                  <select className="input-field" {...form.register('zoneId')}>
                    <option value="">점검 영역을 선택해 주세요.</option>
                    {zones.map((zone) => (
                      <option key={zone.zoneId} value={zone.zoneId}>
                        {zone.name}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>
            ) : (
              <div className="stack-md">
                <EmptyState
                  title="등록된 점검 영역이 없습니다."
                  description="먼저 점검 영역을 등록하세요."
                />
                <div className="wizard-footer">
                  <button className="btn btn-secondary" type="button" onClick={() => setCurrentStep(1)}>
                    이전
                  </button>
                  {selectedPlantId ? (
                    <Link className="btn btn-secondary" to={`/plants/${selectedPlantId}`}>
                      발전소 상세 보기
                    </Link>
                  ) : null}
                </div>
              </div>
            )
          ) : null}

          {currentStep === 3 ? (
            <div className="stack-md">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                {selectedPlant?.name ?? '-'} · {selectedZone?.name ?? '-'}
              </div>
              <FormField
                label="점검명 *"
                hint="필요하면 점검명을 직접 수정할 수 있습니다."
                error={form.formState.errors.name?.message}
              >
                <input className="input-field" {...form.register('name')} />
              </FormField>
              <div className="wizard-form-grid">
                <FormField label="촬영 시각" error={form.formState.errors.capturedAt?.message}>
                  <input
                    className="input-field"
                    type="datetime-local"
                    {...form.register('capturedAt')}
                  />
                </FormField>
                <FormField label="촬영 방식" error={form.formState.errors.captureMethod?.message}>
                  <select className="input-field" {...form.register('captureMethod')}>
                    {CAPTURE_METHOD_OPTIONS.map((method) => (
                      <option key={method} value={method}>
                        {getCaptureMethodLabel(method)}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>
              <FormField label="점검자" error={form.formState.errors.inspectorName?.message}>
                <input className="input-field" {...form.register('inspectorName')} />
              </FormField>
              <FormField label="메모" error={form.formState.errors.memo?.message}>
                <textarea className="input-field textarea-field" {...form.register('memo')} />
              </FormField>
              <p className="text-sm text-slate-500">
                점검을 생성하면 점검 상세 화면으로 이동합니다.
              </p>
            </div>
          ) : null}

          <div className="wizard-footer">
            <button className="btn btn-secondary" type="button" onClick={onClose}>
              취소
            </button>
            {currentStep > 1 ? (
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => setCurrentStep((current) => Math.max(1, current - 1) as WizardStep)}
              >
                이전
              </button>
            ) : null}
            {currentStep < 3 ? (
              <button
                className="btn btn-primary"
                type="button"
                disabled={
                  (currentStep === 1 && !selectedPlantId) ||
                  (currentStep === 2 && !selectedZoneId)
                }
                onClick={() => setCurrentStep((current) => Math.min(3, current + 1) as WizardStep)}
              >
                다음
              </button>
            ) : (
              <button
                className="btn btn-primary"
                type="submit"
                disabled={createInspectionMutation.isPending || !selectedZoneId}
              >
                {createInspectionMutation.isPending ? '생성 중' : '점검 생성'}
              </button>
            )}
          </div>
        </form>
      </section>
    </div>
  )
}

function parsePositiveInteger(value?: string) {
  const numeric = Number(value)
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null
}

function getInitialStep(plantId: number | null, zoneId: number | null): WizardStep {
  if (zoneId) {
    return 3
  }
  if (plantId) {
    return 2
  }
  return 1
}

function canMoveToStep(step: WizardStep, plantId?: string, zoneId?: string) {
  if (step === 1) {
    return true
  }
  if (step === 2) {
    return Boolean(parsePositiveInteger(plantId))
  }
  return Boolean(parsePositiveInteger(plantId) && parsePositiveInteger(zoneId))
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

