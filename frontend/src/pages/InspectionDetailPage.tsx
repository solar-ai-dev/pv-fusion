
import type { ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useParams } from 'react-router-dom'
import { z } from 'zod'
import {
  useAnalysisJob,
  useAnalysisJobs,
  useCreateAnalysisJob,
  useRetryAnalysisJob,
} from '../features/analysisJobs/hooks/useAnalysisJobs'
import type { AnalysisInputType, AnalysisJobSummary, AnalysisJobStatus } from '../features/analysisJobs/types'
import { useEquipments } from '../features/equipments/hooks/useEquipments'
import { flattenEquipmentTree } from '../features/equipments/types'
import { IMAGE_TYPE_OPTIONS, TARGET_TYPE_OPTIONS, type ImageSummary, type ImageType, type TargetType } from '../features/images/types'
import { useDeactivateImage, useImagePreview, useImages, useUploadImage } from '../features/images/hooks/useImages'
import { CAPTURE_METHOD_OPTIONS, getCaptureMethodLabel, getInspectionStatusLabel, getInspectionStatusTone, type UpdateInspectionRequest } from '../features/inspections/types'
import { useInspection, useUpdateInspection } from '../features/inspections/hooks/useInspections'
import { getResourceStatusLabel, getResourceStatusTone } from '../features/plants/types'
import { getActionCandidateLabel, getResultStatusLabel, getResultStatusTone, getReviewStatusLabel, getReviewStatusTone, getSeverityLevelLabel, getSeverityLevelTone } from '../features/results/types'
import { useResults } from '../features/results/hooks/useResults'
import { useZone } from '../features/zones/hooks/useZones'
import { ConfirmModal } from '../shared/components/feedback/ConfirmModal'
import { FormField } from '../shared/components/form/FormField'
import { PageHeader } from '../shared/components/layout/PageHeader'
import { EmptyState } from '../shared/components/state/EmptyState'
import { ErrorState } from '../shared/components/state/ErrorState'
import { LoadingState } from '../shared/components/state/LoadingState'
import { StatusBadge } from '../shared/components/state/StatusBadge'
import { useToast } from '../shared/hooks/useToast'
import { formatDateTime, getApiErrorMessage, isActiveResource, isRunningAnalysisJob, parsePositiveNumber, toDateTimeLocalInputValue, toOffsetDateTime } from '../shared/utils'

const updateInspectionSchema = z.object({
  name: z.string().trim().min(1, '점검명을 입력해 주세요.'),
  capturedAt: z.string().optional(),
  captureMethod: z.enum(CAPTURE_METHOD_OPTIONS),
  inspectorName: z.string().optional(),
  memo: z.string().optional(),
})

