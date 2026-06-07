import type { ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useParams } from 'react-router-dom'
import { z } from 'zod'
import {
  FUSION_REQUESTED_MODEL_OPTIONS,
  RGB_REQUESTED_MODEL_OPTIONS,
  THERMAL_REQUESTED_MODEL_OPTIONS,
  getAnalysisInputTypeLabel,
  getAnalysisJobStatusLabel,
  getAnalysisJobStatusTone,
  getAnalysisModelTypeLabel,
  getRequestedModelTypeLabel,
  type RequestedModelType,
} from '../features/analysisJobs/types'
import {
  useAnalysisJob,
  useAnalysisJobs,
  useCreateAnalysisJob,
  useRetryAnalysisJob,
} from '../features/analysisJobs/hooks/useAnalysisJobs'
import { useEquipments } from '../features/equipments/hooks/useEquipments'
import { flattenEquipmentTree } from '../features/equipments/types'
import {
  useCreateImagePair,
  useDeactivateImagePair,
  useImagePair,
  useImagePairCandidates,
  useUpdateImagePair,
} from '../features/imagePairs/hooks/useImagePairs'
import {
  getImagePairTargetLabel,
  type ImagePairCandidateParams,
} from '../features/imagePairs/types'
import {
  IMAGE_TYPE_OPTIONS,
  TARGET_TYPE_OPTIONS,
  getImageTypeLabel,
  getTargetTypeLabel,
  getUploadStatusLabel,
  getUploadStatusTone,
  type ImageSummary,
  type TargetType,
} from '../features/images/types'
import {
  useDeactivateImage,
  useImagePreview,
  useImages,
  useUploadImage,
} from '../features/images/hooks/useImages'
import {
  CAPTURE_METHOD_OPTIONS,
  getCaptureMethodLabel,
  getInspectionStatusLabel,
  getInspectionStatusTone,
  type UpdateInspectionRequest,
} from '../features/inspections/types'
import {
  useInspection,
  useUpdateInspection,
} from '../features/inspections/hooks/useInspections'
import { useZone } from '../features/zones/hooks/useZones'
import { ConfirmModal } from '../shared/components/feedback/ConfirmModal'
import { FormField } from '../shared/components/form/FormField'
import { PageHeader } from '../shared/components/layout/PageHeader'
import { EmptyState } from '../shared/components/state/EmptyState'
import { ErrorState } from '../shared/components/state/ErrorState'
import { LoadingState } from '../shared/components/state/LoadingState'
import { StatusBadge } from '../shared/components/state/StatusBadge'
import { DataTable } from '../shared/components/table/DataTable'
import { useToast } from '../shared/hooks/useToast'
import {
  formatDateTime,
  getApiErrorMessage,
  isActiveResource,
  isRunningAnalysisJob,
  parsePositiveNumber,
  toDateTimeLocalInputValue,
  toOffsetDateTime,
} from '../shared/utils'
import { getResourceStatusLabel, getResourceStatusTone } from '../features/plants/types'

const updateInspectionSchema = z.object({
  name: z.string().trim().min(1, '점검명을 입력해 주세요.'),
  capturedAt: z.string().optional(),
  captureMethod: z.enum(CAPTURE_METHOD_OPTIONS),
  inspectorName: z.string().optional(),
  memo: z.string().optional(),
})

const uploadImageSchema = z
  .object({
    targetType: z.enum(TARGET_TYPE_OPTIONS),
    equipmentId: z.string().optional(),
    imageType: z.enum(IMAGE_TYPE_OPTIONS),
    capturedAt: z.string().optional(),
    memo: z.string().optional(),
    file: z.custom<FileList | undefined>(
      (value) => value === undefined || value instanceof FileList,
      '이미지 파일을 선택해 주세요.',
    ),
  })
  .superRefine((value, context) => {
    const hasFile = value.file instanceof FileList && value.file.length > 0

    if (!hasFile) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['file'],
        message: '이미지 파일을 선택해 주세요.',
      })
    }

    if (value.targetType === 'ZONE' && value.equipmentId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['equipmentId'],
        message: '구역 대상 이미지는 장비를 선택할 수 없습니다.',
      })
    }

    if (value.targetType !== 'ZONE' && !value.equipmentId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['equipmentId'],
        message: '장비 대상 이미지는 장비를 지정해야 합니다.',
      })
    }
  })

type UpdateInspectionFormValues = z.infer<typeof updateInspectionSchema>
type UploadImageFormValues = z.infer<typeof uploadImageSchema>

