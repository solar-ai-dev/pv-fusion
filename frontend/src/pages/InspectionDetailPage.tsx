import type { ChangeEvent, ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import {
  useAnalysisJob,
  useAnalysisJobs,
  useCreateAnalysisJob,
  useRetryAnalysisJob,
} from '../features/analysisJobs/hooks/useAnalysisJobs'
import type {
  AnalysisJobSummary,
  AnalysisJobStatus,
} from '../features/analysisJobs/types'
import { useEquipments } from '../features/equipments/hooks/useEquipments'
import { flattenEquipmentTree } from '../features/equipments/types'
import {
  IMAGE_TYPE_OPTIONS,
  TARGET_TYPE_OPTIONS,
  getImageTypeLabel,
  getTargetTypeLabel,
  getUploadStatusLabel,
  getUploadStatusTone,
  type ImageSummary,
  type ImageType,
} from '../features/images/types'
import {
  useDeleteImage,
  useImageDeleteImpact,
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
  useDeleteInspection,
  useInspectionDeleteImpact,
  useInspection,
  useUpdateInspection,
} from '../features/inspections/hooks/useInspections'
import { usePlant } from '../features/plants/hooks/usePlants'
import {
  getActionCandidateLabel,
  getResultStatusLabel,
  getResultStatusTone,
  getReviewStatusLabel,
  getReviewStatusTone,
  getSeverityLevelLabel,
  getSeverityLevelTone,
  type AnalysisResultSummary,
} from '../features/results/types'
import { useResults } from '../features/results/hooks/useResults'
import { useZone } from '../features/zones/hooks/useZones'
import { ConfirmModal } from '../shared/components/feedback/ConfirmModal'
import { DeleteImpactSummary } from '../shared/components/feedback/DeleteImpactSummary'
import { FormField } from '../shared/components/form/FormField'
import { PageHeader } from '../shared/components/layout/PageHeader'
import { EmptyState } from '../shared/components/state/EmptyState'
import { ErrorState } from '../shared/components/state/ErrorState'
import { LoadingState } from '../shared/components/state/LoadingState'
import { StatusBadge, type StatusBadgeTone } from '../shared/components/state/StatusBadge'
import { useToast } from '../shared/hooks/useToast'
import {
  formatDateTime,
  formatFileSize,
  getApiErrorCode,
  getApiErrorMessage,
  isActiveResource,
  isRunningAnalysisJob,
  parsePositiveNumber,
  toDateTimeLocalInputValue,
  toOffsetDateTime,
} from '../shared/utils'

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
      '업로드할 이미지를 선택해 주세요.',
    ),
  })
  .superRefine((value, context) => {
    const selectedFile = value.file?.item(0)

    if (!selectedFile) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['file'],
        message: '업로드할 이미지를 선택해 주세요.',
      })
    }

    if (value.targetType === 'ZONE' && value.equipmentId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['equipmentId'],
        message: '구역 단위 업로드에는 설비 위치를 선택하지 않습니다.',
      })
    }

    if (value.targetType !== 'ZONE' && !value.equipmentId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['equipmentId'],
        message: '어레이, 패널, 모듈 업로드에는 설비 위치가 필요합니다.',
      })
    }
  })

type UpdateInspectionFormValues = z.infer<typeof updateInspectionSchema>
type UploadImageFormValues = z.infer<typeof uploadImageSchema>
type WorkflowTab = 'overview' | 'images-analysis' | 'results'
type UploadFeedback = {
  filename: string
  status: 'uploading' | 'success' | 'error'
  error?: string
}
type SelectedUploadFile = {
  id: string
  file: File
  previewUrl: string
}
type ImageJobState = {
  hasActiveJob: boolean
  latestJob: AnalysisJobSummary | null
  latestSucceededJob: AnalysisJobSummary | null
  latestFailedJob: AnalysisJobSummary | null
  canRetry: boolean
}

const WORKFLOW_TABS: Array<{ id: WorkflowTab; label: string }> = [
  { id: 'overview', label: '개요' },
  { id: 'images-analysis', label: '이미지·분석' },
  { id: 'results', label: '결과' },
]
const UPLOAD_FILES_PAGE_SIZE = 5
const IMAGE_LIST_PAGE_SIZE = 5

