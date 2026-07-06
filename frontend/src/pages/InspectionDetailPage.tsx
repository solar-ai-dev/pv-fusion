import type { ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useState } from 'react'
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
  AnalysisInputType,
  AnalysisJobSummary,
  AnalysisJobStatus,
} from '../features/analysisJobs/types'
import { useEquipments } from '../features/equipments/hooks/useEquipments'
import { flattenEquipmentTree } from '../features/equipments/types'
import {
  IMAGE_TYPE_OPTIONS,
  TARGET_TYPE_OPTIONS,
  type ImageSummary,
  type ImageType,
  type TargetType,
} from '../features/images/types'
import {
  useDeleteImage,
  useDeactivateImage,
  useImageDeleteImpact,
  useImagePreview,
  useImages,
  useUploadImage,
} from '../features/images/hooks/useImages'
import {
  CAPTURE_METHOD_OPTIONS,
  getCaptureMethodLabel,
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
} from '../features/results/types'
import { useResults } from '../features/results/hooks/useResults'
import { useZone } from '../features/zones/hooks/useZones'
import { ConfirmModal } from '../shared/components/feedback/ConfirmModal'
import { DeleteImpactSummary } from '../shared/components/feedback/DeleteImpactSummary'
import { FormField } from '../shared/components/form/FormField'
import { PageHeader } from '../shared/components/layout/PageHeader'
import { ErrorState } from '../shared/components/state/ErrorState'
import { LoadingState } from '../shared/components/state/LoadingState'
import { StatusBadge } from '../shared/components/state/StatusBadge'
import { useToast } from '../shared/hooks/useToast'
import {
  formatDateTime,
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
    const hasFile = value.file instanceof FileList && value.file.length > 0

    if (!hasFile) {
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
        message: '전체 영역 업로드에서는 설비 위치를 선택하지 않습니다.',
      })
    }

    if (value.targetType !== 'ZONE' && !value.equipmentId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['equipmentId'],
        message: 'Array, Panel, Module 단위로 업로드하려면 설비 위치를 선택하세요.',
      })
    }
  })

type UpdateInspectionFormValues = z.infer<typeof updateInspectionSchema>
type UploadImageFormValues = z.infer<typeof uploadImageSchema>
type WorkflowTab = 'overview' | 'images-analysis' | 'results'