const uploadImageSchema = z.object({
  targetType: z.enum(TARGET_TYPE_OPTIONS),
  equipmentId: z.string().optional(),
  imageType: z.enum(IMAGE_TYPE_OPTIONS),
  capturedAt: z.string().optional(),
  memo: z.string().optional(),
  file: z.custom<FileList | undefined>((value) => value === undefined || value instanceof FileList, '업로드할 이미지를 선택해 주세요.'),
}).superRefine((value, context) => {
  const hasFile = value.file instanceof FileList && value.file.length > 0
  if (!hasFile) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['file'], message: '업로드할 이미지를 선택해 주세요.' })
  }
  if (value.targetType === 'ZONE' && value.equipmentId) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['equipmentId'], message: '전체 영역 업로드에서는 설비 위치를 선택하지 않습니다.' })
  }
  if (value.targetType !== 'ZONE' && !value.equipmentId) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['equipmentId'], message: 'Array, Panel, Module 단위로 업로드하려면 설비 위치를 선택하세요.' })
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
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null)
  const [uploadFormVersion, setUploadFormVersion] = useState(0)
  const [showAdvancedUploadOptions, setShowAdvancedUploadOptions] = useState(false)

  const inspectionQuery = useInspection(inspectionId ?? 0)
  const zoneId = inspectionQuery.data?.data.zoneId ?? 0
  const zoneQuery = useZone(zoneId)
  const equipmentsQuery = useEquipments(zoneId, {})
  const imagesQuery = useImages({ inspectionId: inspectionId ?? undefined })
  const resultsQuery = useResults({ inspectionId: inspectionId ?? undefined, page: 0, size: 5 }, Boolean(inspectionId))
  const updateInspectionMutation = useUpdateInspection(inspectionId ?? 0)
  const uploadImageMutation = useUploadImage(inspectionId ?? 0)
  const deactivateImageMutation = useDeactivateImage(inspectionId ?? 0)
  const previewQuery = useImagePreview(previewImageId ?? 0, Boolean(previewImageId))
  const analysisJobsQuery = useAnalysisJobs({ inspectionId: inspectionId ?? undefined, page: 0, size: 20 }, Boolean(inspectionId))
  const selectedJobQuery = useAnalysisJob(selectedJobId ?? 0, Boolean(selectedJobId))
  const createAnalysisJobMutation = useCreateAnalysisJob()
  const retryAnalysisJobMutation = useRetryAnalysisJob(selectedJobId ?? 0)

  const inspectionForm = useForm<UpdateInspectionFormValues>({ resolver: zodResolver(updateInspectionSchema), defaultValues: { name: '', capturedAt: '', captureMethod: 'DRONE', inspectorName: '', memo: '' } })
  const uploadForm = useForm<UploadImageFormValues>({ resolver: zodResolver(uploadImageSchema), defaultValues: { targetType: 'ZONE', equipmentId: '', imageType: 'RGB', capturedAt: '', memo: '', file: undefined } })

  const flattenedEquipments = useMemo(() => flattenEquipmentTree(equipmentsQuery.data?.data ?? []), [equipmentsQuery.data])
  const selectedTargetType = uploadForm.watch('targetType')
  const selectedImageType = uploadForm.watch('imageType')
  const isZoneUploadTarget = selectedTargetType === 'ZONE'
  const uploadEquipmentOptions = useMemo(() => isZoneUploadTarget ? [] : flattenedEquipments.filter((equipment) => equipment.equipmentType === selectedTargetType), [flattenedEquipments, isZoneUploadTarget, selectedTargetType])
  const isUploadEquipmentEmpty = !isZoneUploadTarget && !equipmentsQuery.isLoading && !equipmentsQuery.isError && uploadEquipmentOptions.length === 0

  const imageRows = useMemo(() => imagesQuery.data?.data ?? [], [imagesQuery.data])
  const jobRows = useMemo(() => analysisJobsQuery.data?.data.content ?? [], [analysisJobsQuery.data])
  const resultRows = useMemo(() => resultsQuery.data?.data.content ?? [], [resultsQuery.data])
  const selectedJob = selectedJobQuery.data?.data ?? null
  const runningImageJobIds = useMemo(() => new Set(jobRows.filter((job) => job.imageId != null && isRunningAnalysisJob(job.jobStatus)).map((job) => job.imageId as number)), [jobRows])
  const rgbImages = useMemo(() => imageRows.filter((image) => image.imageType === 'RGB'), [imageRows])
  const thermalImages = useMemo(() => imageRows.filter((image) => image.imageType === 'THERMAL'), [imageRows])
  const latestRgbImage = useMemo(() => getLatestImageByType(imageRows, 'RGB'), [imageRows])
  const latestThermalImage = useMemo(() => getLatestImageByType(imageRows, 'THERMAL'), [imageRows])
  const rgbRequestableImage = latestRgbImage && canRequestAnalysis(latestRgbImage, runningImageJobIds) ? latestRgbImage : null
  const thermalRequestableImage = latestThermalImage && canRequestAnalysis(latestThermalImage, runningImageJobIds) ? latestThermalImage : null
  const latestFailedJob = jobRows.find((job) => job.jobStatus === 'FAILED') ?? null
  const latestResult = resultRows[0] ?? null

  useEffect(() => {
    if (!inspectionQuery.data) return
    inspectionForm.reset({ name: inspectionQuery.data.data.name, capturedAt: toDateTimeLocalInputValue(inspectionQuery.data.data.capturedAt), captureMethod: inspectionQuery.data.data.captureMethod, inspectorName: inspectionQuery.data.data.inspectorName ?? '', memo: inspectionQuery.data.data.memo ?? '' })
  }, [inspectionForm, inspectionQuery.data])

  useEffect(() => {
    const currentEquipmentId = uploadForm.getValues('equipmentId')
    if (selectedTargetType === 'ZONE') {
      if (currentEquipmentId) uploadForm.setValue('equipmentId', '')
      return
    }
    if (currentEquipmentId && !uploadEquipmentOptions.some((equipment) => String(equipment.equipmentId) === currentEquipmentId)) {
      uploadForm.setValue('equipmentId', '')
    }
  }, [selectedTargetType, uploadEquipmentOptions, uploadForm])

  useEffect(() => {
    if (!selectedJobId && jobRows[0]) setSelectedJobId(jobRows[0].jobId)
  }, [jobRows, selectedJobId])

  if (!inspectionId) return <ErrorState title="올바르지 않은 점검 정보입니다." description="주소의 점검 정보를 다시 확인해 주세요." />
  if (inspectionQuery.isLoading && !inspectionQuery.data) return <LoadingState message="점검 정보를 불러오는 중입니다." />
  if (inspectionQuery.isError || !inspectionQuery.data) return <ErrorState title="점검 상세를 불러오지 못했습니다." description={getApiErrorMessage(inspectionQuery.error)} />

  const inspection = inspectionQuery.data.data

  const handleUpdateInspection = inspectionForm.handleSubmit(async (values) => {
    const payload: UpdateInspectionRequest = { name: values.name.trim(), capturedAt: toOffsetDateTime(values.capturedAt), captureMethod: values.captureMethod, inspectorName: values.inspectorName?.trim() || null, memo: values.memo?.trim() || null }
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
    if (!file) return
    try {
      const response = await uploadImageMutation.mutateAsync({ inspectionId, equipmentId: values.targetType === 'ZONE' ? null : Number(values.equipmentId), targetType: values.targetType, imageType: values.imageType, capturedAt: toOffsetDateTime(values.capturedAt), memo: values.memo?.trim() || null, file })
      toast.push(response.message || '이미지가 업로드되었습니다.')
      uploadForm.reset({ targetType: 'ZONE', equipmentId: '', imageType: values.imageType, capturedAt: '', memo: '', file: undefined })
      setUploadFormVersion((current) => current + 1)
    } catch (error) {
      toast.push(getApiErrorMessage(error, '이미지 업로드에 실패했습니다. 파일 형식과 업로드 대상을 다시 확인해 주세요.'))
    }
  })
  const handleDeactivateImage = async () => {
    if (!selectedImage) return
    try {
      const response = await deactivateImageMutation.mutateAsync(selectedImage.imageId)
      toast.push(response.message || '이미지를 비활성화했습니다.')
      setSelectedImage(null)
    } catch (error) {
      toast.push(getApiErrorMessage(error, '이미지 비활성화에 실패했습니다.'))
    }
  }

  const requestSingleAnalysis = async (image: ImageSummary) => {
    try {
      const response = await createAnalysisJobMutation.mutateAsync({ imageId: image.imageId })
      setSelectedJobId(response.data.jobId)
      toast.push(response.message || `${getUserImageTypeLabel(image.imageType)} 분석 요청이 등록되었습니다.`)
      await analysisJobsQuery.refetch()
    } catch (error) {
      toast.push(getApiErrorMessage(error, '분석 요청에 실패했습니다.'))
    }
  }

  const handleRefreshJobs = async () => {
    await analysisJobsQuery.refetch()
    await resultsQuery.refetch()
    if (selectedJobId) await selectedJobQuery.refetch()
  }

  const handleRetryJob = async () => {
    if (!selectedJobId) return
    try {
      const response = await retryAnalysisJobMutation.mutateAsync(undefined)
      toast.push(response.message || '분석을 다시 요청했습니다.')
      await handleRefreshJobs()
    } catch (error) {
      toast.push(getApiErrorMessage(error, '다시 요청에 실패했습니다.'))
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="점검 상세"
        description="이 점검의 이미지 업로드, 분석 요청, 결과 확인을 진행하세요."
        actions={
          <>
            <Link className="btn btn-secondary" to="/inspections">점검 목록</Link>
            <button className="btn btn-primary" type="button" onClick={() => setIsEditModalOpen(true)}>점검 정보 수정</button>
          </>
        }
      />

      <section className="panel stack-md">
        <div className="toolbar">
          <div className="stack-sm">
            <div className="inline-actions">
              <StatusBadge label={getInspectionStatusLabel(inspection.inspectionStatus)} tone={getInspectionStatusTone(inspection.inspectionStatus)} />
              <StatusBadge label={getCaptureMethodLabel(inspection.captureMethod)} />
              <StatusBadge label={getAnalysisSummaryLabel(jobRows)} />
            </div>
            <div>
              <h2 className="panel-title">{inspection.name}</h2>
              <p className="panel-description">이 점검의 다음 작업을 아래 순서대로 진행하세요.</p>
            </div>
          </div>
          <div className="inline-actions">
            <Link className="btn btn-secondary" to={`/zones/${inspection.zoneId}`}>점검 영역 상세</Link>
            {zoneQuery.data ? <Link className="btn btn-secondary" to={`/plants/${zoneQuery.data.data.plantId}`}>발전소 상세</Link> : null}
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <SummaryItem label="발전소" value={zoneQuery.data ? `발전소 ${zoneQuery.data.data.plantId}` : '-'} />
          <SummaryItem label="점검 영역" value={zoneQuery.data?.data.name || '점검 영역 정보를 불러오는 중입니다.'} />
          <SummaryItem label="점검 상태" value={getInspectionStatusLabel(inspection.inspectionStatus)} />
          <SummaryItem label="촬영 시각" value={formatDateTime(inspection.capturedAt)} />
          <SummaryItem label="촬영 방식" value={getCaptureMethodLabel(inspection.captureMethod)} />
          <SummaryItem label="점검자" value={inspection.inspectorName || '-'} />
          <SummaryItem label="업로드 이미지" value={`${imageRows.length}건`} />
          <SummaryItem label="분석 작업" value={getAnalysisSummaryLabel(jobRows)} />
          <SummaryItem label="분석 결과" value={latestResult ? '결과가 있습니다.' : '아직 결과가 없습니다.'} />
        </div>
      </section>

      <section className="panel stack-md">
        <SectionHeading step="Step 1" title="점검 정보" description="이 점검의 기본 정보를 확인하고 필요한 경우 수정하세요." />
        <div className="detail-grid">
          <DetailItem label="점검명" value={inspection.name} />
          <DetailItem label="촬영 시각" value={formatDateTime(inspection.capturedAt)} />
          <DetailItem label="촬영 방식" value={getCaptureMethodLabel(inspection.captureMethod)} />
          <DetailItem label="점검자" value={inspection.inspectorName || '-'} />
          <DetailItem label="메모" value={inspection.memo || '-'} />
          <DetailItem label="등록 시각" value={formatDateTime(inspection.createdAt)} />
        </div>
      </section>

      <section id="image-upload-section" className="panel stack-md">
        <SectionHeading step="Step 2" title="이미지 업로드" description="RGB 이미지와 열화상 이미지를 구분해 업로드하세요. 업로드가 끝나면 바로 분석 요청으로 이어갈 수 있습니다." />
        <div className="grid gap-4 lg:grid-cols-2">
          <ImageTypeCard title="RGB 이미지" description="외관 이상, 오염, 음영 등을 분석합니다." isSelected={selectedImageType === 'RGB'} count={rgbImages.length} buttonText="RGB 업로드 준비" onSelect={() => uploadForm.setValue('imageType', 'RGB')} />
          <ImageTypeCard title="열화상 이미지" description="핫스팟, 과열 영역을 분석합니다." isSelected={selectedImageType === 'THERMAL'} count={thermalImages.length} buttonText="열화상 업로드 준비" onSelect={() => uploadForm.setValue('imageType', 'THERMAL')} />
        </div>

        <form className="stack-md" onSubmit={handleUploadImage}>
          <FormField label="업로드할 이미지 유형 *" error={uploadForm.formState.errors.imageType?.message}>
            <select className="input-field" {...uploadForm.register('imageType')}>
              {IMAGE_TYPE_OPTIONS.map((imageType) => <option key={imageType} value={imageType}>{getUserImageTypeLabel(imageType)}</option>)}
            </select>
          </FormField>
          <FormField label={`${getUserImageTypeLabel(selectedImageType)} 파일 *`} hint="이미지 한 장씩 업로드한 뒤 필요한 경우 추가로 반복 업로드하세요." error={uploadForm.formState.errors.file?.message}>
            <input key={uploadFormVersion} className="input-field" type="file" accept="image/*" {...uploadForm.register('file')} />
          </FormField>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <button className="text-button" type="button" onClick={() => setShowAdvancedUploadOptions((current) => !current)}>{showAdvancedUploadOptions ? '고급 설정 접기' : '고급 설정 열기'}</button>
            {showAdvancedUploadOptions ? (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <FormField label="검사 대상 단위" error={uploadForm.formState.errors.targetType?.message}>
                  <select className="input-field" {...uploadForm.register('targetType')}>
                    {TARGET_TYPE_OPTIONS.map((targetType) => <option key={targetType} value={targetType}>{getUserTargetTypeLabel(targetType)}</option>)}
                  </select>
                </FormField>
                <FormField label="설비 위치" hint={isZoneUploadTarget ? '전체 영역 업로드에서는 설비 위치를 선택하지 않아도 됩니다.' : 'Array, Panel, Module 단위로 업로드하려면 설비 위치를 선택하세요.'} error={uploadForm.formState.errors.equipmentId?.message}>
                  <select className="input-field" {...uploadForm.register('equipmentId')} disabled={isZoneUploadTarget || isUploadEquipmentEmpty}>
                    <option value="">{selectedTargetType === 'ZONE' ? '설비 위치 선택 없음' : '설비 위치를 선택하세요.'}</option>
                    {uploadEquipmentOptions.map((equipment) => <option key={equipment.equipmentId} value={equipment.equipmentId}>{`${'ㆍ'.repeat(equipment.depth)} ${equipment.name}`}</option>)}
                  </select>
                </FormField>
                <FormField label="촬영 시각" error={uploadForm.formState.errors.capturedAt?.message}><input className="input-field" type="datetime-local" {...uploadForm.register('capturedAt')} /></FormField>
                <FormField label="메모" error={uploadForm.formState.errors.memo?.message}><textarea className="input-field textarea-field" {...uploadForm.register('memo')} /></FormField>
              </div>
            ) : null}
          </div>
          {isUploadEquipmentEmpty ? <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Array, Panel, Module 단위로 업로드하려면 점검 영역 상세에서 설비를 먼저 등록하세요.</div> : null}
          <div className="flex justify-end"><button className="btn btn-primary" type="submit" disabled={uploadImageMutation.isPending}>{`${getUserImageTypeLabel(selectedImageType)} 이미지 업로드`}</button></div>
        </form>
        <div className="stack-md">
          <div>
            <h3 className="panel-title">업로드된 이미지</h3>
            <p className="panel-description">업로드한 이미지를 확인하고 미리보기, 분석 요청, 비활성화를 진행할 수 있습니다.</p>
          </div>
          {imageRows.length === 0 ? (
            <div className="state-card space-y-4">
              <EmptyState title="아직 업로드된 이미지가 없습니다." description="RGB 또는 열화상 이미지를 업로드하면 분석을 요청할 수 있습니다." />
              <div className="flex flex-wrap justify-center gap-3">
                <button className="btn btn-secondary" type="button" onClick={() => uploadForm.setValue('imageType', 'RGB')}>RGB 이미지 업로드</button>
                <button className="btn btn-secondary" type="button" onClick={() => uploadForm.setValue('imageType', 'THERMAL')}>열화상 이미지 업로드</button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {imageRows.map((image) => {
                const canRequest = canRequestAnalysis(image, runningImageJobIds)
                return <article key={image.imageId} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="min-w-0"><div className="truncate text-sm font-semibold text-slate-900">{image.originalFilename}</div><div className="mt-2 flex flex-wrap gap-2"><StatusBadge label={getUserImageTypeLabel(image.imageType)} /><StatusBadge label={getUserUploadStatusLabel(image.uploadStatus)} tone={getUserUploadStatusTone(image.uploadStatus)} /><StatusBadge label={getResourceStatusLabel(image.status)} tone={getResourceStatusTone(image.status)} /></div></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><MiniInfo label="검사 대상" value={getUserTargetTypeLabel(image.targetType)} /><MiniInfo label="촬영 시각" value={formatDateTime(image.capturedAt)} /><MiniInfo label="분석 가능 여부" value={canRequest ? '요청 가능' : '대기 중이거나 비활성화됨'} /><MiniInfo label="미리보기" value="가능" /></div><div className="mt-4 flex flex-wrap gap-3"><button className="btn btn-secondary" type="button" onClick={() => setPreviewImageId(image.imageId)}>미리보기</button><button className="btn btn-secondary" type="button" disabled={!canRequest || createAnalysisJobMutation.isPending} onClick={() => requestSingleAnalysis(image)}>{`${getUserImageTypeLabel(image.imageType)} 분석 요청`}</button><button className="btn btn-secondary" type="button" onClick={() => setSelectedImage(image)}>비활성화</button></div></article>
              })}
            </div>
          )}
        </div>
      </section>

      <section className="panel stack-md">
        <SectionHeading step="Step 3" title="분석 요청" description="분석 가능한 이미지가 있으면 바로 요청할 수 있습니다. RGB 단건 분석과 열화상 단건 분석을 우선 제공합니다." />
        <div className="grid gap-4 lg:grid-cols-2">
          <AnalysisRequestCard title="RGB 분석" description={rgbRequestableImage ? 'RGB 이미지 분석을 요청할 수 있습니다.' : rgbImages.length > 0 ? '이미 분석 중이거나 요청 대기 중인 RGB 이미지가 있습니다.' : '먼저 RGB 이미지를 업로드하세요.'} buttonText="RGB 분석 요청" disabled={!rgbRequestableImage || createAnalysisJobMutation.isPending} onClick={() => rgbRequestableImage && requestSingleAnalysis(rgbRequestableImage)} />
          <AnalysisRequestCard title="열화상 분석" description={thermalRequestableImage ? '열화상 이미지 분석을 요청할 수 있습니다.' : thermalImages.length > 0 ? '이미 분석 중이거나 요청 대기 중인 열화상 이미지가 있습니다.' : '먼저 열화상 이미지를 업로드하세요.'} buttonText="열화상 분석 요청" disabled={!thermalRequestableImage || createAnalysisJobMutation.isPending} onClick={() => thermalRequestableImage && requestSingleAnalysis(thermalRequestableImage)} />
        </div>
        {!rgbRequestableImage && !thermalRequestableImage && imageRows.length === 0 ? <EmptyState title="분석할 이미지가 없습니다." description="먼저 RGB 또는 열화상 이미지를 업로드하세요." /> : null}
      </section>

      <section className="panel stack-md">
        <SectionHeading step="Step 4" title="분석 상태" description="요청한 분석의 진행 상태를 확인하고 실패한 경우 같은 화면에서 다시 요청할 수 있습니다." />
        <div className="toolbar"><div><h3 className="panel-title">분석 작업 목록</h3><p className="panel-description">대기 중, 분석 중, 완료, 실패 상태를 여기서 바로 확인할 수 있습니다.</p></div><button className="btn btn-secondary" type="button" onClick={handleRefreshJobs}>상태 새로고침</button></div>
        {analysisJobsQuery.isLoading && !analysisJobsQuery.data ? <LoadingState message="분석 상태를 불러오는 중입니다." /> : null}
        {analysisJobsQuery.isError ? <ErrorState title="분석 상태를 불러오지 못했습니다." description={getApiErrorMessage(analysisJobsQuery.error)} /> : null}
        {jobRows.length === 0 && !analysisJobsQuery.isLoading ? <EmptyState title="아직 요청된 분석 작업이 없습니다." description="이미지를 업로드한 뒤 분석을 요청하세요." /> : null}
        {latestFailedJob ? <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-rose-900"><div className="text-base font-semibold">분석에 실패했습니다.</div><p className="mt-2 text-sm">이미지 파일 문제이거나 일시적인 서버 오류일 수 있습니다. {selectedJobId === latestFailedJob.jobId && selectedJob?.failureMessage ? sanitizeFailureMessage(selectedJob.failureMessage) : '잠시 후 다시 요청하거나 이미지를 다시 업로드해 주세요.'}</p><div className="mt-4 flex flex-wrap gap-3"><button className="btn btn-primary" type="button" onClick={() => { setSelectedJobId(latestFailedJob.jobId); void handleRetryJob() }} disabled={retryAnalysisJobMutation.isPending}>다시 요청</button><button className="btn btn-secondary" type="button" onClick={scrollToImageUploadSection}>이미지 다시 업로드</button></div></div> : null}
        {jobRows.length > 0 ? <div className="grid gap-4 xl:grid-cols-2">{jobRows.map((job) => <article key={job.jobId} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="toolbar gap-3"><div><div className="text-base font-semibold text-slate-900">{getUserInputTypeLabel(job.inputType)}</div><p className="mt-1 text-sm text-slate-500">요청 {formatDateTime(job.requestedAt)}</p></div><StatusBadge label={getUserJobStatusLabel(job.jobStatus)} tone={getUserJobStatusTone(job.jobStatus)} /></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><MiniInfo label="대상 이미지" value={getImageNameById(imageRows, job.imageId)} /><MiniInfo label="진행 상태" value={getUserJobStatusLabel(job.jobStatus)} /><MiniInfo label="시작 시각" value={formatDateTime(job.startedAt)} /><MiniInfo label="완료 시각" value={formatDateTime(job.completedAt)} /></div>{job.jobStatus === 'FAILED' ? <p className="mt-4 text-sm text-rose-700">{sanitizeFailureMessage(selectedJobId === job.jobId && selectedJob?.failureMessage ? selectedJob.failureMessage : '분석에 실패했습니다. 다시 요청하거나 이미지를 다시 업로드해 주세요.')}</p> : null}<div className="mt-4 flex flex-wrap gap-3"><button className="btn btn-secondary" type="button" onClick={() => setSelectedJobId(job.jobId)}>상세 확인</button>{job.jobStatus === 'FAILED' ? <button className="btn btn-primary" type="button" disabled={retryAnalysisJobMutation.isPending} onClick={() => { setSelectedJobId(job.jobId); void handleRetryJob() }}>다시 요청</button> : null}{job.jobStatus === 'SUCCEEDED' ? <Link className="btn btn-secondary" to={`/results?inspectionId=${inspectionId}`}>분석 결과 보기</Link> : null}</div></article>)}</div> : null}
      </section>

      <section className="panel stack-md">
        <SectionHeading step="Step 5" title="결과 검토" description="분석이 완료되면 조치 후보와 심각도를 확인하고 결과 상세로 이동할 수 있습니다." />
        {resultsQuery.isLoading && !resultsQuery.data ? <LoadingState message="분석 결과를 불러오는 중입니다." /> : null}
        {resultsQuery.isError ? <ErrorState title="분석 결과를 불러오지 못했습니다." description={getApiErrorMessage(resultsQuery.error)} /> : null}
        {resultRows.length === 0 && !resultsQuery.isLoading ? <EmptyState title="아직 분석 결과가 없습니다." description="분석이 완료되면 조치 후보와 심각도를 확인할 수 있습니다." /> : null}
        {latestResult ? <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]"><section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="toolbar"><div><h3 className="text-lg font-semibold text-slate-900">최신 분석 결과</h3><p className="mt-1 text-sm text-slate-500">{latestResult.analyzedAt ? `${formatDateTime(latestResult.analyzedAt)} 기준` : '분석 시각 확인 중'}</p></div><div className="flex flex-wrap gap-2"><StatusBadge label={getResultStatusLabel(latestResult.resultStatus)} tone={getResultStatusTone(latestResult.resultStatus)} /><StatusBadge label={getReviewStatusLabel(latestResult.reviewStatus)} tone={getReviewStatusTone(latestResult.reviewStatus)} /></div></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><MiniInfo label="조치 후보" value={getActionCandidateLabel(latestResult.actionCandidate)} /><MiniInfo label="심각도" value={getSeverityLevelLabel(latestResult.severityLevel)} /><MiniInfo label="이상 개수" value={latestResult.anomalyCount == null ? '-' : `${latestResult.anomalyCount}건`} /><MiniInfo label="검토 상태" value={getReviewStatusLabel(latestResult.reviewStatus)} /></div><div className="mt-4 flex flex-wrap gap-3"><Link className="btn btn-primary" to={`/results/${latestResult.resultId}`}>결과 상세 보기</Link><Link className="btn btn-secondary" to={`/results?inspectionId=${inspectionId}`}>이 점검의 결과 목록</Link></div></section><section className="rounded-3xl border border-slate-200 bg-slate-50 p-5"><h3 className="text-lg font-semibold text-slate-900">결과 요약</h3><div className="mt-4 space-y-3">{resultRows.slice(0, 3).map((result) => <div key={result.resultId} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex flex-wrap items-center gap-2"><StatusBadge label={getResultStatusLabel(result.resultStatus)} tone={getResultStatusTone(result.resultStatus)} /><StatusBadge label={getSeverityLevelLabel(result.severityLevel)} tone={getSeverityLevelTone(result.severityLevel)} /><StatusBadge label={getReviewStatusLabel(result.reviewStatus)} tone={getReviewStatusTone(result.reviewStatus)} /></div><div className="mt-3 grid gap-2 sm:grid-cols-2 text-sm text-slate-600"><span>조치 후보: {getActionCandidateLabel(result.actionCandidate)}</span><span>분석 시각: {formatDateTime(result.analyzedAt)}</span></div></div>)}</div></section></div> : null}
      </section>

      <EntityModal isOpen={isEditModalOpen} title="점검 정보 수정" description="이 점검의 기본 정보를 수정하세요." onClose={() => setIsEditModalOpen(false)}>
        <form className="stack-md" onSubmit={handleUpdateInspection}>
          <FormField label="점검명 *" error={inspectionForm.formState.errors.name?.message}><input className="input-field" {...inspectionForm.register('name')} /></FormField>
          <FormField label="촬영 방식" error={inspectionForm.formState.errors.captureMethod?.message}><select className="input-field" {...inspectionForm.register('captureMethod')}>{CAPTURE_METHOD_OPTIONS.map((method) => <option key={method} value={method}>{getCaptureMethodLabel(method)}</option>)}</select></FormField>
          <FormField label="촬영 시각" error={inspectionForm.formState.errors.capturedAt?.message}><input className="input-field" type="datetime-local" {...inspectionForm.register('capturedAt')} /></FormField>
          <FormField label="점검자" error={inspectionForm.formState.errors.inspectorName?.message}><input className="input-field" {...inspectionForm.register('inspectorName')} /></FormField>
          <FormField label="메모" error={inspectionForm.formState.errors.memo?.message}><textarea className="input-field textarea-field" {...inspectionForm.register('memo')} /></FormField>
          <ModalActions isSubmitting={updateInspectionMutation.isPending} onCancel={() => setIsEditModalOpen(false)} submitText="저장" />
        </form>
      </EntityModal>
      <PreviewModal isOpen={Boolean(previewImageId)} imageName={imageRows.find((image) => image.imageId === previewImageId)?.originalFilename ?? ''} previewUrl={previewQuery.data?.data.url} expiresAt={previewQuery.data?.data.expiresAt} isLoading={previewQuery.isLoading} error={previewQuery.isError ? getApiErrorMessage(previewQuery.error) : null} onClose={() => setPreviewImageId(null)} />
      <ConfirmModal isOpen={Boolean(selectedImage)} title="이미지 비활성화" description={selectedImage ? `${selectedImage.originalFilename} 이미지를 비활성화할까요?` : '선택한 이미지를 비활성화할까요?'} confirmText="비활성화" cancelText="취소" isConfirming={deactivateImageMutation.isPending} onConfirm={handleDeactivateImage} onCancel={() => setSelectedImage(null)} />
    </section>
  )

  function scrollToImageUploadSection() {
    document.getElementById('image-upload-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

function SectionHeading({ step, title, description }: { step: string; title: string; description: string }) {
  return <div><div className="text-xs font-semibold uppercase tracking-[0.08em] text-sky-600">{step}</div><h2 className="mt-2 text-xl font-semibold text-slate-950">{title}</h2><p className="mt-2 text-sm text-slate-600">{description}</p></div>
}
function SummaryItem({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</div><div className="mt-2 text-sm font-medium text-slate-900">{value}</div></div> }
function DetailItem({ label, value }: { label: string; value: string }) { return <div className="detail-item"><span className="detail-label">{label}</span><span className="detail-value">{value}</span></div> }
function MiniInfo({ label, value }: { label: string; value: string }) { return <div><div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</div><div className="mt-1 break-all text-sm text-slate-900">{value}</div></div> }
function ImageTypeCard({ title, description, isSelected, count, buttonText, onSelect }: { title: string; description: string; isSelected: boolean; count: number; buttonText: string; onSelect: () => void }) { return <article className={`rounded-3xl border p-5 transition ${isSelected ? 'border-sky-300 bg-sky-50 shadow-sm' : 'border-slate-200 bg-white'}`}><div className="toolbar gap-3"><div><h3 className="text-lg font-semibold text-slate-950">{title}</h3><p className="mt-2 text-sm text-slate-600">{description}</p></div><StatusBadge label={`${count}건`} /></div><div className="mt-4"><button className="btn btn-secondary" type="button" onClick={onSelect}>{buttonText}</button></div></article> }
function AnalysisRequestCard({ title, description, buttonText, disabled, onClick }: { title: string; description: string; buttonText: string; disabled: boolean; onClick: () => void }) { return <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="text-lg font-semibold text-slate-950">{title}</h3><p className="mt-2 text-sm text-slate-600">{description}</p><div className="mt-4"><button className="btn btn-primary" type="button" disabled={disabled} onClick={onClick}>{buttonText}</button></div></article> }
function EntityModal({ isOpen, title, description, children, onClose }: { isOpen: boolean; title: string; description: string; children: ReactNode; onClose: () => void }) { if (!isOpen) return null; return <div className="modal-backdrop" onClick={onClose}><section className="modal-card max-h-[calc(100vh-3rem)] overflow-y-auto" onClick={(event) => event.stopPropagation()}><h2 className="panel-title">{title}</h2><p className="panel-description">{description}</p><div className="mt-6">{children}</div></section></div> }
function ModalActions({ isSubmitting, onCancel, submitText = '저장' }: { isSubmitting: boolean; onCancel: () => void; submitText?: string }) { return <div className="flex justify-end gap-3"><button className="btn btn-secondary" type="button" onClick={onCancel}>취소</button><button className="btn btn-primary" type="submit" disabled={isSubmitting}>{submitText}</button></div> }
function PreviewModal({ isOpen, imageName, previewUrl, expiresAt, isLoading, error, onClose }: { isOpen: boolean; imageName: string; previewUrl?: string; expiresAt?: string; isLoading: boolean; error: string | null; onClose: () => void }) { if (!isOpen) return null; return <div className="modal-backdrop" onClick={onClose}><section className="w-full max-w-4xl rounded-[1.75rem] bg-white p-6" onClick={(event) => event.stopPropagation()}><div className="toolbar"><div><h2 className="panel-title">이미지 미리보기</h2><p className="panel-description">{imageName}{expiresAt ? ` · 만료 ${formatDateTime(expiresAt)}` : ''}</p></div><button className="btn btn-secondary" type="button" onClick={onClose}>닫기</button></div><div className="mt-6">{isLoading ? <LoadingState message="미리보기를 불러오는 중입니다." /> : null}{error ? <ErrorState title="이미지 미리보기를 불러오지 못했습니다." description={error} /> : null}{!isLoading && !error && previewUrl ? <div className="space-y-4"><img className="max-h-[70vh] w-full rounded-3xl border border-slate-200 bg-slate-50 object-contain" src={previewUrl} alt={imageName || '점검 이미지 미리보기'} /><div className="text-sm text-slate-500">이미지를 확인한 뒤 분석 요청 또는 다시 업로드 여부를 결정할 수 있습니다.</div></div> : null}</div></section></div> }
function getLatestImageByType(images: ImageSummary[], imageType: ImageType) { const matches = images.filter((image) => image.imageType === imageType); return matches.length > 0 ? matches[matches.length - 1] : null }
function canRequestAnalysis(image: ImageSummary, runningImageJobIds: Set<number>) { return isActiveResource(image.status) && !runningImageJobIds.has(image.imageId) }
function getUserImageTypeLabel(imageType: ImageType) { return imageType === 'RGB' ? 'RGB' : '열화상' }
function getUserTargetTypeLabel(targetType: TargetType) { switch (targetType) { case 'ZONE': return '전체 영역'; case 'ARRAY': return 'Array'; case 'PANEL': return 'Panel'; case 'MODULE': return 'Module' } }
function getUserUploadStatusLabel(status: ImageSummary['uploadStatus']) { return status === 'UPLOADED' ? '업로드 완료' : '업로드 실패' }
function getUserUploadStatusTone(status: ImageSummary['uploadStatus']) { return status === 'UPLOADED' ? 'success' : 'danger' }
function getUserInputTypeLabel(inputType: AnalysisInputType) { return inputType === 'RGB_SINGLE' ? 'RGB 단건 분석' : '열화상 단건 분석' }
function getUserJobStatusLabel(status: AnalysisJobStatus) { switch (status) { case 'QUEUED': return '대기 중'; case 'RUNNING': return '분석 중'; case 'SUCCEEDED': return '완료'; case 'FAILED': return '실패' } }
function getUserJobStatusTone(status: AnalysisJobStatus) { switch (status) { case 'QUEUED': return 'warning'; case 'RUNNING': return 'default'; case 'SUCCEEDED': return 'success'; case 'FAILED': return 'danger' } }
function getAnalysisSummaryLabel(jobRows: AnalysisJobSummary[]) { if (jobRows.length === 0) return '분석 요청 대기'; const queuedCount = jobRows.filter((job) => job.jobStatus === 'QUEUED').length; const runningCount = jobRows.filter((job) => job.jobStatus === 'RUNNING').length; const failedCount = jobRows.filter((job) => job.jobStatus === 'FAILED').length; if (runningCount > 0) return `분석 중 ${runningCount}건`; if (queuedCount > 0) return `대기 중 ${queuedCount}건`; if (failedCount > 0) return `실패 ${failedCount}건`; return '분석 완료' }
function getImageNameById(images: ImageSummary[], imageId: number | null) { if (!imageId) return '-'; return images.find((image) => image.imageId === imageId)?.originalFilename || '이미지 확인 필요' }
function sanitizeFailureMessage(message: string) { const trimmed = message.trim(); if (!trimmed) return '분석에 실패했습니다. 다시 요청하거나 이미지를 다시 업로드해 주세요.'; return trimmed.replace(/traceId|stack|exception|objectKey|bucket/gi, '').trim() }