export function InspectionDetailPage() {
  const params = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const inspectionId = parsePositiveNumber(params.inspectionId)

  const [activeTab, setActiveTab] = useState<WorkflowTab>('overview')
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteInspectionModalOpen, setIsDeleteInspectionModalOpen] = useState(false)
  const [isMoreActionsOpen, setIsMoreActionsOpen] = useState(false)
  const [previewImageId, setPreviewImageId] = useState<number | null>(null)
  const [imageToDelete, setImageToDelete] = useState<ImageSummary | null>(null)
  const [expandedFailureJobId, setExpandedFailureJobId] = useState<number | null>(null)
  const [uploadFormVersion, setUploadFormVersion] = useState(0)
  const [uploadFeedbackList, setUploadFeedbackList] = useState<UploadFeedback[]>([])
  const [pendingAnalysisImageId, setPendingAnalysisImageId] = useState<number | null>(null)
  const [pendingRetryJobId, setPendingRetryJobId] = useState<number | null>(null)
  const [selectedUploadFiles, setSelectedUploadFiles] = useState<SelectedUploadFile[]>([])
  const [selectedPreviewFileId, setSelectedPreviewFileId] = useState<string | null>(null)
  const [selectedFilesPage, setSelectedFilesPage] = useState(1)
  const [imageListPage, setImageListPage] = useState(1)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!isMoreActionsOpen) {
      return
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.more-actions-wrapper')) {
        setIsMoreActionsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMoreActionsOpen])

  const inspectionQuery = useInspection(inspectionId ?? 0)
  const zoneId = inspectionQuery.data?.data.zoneId ?? 0
  const zoneQuery = useZone(zoneId)
  const plantQuery = usePlant(zoneQuery.data?.data.plantId ?? 0)
  const equipmentsQuery = useEquipments(zoneId, {})
  const imagesQuery = useImages({ inspectionId: inspectionId ?? undefined })
  const resultsQuery = useResults(
    { inspectionId: inspectionId ?? undefined, page: 0, size: 100 },
    Boolean(inspectionId),
  )
  const analysisJobsQuery = useAnalysisJobs(
    { inspectionId: inspectionId ?? undefined, page: 0, size: 100 },
    Boolean(inspectionId),
  )
  const failureJobQuery = useAnalysisJob(expandedFailureJobId ?? 0, Boolean(expandedFailureJobId))
  const previewQuery = useImagePreview(previewImageId ?? 0, Boolean(previewImageId))
  const updateInspectionMutation = useUpdateInspection(inspectionId ?? 0)
  const deleteInspectionMutation = useDeleteInspection(inspectionId ?? 0)
  const uploadImageMutation = useUploadImage(inspectionId ?? 0)
  const deleteImageMutation = useDeleteImage(inspectionId ?? 0)
  const createAnalysisJobMutation = useCreateAnalysisJob()
  const retryAnalysisJobMutation = useRetryAnalysisJob()
  const inspectionDeleteImpactQuery = useInspectionDeleteImpact(
    inspectionId ?? 0,
    isDeleteInspectionModalOpen,
  )
  const imageDeleteImpactQuery = useImageDeleteImpact(
    imageToDelete?.imageId ?? 0,
    Boolean(imageToDelete),
  )

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

  const selectedTargetType = uploadForm.watch('targetType')
  const selectedImageType = uploadForm.watch('imageType')
  const selectedEquipmentId = uploadForm.watch('equipmentId')
  const selectedFileCount = selectedUploadFiles.length
  const selectedPreviewFile = useMemo(
    () =>
      selectedUploadFiles.find((file) => file.id === selectedPreviewFileId) ??
      selectedUploadFiles[0] ??
      null,
    [selectedPreviewFileId, selectedUploadFiles],
  )

  const selectedUploadFilesRef = useRef<SelectedUploadFile[]>([])

  useEffect(() => {
    selectedUploadFilesRef.current = selectedUploadFiles
  }, [selectedUploadFiles])

  useEffect(() => {
    return () => {
      selectedUploadFilesRef.current.forEach((file) => URL.revokeObjectURL(file.previewUrl))
    }
  }, [])

  const flattenedEquipments = useMemo(
    () => flattenEquipmentTree(equipmentsQuery.data?.data ?? []),
    [equipmentsQuery.data],
  )
  const isZoneUploadTarget = selectedTargetType === 'ZONE'
  const uploadEquipmentOptions = useMemo(
    () =>
      isZoneUploadTarget
        ? []
        : flattenedEquipments.filter(
            (equipment) => equipment.equipmentType === selectedTargetType,
          ),
    [flattenedEquipments, isZoneUploadTarget, selectedTargetType],
  )
  const isUploadEquipmentEmpty =
    !isZoneUploadTarget &&
    !equipmentsQuery.isLoading &&
    !equipmentsQuery.isError &&
    uploadEquipmentOptions.length === 0
  const isUploadEquipmentMissing =
    !isZoneUploadTarget && (!selectedEquipmentId || isUploadEquipmentEmpty)
  const isUploadReady = selectedFileCount > 0 && !isUploadEquipmentMissing

  const imageRows = useMemo(
    () => sortImagesDescending(imagesQuery.data?.data ?? []),
    [imagesQuery.data],
  )
  const paginatedImageRows = useMemo(
    () =>
      paginateItems(imageRows, imageListPage, IMAGE_LIST_PAGE_SIZE),
    [imageRows, imageListPage],
  )
  const jobRows = useMemo(
    () => sortJobsDescending(analysisJobsQuery.data?.data.content ?? []),
    [analysisJobsQuery.data],
  )
  const resultRows = useMemo(
    () => sortResultsDescending(resultsQuery.data?.data.content ?? []),
    [resultsQuery.data],
  )
  const jobResultMap = useMemo(() => {
    const map = new Map<number, AnalysisResultSummary>()
    for (const result of resultRows) {
      map.set(result.jobId, result)
    }
    return map
  }, [resultRows])
  const imageJobStateMap = useMemo(() => computeImageJobStateMap(jobRows), [jobRows])
  const latestResult = resultRows[0] ?? null
  const queuedJobs = useMemo(
    () => jobRows.filter((job) => job.jobStatus === 'QUEUED'),
    [jobRows],
  )
  const runningJobs = useMemo(
    () => jobRows.filter((job) => job.jobStatus === 'RUNNING'),
    [jobRows],
  )
  const completedJobs = useMemo(
    () => jobRows.filter((job) => job.jobStatus === 'SUCCEEDED'),
    [jobRows],
  )
  const failedJobs = useMemo(
    () => jobRows.filter((job) => job.jobStatus === 'FAILED'),
    [jobRows],
  )
  const rgbImages = useMemo(
    () => imageRows.filter((image) => image.imageType === 'RGB'),
    [imageRows],
  )
  const thermalImages = useMemo(
    () => imageRows.filter((image) => image.imageType === 'THERMAL'),
    [imageRows],
  )
  const paginatedSelectedUploadFiles = useMemo(
    () =>
      paginateItems(selectedUploadFiles, selectedFilesPage, UPLOAD_FILES_PAGE_SIZE),
    [selectedUploadFiles, selectedFilesPage],
  )
  const firstRetryableFailureJob = useMemo(
    () =>
      failedJobs.find(
        (job) => job.imageId != null && imageJobStateMap.get(job.imageId)?.canRetry,
      ) ?? null,
    [failedJobs, imageJobStateMap],
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
    const uploadPageCount = Math.max(1, Math.ceil(selectedUploadFiles.length / UPLOAD_FILES_PAGE_SIZE))
    if (selectedFilesPage > uploadPageCount) {
      setSelectedFilesPage(uploadPageCount)
    }
  }, [selectedFilesPage, selectedUploadFiles.length])

  useEffect(() => {
    const imagePageCount = Math.max(1, Math.ceil(imageRows.length / IMAGE_LIST_PAGE_SIZE))
    if (imageListPage > imagePageCount) {
      setImageListPage(imagePageCount)
    }
  }, [imageListPage, imageRows.length])

  if (!inspectionId) {
    return (
      <ErrorState
        title="올바르지 않은 점검 정보입니다."
        description="주소의 점검 ID를 다시 확인해 주세요."
      />
    )
  }

  if (inspectionQuery.isLoading && !inspectionQuery.data) {
    return <LoadingState message="점검 정보를 불러오는 중입니다." />
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
  const fileField = uploadForm.register('file')

  const syncUploadFormFiles = (files: File[]) => {
    const dataTransfer = new DataTransfer()
    files.forEach((file) => dataTransfer.items.add(file))
    uploadForm.setValue('file', dataTransfer.files, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })
  }

  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSelectUploadFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])

    selectedUploadFiles.forEach((file) => URL.revokeObjectURL(file.previewUrl))

    const nextFiles = files.map((file, index) => ({
      id:
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${file.name}-${file.size}-${file.lastModified}-${index}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }))

    setSelectedUploadFiles(nextFiles)
    setSelectedPreviewFileId(nextFiles[0]?.id ?? null)
    setSelectedFilesPage(1)
    setUploadFeedbackList([])
    syncUploadFormFiles(files)
    uploadForm.clearErrors('file')
    event.currentTarget.value = ''
  }

  const handleRemoveSelectedFile = (targetId: string) => {
    setSelectedUploadFiles((current) => {
      const target = current.find((file) => file.id === targetId)
      if (target) {
        URL.revokeObjectURL(target.previewUrl)
      }
      const nextFiles = current.filter((file) => file.id !== targetId)
      setSelectedPreviewFileId((currentPreviewId) => {
        if (currentPreviewId !== targetId) {
          return currentPreviewId
        }
        return nextFiles[0]?.id ?? null
      })
      syncUploadFormFiles(nextFiles.map((file) => file.file))
      return nextFiles
    })
    uploadForm.clearErrors('file')
  }

  const handleClearSelectedFiles = () => {
    selectedUploadFiles.forEach((file) => URL.revokeObjectURL(file.previewUrl))
    setSelectedUploadFiles([])
    setSelectedPreviewFileId(null)
    setSelectedFilesPage(1)
    setUploadFeedbackList([])
    uploadForm.setValue('file', undefined, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })
    resetFileInput()
    uploadForm.clearErrors('file')
  }

  const handleRefreshWorkspace = async () => {
    await Promise.all([
      imagesQuery.refetch(),
      analysisJobsQuery.refetch(),
      resultsQuery.refetch(),
      expandedFailureJobId ? failureJobQuery.refetch() : Promise.resolve(),
    ])
  }

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
      toast.push(response.message || '점검 정보가 수정되었습니다.')
      setIsEditModalOpen(false)
    } catch (error) {
      toast.push(getApiErrorMessage(error, '점검 정보 수정에 실패했습니다.'))
    }
  })

  const handleUploadImage = uploadForm.handleSubmit(async (values) => {
    if (selectedUploadFiles.length === 0) {
      uploadForm.setError('file', {
        type: 'manual',
        message: '업로드할 이미지를 선택해 주세요.',
      })
      return
    }

    const files = selectedUploadFiles.map((item) => item.file)
    setUploadFeedbackList(
      files.map((file) => ({
        filename: file.name,
        status: 'uploading',
      })),
    )

    let successCount = 0
    let failureCount = 0

    for (const file of files) {
      try {
        await uploadImageMutation.mutateAsync({
          inspectionId,
          equipmentId: values.targetType === 'ZONE' ? null : Number(values.equipmentId),
          targetType: values.targetType,
          imageType: values.imageType,
          capturedAt: toOffsetDateTime(values.capturedAt),
          memo: values.memo?.trim() || null,
          file,
        })

        successCount += 1
        setUploadFeedbackList((current) =>
          current.map((item) =>
            item.filename === file.name && item.status === 'uploading'
              ? { ...item, status: 'success' }
              : item,
          ),
        )
      } catch (error) {
        const message = getApiErrorMessage(error, '이미지 업로드에 실패했습니다.')
        failureCount += 1
        setUploadFeedbackList((current) =>
          current.map((item) =>
            item.filename === file.name && item.status === 'uploading'
              ? { ...item, status: 'error', error: message }
              : item,
          ),
        )
      }
    }

    toast.push(
      failureCount > 0
        ? `${successCount}건 업로드 완료, ${failureCount}건 실패`
        : `${successCount}건 업로드가 완료되었습니다.`,
    )

    uploadForm.reset({
      targetType: 'ZONE',
      equipmentId: '',
      imageType: values.imageType,
      capturedAt: '',
      memo: '',
      file: undefined,
    })
    selectedUploadFiles.forEach((file) => URL.revokeObjectURL(file.previewUrl))
    setSelectedUploadFiles([])
    setSelectedPreviewFileId(null)
    setSelectedFilesPage(1)
    setUploadFormVersion((current) => current + 1)
    uploadForm.setValue('file', undefined)
    resetFileInput()
    setActiveTab('images-analysis')
    await handleRefreshWorkspace()
  })

  const handleRequestAnalysis = async (image: ImageSummary) => {
    setPendingAnalysisImageId(image.imageId)

    try {
      const response = await createAnalysisJobMutation.mutateAsync({ imageId: image.imageId })
      toast.push(response.message || 'AI 분석 요청을 등록했습니다.')
      setExpandedFailureJobId(response.data.jobId)
      await handleRefreshWorkspace()
    } catch (error) {
      if (getApiErrorCode(error) === 'ANALYSIS_JOB_ALREADY_RUNNING') {
        toast.push('이미 분석이 진행 중인 이미지입니다.')
        await handleRefreshWorkspace()
      } else {
        toast.push(getApiErrorMessage(error, '분석 요청에 실패했습니다.'))
      }
    } finally {
      setPendingAnalysisImageId(null)
    }
  }

  const handleRetryJob = async (job: AnalysisJobSummary) => {
    setPendingRetryJobId(job.jobId)
    setExpandedFailureJobId(job.jobId)

    try {
      const response = await retryAnalysisJobMutation.mutateAsync({ jobId: job.jobId })
      toast.push(response.message || '다시 분석 요청을 등록했습니다.')
      setExpandedFailureJobId(response.data.jobId)
      await handleRefreshWorkspace()
    } catch (error) {
      if (getApiErrorCode(error) === 'ANALYSIS_JOB_ALREADY_RUNNING') {
        toast.push('이미 분석이 진행 중인 이미지입니다.')
        await handleRefreshWorkspace()
      } else {
        toast.push(getApiErrorMessage(error, '재요청에 실패했습니다.'))
      }
    } finally {
      setPendingRetryJobId(null)
    }
  }

  const handleDeleteImage = async () => {
    if (!imageToDelete) {
      return
    }

    if (!imageDeleteImpactQuery.data?.data) {
      toast.push('삭제 영향 범위를 다시 불러온 뒤 시도해 주세요.')
      return
    }

    try {
      await deleteImageMutation.mutateAsync(imageToDelete.imageId)
      toast.push('이미지를 삭제했습니다.')
      setImageToDelete(null)
      await handleRefreshWorkspace()
    } catch (error) {
      toast.push(getApiErrorMessage(error, '이미지 삭제에 실패했습니다.'))
    }
  }

  const handleDeleteInspection = async () => {
    if (!inspectionDeleteImpactQuery.data?.data) {
      toast.push('삭제 영향 범위를 다시 불러온 뒤 시도해 주세요.')
      return
    }

    try {
      await deleteInspectionMutation.mutateAsync()
      toast.push('점검을 삭제했습니다.')
      setIsDeleteInspectionModalOpen(false)
      navigate('/inspections')
    } catch (error) {
      toast.push(getApiErrorMessage(error, '점검 삭제에 실패했습니다.'))
    }
  }

  const openUploadTab = () => {
    setActiveTab('images-analysis')
    window.requestAnimationFrame(() => {
      document.getElementById('inspection-upload-form')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })
  }

  const openFailureDetail = (jobId: number) => {
    setExpandedFailureJobId((current) => (current === jobId ? null : jobId))
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="점검 상세"
        actions={
          <div className="page-actions">
            <button className="btn btn-secondary" type="button" onClick={openUploadTab}>
              이미지 업로드
            </button>
            {latestResult ? (
              <Link className="btn btn-primary" to={`/results/${latestResult.resultId}`}>
                결과 보기
              </Link>
            ) : null}
            <Link className="btn btn-secondary" to="/inspections">
              목록으로
            </Link>
            <div className="more-actions-wrapper">
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => setIsMoreActionsOpen((current) => !current)}
              >
                더보기
              </button>
              {isMoreActionsOpen ? (
                <div className="more-actions-menu">
                  <button
                    className="more-actions-item"
                    type="button"
                    onClick={() => {
                      setIsEditModalOpen(true)
                      setIsMoreActionsOpen(false)
                    }}
                  >
                    점검 수정
                  </button>
                  <Link
                    className="more-actions-item"
                    to={`/zones/${inspection.zoneId}`}
                    onClick={() => setIsMoreActionsOpen(false)}
                  >
                    구역 상세
                  </Link>
                  {zoneQuery.data ? (
                    <Link
                      className="more-actions-item"
                      to={`/plants/${zoneQuery.data.data.plantId}`}
                      onClick={() => setIsMoreActionsOpen(false)}
                    >
                      발전소 상세
                    </Link>
                  ) : null}
                  <div className="more-actions-divider" />
                  <button
                    className="more-actions-item more-actions-item--danger"
                    type="button"
                    onClick={() => {
                      setIsDeleteInspectionModalOpen(true)
                      setIsMoreActionsOpen(false)
                    }}
                  >
                    점검 삭제
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        }
      />

      <section className="panel inspection-hero">
        <div className="inspection-hero-main">
          <div className="inspection-hero-copy">
            <h2 className="inspection-hero-title">{inspection.name}</h2>
            <p className="inspection-hero-description">
              {plantQuery.data?.data.name || '발전소 정보 확인 중'} ·{' '}
              {zoneQuery.data?.data.name || '구역 정보 확인 중'}
            </p>
            <div className="inspection-hero-badges">
              <StatusBadge
                label={getInspectionStatusLabel(inspection.inspectionStatus)}
                tone={getInspectionStatusTone(inspection.inspectionStatus)}
              />
              <StatusBadge
                label={firstRetryableFailureJob ? '재확인 필요' : '흐름 정상'}
                tone={firstRetryableFailureJob ? 'warning' : 'success'}
              />
            </div>
          </div>
          <div className="inspection-summary-grid">
            <SummaryMetric label="촬영 시각" value={formatDateTime(inspection.capturedAt)} />
            <SummaryMetric
              label="촬영 방식"
              value={getCaptureMethodLabel(inspection.captureMethod)}
            />
            <SummaryMetric label="이미지 수" value={`${imageRows.length}건`} />
            <SummaryMetric label="분석 요청 수" value={`${jobRows.length}건`} />
            <SummaryMetric label="완료 결과 수" value={`${resultRows.length}건`} />
            <SummaryMetric label="실패 수" value={`${failedJobs.length}건`} tone="danger" />
          </div>
        </div>
      </section>

      <section className="panel stack-md">
        <div className="tab-strip">
          {WORKFLOW_TABS.map((tab) => (
            <button
              key={tab.id}
              className={`tab-button workflow-tab ${activeTab === tab.id ? 'workflow-tab-active' : ''}`}
              type="button"
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' ? (
          <div className="inspection-tab-stack">
            <div className="inspection-overview-grid">
              <article className="inspection-overview-card">
                <div className="inspection-card-label">점검 요약</div>
                <h3 className="inspection-card-title">
                  {inspection.name}
                </h3>
                <p className="inspection-card-description">
                  선택한 이미지는 각각 독립 이미지로 업로드됩니다. 분석 요청은 업로드된 이미지
                  한 건 기준으로 생성되며 RGB와 열화상 이미지는 서로 독립적으로 관리됩니다.
                </p>
                <div className="inspection-overview-list">
                  <OverviewRow label="RGB 이미지" value={`${rgbImages.length}건`} badge={<StatusBadge label="RGB" tone="sky" />} />
                  <OverviewRow label="열화상 이미지" value={`${thermalImages.length}건`} badge={<StatusBadge label="THERMAL" tone="orange" />} />
                  <OverviewRow
                    label="최근 결과"
                    value={latestResult ? `#${latestResult.resultId}` : '없음'}
                    badge={
                      latestResult ? (
                        <StatusBadge
                          label={getResultStatusLabel(latestResult.resultStatus)}
                          tone={getResultStatusTone(latestResult.resultStatus)}
                        />
                      ) : (
                        <StatusBadge label="대기" tone="slate" />
                      )
                    }
                  />
                </div>
              </article>
              <article className="inspection-overview-card">
                <div className="inspection-card-label">분석 현황</div>
                <div className="inspection-overview-list">
                  <OverviewRow
                    label="대기 중"
                    value={`${queuedJobs.length}건`}
                    badge={<StatusBadge label="QUEUED" tone="amber" />}
                  />
                  <OverviewRow
                    label="분석 중"
                    value={`${runningJobs.length}건`}
                    badge={<StatusBadge label="RUNNING" tone="sky" />}
                  />
                  <OverviewRow
                    label="분석 완료"
                    value={`${completedJobs.length}건`}
                    badge={<StatusBadge label="SUCCEEDED" tone="emerald" />}
                  />
                  <OverviewRow
                    label="분석 실패"
                    value={`${failedJobs.length}건`}
                    badge={<StatusBadge label="FAILED" tone="orange" />}
                  />
                </div>
              </article>
            </div>

            {firstRetryableFailureJob ? (
              <div className="inspection-alert inspection-alert-warning">
                <div>
                  <div className="inspection-alert-title">실패한 분석 요청이 있습니다.</div>
                  <p className="inspection-alert-description">
                    이미지·분석 탭에서 실패 사유를 확인하고 다시 분석 요청 또는 재업로드를
                    진행해 주세요.
                  </p>
                </div>
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => {
                    setActiveTab('images-analysis')
                    openFailureDetail(firstRetryableFailureJob.jobId)
                  }}
                >
                  실패 사유 보기
                </button>
              </div>
            ) : null}

            <div className="detail-grid">
              <DetailItem label="점검명" value={inspection.name} />
              <DetailItem label="발전소" value={plantQuery.data?.data.name || '-'} />
              <DetailItem label="구역" value={zoneQuery.data?.data.name || '-'} />
              <DetailItem label="촬영 시각" value={formatDateTime(inspection.capturedAt)} />
              <DetailItem
                label="촬영 방식"
                value={getCaptureMethodLabel(inspection.captureMethod)}
              />
              <DetailItem label="점검 상태" value={getInspectionStatusLabel(inspection.inspectionStatus)} />
              <DetailItem label="점검자" value={inspection.inspectorName || '-'} />
              <DetailItem label="메모" value={inspection.memo || '-'} />
            </div>
          </div>
        ) : null}

        {activeTab === 'images-analysis' ? (
          <div className="inspection-tab-stack">
            <section id="inspection-upload-form" className="inspection-upload-panel">
              <div className="section-header">
                <div>
                  <h3 className="panel-title">이미지 업로드</h3>
                  <p className="panel-description">
                    RGB 또는 열화상 이미지를 선택해 업로드합니다. 업로드된 이미지는 각각
                    독립적인 분석 대상으로 관리되며, 분석 요청은 이미지 한 건 기준으로
                    생성됩니다.
                  </p>
                </div>
              </div>

              <form className="inspection-upload-form" onSubmit={handleUploadImage}>
                <div className="inspection-upload-type-row">
                  <button
                    className={`inspection-type-chip ${selectedImageType === 'RGB' ? 'inspection-type-chip-active inspection-type-chip-rgb' : ''}`}
                    type="button"
                    onClick={() => uploadForm.setValue('imageType', 'RGB')}
                  >
                    RGB
                    <span>{rgbImages.length}건</span>
                  </button>
                  <button
                    className={`inspection-type-chip ${selectedImageType === 'THERMAL' ? 'inspection-type-chip-active inspection-type-chip-thermal' : ''}`}
                    type="button"
                    onClick={() => uploadForm.setValue('imageType', 'THERMAL')}
                  >
                    열화상
                    <span>{thermalImages.length}건</span>
                  </button>
                </div>

                <div className="inspection-upload-grid">
                  <FormField
                    label="이미지 파일"
                    hint="선택한 이미지는 각각 독립 이미지로 업로드됩니다."
                    error={uploadForm.formState.errors.file?.message}
                  >
                    <input
                      key={uploadFormVersion}
                      className="input-field"
                      type="file"
                      accept="image/*"
                      multiple
                      {...fileField}
                      ref={(element) => {
                        fileField.ref(element)
                        fileInputRef.current = element
                      }}
                      onChange={handleSelectUploadFiles}
                    />
                  </FormField>
                  <FormField
                    label="검사 대상 단위"
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
                    label="검사 대상 위치"
                    hint={
                      isZoneUploadTarget
                        ? '구역 단위 업로드에서는 선택하지 않습니다.'
                        : '어레이, 패널, 모듈 업로드에서 사용합니다.'
                    }
                    error={uploadForm.formState.errors.equipmentId?.message}
                  >
                    <select
                      className="input-field"
                      {...uploadForm.register('equipmentId')}
                      disabled={isZoneUploadTarget || isUploadEquipmentEmpty}
                    >
                      <option value="">
                        {isZoneUploadTarget ? '설비 위치 없음' : '설비 위치를 선택해 주세요.'}
                      </option>
                      {uploadEquipmentOptions.map((equipment) => (
                        <option key={equipment.equipmentId} value={equipment.equipmentId}>
                          {`${'· '.repeat(equipment.depth)}${equipment.name}`}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField
                    label="촬영 시각"
                    error={uploadForm.formState.errors.capturedAt?.message}
                  >
                    <input
                      className="input-field"
                      type="datetime-local"
                      {...uploadForm.register('capturedAt')}
                    />
                  </FormField>
                </div>

                <FormField label="메모" error={uploadForm.formState.errors.memo?.message}>
                  <textarea className="input-field textarea-field" {...uploadForm.register('memo')} />
                </FormField>

                <div className="inspection-upload-meta-note">
                  <strong>공통 메타데이터 안내</strong>
                  <span>아래 입력값은 선택한 모든 파일에 공통 적용됩니다.</span>
                  <span>
                    업로드된 이미지는 각각 독립 이미지로 저장되며, 분석 요청은 이미지 한 건
                    기준으로 진행됩니다.
                  </span>
                </div>

                <div className="inspection-upload-preview">
                  <div className="inspection-upload-preview-card inspection-upload-preview-card-list">
                    <div className="inspection-upload-preview-header">
                      <div>
                        <div className="inspection-card-label">선택 파일</div>
                        <div className="inspection-upload-selection-count">
                          선택한 파일 {selectedFileCount}개
                        </div>
                      </div>
                      {selectedFileCount > 0 ? (
                        <button className="text-button" type="button" onClick={handleClearSelectedFiles}>
                          전체 제거
                        </button>
                      ) : null}
                    </div>
                    {selectedUploadFiles.length > 0 ? (
                      <div className="inspection-selected-file-list">
                        {paginatedSelectedUploadFiles.items.map((selectedFile, index) => (
                          <div
                            key={selectedFile.id}
                            className={`inspection-selected-file-item ${selectedPreviewFile?.id === selectedFile.id ? 'inspection-selected-file-item-selected' : ''}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => setSelectedPreviewFileId(selectedFile.id)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault()
                                setSelectedPreviewFileId(selectedFile.id)
                              }
                            }}
                          >
                            <span className="inspection-selected-file-order">
                              {(paginatedSelectedUploadFiles.page - 1) * UPLOAD_FILES_PAGE_SIZE + index + 1}
                            </span>
                            <span className="inspection-selected-file-name" title={selectedFile.file.name}>
                              {selectedFile.file.name}
                            </span>
                            <span className="inspection-selected-file-size">
                              {formatFileSize(selectedFile.file.size)}
                            </span>
                            <button
                              className="text-button inspection-selected-file-remove"
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()
                                handleRemoveSelectedFile(selectedFile.id)
                              }}
                            >
                              제거
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="inspection-upload-empty-copy">
                        선택한 파일이 여기에 표시됩니다.
                      </div>
                    )}
                  </div>
                  {paginatedSelectedUploadFiles.totalPages > 1 ? (
                    <PaginationControls
                      page={paginatedSelectedUploadFiles.page}
                      totalPages={paginatedSelectedUploadFiles.totalPages}
                      onPrevious={() => setSelectedFilesPage((current) => Math.max(1, current - 1))}
                      onNext={() =>
                        setSelectedFilesPage((current) =>
                          Math.min(paginatedSelectedUploadFiles.totalPages, current + 1),
                        )
                      }
                    />
                  ) : null}
                  <div className="inspection-upload-preview-card">
                    <div className="inspection-card-label">선택한 파일 미리보기</div>
                    <div className="inspection-upload-preview-caption">
                      목록에서 선택한 이미지가 표시됩니다.
                    </div>
                    {selectedPreviewFile ? (
                      <>
                        <div
                          className="inspection-upload-preview-filename"
                          title={selectedPreviewFile.file.name}
                        >
                          {selectedPreviewFile.file.name}
                        </div>
                        <img
                          className="inspection-upload-preview-image"
                          src={selectedPreviewFile.previewUrl}
                          alt={selectedPreviewFile.file.name || '업로드 이미지 미리보기'}
                        />
                      </>
                    ) : (
                      <div className="image-placeholder inspection-upload-placeholder">
                        선택한 파일 미리보기가 여기에 표시됩니다.
                      </div>
                    )}
                  </div>
                </div>

                {isUploadEquipmentEmpty ? (
                  <div className="inspection-inline-note">
                    선택한 대상 단위에 등록된 설비 위치가 없습니다. 구역 전체 이미지는 대상
                    단위를 ZONE으로 선택하고, Array/Panel/Module 단위 이미지는 설비 구조를
                    먼저 등록한 뒤 위치를 선택해 주세요.
                  </div>
                ) : null}

                {uploadFeedbackList.length > 0 ? (
                  <div className="inspection-upload-feedback-panel">
                    <div className="inspection-upload-feedback-summary">
                      업로드 결과 · 성공 {uploadFeedbackList.filter((item) => item.status === 'success').length}
                      / 실패 {uploadFeedbackList.filter((item) => item.status === 'error').length}
                    </div>
                    <div className="inspection-upload-feedback-list">
                    {uploadFeedbackList.map((uploadFeedback) => (
                      <div
                        key={`${uploadFeedback.filename}-${uploadFeedback.status}`}
                        className={`inspection-upload-status inspection-upload-status-${uploadFeedback.status}`}
                      >
                        <strong>{uploadFeedback.filename}</strong>
                        <span>
                          {uploadFeedback.status === 'uploading' && '업로드 중입니다.'}
                          {uploadFeedback.status === 'success' && '업로드가 완료되었습니다.'}
                          {uploadFeedback.status === 'error' &&
                            (uploadFeedback.error || '업로드에 실패했습니다.')}
                        </span>
                      </div>
                    ))}
                  </div>
                  </div>
                ) : null}

                <div className="inspection-upload-actions">
                  <div className="inspection-upload-action-copy">
                    {!isZoneUploadTarget && !selectedEquipmentId && !isUploadEquipmentEmpty
                      ? 'Array/Panel/Module 업로드에는 설비 위치 선택이 필요합니다.'
                      : '선택한 파일은 파일별로 개별 업로드됩니다.'}
                  </div>
                  <button
                    className="btn btn-primary"
                    type="submit"
                    disabled={uploadImageMutation.isPending || !isUploadReady}
                  >
                    {uploadImageMutation.isPending ? '업로드 중...' : '이미지 업로드'}
                  </button>
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => void handleRefreshWorkspace()}
                  >
                    상태 새로고침
                  </button>
                </div>
              </form>
            </section>

            <section className="stack-md">
              <div className="section-header">
                <div>
                  <h3 className="panel-title">이미지 목록 및 분석 상태</h3>
                  <p className="panel-description">
                    이미지별 분석 요청, 실패 사유 확인, 결과 상세 이동을 한 화면에서 처리합니다.
                  </p>
                </div>
                <div className="inspection-image-summary-chips">
                  <StatusBadge label={`RGB ${rgbImages.length}건`} tone="sky" />
                  <StatusBadge label={`열화상 ${thermalImages.length}건`} tone="orange" />
                  <StatusBadge label={`실패 ${failedJobs.length}건`} tone="danger" />
                </div>
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

              {!imagesQuery.isLoading && !imagesQuery.isError && imageRows.length === 0 ? (
                <EmptyState
                  title="등록된 이미지가 없습니다."
                  description="이미지를 먼저 업로드하면 이 영역에서 분석 요청과 상태 확인을 이어서 진행할 수 있습니다."
                  action={
                    <button className="btn btn-primary" type="button" onClick={openUploadTab}>
                      업로드 영역으로 이동
                    </button>
                  }
                />
              ) : null}

              {imageRows.length > 0 ? (
                <div className="inspection-image-card-list">
                  {paginatedImageRows.items.map((image) => {
                    const imageState = imageJobStateMap.get(image.imageId) ?? createEmptyImageJobState()
                    const latestJob = imageState.latestJob
                    const latestFailedJob = imageState.latestFailedJob
                    const latestSucceededJob = imageState.latestSucceededJob
                    const latestResultForImage = latestSucceededJob
                      ? jobResultMap.get(latestSucceededJob.jobId) ?? null
                      : null
                    const canRequestAnalysisNow =
                      isActiveResource(image.status) &&
                      !imageState.hasActiveJob &&
                      !imageState.canRetry &&
                      latestSucceededJob == null
                    const isFailureExpanded =
                      latestFailedJob != null && expandedFailureJobId === latestFailedJob.jobId
                    const failureDetail =
                      isFailureExpanded && failureJobQuery.data?.data.jobId === latestFailedJob?.jobId
                        ? failureJobQuery.data.data
                        : null

                    return (
                      <article key={image.imageId} className="inspection-image-card">
                        <div className="inspection-image-card-main">
                          <button
                            className="inspection-image-thumb"
                            type="button"
                            onClick={() => setPreviewImageId(image.imageId)}
                          >
                            미리보기
                          </button>
                          <div className="inspection-image-body">
                            <div className="inspection-image-head">
                              <div>
                                <div className="inspection-image-title">
                                  {image.originalFilename}
                                </div>
                                <div className="inspection-image-subtitle">
                                  이미지 ID #{image.imageId}
                                </div>
                              </div>
                              <div className="inspection-image-badges">
                                <StatusBadge
                                  label={getImageTypeLabel(image.imageType)}
                                  tone={getImageBadgeTone(image.imageType)}
                                />
                                <StatusBadge
                                  label={getUploadStatusLabel(image.uploadStatus)}
                                  tone={getUploadStatusTone(image.uploadStatus)}
                                />
                              </div>
                            </div>

                            <div className="inspection-image-meta-grid">
                              <MetaField label="검사 대상 단위" value={getTargetTypeLabel(image.targetType)} />
                              <MetaField
                                label="검사 대상 위치"
                                value={image.equipmentId ? String(image.equipmentId) : '구역 기준'}
                              />
                              <MetaField label="촬영 시각" value={formatDateTime(image.capturedAt)} />
                              <MetaField
                                label="최근 분석 Job ID"
                                value={latestJob ? `#${latestJob.jobId}` : '-'}
                              />
                              <MetaField
                                label="분석 상태"
                                valueNode={
                                  latestJob ? (
                                    <StatusBadge
                                      label={getAnalysisJobStatusLabel(latestJob.jobStatus)}
                                      tone={getAnalysisJobStatusTone(latestJob.jobStatus)}
                                    />
                                  ) : (
                                    <span className="inspection-meta-muted">분석 없음</span>
                                  )
                                }
                              />
                              <MetaField
                                label="결과 존재 여부"
                                valueNode={
                                  latestResultForImage ? (
                                    <StatusBadge
                                      label={getResultStatusLabel(latestResultForImage.resultStatus)}
                                      tone={getResultStatusTone(latestResultForImage.resultStatus)}
                                    />
                                  ) : (
                                    <span className="inspection-meta-muted">결과 없음</span>
                                  )
                                }
                              />
                            </div>

                            {latestFailedJob ? (
                              <div className="inspection-failure-box">
                                <div className="inspection-failure-head">
                                  <div>
                                    <div className="inspection-card-label">실패 사유</div>
                                    <div className="inspection-failure-summary">
                                      {failureDetail?.failureCode
                                        ? `${failureDetail.failureCode} · `
                                        : ''}
                                      {failureDetail?.failureMessage
                                        ? sanitizeFailureMessage(failureDetail.failureMessage)
                                        : '실패 상세를 열어 원인과 다음 조치를 확인해 주세요.'}
                                    </div>
                                  </div>
                                  <button
                                    className="text-button"
                                    type="button"
                                    onClick={() => openFailureDetail(latestFailedJob.jobId)}
                                  >
                                    {isFailureExpanded ? '실패 상세 닫기' : '실패 상세 보기'}
                                  </button>
                                </div>
                                {isFailureExpanded ? (
                                  <div className="inspection-failure-detail">
                                    {failureJobQuery.isLoading ? (
                                      <span className="inspection-meta-muted">
                                        실패 상세를 불러오는 중입니다.
                                      </span>
                                    ) : null}
                                    {failureDetail ? (
                                      <>
                                        <MetaField
                                          label="실패 발생 시각"
                                          value={formatDateTime(
                                            failureDetail.completedAt ?? failureDetail.updatedAt,
                                          )}
                                        />
                                        <MetaField
                                          label="재요청 가능 여부"
                                          value={imageState.canRetry ? '가능' : '불가'}
                                        />
                                        <MetaField
                                          label="다음 행동"
                                          value={getFailureNextStep(failureDetail.failureCode)}
                                        />
                                      </>
                                    ) : null}
                                  </div>
                                ) : null}
                              </div>
                            ) : null}

                            <div className="inspection-image-actions">
                              <button
                                className="btn btn-secondary"
                                type="button"
                                onClick={() => setPreviewImageId(image.imageId)}
                              >
                                미리보기
                              </button>
                              {imageState.hasActiveJob ? (
                                <button className="btn btn-secondary" type="button" disabled>
                                  {latestJob?.jobStatus === 'QUEUED' ? '대기 중' : '분석 중'}
                                </button>
                              ) : latestResultForImage ? (
                                <Link className="btn btn-primary" to={`/results/${latestResultForImage.resultId}`}>
                                  결과 보기
                                </Link>
                              ) : imageState.canRetry && latestFailedJob ? (
                                <button
                                  className="btn btn-primary"
                                  type="button"
                                  disabled={pendingRetryJobId === latestFailedJob.jobId}
                                  onClick={() => void handleRetryJob(latestFailedJob)}
                                >
                                  {pendingRetryJobId === latestFailedJob.jobId
                                    ? '재요청 중...'
                                    : '다시 분석 요청'}
                                </button>
                              ) : latestSucceededJob ? (
                                <button
                                  className="btn btn-secondary"
                                  type="button"
                                  onClick={() => void handleRefreshWorkspace()}
                                >
                                  결과 상태 확인
                                </button>
                              ) : (
                                <button
                                  className="btn btn-primary"
                                  type="button"
                                  disabled={!canRequestAnalysisNow || pendingAnalysisImageId === image.imageId}
                                  onClick={() => void handleRequestAnalysis(image)}
                                >
                                  {pendingAnalysisImageId === image.imageId
                                    ? '요청 중...'
                                    : 'AI 분석 요청'}
                                </button>
                              )}
                              <button
                                className="btn btn-secondary"
                                type="button"
                                onClick={() => void handleRefreshWorkspace()}
                              >
                                상태 확인
                              </button>
                              <button
                                className="text-button text-button-danger muted-action"
                                type="button"
                                onClick={() => setImageToDelete(image)}
                              >
                                삭제
                              </button>
                            </div>
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              ) : null}
              {paginatedImageRows.totalPages > 1 ? (
                <PaginationControls
                  page={paginatedImageRows.page}
                  totalPages={paginatedImageRows.totalPages}
                  onPrevious={() => setImageListPage((current) => Math.max(1, current - 1))}
                  onNext={() =>
                    setImageListPage((current) =>
                      Math.min(paginatedImageRows.totalPages, current + 1),
                    )
                  }
                />
              ) : null}
            </section>
          </div>
        ) : null}

        {activeTab === 'results' ? (
          <div className="inspection-tab-stack">
            <div className="section-header">
              <div>
                <h3 className="panel-title">결과 목록</h3>
                <p className="panel-description">
                  분석이 완료된 결과를 확인하고 상세 화면으로 바로 이동할 수 있습니다.
                </p>
              </div>
            </div>

            {resultsQuery.isLoading && !resultsQuery.data ? (
              <LoadingState message="분석 결과를 불러오는 중입니다." />
            ) : null}
            {resultsQuery.isError ? (
              <ErrorState
                title="분석 결과를 불러오지 못했습니다."
                description={getApiErrorMessage(resultsQuery.error)}
              />
            ) : null}
            {!resultsQuery.isLoading && !resultsQuery.isError && resultRows.length === 0 ? (
              <EmptyState
                title="아직 생성된 결과가 없습니다."
                description="이미지·분석 탭에서 분석 요청을 등록하면 결과가 여기에 표시됩니다."
              />
            ) : null}

            {resultRows.length > 0 ? (
              <>
                <div className="inspection-result-summary-grid">
                  <SummaryMetric label="총 결과" value={`${resultRows.length}건`} />
                  <SummaryMetric
                    label="이상 결과"
                    value={`${resultRows.filter((result) => result.resultStatus === 'ANOMALY').length}건`}
                    tone="danger"
                  />
                  <SummaryMetric
                    label="재검토 필요"
                    value={`${resultRows.filter((result) => result.reviewStatus === 'RECHECK_REQUIRED').length}건`}
                    tone="warning"
                  />
                  <SummaryMetric
                    label="미검토"
                    value={`${resultRows.filter((result) => result.reviewStatus === 'UNCHECKED').length}건`}
                  />
                </div>

                <div className="inspection-result-list">
                  {resultRows.map((result) => (
                    <article key={result.resultId} className="inspection-result-card">
                      <div className="inspection-result-row">
                        <div>
                          <div className="inspection-result-title">결과 #{result.resultId}</div>
                          <div className="inspection-result-subtitle">
                            {result.inputType === 'RGB_SINGLE' ? 'RGB 이미지' : '열화상 이미지'} ·
                            분석 시각 {formatDateTime(result.analyzedAt)}
                          </div>
                        </div>
                        <div className="inspection-result-badges">
                          <StatusBadge
                            label={getResultStatusLabel(result.resultStatus)}
                            tone={getResultStatusTone(result.resultStatus)}
                          />
                          <StatusBadge
                            label={getSeverityLevelLabel(result.severityLevel)}
                            tone={getSeverityLevelTone(result.severityLevel)}
                          />
                          <StatusBadge
                            label={getReviewStatusLabel(result.reviewStatus)}
                            tone={getReviewStatusTone(result.reviewStatus)}
                          />
                        </div>
                        <div className="inspection-result-inline-meta">
                          <span>이상 {result.anomalyCount != null ? `${result.anomalyCount}건` : '-'}</span>
                          <span>조치 {getActionCandidateLabel(result.actionCandidate)}</span>
                          <span>
                            입력 {result.inputType === 'RGB_SINGLE' ? 'RGB 단건' : '열화상 단건'}
                          </span>
                        </div>
                        <div className="inspection-result-actions">
                          <Link className="btn btn-secondary inspection-result-action-btn" to={`/results/${result.resultId}`}>
                            결과 상세
                          </Link>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </section>

      <EntityModal
        isOpen={isEditModalOpen}
        title="점검 정보 수정"
        description="점검 기본 정보를 수정합니다."
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
          <FormField label="촬영 시각" error={inspectionForm.formState.errors.capturedAt?.message}>
            <input
              className="input-field"
              type="datetime-local"
              {...inspectionForm.register('capturedAt')}
            />
          </FormField>
          <FormField label="점검자" error={inspectionForm.formState.errors.inspectorName?.message}>
            <input className="input-field" {...inspectionForm.register('inspectorName')} />
          </FormField>
          <FormField label="메모" error={inspectionForm.formState.errors.memo?.message}>
            <textarea className="input-field textarea-field" {...inspectionForm.register('memo')} />
          </FormField>
          <ModalActions
            isSubmitting={updateInspectionMutation.isPending}
            onCancel={() => setIsEditModalOpen(false)}
            submitText="저장"
          />
        </form>
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
        isOpen={Boolean(imageToDelete)}
        title="이미지 삭제"
        description={
          imageToDelete
            ? `${imageToDelete.originalFilename} 이미지를 삭제할까요? 연결된 분석 작업과 결과도 함께 삭제됩니다.`
            : '선택한 이미지를 삭제할까요?'
        }
        confirmText="삭제"
        cancelText="취소"
        isConfirming={deleteImageMutation.isPending}
        confirmDisabled={imageDeleteImpactQuery.isLoading || !imageDeleteImpactQuery.data?.data}
        onConfirm={handleDeleteImage}
        onCancel={() => setImageToDelete(null)}
      >
        <DeleteImpactSummary
          impact={imageDeleteImpactQuery.data?.data}
          isLoading={imageDeleteImpactQuery.isLoading}
          errorMessage={
            imageDeleteImpactQuery.isError
              ? getApiErrorMessage(
                  imageDeleteImpactQuery.error,
                  '삭제 영향 범위를 불러오지 못했습니다.',
                )
              : null
          }
        />
      </ConfirmModal>

      <ConfirmModal
        isOpen={isDeleteInspectionModalOpen}
        title="점검 삭제"
        description="점검을 삭제하면 연결된 이미지와 분석 데이터가 함께 삭제됩니다."
        confirmText="삭제"
        cancelText="취소"
        isConfirming={deleteInspectionMutation.isPending}
        confirmDisabled={
          inspectionDeleteImpactQuery.isLoading || !inspectionDeleteImpactQuery.data?.data
        }
        onConfirm={handleDeleteInspection}
        onCancel={() => setIsDeleteInspectionModalOpen(false)}
      >
        <DeleteImpactSummary
          impact={inspectionDeleteImpactQuery.data?.data}
          isLoading={inspectionDeleteImpactQuery.isLoading}
          errorMessage={
            inspectionDeleteImpactQuery.isError
              ? getApiErrorMessage(
                  inspectionDeleteImpactQuery.error,
                  '삭제 영향 범위를 불러오지 못했습니다.',
                )
              : null
          }
        />
      </ConfirmModal>
    </section>
  )
}

function SummaryMetric({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: string
  tone?: 'default' | 'warning' | 'danger'
}) {
  return (
    <div className={`inspection-summary-card inspection-summary-card-${tone}`}>
      <span className="inspection-summary-label">{label}</span>
      <strong className="inspection-summary-value">{value}</strong>
    </div>
  )
}

function OverviewRow({
  label,
  value,
  badge,
}: {
  label: string
  value: string
  badge: ReactNode
}) {
  return (
    <div className="inspection-overview-row">
      <div>
        <div className="inspection-card-label">{label}</div>
        <div className="inspection-overview-value">{value}</div>
      </div>
      {badge}
    </div>
  )
}

function MetaField({
  label,
  value,
  valueNode,
}: {
  label: string
  value?: string
  valueNode?: ReactNode
}) {
  return (
    <div className="inspection-meta-field">
      <span className="inspection-meta-label">{label}</span>
      <div className="inspection-meta-value">{valueNode ?? value ?? '-'}</div>
    </div>
  )
}

function PaginationControls({
  page,
  totalPages,
  onPrevious,
  onNext,
}: {
  page: number
  totalPages: number
  onPrevious: () => void
  onNext: () => void
}) {
  return (
    <div className="inspection-pagination">
      <button
        className="btn btn-secondary inspection-pagination-btn"
        type="button"
        disabled={page <= 1}
        onClick={onPrevious}
      >
        이전
      </button>
      <span className="inspection-pagination-status">
        {page} / {totalPages}
      </span>
      <button
        className="btn btn-secondary inspection-pagination-btn"
        type="button"
        disabled={page >= totalPages}
        onClick={onNext}
      >
        다음
      </button>
    </div>
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
          {isLoading ? <LoadingState message="미리보기를 불러오는 중입니다." /> : null}
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
                이미지를 확인한 뒤 분석 요청 또는 재업로드 여부를 결정할 수 있습니다.
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}

function sortImagesDescending(images: ImageSummary[]) {
  return [...images].sort((a, b) => b.imageId - a.imageId)
}

function sortJobsDescending(jobs: AnalysisJobSummary[]) {
  return [...jobs].sort((a, b) => {
    const timeA = a.requestedAt ?? ''
    const timeB = b.requestedAt ?? ''
    if (timeB !== timeA) {
      return timeB.localeCompare(timeA)
    }
    return b.jobId - a.jobId
  })
}

function sortResultsDescending(results: AnalysisResultSummary[]) {
  return [...results].sort((a, b) => {
    const timeA = a.analyzedAt ?? ''
    const timeB = b.analyzedAt ?? ''
    if (timeB !== timeA) {
      return timeB.localeCompare(timeA)
    }
    return b.resultId - a.resultId
  })
}

function paginateItems<T>(items: T[], page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const startIndex = (safePage - 1) * pageSize

  return {
    items: items.slice(startIndex, startIndex + pageSize),
    page: safePage,
    totalPages,
  }
}

function createEmptyImageJobState(): ImageJobState {
  return {
    hasActiveJob: false,
    latestJob: null,
    latestSucceededJob: null,
    latestFailedJob: null,
    canRetry: false,
  }
}

function computeImageJobStateMap(jobs: AnalysisJobSummary[]) {
  const grouped = new Map<number, AnalysisJobSummary[]>()

  for (const job of jobs) {
    if (job.imageId == null) {
      continue
    }
    const list = grouped.get(job.imageId) ?? []
    list.push(job)
    grouped.set(job.imageId, list)
  }

  const map = new Map<number, ImageJobState>()

  for (const [imageId, imageJobs] of grouped) {
    const latestJob = imageJobs[0] ?? null
    const latestSucceededJob = imageJobs.find((job) => job.jobStatus === 'SUCCEEDED') ?? null
    const latestFailedJob = imageJobs.find((job) => job.jobStatus === 'FAILED') ?? null
    const hasActiveJob = imageJobs.some((job) => isRunningAnalysisJob(job.jobStatus))
    const hasNewerSucceededJob =
      latestSucceededJob != null && latestFailedJob != null
        ? latestSucceededJob.jobId > latestFailedJob.jobId
        : false

    map.set(imageId, {
      hasActiveJob,
      latestJob,
      latestSucceededJob,
      latestFailedJob,
      canRetry: !hasActiveJob && latestFailedJob != null && !hasNewerSucceededJob,
    })
  }

  return map
}

function getImageBadgeTone(imageType: ImageType): StatusBadgeTone {
  return imageType === 'RGB' ? 'sky' : 'orange'
}

function getAnalysisJobStatusLabel(status: AnalysisJobStatus) {
  switch (status) {
    case 'QUEUED':
      return '대기 중'
    case 'RUNNING':
      return '분석 중'
    case 'SUCCEEDED':
      return '완료'
    case 'FAILED':
      return '실패'
  }
}

function getAnalysisJobStatusTone(status: AnalysisJobStatus): StatusBadgeTone {
  switch (status) {
    case 'QUEUED':
      return 'amber'
    case 'RUNNING':
      return 'sky'
    case 'SUCCEEDED':
      return 'emerald'
    case 'FAILED':
      return 'orange'
  }
}

function sanitizeFailureMessage(message: string) {
  const trimmed = message.trim()
  if (!trimmed) {
    return '분석 요청이 실패했습니다. 이미지 정보를 확인하거나 다시 요청해 주세요.'
  }

  return trimmed.replace(/traceId|stack|exception|objectKey|bucket/gi, '').trim()
}

function getFailureNextStep(failureCode?: string | null) {
  const normalizedCode = failureCode?.toUpperCase() ?? ''

  if (normalizedCode.includes('IMAGE')) {
    return '이미지 정보와 촬영 상태를 확인한 뒤 다시 업로드해 주세요.'
  }

  if (normalizedCode.includes('UNSUPPORTED') || normalizedCode.includes('TYPE')) {
    return '이미지 유형과 검사 대상 설정을 다시 확인해 주세요.'
  }

  return '일시적 처리 오류일 수 있으니 잠시 후 다시 분석 요청해 주세요.'
}