export function InspectionDetailPage() {
  const params = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const inspectionId = parsePositiveNumber(params.inspectionId)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteInspectionModalOpen, setIsDeleteInspectionModalOpen] = useState(false)
  const [previewImageId, setPreviewImageId] = useState<number | null>(null)
  const [selectedImage, setSelectedImage] = useState<ImageSummary | null>(null)
  const [imageToDelete, setImageToDelete] = useState<ImageSummary | null>(null)
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null)
  const [pendingRetryImageId, setPendingRetryImageId] = useState<number | null>(null)
  const [uploadFormVersion, setUploadFormVersion] = useState(0)
  const [showAdvancedUploadOptions, setShowAdvancedUploadOptions] = useState(false)
  const [activeTab, setActiveTab] = useState<WorkflowTab>('overview')
  const [isJobHistoryOpen, setIsJobHistoryOpen] = useState(false)

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
    { inspectionId: inspectionId ?? undefined, page: 0, size: 20 },
    Boolean(inspectionId),
  )
  const selectedJobQuery = useAnalysisJob(selectedJobId ?? 0, Boolean(selectedJobId))
  const updateInspectionMutation = useUpdateInspection(inspectionId ?? 0)
  const deleteInspectionMutation = useDeleteInspection(inspectionId ?? 0)
  const uploadImageMutation = useUploadImage(inspectionId ?? 0)
  const deactivateImageMutation = useDeactivateImage(inspectionId ?? 0)
  const deleteImageMutation = useDeleteImage(inspectionId ?? 0)
  const previewQuery = useImagePreview(previewImageId ?? 0, Boolean(previewImageId))
  const createAnalysisJobMutation = useCreateAnalysisJob()
  const retryAnalysisJobMutation = useRetryAnalysisJob()
  const inspectionDeleteImpactQuery = useInspectionDeleteImpact(inspectionId ?? 0, isDeleteInspectionModalOpen)
  const imageDeleteImpactQuery = useImageDeleteImpact(imageToDelete?.imageId ?? 0, Boolean(imageToDelete))

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
  const selectedImageType = uploadForm.watch('imageType')
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

  const imageRows = useMemo(() => imagesQuery.data?.data ?? [], [imagesQuery.data])
  const jobRows = useMemo(
    () => sortJobsDescending(analysisJobsQuery.data?.data.content ?? []),
    [analysisJobsQuery.data],
  )
  const resultRows = useMemo(
    () => resultsQuery.data?.data.content ?? [],
    [resultsQuery.data],
  )
  const selectedJob = selectedJobQuery.data?.data ?? null
  const imageJobStateMap = useMemo(() => computeImageJobStateMap(jobRows), [jobRows])
  const runningImageJobIds = useMemo(
    () =>
      new Set(
        jobRows
          .filter((job) => job.imageId != null && isRunningAnalysisJob(job.jobStatus))
          .map((job) => job.imageId as number),
      ),
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
  const latestRgbImage = useMemo(() => getLatestImageByType(imageRows, 'RGB'), [imageRows])
  const latestThermalImage = useMemo(
    () => getLatestImageByType(imageRows, 'THERMAL'),
    [imageRows],
  )
  const rgbRequestableImage =
    latestRgbImage && canRequestAnalysis(latestRgbImage, runningImageJobIds)
      ? latestRgbImage
      : null
  const thermalRequestableImage =
    latestThermalImage && canRequestAnalysis(latestThermalImage, runningImageJobIds)
      ? latestThermalImage
      : null
  // imageId별 canRetry가 true인 가장 최신 FAILED job (상단 배너 + workflowStatus 용)
  const retryableBannerJob = useMemo(
    () =>
      jobRows.find(
        (job) =>
          job.jobStatus === 'FAILED' &&
          job.imageId != null &&
          imageJobStateMap.get(job.imageId)?.canRetry === true,
      ) ?? null,
    [jobRows, imageJobStateMap],
  )
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
  const pendingReviewCount = useMemo(
    () =>
      resultRows.filter(
        (r) => r.reviewStatus === 'UNCHECKED' || r.reviewStatus === 'RECHECK_REQUIRED',
      ).length,
    [resultRows],
  )
  const jobResultMap = useMemo(() => {
    const map = new Map<number, (typeof resultRows)[0]>()
    for (const result of resultRows) {
      map.set(result.jobId, result)
    }
    return map
  }, [resultRows])
  const hasRequestableImage = Boolean(rgbRequestableImage || thermalRequestableImage)
  const hasResults = resultRows.length > 0
  const workflowStatus = useMemo(
    () =>
      getWorkflowStatus({
        imageCount: imageRows.length,
        hasRequestableImage,
        queuedCount: queuedJobs.length,
        runningCount: runningJobs.length,
        failedJob: retryableBannerJob,
        hasResults,
      }),
    [
      hasRequestableImage,
      hasResults,
      imageRows.length,
      retryableBannerJob,
      queuedJobs.length,
      runningJobs.length,
    ],
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
    if (!selectedJobId && jobRows[0]) {
      setSelectedJobId(jobRows[0].jobId)
    }
  }, [jobRows, selectedJobId])

  if (!inspectionId) {
    return (
      <ErrorState
        title="올바르지 않은 점검 정보입니다."
        description="주소의 점검 정보를 다시 확인해 주세요."
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

      toast.push(response.message || '이미지가 업로드되었습니다.')
      uploadForm.reset({
        targetType: 'ZONE',
        equipmentId: '',
        imageType: values.imageType,
        capturedAt: '',
        memo: '',
        file: undefined,
      })
      setUploadFormVersion((current) => current + 1)
    } catch (error) {
      toast.push(
        getApiErrorMessage(
          error,
          '이미지 업로드에 실패했습니다. 파일 형식과 업로드 대상을 다시 확인해 주세요.',
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

  const handleDeleteInspection = async () => {
    if (!inspectionDeleteImpactQuery.data?.data) {
      toast.push('삭제 영향 범위를 불러온 뒤 다시 시도해 주세요.')
      return
    }

    try {
      await deleteInspectionMutation.mutateAsync()
      toast.push('점검이 삭제되었습니다.')
      setIsDeleteInspectionModalOpen(false)
      navigate('/inspections')
    } catch (error) {
      toast.push(getApiErrorMessage(error, '점검 삭제에 실패했습니다.'))
    }
  }

  const handleDeleteImage = async () => {
    if (!imageToDelete) {
      return
    }
    if (!imageDeleteImpactQuery.data?.data) {
      toast.push('삭제 영향 범위를 불러온 뒤 다시 시도해 주세요.')
      return
    }

    try {
      await deleteImageMutation.mutateAsync(imageToDelete.imageId)
      await imagesQuery.refetch()
      await analysisJobsQuery.refetch()
      await resultsQuery.refetch()
      toast.push('이미지가 삭제되었습니다.')
      setImageToDelete(null)
    } catch (error) {
      toast.push(getApiErrorMessage(error, '이미지 삭제에 실패했습니다.'))
    }
  }
  const requestSingleAnalysis = async (image: ImageSummary) => {
    try {
      const response = await createAnalysisJobMutation.mutateAsync({ imageId: image.imageId })
      setSelectedJobId(response.data.jobId)
      toast.push(
        response.message || `${getUserImageTypeLabel(image.imageType)} 분석 요청이 등록되었습니다.`,
      )
      await analysisJobsQuery.refetch()
    } catch (error) {
      if (getApiErrorCode(error) === 'ANALYSIS_JOB_ALREADY_RUNNING') {
        toast.push('이미 분석이 진행 중입니다.')
        await analysisJobsQuery.refetch()
      } else {
        toast.push(getApiErrorMessage(error, '분석 요청에 실패했습니다.'))
      }
    }
  }

  const handleRefreshJobs = async () => {
    await analysisJobsQuery.refetch()
    await resultsQuery.refetch()
    if (selectedJobId) {
      await selectedJobQuery.refetch()
    }
  }

  const handleRetryJob = async (jobId: number, imageId: number) => {
    setPendingRetryImageId(imageId)
    setSelectedJobId(jobId)
    try {
      const response = await retryAnalysisJobMutation.mutateAsync({ jobId })
      setSelectedJobId(response.data.jobId)
      toast.push(response.message || '분석 요청이 등록되었습니다.')
      await handleRefreshJobs()
    } catch (error) {
      if (getApiErrorCode(error) === 'ANALYSIS_JOB_ALREADY_RUNNING') {
        toast.push('이미 분석이 진행 중입니다.')
        await handleRefreshJobs()
      } else {
        toast.push(getApiErrorMessage(error, '다시 요청에 실패했습니다.'))
      }
    } finally {
      setPendingRetryImageId(null)
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="점검 상세"
        description="이미지 업로드와 이미지별 분석 요청, 결과 확인을 한 흐름으로 이어서 진행하세요."
        actions={
          <>
            <Link className="btn btn-secondary" to="/inspections">
              점검 목록
            </Link>
            {latestResult ? (
              <Link className="btn btn-secondary" to={`/results/${latestResult.resultId}`}>
                결과 보기
              </Link>
            ) : null}
            <button className="text-button" type="button" onClick={() => setIsEditModalOpen(true)}>
              점검 정보 수정
            </button>
          </>
        }
      />

      <section className="panel stack-md">
        <div className="toolbar gap-4">
          <div className="min-w-0">
            <h2 className="panel-title">{inspection.name}</h2>
            <p className="panel-description">
              {zoneQuery.data?.data.name || '구역 정보 확인 중'} · {workflowStatus.summary}
            </p>
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
        <div className="insp-status-summary">
          <div className="insp-primary-state">
            <StatusBadge label={workflowStatus.badge} tone={workflowStatus.tone} />
            <span className="insp-state-label">{workflowStatus.summary}</span>
          </div>
          <div className="insp-sub-chips">
            <span className="insp-chip">이미지 {imageRows.length}건</span>
            {queuedJobs.length > 0 ? (
              <span className="insp-chip insp-chip-warning">대기 {queuedJobs.length}건</span>
            ) : null}
            {runningJobs.length > 0 ? (
              <span className="insp-chip insp-chip-sky">진행 {runningJobs.length}건</span>
            ) : null}
            {completedJobs.length > 0 ? (
              <span className="insp-chip insp-chip-success">완료 {completedJobs.length}건</span>
            ) : null}
            {failedJobs.length > 0 ? (
              <span className="insp-chip insp-chip-danger">실패 {failedJobs.length}건</span>
            ) : null}
            {pendingReviewCount > 0 ? (
              <span className="insp-chip insp-chip-amber">검토대기 {pendingReviewCount}건</span>
            ) : null}
          </div>
          <div className="insp-meta-row">
            <span>{plantQuery.data?.data.name || '발전소 확인 중'}</span>
            <span className="insp-meta-sep">·</span>
            <span>{zoneQuery.data?.data.name || '구역 확인 중'}</span>
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
          <div className="stack-md">
            <article className="workflow-focus-card">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-sky-700">지금 할 일</div>
                  <h3 className="mt-2 text-xl font-semibold text-slate-950">{workflowStatus.title}</h3>
                  <p className="mt-2 max-w-2xl text-sm text-slate-600">{workflowStatus.description}</p>
                </div>
                <StatusBadge label={workflowStatus.badge} tone={workflowStatus.tone} />
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={() => setActiveTab(workflowStatus.primaryTab)}
                >
                  {workflowStatus.primaryAction}
                </button>
                {workflowStatus.secondaryAction ? (
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => setActiveTab(workflowStatus.secondaryAction!.tab)}
                  >
                    {workflowStatus.secondaryAction.label}
                  </button>
                ) : null}
              </div>
            </article>

            <div className="grid gap-4 lg:grid-cols-3">
              <CompactStatusCard
                title="이미지"
                value={`${imageRows.length}건 등록`}
                description={
                  imageRows.length === 0
                    ? 'RGB 또는 열화상 이미지를 먼저 업로드하세요.'
                    : `RGB ${rgbImages.length}건 · 열화상 ${thermalImages.length}건`
                }
                actionLabel="이미지·분석 탭 열기"
                onAction={() => setActiveTab('images-analysis')}
              />
              <CompactStatusCard
                title="분석"
                value={getAnalysisSummaryLabel(jobRows)}
                description={
                  jobRows.length === 0
                    ? '아직 요청된 분석이 없습니다.'
                    : `대기 ${queuedJobs.length}건 · 진행 ${runningJobs.length}건 · 완료 ${completedJobs.length}건`
                }
                actionLabel="이미지·분석 탭 열기"
                onAction={() => setActiveTab('images-analysis')}
              />
              <CompactStatusCard
                title="결과"
                value={latestResult ? getResultStatusLabel(latestResult.resultStatus) : '결과 없음'}
                description={
                  latestResult
                    ? `${latestResult.analyzedAt ? formatDateTime(latestResult.analyzedAt) : '방금'} 기준 결과를 확인할 수 있습니다.`
                    : '분석이 완료되면 결과 검토를 시작할 수 있습니다.'
                }
                actionLabel={latestResult ? '결과 탭 열기' : '결과 탭 열기'}
                onAction={() => setActiveTab('results')}
              />
            </div>

            {retryableBannerJob ? (
              <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-rose-900">
                <div className="text-base font-semibold">실패한 분석이 있습니다.</div>
                <p className="mt-2 text-sm">
                  {selectedJobId === retryableBannerJob.jobId && selectedJob?.failureMessage
                    ? sanitizeFailureMessage(selectedJob.failureMessage)
                    : '이미지·분석 탭에서 다시 요청하거나 이미지를 다시 업로드할 수 있습니다.'}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button className="btn btn-primary" type="button" onClick={() => setActiveTab('images-analysis')}>
                    이미지·분석 탭 열기
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {activeTab === 'images-analysis' ? (
          <div id="image-upload-section" className="stack-md">
            {/* ── 1. 업로드 영역 ── */}
            <SectionHeading
              title="이미지 업로드"
              description="이미지 유형을 선택하고 파일을 올리세요. 고급 설정은 필요할 때만 열면 됩니다."
            />
            <form className="stack-md rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" onSubmit={handleUploadImage}>
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex gap-2">
                  <button
                    className={`btn ${selectedImageType === 'RGB' ? 'btn-primary' : 'btn-secondary'}`}
                    type="button"
                    onClick={() => uploadForm.setValue('imageType', 'RGB')}
                  >
                    RGB{rgbImages.length > 0 ? ` (${rgbImages.length})` : ''}
                  </button>
                  <button
                    className={`btn ${selectedImageType === 'THERMAL' ? 'btn-primary' : 'btn-secondary'}`}
                    type="button"
                    onClick={() => uploadForm.setValue('imageType', 'THERMAL')}
                  >
                    열화상{thermalImages.length > 0 ? ` (${thermalImages.length})` : ''}
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <FormField label={`${getUserImageTypeLabel(selectedImageType)} 파일`} error={uploadForm.formState.errors.file?.message}>
                    <input
                      key={uploadFormVersion}
                      className="input-field"
                      type="file"
                      accept="image/*"
                      {...uploadForm.register('file')}
                    />
                  </FormField>
                </div>
                <button className="btn btn-primary" type="submit" disabled={uploadImageMutation.isPending}>
                  업로드
                </button>
              </div>
              <button
                className="text-button w-fit"
                type="button"
                onClick={() => setShowAdvancedUploadOptions((current) => !current)}
              >
                {showAdvancedUploadOptions ? '고급 설정 접기' : '고급 설정 열기'}
              </button>
              {showAdvancedUploadOptions ? (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField label="검사 대상 단위" error={uploadForm.formState.errors.targetType?.message}>
                      <select className="input-field" {...uploadForm.register('targetType')}>
                        {TARGET_TYPE_OPTIONS.map((targetType) => (
                          <option key={targetType} value={targetType}>
                            {getUserTargetTypeLabel(targetType)}
                          </option>
                        ))}
                      </select>
                    </FormField>
                    <FormField
                      label="설비 위치"
                      hint={isZoneUploadTarget ? '전체 영역 업로드에서는 선택 불필요' : '세부 단위일 때만 선택'}
                      error={uploadForm.formState.errors.equipmentId?.message}
                    >
                      <select
                        className="input-field"
                        {...uploadForm.register('equipmentId')}
                        disabled={isZoneUploadTarget || isUploadEquipmentEmpty}
                      >
                        <option value="">
                          {selectedTargetType === 'ZONE' ? '설비 위치 선택 없음' : '설비 위치를 선택하세요.'}
                        </option>
                        {uploadEquipmentOptions.map((equipment) => (
                          <option key={equipment.equipmentId} value={equipment.equipmentId}>
                            {`${'ㆍ'.repeat(equipment.depth)} ${equipment.name}`}
                          </option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label="촬영 시각" error={uploadForm.formState.errors.capturedAt?.message}>
                      <input className="input-field" type="datetime-local" {...uploadForm.register('capturedAt')} />
                    </FormField>
                    <FormField label="메모" error={uploadForm.formState.errors.memo?.message}>
                      <textarea className="input-field textarea-field" {...uploadForm.register('memo')} />
                    </FormField>
                  </div>
                </div>
              ) : null}
              {isUploadEquipmentEmpty ? (
                <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  세부 단위로 업로드하려면 구역 상세에서 설비 위치를 먼저 등록하세요.
                </div>
              ) : null}
            </form>

            {/* ── 2. 업로드된 이미지 목록 ── */}
            <div className="stack-sm">
              <div className="toolbar">
                <div>
                  <h3 className="panel-title">업로드된 이미지</h3>
                  <p className="panel-description">이미지별 최신 분석 상태와 결과를 확인하세요.</p>
                </div>
                <button className="btn btn-secondary" type="button" onClick={handleRefreshJobs}>
                  새로고침
                </button>
              </div>
              {imageRows.length === 0 ? (
                <CompactEmptyState
                  title="등록된 이미지가 없습니다."
                  description="RGB 또는 열화상 이미지를 먼저 업로드하세요."
                />
              ) : (
                <div className="img-list-table">
                  <div className="img-list-header">
                    <span>파일명</span>
                    <span>최신 분석</span>
                    <span>최신 결과</span>
                    <span>마지막 분석</span>
                    <span>액션</span>
                  </div>
                  {imageRows.map((image) => {
                    const imageState = imageJobStateMap.get(image.imageId)
                    const hasActiveJob = imageState?.hasActiveJob ?? false
                    const canRetry = imageState?.canRetry ?? false
                    const latestJob = imageState?.latestJob ?? null
                    const latestSucceededJob = imageState?.latestSucceededJob ?? null
                    const resultForImage = latestSucceededJob
                      ? jobResultMap.get(latestSucceededJob.jobId) ?? null
                      : null
                    const canRequest = canRequestAnalysis(image, runningImageJobIds)

                    return (
                      <div key={image.imageId} className="img-list-row">
                        <div className="img-list-cell img-list-cell-name">
                          <button
                            className="img-preview-btn"
                            type="button"
                            title="미리보기"
                            onClick={() => setPreviewImageId(image.imageId)}
                          >
                            ▶
                          </button>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-slate-900">{image.originalFilename}</div>
                            <div className="flex gap-1.5 mt-0.5 flex-wrap">
                              <StatusBadge label={getUserImageTypeLabel(image.imageType)} />
                              <StatusBadge
                                label={getUserUploadStatusLabel(image.uploadStatus)}
                                tone={getUserUploadStatusTone(image.uploadStatus)}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="img-list-cell">
                          {latestJob ? (
                            <StatusBadge
                              label={getUserJobStatusLabel(latestJob.jobStatus)}
                              tone={getUserJobStatusTone(latestJob.jobStatus)}
                            />
                          ) : (
                            <span className="text-slate-400 text-sm">-</span>
                          )}
                        </div>
                        <div className="img-list-cell">
                          {resultForImage ? (
                            <StatusBadge
                              label={getResultStatusLabel(resultForImage.resultStatus)}
                              tone={getResultStatusTone(resultForImage.resultStatus)}
                            />
                          ) : (
                            <span className="text-slate-400 text-sm">-</span>
                          )}
                        </div>
                        <div className="img-list-cell">
                          <span className="text-xs text-slate-500 whitespace-nowrap">
                            {latestJob?.completedAt ? formatDateTime(latestJob.completedAt) : '-'}
                          </span>
                        </div>
                        <div className="img-list-cell img-list-cell-actions">
                          {hasActiveJob ? (
                            <span className="text-xs text-sky-600 font-medium">진행 중</span>
                          ) : canRetry && imageState?.latestFailedJob ? (
                            <button
                              className="btn btn-primary"
                              type="button"
                              style={{ fontSize: '0.78rem', padding: '0.3rem 0.7rem' }}
                              disabled={pendingRetryImageId === image.imageId || retryAnalysisJobMutation.isPending}
                              onClick={() =>
                                imageState.latestFailedJob?.imageId != null &&
                                void handleRetryJob(imageState.latestFailedJob.jobId, imageState.latestFailedJob.imageId)
                              }
                            >
                              {pendingRetryImageId === image.imageId ? '요청 중…' : '재요청'}
                            </button>
                          ) : resultForImage ? (
                            <Link
                              className="text-button text-sm"
                              to={`/results/${resultForImage.resultId}`}
                            >
                              결과 보기
                            </Link>
                          ) : latestSucceededJob ? (
                            <button
                              className="text-button text-sm"
                              type="button"
                              onClick={() => setActiveTab('results')}
                              title="분석은 완료되었습니다. 결과 탭에서 확인하세요."
                            >
                              결과 탭 열기
                            </button>
                          ) : canRequest ? (
                            <button
                              className="btn btn-secondary"
                              type="button"
                              style={{ fontSize: '0.78rem', padding: '0.3rem 0.7rem' }}
                              disabled={createAnalysisJobMutation.isPending}
                              onClick={() => requestSingleAnalysis(image)}
                            >
                              분석 요청
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                          <div className="img-list-mgmt">
                            <button className="text-button muted-action text-xs" type="button" onClick={() => setSelectedImage(image)}>
                              비활성화
                            </button>
                            <button className="text-button text-button-danger muted-action text-xs" type="button" onClick={() => setImageToDelete(image)}>
                              삭제
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* ── 3. 분석 상태 요약 ── */}
            {jobRows.length > 0 ? (
              <div className="analysis-kpi-strip">
                <div className="analysis-kpi-item">
                  <span className="analysis-kpi-label">대기</span>
                  <strong className="analysis-kpi-value">{queuedJobs.length}건</strong>
                </div>
                <div className="analysis-kpi-item">
                  <span className="analysis-kpi-label">진행</span>
                  <strong className="analysis-kpi-value analysis-kpi-sky">{runningJobs.length}건</strong>
                </div>
                <div className="analysis-kpi-item">
                  <span className="analysis-kpi-label">완료</span>
                  <strong className="analysis-kpi-value analysis-kpi-success">{completedJobs.length}건</strong>
                </div>
                <div className="analysis-kpi-item">
                  <span className="analysis-kpi-label">실패</span>
                  <strong className={`analysis-kpi-value ${failedJobs.length > 0 ? 'analysis-kpi-danger' : ''}`}>
                    {failedJobs.length}건
                  </strong>
                </div>
              </div>
            ) : null}

            {/* ── 4. 분석 이력 (접힘) ── */}
            {jobRows.length > 0 ? (
              <div className="history-collapse">
                <button
                  className="history-collapse-toggle"
                  type="button"
                  onClick={() => setIsJobHistoryOpen((prev) => !prev)}
                >
                  <span>분석 이력 ({jobRows.length}건)</span>
                  <span>{isJobHistoryOpen ? '▲ 접기' : '▼ 열기'}</span>
                </button>
                {isJobHistoryOpen ? (
                  <div className="job-history-table">
                    <div className="job-history-header">
                      <span>유형</span>
                      <span>상태</span>
                      <span>대상 이미지</span>
                      <span>요청 시각</span>
                      <span>완료 시각</span>
                      <span>액션</span>
                    </div>
                    {jobRows.map((job) => {
                      const imageState = job.imageId != null ? imageJobStateMap.get(job.imageId) : null
                      const isRetryableCard =
                        job.jobStatus === 'FAILED' &&
                        imageState?.latestFailedJob?.jobId === job.jobId &&
                        (imageState?.canRetry ?? false)

                      return (
                        <div key={job.jobId} className="job-history-row">
                          <span className="text-sm text-slate-700">{getUserInputTypeLabel(job.inputType)}</span>
                          <span>
                            <StatusBadge
                              label={getUserJobStatusLabel(job.jobStatus)}
                              tone={getUserJobStatusTone(job.jobStatus)}
                            />
                          </span>
                          <span className="text-xs text-slate-500 truncate">{getImageNameById(imageRows, job.imageId)}</span>
                          <span className="text-xs text-slate-500 whitespace-nowrap">{formatDateTime(job.requestedAt)}</span>
                          <span className="text-xs text-slate-500 whitespace-nowrap">{formatDateTime(job.completedAt)}</span>
                          <span>
                            {isRetryableCard ? (
                              <button
                                className="text-button text-sm"
                                type="button"
                                disabled={pendingRetryImageId === job.imageId || retryAnalysisJobMutation.isPending}
                                onClick={() =>
                                  job.imageId != null && void handleRetryJob(job.jobId, job.imageId)
                                }
                              >
                                재요청
                              </button>
                            ) : job.jobStatus === 'SUCCEEDED' ? (
                              <Link className="text-button text-sm" to={`/results?inspectionId=${inspectionId}`}>
                                결과
                              </Link>
                            ) : null}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {activeTab === 'results' ? (
          <div className="stack-md">
            <SectionHeading
              title="결과 검토"
              description="분석이 완료되면 조치 후보와 심각도를 확인하고 결과 상세로 이동할 수 있습니다."
            />
            {resultsQuery.isLoading && !resultsQuery.data ? <LoadingState message="분석 결과를 불러오는 중입니다." /> : null}
            {resultsQuery.isError ? <ErrorState title="분석 결과를 불러오지 못했습니다." description={getApiErrorMessage(resultsQuery.error)} /> : null}
            {resultRows.length === 0 && !resultsQuery.isLoading ? (
              <CompactEmptyState
                title="등록된 분석 결과가 없습니다."
                description="분석이 완료되면 결과를 여기서 검토할 수 있습니다."
              />
            ) : null}

            {latestResult ? (
              <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="toolbar">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">최신 분석 결과</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {latestResult.analyzedAt
                          ? `${formatDateTime(latestResult.analyzedAt)} 기준`
                          : '분석 시각 확인 중'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge
                        label={getResultStatusLabel(latestResult.resultStatus)}
                        tone={getResultStatusTone(latestResult.resultStatus)}
                      />
                      <StatusBadge
                        label={getReviewStatusLabel(latestResult.reviewStatus)}
                        tone={getReviewStatusTone(latestResult.reviewStatus)}
                      />
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <MiniInfo label="조치 후보" value={getActionCandidateLabel(latestResult.actionCandidate)} />
                    <MiniInfo label="심각도" value={getSeverityLevelLabel(latestResult.severityLevel)} />
                    <MiniInfo label="이상 개수" value={latestResult.anomalyCount == null ? '-' : `${latestResult.anomalyCount}건`} />
                    <MiniInfo label="검토 상태" value={getReviewStatusLabel(latestResult.reviewStatus)} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link className="btn btn-primary" to={`/results/${latestResult.resultId}`}>
                      결과 상세 보기
                    </Link>
                    <Link className="btn btn-secondary" to={`/results?inspectionId=${inspectionId}`}>
                      이 점검의 결과 목록
                    </Link>
                  </div>
                </section>
                <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="text-lg font-semibold text-slate-900">최근 결과 요약</h3>
                  <div className="mt-4 space-y-3">
                    {resultRows.slice(0, 3).map((result) => (
                      <div key={result.resultId} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex flex-wrap items-center gap-2">
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
                        <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                          <span>조치 후보: {getActionCandidateLabel(result.actionCandidate)}</span>
                          <span>분석 시각: {formatDateTime(result.analyzedAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            ) : null}
          </div>
        ) : null}

        {activeTab === 'overview' ? (
          <div className="stack-md">
            <SectionHeading title="점검 정보" description="촬영 정보와 메모를 확인하고 필요한 경우 수정하세요." />
            <div className="detail-grid">
              <DetailItem label="점검명" value={inspection.name} />
              <DetailItem label="촬영 시각" value={formatDateTime(inspection.capturedAt)} />
              <DetailItem label="촬영 방식" value={getCaptureMethodLabel(inspection.captureMethod)} />
              <DetailItem label="점검자" value={inspection.inspectorName || '-'} />
              <DetailItem label="메모" value={inspection.memo || '-'} />
              <DetailItem label="등록 시각" value={formatDateTime(inspection.createdAt)} />
            </div>
            <div className="management-panel">
              <div>
                <h3 className="panel-title">관리 작업</h3>
                <p className="panel-description">삭제는 연결된 이미지와 분석 데이터에 영향을 줍니다.</p>
              </div>
              <div className="management-actions management-actions-muted">
                <button className="btn btn-secondary" type="button" onClick={() => setIsEditModalOpen(true)}>
                  점검 정보 수정
                </button>
                <button className="text-button text-button-danger" type="button" onClick={() => setIsDeleteInspectionModalOpen(true)}>
                  점검 삭제
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </section>
      <EntityModal isOpen={isEditModalOpen} title="점검 정보 수정" description="이 점검의 기본 정보를 수정하세요." onClose={() => setIsEditModalOpen(false)}>
        <form className="stack-md" onSubmit={handleUpdateInspection}>
          <FormField label="점검명 *" error={inspectionForm.formState.errors.name?.message}>
            <input className="input-field" {...inspectionForm.register('name')} />
          </FormField>
          <FormField label="촬영 방식" error={inspectionForm.formState.errors.captureMethod?.message}>
            <select className="input-field" {...inspectionForm.register('captureMethod')}>
              {CAPTURE_METHOD_OPTIONS.map((method) => (
                <option key={method} value={method}>{getCaptureMethodLabel(method)}</option>
              ))}
            </select>
          </FormField>
          <FormField label="촬영 시각" error={inspectionForm.formState.errors.capturedAt?.message}>
            <input className="input-field" type="datetime-local" {...inspectionForm.register('capturedAt')} />
          </FormField>
          <FormField label="점검자" error={inspectionForm.formState.errors.inspectorName?.message}>
            <input className="input-field" {...inspectionForm.register('inspectorName')} />
          </FormField>
          <FormField label="메모" error={inspectionForm.formState.errors.memo?.message}>
            <textarea className="input-field textarea-field" {...inspectionForm.register('memo')} />
          </FormField>
          <ModalActions isSubmitting={updateInspectionMutation.isPending} onCancel={() => setIsEditModalOpen(false)} submitText="저장" />
        </form>
      </EntityModal>

      <PreviewModal
        isOpen={Boolean(previewImageId)}
        imageName={imageRows.find((image) => image.imageId === previewImageId)?.originalFilename ?? ''}
        previewUrl={previewQuery.data?.data.url}
        expiresAt={previewQuery.data?.data.expiresAt}
        isLoading={previewQuery.isLoading}
        error={previewQuery.isError ? getApiErrorMessage(previewQuery.error) : null}
        onClose={() => setPreviewImageId(null)}
      />

      <ConfirmModal
        isOpen={Boolean(selectedImage)}
        title="이미지 비활성화"
        description={selectedImage ? `${selectedImage.originalFilename} 이미지를 비활성화할까요?` : '선택한 이미지를 비활성화할까요?'}
        confirmText="비활성화"
        cancelText="취소"
        isConfirming={deactivateImageMutation.isPending}
        onConfirm={handleDeactivateImage}
        onCancel={() => setSelectedImage(null)}
      />
      <ConfirmModal
        isOpen={Boolean(imageToDelete)}
        title="이미지 삭제"
        description={imageToDelete ? `${imageToDelete.originalFilename} 이미지를 삭제할까요? 연결된 분석 작업과 결과도 함께 삭제됩니다.` : '선택한 이미지를 삭제할까요?'}
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
              ? getApiErrorMessage(imageDeleteImpactQuery.error, '삭제 영향 범위를 불러오지 못했습니다.')
              : null
          }
        />
      </ConfirmModal>
      <ConfirmModal
        isOpen={isDeleteInspectionModalOpen}
        title="점검 삭제"
        description="이 점검을 삭제하면 연결된 이미지와 분석 데이터가 함께 삭제됩니다."
        confirmText="삭제"
        cancelText="취소"
        isConfirming={deleteInspectionMutation.isPending}
        confirmDisabled={inspectionDeleteImpactQuery.isLoading || !inspectionDeleteImpactQuery.data?.data}
        onConfirm={handleDeleteInspection}
        onCancel={() => setIsDeleteInspectionModalOpen(false)}
      >
        <DeleteImpactSummary
          impact={inspectionDeleteImpactQuery.data?.data}
          isLoading={inspectionDeleteImpactQuery.isLoading}
          errorMessage={
            inspectionDeleteImpactQuery.isError
              ? getApiErrorMessage(inspectionDeleteImpactQuery.error, '삭제 영향 범위를 불러오지 못했습니다.')
              : null
          }
        />
      </ConfirmModal>
    </section>
  )

}

const WORKFLOW_TABS: Array<{ id: WorkflowTab; label: string }> = [
  { id: 'overview', label: '개요' },
  { id: 'images-analysis', label: '이미지·분석' },
  { id: 'results', label: '결과' },
]

type WorkflowStatus = {
  title: string
  description: string
  summary: string
  badge: string
  tone: 'default' | 'success' | 'warning' | 'danger'
  primaryAction: string
  primaryTab: WorkflowTab
  secondaryAction?: {
    label: string
    tab: WorkflowTab
  }
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
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

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</div>
      <div className="mt-1 break-all text-sm text-slate-900">{value}</div>
    </div>
  )
}

function CompactEmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="compact-empty">
      <div className="text-base font-semibold text-slate-900">{title}</div>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

function CompactStatusCard({ title, value, description, actionLabel, onAction }: { title: string; value: string; description: string; actionLabel: string; onAction: () => void }) {
  return (
    <article className="compact-status-card">
      <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{title}</div>
      <div className="mt-2 text-lg font-semibold text-slate-950">{value}</div>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
      <button className="btn btn-secondary mt-4" type="button" onClick={onAction}>
        {actionLabel}
      </button>
    </article>
  )
}

function EntityModal({ isOpen, title, description, children, onClose }: { isOpen: boolean; title: string; description: string; children: ReactNode; onClose: () => void }) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="modal-card max-h-[calc(100vh-3rem)] overflow-y-auto" onClick={(event) => event.stopPropagation()}>
        <h2 className="panel-title">{title}</h2>
        <p className="panel-description">{description}</p>
        <div className="mt-6">{children}</div>
      </section>
    </div>
  )
}

function ModalActions({ isSubmitting, onCancel, submitText = '저장' }: { isSubmitting: boolean; onCancel: () => void; submitText?: string }) {
  return (
    <div className="flex justify-end gap-3">
      <button className="btn btn-secondary" type="button" onClick={onCancel}>취소</button>
      <button className="btn btn-primary" type="submit" disabled={isSubmitting}>{submitText}</button>
    </div>
  )
}

function PreviewModal({ isOpen, imageName, previewUrl, expiresAt, isLoading, error, onClose }: { isOpen: boolean; imageName: string; previewUrl?: string; expiresAt?: string; isLoading: boolean; error: string | null; onClose: () => void }) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="w-full max-w-4xl rounded-[1.75rem] bg-white p-6" onClick={(event) => event.stopPropagation()}>
        <div className="toolbar">
          <div>
            <h2 className="panel-title">이미지 미리보기</h2>
            <p className="panel-description">{imageName}{expiresAt ? ` · 만료 ${formatDateTime(expiresAt)}` : ''}</p>
          </div>
          <button className="btn btn-secondary" type="button" onClick={onClose}>닫기</button>
        </div>
        <div className="mt-6">
          {isLoading ? <LoadingState message="미리보기를 불러오는 중입니다." /> : null}
          {error ? <ErrorState title="이미지 미리보기를 불러오지 못했습니다." description={error} /> : null}
          {!isLoading && !error && previewUrl ? (
            <div className="space-y-4">
              <img className="max-h-[70vh] w-full rounded-3xl border border-slate-200 bg-slate-50 object-contain" src={previewUrl} alt={imageName || '점검 이미지 미리보기'} />
              <div className="text-sm text-slate-500">이미지를 확인한 뒤 분석 요청 또는 다시 업로드 여부를 결정할 수 있습니다.</div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}

function sortJobsDescending(jobs: AnalysisJobSummary[]): AnalysisJobSummary[] {
  return [...jobs].sort((a, b) => {
    const timeA = a.requestedAt ?? ''
    const timeB = b.requestedAt ?? ''
    if (timeB !== timeA) return timeB.localeCompare(timeA)
    return b.jobId - a.jobId
  })
}

type ImageJobState = {
  hasActiveJob: boolean
  latestJob: AnalysisJobSummary | null
  latestSucceededJob: AnalysisJobSummary | null
  latestFailedJob: AnalysisJobSummary | null
  canRetry: boolean
}

function computeImageJobStateMap(jobs: AnalysisJobSummary[]): Map<number, ImageJobState> {
  const grouped = new Map<number, AnalysisJobSummary[]>()
  for (const job of jobs) {
    if (job.imageId == null) continue
    const list = grouped.get(job.imageId) ?? []
    list.push(job)
    grouped.set(job.imageId, list)
  }

  const map = new Map<number, ImageJobState>()
  for (const [imageId, imageJobs] of grouped) {
    // imageJobs는 API 반환 순서(최신 우선) 그대로 사용
    const hasActiveJob = imageJobs.some(
      (j) => j.jobStatus === 'QUEUED' || j.jobStatus === 'RUNNING',
    )
    const latestJob = imageJobs[0] ?? null
    const latestSucceededJob = imageJobs.find((j) => j.jobStatus === 'SUCCEEDED') ?? null
    const latestFailedJob = imageJobs.find((j) => j.jobStatus === 'FAILED') ?? null

    // SUCCEEDED가 FAILED보다 최신(높은 jobId)이면 재시도 불필요
    const hasNewerSucceedThanFailed =
      latestSucceededJob != null && latestFailedJob != null
        ? latestSucceededJob.jobId > latestFailedJob.jobId
        : false

    const canRetry = !hasActiveJob && latestFailedJob != null && !hasNewerSucceedThanFailed

    map.set(imageId, { hasActiveJob, latestJob, latestSucceededJob, latestFailedJob, canRetry })
  }

  return map
}

function getLatestImageByType(images: ImageSummary[], imageType: ImageType) {
  const matches = images.filter((image) => image.imageType === imageType)
  return matches.length > 0 ? matches[matches.length - 1] : null
}

function canRequestAnalysis(image: ImageSummary, runningImageJobIds: Set<number>) {
  return isActiveResource(image.status) && !runningImageJobIds.has(image.imageId)
}

function getUserImageTypeLabel(imageType: ImageType) {
  return imageType === 'RGB' ? 'RGB' : '열화상'
}

function getUserTargetTypeLabel(targetType: TargetType) {
  switch (targetType) {
    case 'ZONE':
      return '전체 영역'
    case 'ARRAY':
      return 'Array'
    case 'PANEL':
      return 'Panel'
    case 'MODULE':
      return 'Module'
  }
}

function getUserUploadStatusLabel(status: ImageSummary['uploadStatus']) {
  return status === 'UPLOADED' ? '업로드 완료' : '업로드 실패'
}

function getUserUploadStatusTone(status: ImageSummary['uploadStatus']) {
  return status === 'UPLOADED' ? 'success' : 'danger'
}

function getUserInputTypeLabel(inputType: AnalysisInputType) {
  return inputType === 'RGB_SINGLE' ? 'RGB 단건 분석' : '열화상 단건 분석'
}

function getUserJobStatusLabel(status: AnalysisJobStatus) {
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

function getUserJobStatusTone(status: AnalysisJobStatus) {
  switch (status) {
    case 'QUEUED':
      return 'warning'
    case 'RUNNING':
      return 'default'
    case 'SUCCEEDED':
      return 'success'
    case 'FAILED':
      return 'danger'
  }
}

function getAnalysisSummaryLabel(jobRows: AnalysisJobSummary[]) {
  if (jobRows.length === 0) {
    return '분석 요청 대기'
  }

  const queuedCount = jobRows.filter((job) => job.jobStatus === 'QUEUED').length
  const runningCount = jobRows.filter((job) => job.jobStatus === 'RUNNING').length
  const failedCount = jobRows.filter((job) => job.jobStatus === 'FAILED').length

  if (runningCount > 0) {
    return `분석 중 ${runningCount}건`
  }
  if (queuedCount > 0) {
    return `대기 중 ${queuedCount}건`
  }
  if (failedCount > 0) {
    return `실패 ${failedCount}건`
  }

  return '분석 완료'
}

function getImageNameById(images: ImageSummary[], imageId: number | null) {
  if (!imageId) {
    return '-'
  }

  return images.find((image) => image.imageId === imageId)?.originalFilename || '이미지 확인 필요'
}

function sanitizeFailureMessage(message: string) {
  const trimmed = message.trim()
  if (!trimmed) {
    return '분석에 실패했습니다. 다시 요청하거나 이미지를 다시 업로드해 주세요.'
  }

  return trimmed.replace(/traceId|stack|exception|objectKey|bucket/gi, '').trim()
}

function getWorkflowStatus({
  imageCount,
  hasRequestableImage,
  queuedCount,
  runningCount,
  failedJob,
  hasResults,
}: {
  imageCount: number
  hasRequestableImage: boolean
  queuedCount: number
  runningCount: number
  failedJob: AnalysisJobSummary | null
  hasResults: boolean
}): WorkflowStatus {
  if (imageCount === 0) {
    return {
      title: '이미지 업로드부터 시작하세요.',
      description: 'RGB 또는 열화상 이미지를 등록하면 바로 분석 요청으로 이어갈 수 있습니다.',
      summary: '이미지 업로드 대기',
      badge: '업로드 필요',
      tone: 'warning',
      primaryAction: '이미지 업로드',
      primaryTab: 'images-analysis',
      secondaryAction: undefined,
    }
  }

  if (failedJob) {
    return {
      title: '실패한 분석을 다시 확인하세요.',
      description: '이미지·분석 탭에서 실패 원인을 확인하고 다시 요청하거나 이미지를 다시 업로드할 수 있습니다.',
      summary: '실패한 분석 있음',
      badge: '재확인 필요',
      tone: 'danger',
      primaryAction: '이미지·분석 확인',
      primaryTab: 'images-analysis',
      secondaryAction: undefined,
    }
  }

  if (runningCount > 0 || queuedCount > 0) {
    return {
      title: '분석 진행 상태를 확인하세요.',
      description: '요청한 분석이 처리 중입니다. 상태를 새로고침해 완료 여부를 확인할 수 있습니다.',
      summary: '분석 진행 중',
      badge: '처리 중',
      tone: 'default',
      primaryAction: '분석 상태 보기',
      primaryTab: 'images-analysis',
      secondaryAction: hasResults
        ? {
            label: '결과 보기',
            tab: 'results',
          }
        : undefined,
    }
  }

  if (hasResults) {
    return {
      title: '분석 결과를 검토하세요.',
      description: '최신 결과의 조치 후보와 심각도를 확인하고 결과 상세로 이동할 수 있습니다.',
      summary: '결과 확인 가능',
      badge: '검토 가능',
      tone: 'success',
      primaryAction: '결과 검토',
      primaryTab: 'results',
      secondaryAction: hasRequestableImage
        ? {
            label: '추가 분석 요청',
            tab: 'images-analysis',
          }
        : undefined,
    }
  }

  if (hasRequestableImage) {
    return {
      title: '분석 요청을 진행하세요.',
      description: '업로드된 이미지를 바탕으로 RGB 또는 열화상 분석을 각각 요청할 수 있습니다.',
      summary: '분석 요청 대기',
      badge: '요청 가능',
      tone: 'warning',
      primaryAction: '분석 요청',
      primaryTab: 'images-analysis',
      secondaryAction: undefined,
    }
  }

  return {
    title: '업로드된 이미지를 확인하세요.',
    description: '현재 등록된 이미지는 대기 중이거나 비활성화되어 있습니다. 이미지를 다시 확인한 뒤 다음 작업을 진행하세요.',
    summary: '이미지 확인 필요',
    badge: '확인 필요',
    tone: 'warning',
    primaryAction: '이미지 보기',
    primaryTab: 'images-analysis',
    secondaryAction: undefined,
  }
}