export function InspectionDetailPage() {
  const params = useParams()
  const toast = useToast()
  const inspectionId = parsePositiveNumber(params.inspectionId)

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [previewImageId, setPreviewImageId] = useState<number | null>(null)
  const [selectedImage, setSelectedImage] = useState<ImageSummary | null>(null)
  const [uploadFormVersion, setUploadFormVersion] = useState(0)

  const [candidateTargetType, setCandidateTargetType] = useState<TargetType>('ZONE')
  const [candidateEquipmentId, setCandidateEquipmentId] = useState('')
  const [candidateRequest, setCandidateRequest] = useState<ImagePairCandidateParams | null>(null)
  const [selectedRgbImageId, setSelectedRgbImageId] = useState('')
  const [selectedThermalImageId, setSelectedThermalImageId] = useState('')

  const [activePairId, setActivePairId] = useState<number | null>(null)
  const [isPairEditModalOpen, setIsPairEditModalOpen] = useState(false)
  const [editRgbImageId, setEditRgbImageId] = useState('')
  const [editThermalImageId, setEditThermalImageId] = useState('')
  const [isPairDeactivateModalOpen, setIsPairDeactivateModalOpen] = useState(false)

  const [rgbRequestedModelType, setRgbRequestedModelType] =
    useState<RequestedModelType>('AUTO')
  const [thermalRequestedModelType, setThermalRequestedModelType] =
    useState<RequestedModelType>('AUTO')
  const [fusionRequestedModelType, setFusionRequestedModelType] =
    useState<RequestedModelType>('AUTO')
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null)

  const inspectionQuery = useInspection(inspectionId ?? 0)
  const zoneId = inspectionQuery.data?.data.zoneId ?? 0
  const zoneQuery = useZone(zoneId)
  const equipmentsQuery = useEquipments(zoneId, {})
  const imagesQuery = useImages({ inspectionId: inspectionId ?? undefined })
  const updateInspectionMutation = useUpdateInspection(inspectionId ?? 0)
  const uploadImageMutation = useUploadImage(inspectionId ?? 0)
  const deactivateImageMutation = useDeactivateImage(inspectionId ?? 0)
  const previewQuery = useImagePreview(previewImageId ?? 0, Boolean(previewImageId))

  const pairCandidatesQuery = useImagePairCandidates(
    candidateRequest ?? {
      inspectionId: inspectionId ?? 0,
      targetType: 'ZONE',
    },
    Boolean(candidateRequest),
  )
  const pairQuery = useImagePair(activePairId ?? 0, Boolean(activePairId))
  const createImagePairMutation = useCreateImagePair(inspectionId ?? 0)
  const updateImagePairMutation = useUpdateImagePair(
    inspectionId ?? 0,
    activePairId ?? 0,
  )
  const deactivateImagePairMutation = useDeactivateImagePair(
    inspectionId ?? 0,
    activePairId ?? 0,
  )

  const analysisJobsQuery = useAnalysisJobs(
    {
      inspectionId: inspectionId ?? undefined,
      page: 0,
      size: 20,
    },
    Boolean(inspectionId),
  )
  const selectedJobQuery = useAnalysisJob(selectedJobId ?? 0, Boolean(selectedJobId))
  const createAnalysisJobMutation = useCreateAnalysisJob()
  const retryAnalysisJobMutation = useRetryAnalysisJob(selectedJobId ?? 0)

  const inspectionForm = useForm<UpdateInspectionFormValues>({
    resolver: zodResolver(updateInspectionSchema),
    defaultValues: {
      name: '',
      capturedAt: '',
      captureMethod: 'DRONE',
      inspectorName: '',
      memo: '',
    },
  })

  const uploadForm = useForm<UploadImageFormValues>({
    resolver: zodResolver(uploadImageSchema),
    defaultValues: {
      targetType: 'ZONE',
      equipmentId: '',
      imageType: 'RGB',
      capturedAt: '',
      memo: '',
      file: undefined,
    },
  })

  const flattenedEquipments = useMemo(
    () => flattenEquipmentTree(equipmentsQuery.data?.data ?? []),
    [equipmentsQuery.data],
  )

  const selectedTargetType = uploadForm.watch('targetType')
  const uploadEquipmentOptions = useMemo(
    () =>
      selectedTargetType === 'ZONE'
        ? []
        : flattenedEquipments.filter(
            (equipment) => equipment.equipmentType === selectedTargetType,
          ),
    [flattenedEquipments, selectedTargetType],
  )

  const pairEquipmentOptions = useMemo(
    () =>
      candidateTargetType === 'ZONE'
        ? []
        : flattenedEquipments.filter(
            (equipment) => equipment.equipmentType === candidateTargetType,
          ),
    [candidateTargetType, flattenedEquipments],
  )

  const imageRows = useMemo(() => imagesQuery.data?.data ?? [], [imagesQuery.data])
  const currentPair = pairQuery.data?.data ?? null
  const jobRows = useMemo(
    () => analysisJobsQuery.data?.data.content ?? [],
    [analysisJobsQuery.data],
  )
  const selectedJob = selectedJobQuery.data?.data ?? null

  const runningImageJobIds = useMemo(
    () =>
      new Set(
        jobRows
          .filter((job) => job.imageId != null && isRunningAnalysisJob(job.jobStatus))
          .map((job) => job.imageId as number),
      ),
    [jobRows],
  )

  const runningPairJobIds = useMemo(
    () =>
      new Set(
        jobRows
          .filter((job) => job.imagePairId != null && isRunningAnalysisJob(job.jobStatus))
          .map((job) => job.imagePairId as number),
      ),
    [jobRows],
  )

  const singleAnalysisImages = useMemo(
    () => imageRows.filter((image) => isActiveResource(image.status)),
    [imageRows],
  )

  const mergedRgbCandidates = useMemo(
    () => mergeCandidateImages(currentPair?.rgbImage, pairCandidatesQuery.data?.data.rgbCandidates),
    [currentPair?.rgbImage, pairCandidatesQuery.data?.data.rgbCandidates],
  )

  const mergedThermalCandidates = useMemo(
    () =>
      mergeCandidateImages(
        currentPair?.thermalImage,
        pairCandidatesQuery.data?.data.thermalCandidates,
      ),
    [currentPair?.thermalImage, pairCandidatesQuery.data?.data.thermalCandidates],
  )

  useEffect(() => {
    if (!inspectionQuery.data) {
      return
    }

    inspectionForm.reset({
      name: inspectionQuery.data.data.name,
      capturedAt: toDateTimeLocalInputValue(inspectionQuery.data.data.capturedAt),
      captureMethod: inspectionQuery.data.data.captureMethod,
      inspectorName: inspectionQuery.data.data.inspectorName ?? '',
      memo: inspectionQuery.data.data.memo ?? '',
    })
  }, [inspectionForm, inspectionQuery.data])

  useEffect(() => {
    const currentEquipmentId = uploadForm.getValues('equipmentId')

    if (selectedTargetType === 'ZONE') {
      if (currentEquipmentId) {
        uploadForm.setValue('equipmentId', '')
      }
      return
    }

    if (
      currentEquipmentId &&
      !uploadEquipmentOptions.some(
        (equipment) => String(equipment.equipmentId) === currentEquipmentId,
      )
    ) {
      uploadForm.setValue('equipmentId', '')
    }
  }, [selectedTargetType, uploadEquipmentOptions, uploadForm])

  useEffect(() => {
    if (candidateTargetType === 'ZONE') {
      setCandidateEquipmentId('')
      return
    }

    if (
      candidateEquipmentId &&
      !pairEquipmentOptions.some(
        (equipment) => String(equipment.equipmentId) === candidateEquipmentId,
      )
    ) {
      setCandidateEquipmentId('')
    }
  }, [candidateEquipmentId, candidateTargetType, pairEquipmentOptions])

  useEffect(() => {
    const rgbCandidates = pairCandidatesQuery.data?.data.rgbCandidates ?? []
    const thermalCandidates = pairCandidatesQuery.data?.data.thermalCandidates ?? []

    setSelectedRgbImageId(rgbCandidates[0] ? String(rgbCandidates[0].imageId) : '')
    setSelectedThermalImageId(thermalCandidates[0] ? String(thermalCandidates[0].imageId) : '')
  }, [pairCandidatesQuery.data])

  useEffect(() => {
    if (!activePairId && inspectionQuery.data?.data.imagePairs[0]) {
      setActivePairId(inspectionQuery.data.data.imagePairs[0].imagePairId)
    }
  }, [activePairId, inspectionQuery.data])

  useEffect(() => {
    if (currentPair) {
      setEditRgbImageId(String(currentPair.rgbImageId))
      setEditThermalImageId(String(currentPair.thermalImageId))
    }
  }, [currentPair])

  useEffect(() => {
    if (!selectedJobId && jobRows[0]) {
      setSelectedJobId(jobRows[0].jobId)
    }
  }, [jobRows, selectedJobId])

  if (!inspectionId) {
    return (
      <ErrorState
        title="잘못된 점검 ID입니다."
        description="URL의 inspectionId가 올바른 숫자인지 확인해 주세요."
      />
    )
  }

  if (inspectionQuery.isLoading && !inspectionQuery.data) {
    return <LoadingState message="점검 상세를 불러오는 중입니다." />
  }

  if (inspectionQuery.isError || !inspectionQuery.data) {
    return (
      <ErrorState
        title="점검 상세를 불러오지 못했습니다."
        description={getApiErrorMessage(inspectionQuery.error)}
      />
    )
  }

  const inspection = inspectionQuery.data.data

  const handleUpdateInspection = inspectionForm.handleSubmit(async (values) => {
    const payload: UpdateInspectionRequest = {
      name: values.name.trim(),
      capturedAt: toOffsetDateTime(values.capturedAt),
      captureMethod: values.captureMethod,
      inspectorName: values.inspectorName?.trim() || null,
      memo: values.memo?.trim() || null,
    }

    try {
      const response = await updateInspectionMutation.mutateAsync(payload)
      toast.push(response.message || '점검 정보를 수정했습니다.')
      setIsEditModalOpen(false)
    } catch (error) {
      toast.push(getApiErrorMessage(error, '점검 수정에 실패했습니다.'))
    }
  })

  const handleUploadImage = uploadForm.handleSubmit(async (values) => {
    const file = values.file?.item(0)

    if (!file) {
      return
    }

    try {
      const response = await uploadImageMutation.mutateAsync({
        inspectionId,
        equipmentId: values.targetType === 'ZONE' ? null : Number(values.equipmentId),
        targetType: values.targetType,
        imageType: values.imageType,
        capturedAt: toOffsetDateTime(values.capturedAt),
        memo: values.memo?.trim() || null,
        file,
      })

      toast.push(response.message || '이미지를 업로드했습니다.')
      uploadForm.reset({
        targetType: 'ZONE',
        equipmentId: '',
        imageType: 'RGB',
        capturedAt: '',
        memo: '',
        file: undefined,
      })
      setUploadFormVersion((current) => current + 1)
    } catch (error) {
      toast.push(
        getApiErrorMessage(
          error,
          '이미지 업로드에 실패했습니다. 중복 업로드나 대상 조건을 확인해 주세요.',
        ),
      )
    }
  })

  const handleDeactivateImage = async () => {
    if (!selectedImage) {
      return
    }

    try {
      const response = await deactivateImageMutation.mutateAsync(selectedImage.imageId)
      toast.push(response.message || '이미지를 비활성화했습니다.')
      setSelectedImage(null)
    } catch (error) {
      toast.push(getApiErrorMessage(error, '이미지 비활성화에 실패했습니다.'))
    }
  }

  const handleFetchCandidates = async () => {
    if (candidateTargetType !== 'ZONE' && !candidateEquipmentId) {
      toast.push('장비 대상 Pair 후보 조회에는 장비 선택이 필요합니다.')
      return
    }

    const nextParams: ImagePairCandidateParams = {
      inspectionId,
      targetType: candidateTargetType,
      equipmentId:
        candidateTargetType === 'ZONE' ? undefined : Number(candidateEquipmentId),
    }

    const isSameRequest =
      candidateRequest?.inspectionId === nextParams.inspectionId &&
      candidateRequest?.targetType === nextParams.targetType &&
      candidateRequest?.equipmentId === nextParams.equipmentId

    setCandidateRequest(nextParams)

    if (isSameRequest) {
      await pairCandidatesQuery.refetch()
    }
  }

  const handleCreatePair = async () => {
    if (!selectedRgbImageId || !selectedThermalImageId) {
      toast.push('RGB와 열화상 후보를 각각 선택해 주세요.')
      return
    }

    try {
      const response = await createImagePairMutation.mutateAsync({
        rgbImageId: Number(selectedRgbImageId),
        thermalImageId: Number(selectedThermalImageId),
      })
      setActivePairId(response.data.imagePairId)
      toast.push(response.message || 'RGB-Thermal Pair를 생성했습니다.')
    } catch (error) {
      toast.push(getApiErrorMessage(error, 'Pair 생성에 실패했습니다.'))
    }
  }

  const handleOpenPairEdit = () => {
    if (!currentPair) {
      toast.push('수정할 Pair 상세가 아직 로드되지 않았습니다.')
      return
    }

    setEditRgbImageId(String(currentPair.rgbImageId))
    setEditThermalImageId(String(currentPair.thermalImageId))
    setIsPairEditModalOpen(true)
  }

  const handleUpdatePair = async () => {
    if (!editRgbImageId || !editThermalImageId) {
      toast.push('RGB와 열화상 이미지를 각각 선택해 주세요.')
      return
    }

    try {
      const response = await updateImagePairMutation.mutateAsync({
        rgbImageId: Number(editRgbImageId),
        thermalImageId: Number(editThermalImageId),
      })
      setActivePairId(response.data.imagePairId)
      setIsPairEditModalOpen(false)
      toast.push(response.message || 'Pair 정보를 수정했습니다.')
    } catch (error) {
      toast.push(getApiErrorMessage(error, 'Pair 수정에 실패했습니다.'))
    }
  }

  const handleDeactivatePair = async () => {
    if (!activePairId) {
      return
    }

    try {
      const response = await deactivateImagePairMutation.mutateAsync()
      toast.push(response.message || 'Pair를 비활성화했습니다.')
      setIsPairDeactivateModalOpen(false)
    } catch (error) {
      toast.push(getApiErrorMessage(error, 'Pair 비활성화에 실패했습니다.'))
    }
  }

  const requestSingleAnalysis = async (
    image: ImageSummary,
    requestedModelType: RequestedModelType,
  ) => {
    try {
      const response = await createAnalysisJobMutation.mutateAsync({
        imageId: image.imageId,
        imagePairId: null,
        inputType: image.imageType === 'RGB' ? 'RGB_SINGLE' : 'THERMAL_SINGLE',
        requestedModelType,
      })
      setSelectedJobId(response.data.jobId)
      toast.push(response.message || '분석 요청을 등록했습니다.')
    } catch (error) {
      toast.push(getApiErrorMessage(error, '분석 요청에 실패했습니다.'))
    }
  }

  const requestFusionAnalysis = async () => {
    if (!currentPair) {
      toast.push('Fusion 분석을 요청할 Pair가 없습니다.')
      return
    }

    try {
      const response = await createAnalysisJobMutation.mutateAsync({
        imageId: null,
        imagePairId: currentPair.imagePairId,
        inputType: 'RGB_THERMAL_PAIR',
        requestedModelType: fusionRequestedModelType,
      })
      setSelectedJobId(response.data.jobId)
      toast.push(response.message || 'Fusion 분석 요청을 등록했습니다.')
    } catch (error) {
      toast.push(getApiErrorMessage(error, 'Fusion 분석 요청에 실패했습니다.'))
    }
  }

  const handleRefreshJobs = async () => {
    await analysisJobsQuery.refetch()
    if (selectedJobId) {
      await selectedJobQuery.refetch()
    }
  }

  const handleRetryJob = async () => {
    if (!selectedJobId) {
      return
    }

    try {
      const response = await retryAnalysisJobMutation.mutateAsync(undefined)
      toast.push(response.message || '분석 작업을 재요청했습니다.')
      await handleRefreshJobs()
    } catch (error) {
      toast.push(getApiErrorMessage(error, '분석 재요청에 실패했습니다.'))
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="점검 상세"
        description="점검 메타데이터 수정, 이미지 업로드, Pair 후보 조회, 분석 요청과 상태 확인을 한 화면에서 처리합니다."
        actions={
          <>
            <Link className="btn btn-secondary" to="/inspections">
              목록으로
            </Link>
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => setIsEditModalOpen(true)}
            >
              점검 수정
            </button>
          </>
        }
      />

      <section className="panel stack-md">
        <div className="toolbar">
          <div className="stack-sm">
            <div className="inline-actions">
              <StatusBadge
                label={getInspectionStatusLabel(inspection.inspectionStatus)}
                tone={getInspectionStatusTone(inspection.inspectionStatus)}
              />
              <StatusBadge label={getCaptureMethodLabel(inspection.captureMethod)} />
            </div>
            <div>
              <h2 className="panel-title">{inspection.name}</h2>
              <p className="panel-description">
                구역 {inspection.zoneId} · 발전소 {inspection.plantId}
              </p>
            </div>
          </div>
          <div className="inline-actions">
            <Link className="btn btn-secondary" to={`/zones/${inspection.zoneId}`}>
              구역 상세
            </Link>
            {zoneQuery.data ? (
              <Link className="btn btn-secondary" to={`/plants/${zoneQuery.data.data.plantId}`}>
                발전소 상세
              </Link>
            ) : null}
          </div>
        </div>
        <div className="detail-grid">
          <DetailItem label="촬영 시각" value={formatDateTime(inspection.capturedAt)} />
          <DetailItem label="점검자" value={inspection.inspectorName || '-'} />
          <DetailItem label="메모" value={inspection.memo || '-'} />
          <DetailItem label="작성자" value={String(inspection.createdByUserId)} />
          <DetailItem label="생성 시각" value={formatDateTime(inspection.createdAt)} />
          <DetailItem label="수정 시각" value={formatDateTime(inspection.updatedAt)} />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <section className="panel stack-md">
          <div>
            <h2 className="panel-title">이미지 업로드</h2>
            <p className="panel-description">
              구역 대상 이미지는 장비 없이, ARRAY/PANEL/MODULE 대상 이미지는 같은 구역 소속 장비와 함께 업로드합니다.
            </p>
          </div>
          <form className="stack-md" onSubmit={handleUploadImage}>
            <FormField
              label="대상 타입"
              error={uploadForm.formState.errors.targetType?.message}
            >
              <select className="input-field" {...uploadForm.register('targetType')}>
                {TARGET_TYPE_OPTIONS.map((targetType) => (
                  <option key={targetType} value={targetType}>
                    {getTargetTypeLabel(targetType)}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField
              label="장비 선택"
              hint={
                selectedTargetType === 'ZONE'
                  ? '구역 대상 이미지는 장비를 선택하지 않습니다.'
                  : '선택한 targetType과 같은 장비 타입만 표시됩니다.'
              }
              error={uploadForm.formState.errors.equipmentId?.message}
            >
              <select
                className="input-field"
                {...uploadForm.register('equipmentId')}
                disabled={selectedTargetType === 'ZONE'}
              >
                <option value="">
                  {selectedTargetType === 'ZONE'
                    ? '장비 선택 없음'
                    : '장비를 선택해 주세요'}
                </option>
                {uploadEquipmentOptions.map((equipment) => (
                  <option key={equipment.equipmentId} value={equipment.equipmentId}>
                    {`${'· '.repeat(equipment.depth)}${equipment.name}`}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField
              label="이미지 타입"
              error={uploadForm.formState.errors.imageType?.message}
            >
              <select className="input-field" {...uploadForm.register('imageType')}>
                {IMAGE_TYPE_OPTIONS.map((imageType) => (
                  <option key={imageType} value={imageType}>
                    {getImageTypeLabel(imageType)}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField
              label="촬영 시각"
              hint="비워 두면 backend로 null이 전달됩니다."
              error={uploadForm.formState.errors.capturedAt?.message}
            >
              <input
                className="input-field"
                type="datetime-local"
                {...uploadForm.register('capturedAt')}
              />
            </FormField>
            <FormField label="메모" error={uploadForm.formState.errors.memo?.message}>
              <textarea className="input-field textarea-field" {...uploadForm.register('memo')} />
            </FormField>
            <FormField
              label="이미지 파일"
              hint="같은 inspection + targetType + equipmentId + imageType + ACTIVE 조합은 중복 업로드가 막힙니다."
              error={uploadForm.formState.errors.file?.message}
            >
              <input
                key={uploadFormVersion}
                className="input-field"
                type="file"
                accept="image/*"
                {...uploadForm.register('file')}
              />
            </FormField>
            <div className="flex justify-end">
              <button
                className="btn btn-primary"
                type="submit"
                disabled={uploadImageMutation.isPending}
              >
                이미지 업로드
              </button>
            </div>
          </form>
        </section>

        <section className="panel stack-md">
          <div>
            <h2 className="panel-title">연결 상태</h2>
            <p className="panel-description">
              이미지 목록은 별도 `/api/v1/images?inspectionId=...` 호출로, Pair와 분석 작업은 각각 전용 API로 조회합니다.
            </p>
          </div>
          <div className="detail-grid">
            <DetailItem label="구역명" value={zoneQuery.data?.data.name || '-'} />
            <DetailItem label="장비 노드 수" value={String(flattenedEquipments.length)} />
            <DetailItem label="업로드 이미지 수" value={String(imageRows.length)} />
            <DetailItem label="점검 응답 pair 수" value={String(inspection.imagePairs.length)} />
          </div>
          {equipmentsQuery.isLoading ? (
            <LoadingState message="장비 목록을 불러오는 중입니다." />
          ) : null}
          {equipmentsQuery.isError ? (
            <ErrorState
              title="장비 목록을 불러오지 못했습니다."
              description={getApiErrorMessage(equipmentsQuery.error)}
            />
          ) : null}
        </section>
      </section>

      <section className="panel stack-md">
        <div className="toolbar">
          <div>
            <h2 className="panel-title">업로드 이미지 목록</h2>
            <p className="panel-description">
              이미지 미리보기는 preview URL 응답을 사용하고, 여기서 단일 분석 요청까지 바로 연결합니다.
            </p>
          </div>
          {imagesQuery.isLoading ? (
            <span className="text-sm text-slate-500">이미지 목록을 불러오는 중입니다.</span>
          ) : null}
        </div>

        {imagesQuery.isLoading && !imagesQuery.data ? (
          <LoadingState message="이미지 목록을 불러오는 중입니다." />
        ) : null}

        {imagesQuery.isError ? (
          <ErrorState
            title="이미지 목록을 불러오지 못했습니다."
            description={getApiErrorMessage(imagesQuery.error)}
          />
        ) : null}

        {imagesQuery.data ? (
          <DataTable
            columns={[
              {
                key: 'file',
                header: '파일',
                render: (image: ImageSummary) => (
                  <div className="stack-sm">
                    <span className="font-semibold text-slate-900">{image.originalFilename}</span>
                    <span className="text-xs text-slate-500">이미지 ID {image.imageId}</span>
                  </div>
                ),
              },
              {
                key: 'target',
                header: '대상',
                render: (image: ImageSummary) => (
                  <div className="stack-sm text-sm">
                    <span>{getTargetTypeLabel(image.targetType)}</span>
                    <span>장비 {image.equipmentId ?? '-'}</span>
                  </div>
                ),
              },
              {
                key: 'type',
                header: '유형',
                render: (image: ImageSummary) => (
                  <div className="stack-sm">
                    <StatusBadge label={getImageTypeLabel(image.imageType)} />
                    <StatusBadge
                      label={getUploadStatusLabel(image.uploadStatus)}
                      tone={getUploadStatusTone(image.uploadStatus)}
                    />
                  </div>
                ),
              },
              {
                key: 'status',
                header: '상태',
                render: (image: ImageSummary) => (
                  <StatusBadge
                    label={getResourceStatusLabel(image.status)}
                    tone={getResourceStatusTone(image.status)}
                  />
                ),
              },
              {
                key: 'capturedAt',
                header: '촬영 시각',
                render: (image: ImageSummary) => formatDateTime(image.capturedAt),
              },
              {
                key: 'actions',
                header: '동작',
                render: (image: ImageSummary) => {
                  const singleRequestedModelType =
                    image.imageType === 'RGB'
                      ? rgbRequestedModelType
                      : thermalRequestedModelType
                  const hasRunningJob = runningImageJobIds.has(image.imageId)
                  const canRequest = isActiveResource(image.status) && !hasRunningJob

                  return (
                    <div className="inline-actions">
                      <button
                        className="text-button"
                        type="button"
                        onClick={() => setPreviewImageId(image.imageId)}
                      >
                        미리보기
                      </button>
                      <button
                        className="text-button"
                        type="button"
                        disabled={!canRequest || createAnalysisJobMutation.isPending}
                        onClick={() => requestSingleAnalysis(image, singleRequestedModelType)}
                      >
                        {image.imageType === 'RGB' ? 'RGB 분석' : '열화상 분석'}
                      </button>
                      <button
                        className="text-button text-button-danger"
                        type="button"
                        onClick={() => setSelectedImage(image)}
                      >
                        비활성화
                      </button>
                    </div>
                  )
                },
              },
            ]}
            rows={imageRows}
            rowKey={(image: ImageSummary) => image.imageId}
            emptyTitle="업로드된 이미지가 없습니다."
            emptyDescription="먼저 이미지를 업로드하면 Pair와 분석 작업을 이어서 진행할 수 있습니다."
          />
        ) : null}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <section className="panel stack-md">
          <div className="toolbar">
            <div>
              <h2 className="panel-title">RGB-Thermal Pair 후보</h2>
              <p className="panel-description">
                inspectionId, targetType, equipmentId 기준으로 사용 가능한 RGB와 열화상 후보를 조회합니다.
              </p>
            </div>
            <button className="btn btn-secondary" type="button" onClick={handleFetchCandidates}>
              후보 조회
            </button>
          </div>

          <div className="filter-grid">
            <FormField label="대상 타입">
              <select
                className="input-field"
                value={candidateTargetType}
                onChange={(event) => setCandidateTargetType(event.target.value as TargetType)}
              >
                {TARGET_TYPE_OPTIONS.map((targetType) => (
                  <option key={targetType} value={targetType}>
                    {getTargetTypeLabel(targetType)}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField
              label="장비"
              hint={
                candidateTargetType === 'ZONE'
                  ? '구역 대상 후보는 장비를 선택하지 않습니다.'
                  : '장비 대상 후보는 같은 타입의 장비만 조회됩니다.'
              }
            >
              <select
                className="input-field"
                disabled={candidateTargetType === 'ZONE'}
                value={candidateEquipmentId}
                onChange={(event) => setCandidateEquipmentId(event.target.value)}
              >
                <option value="">
                  {candidateTargetType === 'ZONE' ? '장비 없음' : '장비를 선택해 주세요'}
                </option>
                {pairEquipmentOptions.map((equipment) => (
                  <option key={equipment.equipmentId} value={equipment.equipmentId}>
                    {`${'· '.repeat(equipment.depth)}${equipment.name}`}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          {pairCandidatesQuery.isLoading ? (
            <LoadingState message="Pair 후보를 불러오는 중입니다." />
          ) : null}

          {pairCandidatesQuery.isError ? (
            <ErrorState
              title="Pair 후보를 불러오지 못했습니다."
              description={getApiErrorMessage(pairCandidatesQuery.error)}
            />
          ) : null}

          {pairCandidatesQuery.data ? (
            <>
              <div className="detail-grid">
                <DetailItem
                  label="조회 대상"
                  value={getImagePairTargetLabel(candidateRequest?.targetType ?? candidateTargetType)}
                />
                <DetailItem
                  label="장비 ID"
                  value={String(pairCandidatesQuery.data.data.equipmentId ?? '-')}
                />
                <DetailItem
                  label="RGB 후보"
                  value={String(pairCandidatesQuery.data.data.rgbCandidates.length)}
                />
                <DetailItem
                  label="열화상 후보"
                  value={String(pairCandidatesQuery.data.data.thermalCandidates.length)}
                />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <FormField label="RGB 후보 선택">
                  <select
                    className="input-field"
                    value={selectedRgbImageId}
                    onChange={(event) => setSelectedRgbImageId(event.target.value)}
                  >
                    <option value="">RGB 후보를 선택해 주세요</option>
                    {pairCandidatesQuery.data.data.rgbCandidates.map((image) => (
                      <option key={image.imageId} value={image.imageId}>
                        {`#${image.imageId} ${image.originalFilename}`}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="열화상 후보 선택">
                  <select
                    className="input-field"
                    value={selectedThermalImageId}
                    onChange={(event) => setSelectedThermalImageId(event.target.value)}
                  >
                    <option value="">열화상 후보를 선택해 주세요</option>
                    {pairCandidatesQuery.data.data.thermalCandidates.map((image) => (
                      <option key={image.imageId} value={image.imageId}>
                        {`#${image.imageId} ${image.originalFilename}`}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              <div className="flex justify-end">
                <button
                  className="btn btn-primary"
                  type="button"
                  disabled={
                    !selectedRgbImageId ||
                    !selectedThermalImageId ||
                    createImagePairMutation.isPending
                  }
                  onClick={handleCreatePair}
                >
                  Pair 생성
                </button>
              </div>
            </>
          ) : (
            <EmptyState
              title="Pair 후보를 아직 조회하지 않았습니다."
              description="대상 타입과 장비를 고른 뒤 후보 조회를 실행해 주세요."
            />
          )}
        </section>

        <section className="panel stack-md">
          <div className="toolbar">
            <div>
              <h2 className="panel-title">현재 Pair 상세</h2>
              <p className="panel-description">
                inspection 응답의 summary 또는 방금 생성한 Pair를 기준으로 상세 조회를 연결합니다.
              </p>
            </div>
            {inspection.imagePairs.length > 0 ? (
              <select
                className="input-field max-w-[14rem]"
                value={String(activePairId ?? inspection.imagePairs[0].imagePairId)}
                onChange={(event) => setActivePairId(Number(event.target.value))}
              >
                {inspection.imagePairs.map((pair) => (
                  <option key={pair.imagePairId} value={pair.imagePairId}>
                    {`Pair #${pair.imagePairId}`}
                  </option>
                ))}
                {activePairId &&
                !inspection.imagePairs.some((pair) => pair.imagePairId === activePairId) ? (
                  <option value={activePairId}>{`Pair #${activePairId}`}</option>
                ) : null}
              </select>
            ) : null}
          </div>

          {activePairId && pairQuery.isLoading && !pairQuery.data ? (
            <LoadingState message="Pair 상세를 불러오는 중입니다." />
          ) : null}

          {pairQuery.isError ? (
            <ErrorState
              title="Pair 상세를 불러오지 못했습니다."
              description={getApiErrorMessage(pairQuery.error)}
            />
          ) : null}

          {currentPair ? (
            <>
              <div className="detail-grid">
                <DetailItem label="Pair ID" value={String(currentPair.imagePairId)} />
                <DetailItem
                  label="대상"
                  value={getImagePairTargetLabel(currentPair.targetType)}
                />
                <DetailItem label="장비 ID" value={String(currentPair.equipmentId ?? '-')} />
                <DetailItem
                  label="상태"
                  value={getResourceStatusLabel(currentPair.status)}
                />
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <PairImageCard title="RGB 이미지" image={currentPair.rgbImage} />
                <PairImageCard title="열화상 이미지" image={currentPair.thermalImage} />
              </div>
              <div className="inline-actions">
                <button className="btn btn-secondary" type="button" onClick={handleOpenPairEdit}>
                  Pair 수정
                </button>
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => setIsPairDeactivateModalOpen(true)}
                >
                  Pair 비활성화
                </button>
              </div>
            </>
          ) : (
            <EmptyState
              title="확인할 Pair가 없습니다."
              description="현재 backend에는 inspectionId 기준 Pair 목록 API가 없어, 생성한 Pair 또는 inspection 응답의 summary 범위 안에서만 상세를 확인합니다."
            />
          )}
        </section>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="panel stack-md">
          <div>
            <h2 className="panel-title">AI 분석 요청</h2>
            <p className="panel-description">
              RGB 단일, 열화상 단일, Pair 기반 Fusion 분석 요청을 backend enum 규격에 맞춰 생성합니다.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <FormField label="RGB 요청 모델">
              <select
                className="input-field"
                value={rgbRequestedModelType}
                onChange={(event) =>
                  setRgbRequestedModelType(event.target.value as RequestedModelType)
                }
              >
                {RGB_REQUESTED_MODEL_OPTIONS.map((modelType) => (
                  <option key={modelType} value={modelType}>
                    {getRequestedModelTypeLabel(modelType)}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="열화상 요청 모델">
              <select
                className="input-field"
                value={thermalRequestedModelType}
                onChange={(event) =>
                  setThermalRequestedModelType(event.target.value as RequestedModelType)
                }
              >
                {THERMAL_REQUESTED_MODEL_OPTIONS.map((modelType) => (
                  <option key={modelType} value={modelType}>
                    {getRequestedModelTypeLabel(modelType)}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Fusion 요청 모델">
              <select
                className="input-field"
                value={fusionRequestedModelType}
                onChange={(event) =>
                  setFusionRequestedModelType(event.target.value as RequestedModelType)
                }
              >
                {FUSION_REQUESTED_MODEL_OPTIONS.map((modelType) => (
                  <option key={modelType} value={modelType}>
                    {getRequestedModelTypeLabel(modelType)}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <DataTable
            columns={[
              {
                key: 'image',
                header: '대상 이미지',
                render: (image: ImageSummary) => (
                  <div className="stack-sm">
                    <span className="font-semibold text-slate-900">{image.originalFilename}</span>
                    <span className="text-xs text-slate-500">
                      {`${getImageTypeLabel(image.imageType)} · #${image.imageId}`}
                    </span>
                  </div>
                ),
              },
              {
                key: 'target',
                header: '대상 정보',
                render: (image: ImageSummary) => (
                  <div className="stack-sm text-sm">
                    <span>{getTargetTypeLabel(image.targetType)}</span>
                    <span>장비 {image.equipmentId ?? '-'}</span>
                  </div>
                ),
              },
              {
                key: 'request',
                header: '분석 요청',
                render: (image: ImageSummary) => {
                  const requestedModelType =
                    image.imageType === 'RGB'
                      ? rgbRequestedModelType
                      : thermalRequestedModelType
                  const hasRunningJob = runningImageJobIds.has(image.imageId)
                  const canRequest = isActiveResource(image.status) && !hasRunningJob

                  return (
                    <button
                      className="btn btn-secondary"
                      type="button"
                      disabled={!canRequest || createAnalysisJobMutation.isPending}
                      onClick={() => requestSingleAnalysis(image, requestedModelType)}
                    >
                      {image.imageType === 'RGB' ? 'RGB 분석 요청' : '열화상 분석 요청'}
                    </button>
                  )
                },
              },
            ]}
            rows={singleAnalysisImages}
            rowKey={(image: ImageSummary) => image.imageId}
            emptyTitle="분석 요청 가능한 활성 이미지가 없습니다."
            emptyDescription="활성 상태의 RGB 또는 열화상 이미지를 업로드한 뒤 다시 확인해 주세요."
          />

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="toolbar">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Fusion 분석 요청</h3>
                <p className="mt-1 text-sm text-slate-600">
                  현재 Pair 기준으로 `RGB_THERMAL_PAIR` 입력 작업을 생성합니다.
                </p>
              </div>
              <button
                className="btn btn-primary"
                type="button"
                disabled={
                  !currentPair ||
                  !isActiveResource(currentPair.status) ||
                  runningPairJobIds.has(currentPair.imagePairId) ||
                  createAnalysisJobMutation.isPending
                }
                onClick={requestFusionAnalysis}
              >
                Fusion 분석 요청
              </button>
            </div>
          </div>
        </section>

        <section className="panel stack-md">
          <div className="toolbar">
            <div>
              <h2 className="panel-title">분석 작업 상태</h2>
              <p className="panel-description">
                inspectionId 기준 목록을 조회하고, 실패한 작업은 상세 조회 후 재요청할 수 있습니다.
              </p>
            </div>
            <button className="btn btn-secondary" type="button" onClick={handleRefreshJobs}>
              상태 새로고침
            </button>
          </div>

          {analysisJobsQuery.isLoading && !analysisJobsQuery.data ? (
            <LoadingState message="분석 작업 목록을 불러오는 중입니다." />
          ) : null}

          {analysisJobsQuery.isError ? (
            <ErrorState
              title="분석 작업 목록을 불러오지 못했습니다."
              description={getApiErrorMessage(analysisJobsQuery.error)}
            />
          ) : null}

          {analysisJobsQuery.data ? (
            <DataTable
              columns={[
                {
                  key: 'jobId',
                  header: '작업',
                  render: (job) => (
                    <div className="stack-sm">
                      <span className="font-semibold text-slate-900">{`Job #${job.jobId}`}</span>
                      <span className="text-xs text-slate-500">
                        {formatDateTime(job.requestedAt)}
                      </span>
                    </div>
                  ),
                },
                {
                  key: 'inputType',
                  header: '입력',
                  render: (job) => (
                    <div className="stack-sm">
                      <StatusBadge label={getAnalysisInputTypeLabel(job.inputType)} />
                      <StatusBadge
                        label={getAnalysisModelTypeLabel(job.modelType)}
                        tone="default"
                      />
                    </div>
                  ),
                },
                {
                  key: 'status',
                  header: '상태',
                  render: (job) => (
                    <StatusBadge
                      label={getAnalysisJobStatusLabel(job.jobStatus)}
                      tone={getAnalysisJobStatusTone(job.jobStatus)}
                    />
                  ),
                },
                {
                  key: 'target',
                  header: '대상 ID',
                  render: (job) => (
                    <div className="stack-sm text-sm">
                      <span>{`imageId: ${job.imageId ?? '-'}`}</span>
                      <span>{`imagePairId: ${job.imagePairId ?? '-'}`}</span>
                    </div>
                  ),
                },
                {
                  key: 'actions',
                  header: '동작',
                  render: (job) => (
                    <div className="inline-actions">
                      <button
                        className="text-button"
                        type="button"
                        onClick={() => setSelectedJobId(job.jobId)}
                      >
                        상세/실패 사유
                      </button>
                      <button
                        className="text-button"
                        type="button"
                        disabled={job.jobStatus !== 'FAILED'}
                        onClick={() => setSelectedJobId(job.jobId)}
                      >
                        재요청 준비
                      </button>
                    </div>
                  ),
                },
              ]}
              rows={jobRows}
              rowKey={(job) => job.jobId}
              emptyTitle="분석 작업이 없습니다."
              emptyDescription="단일 이미지나 Pair 분석을 요청하면 이 목록에 상태가 표시됩니다."
            />
          ) : null}
        </section>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <section className="panel stack-md">
          <div>
            <h2 className="panel-title">실패 사유 / 재요청</h2>
            <p className="panel-description">
              실패한 작업을 선택하면 failureCode, failureMessage, traceId를 확인하고 다시 요청할 수 있습니다.
            </p>
          </div>

          {selectedJobId && selectedJobQuery.isLoading && !selectedJobQuery.data ? (
            <LoadingState message="작업 상세를 불러오는 중입니다." />
          ) : null}

          {selectedJobQuery.isError ? (
            <ErrorState
              title="작업 상세를 불러오지 못했습니다."
              description={getApiErrorMessage(selectedJobQuery.error)}
            />
          ) : null}

          {selectedJob ? (
            <>
              <div className="detail-grid">
                <DetailItem label="선택 작업" value={`Job #${selectedJob.jobId}`} />
                <DetailItem
                  label="입력 유형"
                  value={getAnalysisInputTypeLabel(selectedJob.inputType)}
                />
                <DetailItem
                  label="요청 모델"
                  value={getRequestedModelTypeLabel(selectedJob.requestedModelType)}
                />
                <DetailItem
                  label="상태"
                  value={getAnalysisJobStatusLabel(selectedJob.jobStatus)}
                />
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="stack-sm">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                      Failure Code
                    </div>
                    <div className="mt-1 text-sm text-slate-900">
                      {selectedJob.failureCode ?? '-'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                      Failure Message
                    </div>
                    <div className="mt-1 text-sm text-slate-900">
                      {selectedJob.failureMessage ?? '현재 선택한 작업에 실패 메시지가 없습니다.'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                      Trace ID
                    </div>
                    <div className="mt-1 text-sm text-slate-900">
                      {selectedJob.traceId ?? '-'}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  className="btn btn-primary"
                  type="button"
                  disabled={selectedJob.jobStatus !== 'FAILED' || retryAnalysisJobMutation.isPending}
                  onClick={handleRetryJob}
                >
                  분석 재요청
                </button>
              </div>
            </>
          ) : (
            <EmptyState
              title="선택한 작업이 없습니다."
              description="분석 작업 목록에서 상세를 볼 작업을 선택해 주세요."
            />
          )}
        </section>

        <section className="panel stack-md">
          <div>
            <h2 className="panel-title">다음 단계 안내</h2>
            <p className="panel-description">
              이번 단계는 Pair, 분석 요청, 상태 확인까지를 다룹니다. 분석 결과 상세와 시각화는 다음 단계에서 연결합니다.
            </p>
          </div>
          <ul className="marker-list">
            <li>결과 목록/상세와 bbox, heatmap, mask 시각화는 후속 단계 범위입니다.</li>
            <li>관리자 전용 운영 화면과 대시보드 실데이터 연동은 이번 작업 범위가 아닙니다.</li>
            <li>backend가 내려주는 failureCode/failureMessage를 그대로 표시하고, 해석은 최소 안내만 제공합니다.</li>
          </ul>
        </section>
      </section>

      <EntityModal
        isOpen={isEditModalOpen}
        title="점검 수정"
        description="PATCH /api/v1/inspections/{inspectionId} 요청 규격에 맞춰 점검 메타데이터를 수정합니다."
        onClose={() => setIsEditModalOpen(false)}
      >
        <form className="stack-md" onSubmit={handleUpdateInspection}>
          <FormField label="점검명" error={inspectionForm.formState.errors.name?.message}>
            <input className="input-field" {...inspectionForm.register('name')} />
          </FormField>
          <FormField
            label="촬영 방식"
            error={inspectionForm.formState.errors.captureMethod?.message}
          >
            <select className="input-field" {...inspectionForm.register('captureMethod')}>
              {CAPTURE_METHOD_OPTIONS.map((method) => (
                <option key={method} value={method}>
                  {getCaptureMethodLabel(method)}
                </option>
              ))}
            </select>
          </FormField>
          <FormField
            label="촬영 시각"
            error={inspectionForm.formState.errors.capturedAt?.message}
          >
            <input
              className="input-field"
              type="datetime-local"
              {...inspectionForm.register('capturedAt')}
            />
          </FormField>
          <FormField
            label="점검자"
            error={inspectionForm.formState.errors.inspectorName?.message}
          >
            <input className="input-field" {...inspectionForm.register('inspectorName')} />
          </FormField>
          <FormField label="메모" error={inspectionForm.formState.errors.memo?.message}>
            <textarea className="input-field textarea-field" {...inspectionForm.register('memo')} />
          </FormField>
          <ModalActions
            isSubmitting={updateInspectionMutation.isPending}
            onCancel={() => setIsEditModalOpen(false)}
          />
        </form>
      </EntityModal>

      <EntityModal
        isOpen={isPairEditModalOpen}
        title="Pair 수정"
        description="PATCH /api/v1/image-pairs/{imagePairId} 요청으로 RGB 또는 열화상 이미지를 교체합니다."
        onClose={() => setIsPairEditModalOpen(false)}
      >
        <div className="stack-md">
          <FormField label="RGB 이미지">
            <select
              className="input-field"
              value={editRgbImageId}
              onChange={(event) => setEditRgbImageId(event.target.value)}
            >
              <option value="">RGB 이미지를 선택해 주세요</option>
              {mergedRgbCandidates.map((image) => (
                <option key={image.imageId} value={image.imageId}>
                  {`#${image.imageId} ${image.originalFilename}`}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="열화상 이미지">
            <select
              className="input-field"
              value={editThermalImageId}
              onChange={(event) => setEditThermalImageId(event.target.value)}
            >
              <option value="">열화상 이미지를 선택해 주세요</option>
              {mergedThermalCandidates.map((image) => (
                <option key={image.imageId} value={image.imageId}>
                  {`#${image.imageId} ${image.originalFilename}`}
                </option>
              ))}
            </select>
          </FormField>
          <div className="flex justify-end gap-3">
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => setIsPairEditModalOpen(false)}
            >
              취소
            </button>
            <button
              className="btn btn-primary"
              type="button"
              disabled={updateImagePairMutation.isPending}
              onClick={handleUpdatePair}
            >
              수정
            </button>
          </div>
        </div>
      </EntityModal>

      <PreviewModal
        isOpen={Boolean(previewImageId)}
        imageName={
          imageRows.find((image) => image.imageId === previewImageId)?.originalFilename ?? ''
        }
        previewUrl={previewQuery.data?.data.url}
        expiresAt={previewQuery.data?.data.expiresAt}
        isLoading={previewQuery.isLoading}
        error={previewQuery.isError ? getApiErrorMessage(previewQuery.error) : null}
        onClose={() => setPreviewImageId(null)}
      />

      <ConfirmModal
        isOpen={Boolean(selectedImage)}
        title="이미지 비활성화"
        description={
          selectedImage
            ? `${selectedImage.originalFilename} 이미지를 비활성화합니다.`
            : '선택한 이미지를 비활성화합니다.'
        }
        confirmText="비활성화"
        cancelText="취소"
        isConfirming={deactivateImageMutation.isPending}
        onConfirm={handleDeactivateImage}
        onCancel={() => setSelectedImage(null)}
      />

      <ConfirmModal
        isOpen={isPairDeactivateModalOpen}
        title="Pair 비활성화"
        description={
          currentPair
            ? `Pair #${currentPair.imagePairId}를 비활성화합니다.`
            : '현재 Pair를 비활성화합니다.'
        }
        confirmText="비활성화"
        cancelText="취소"
        isConfirming={deactivateImagePairMutation.isPending}
        onConfirm={handleDeactivatePair}
        onCancel={() => setIsPairDeactivateModalOpen(false)}
      />
    </section>
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

function PairImageCard({ title, image }: { title: string; image: ImageSummary }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="stack-sm">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
            {title}
          </div>
          <div className="mt-2 text-sm font-semibold text-slate-900">
            {image.originalFilename}
          </div>
        </div>
        <div className="inline-actions">
          <StatusBadge label={getImageTypeLabel(image.imageType)} />
          <StatusBadge
            label={getResourceStatusLabel(image.status)}
            tone={getResourceStatusTone(image.status)}
          />
        </div>
        <div className="text-sm text-slate-600">
          {`imageId ${image.imageId} · ${getTargetTypeLabel(image.targetType)} · 장비 ${image.equipmentId ?? '-'}`}
        </div>
      </div>
    </div>
  )
}

function mergeCandidateImages(
  pinnedImage?: ImageSummary | null,
  images?: ImageSummary[],
) {
  const imageMap = new Map<number, ImageSummary>()

  if (pinnedImage) {
    imageMap.set(pinnedImage.imageId, pinnedImage)
  }

  for (const image of images ?? []) {
    imageMap.set(image.imageId, image)
  }

  return [...imageMap.values()]
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

function PreviewModal({
  isOpen,
  imageName,
  previewUrl,
  expiresAt,
  isLoading,
  error,
  onClose,
}: {
  isOpen: boolean
  imageName: string
  previewUrl?: string
  expiresAt?: string
  isLoading: boolean
  error: string | null
  onClose: () => void
}) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="w-full max-w-4xl rounded-[1.75rem] bg-white p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="toolbar">
          <div>
            <h2 className="panel-title">이미지 미리보기</h2>
            <p className="panel-description">
              {imageName}
              {expiresAt ? ` · 만료 ${formatDateTime(expiresAt)}` : ''}
            </p>
          </div>
          <button className="btn btn-secondary" type="button" onClick={onClose}>
            닫기
          </button>
        </div>
        <div className="mt-6">
          {isLoading ? <LoadingState message="미리보기 URL을 불러오는 중입니다." /> : null}
          {error ? (
            <ErrorState title="이미지 미리보기를 불러오지 못했습니다." description={error} />
          ) : null}
          {!isLoading && !error && previewUrl ? (
            <div className="space-y-4">
              <img
                className="max-h-[70vh] w-full rounded-3xl border border-slate-200 bg-slate-50 object-contain"
                src={previewUrl}
                alt={imageName || '점검 이미지 미리보기'}
              />
              <div className="text-sm text-slate-500">
                preview API가 반환한 URL을 그대로 사용해 브라우저에서 이미지를 표시합니다.
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}
