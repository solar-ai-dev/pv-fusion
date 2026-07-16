package com.pvfusion.service.result;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.pvfusion.application.dto.defect.DetectedDefectListQuery;
import com.pvfusion.application.dto.defect.DetectedDefectResponse;
import com.pvfusion.application.dto.defect.DetectedDefectSummaryResponse;
import com.pvfusion.application.dto.defect.GetDetectedDefectQuery;
import com.pvfusion.application.dto.defect.SaveDetectedDefectCommand;
import com.pvfusion.application.dto.image.ImageAccessUrlRequest;
import com.pvfusion.application.dto.result.AnalysisResultListQuery;
import com.pvfusion.application.dto.result.AnalysisResultResponse;
import com.pvfusion.application.dto.result.AnalysisResultSummaryResponse;
import com.pvfusion.application.dto.result.GetAnalysisResultQuery;
import com.pvfusion.application.dto.result.GetResultVisualizationQuery;
import com.pvfusion.application.dto.result.ModelInfoResponse;
import com.pvfusion.application.dto.result.ResultVisualizationResponse;
import com.pvfusion.application.dto.result.SaveAnalysisResultCommand;
import com.pvfusion.application.dto.result.UpdateResultActionCandidateCommand;
import com.pvfusion.application.dto.review.ChangeResultReviewStatusCommand;
import com.pvfusion.application.dto.review.ResultReviewHistoryQuery;
import com.pvfusion.application.dto.review.ResultReviewHistoryResponse;
import com.pvfusion.application.dto.review.ResultReviewHistorySummaryResponse;
import com.pvfusion.application.port.in.access.AccessChecker;
import com.pvfusion.application.port.in.defect.GetDetectedDefectUseCase;
import com.pvfusion.application.port.in.defect.QueryDetectedDefectUseCase;
import com.pvfusion.application.port.in.result.GetAnalysisResultUseCase;
import com.pvfusion.application.port.in.result.GetResultVisualizationUseCase;
import com.pvfusion.application.port.in.result.QueryAnalysisResultUseCase;
import com.pvfusion.application.port.in.result.SaveAnalysisResultUseCase;
import com.pvfusion.application.port.in.result.UpdateResultActionCandidateUseCase;
import com.pvfusion.application.port.in.review.ChangeResultReviewStatusUseCase;
import com.pvfusion.application.port.in.review.QueryResultReviewHistoryUseCase;
import com.pvfusion.application.port.out.auth.CurrentUserPort;
import com.pvfusion.application.port.out.analysis.LoadAnalysisJobPort;
import com.pvfusion.application.port.out.defect.LoadDetectedDefectPort;
import com.pvfusion.application.port.out.defect.SaveDetectedDefectPort;
import com.pvfusion.application.port.out.image.GenerateImageAccessUrlPort;
import com.pvfusion.application.port.out.image.LoadImagePort;
import com.pvfusion.application.port.out.inspection.LoadInspectionPort;
import com.pvfusion.application.port.out.result.LoadAnalysisResultPort;
import com.pvfusion.application.port.out.result.SaveAnalysisResultPort;
import com.pvfusion.application.port.out.result.UpdateAnalysisResultPort;
import com.pvfusion.application.port.out.review.LoadResultReviewHistoryPort;
import com.pvfusion.application.port.out.review.SaveResultReviewHistoryPort;
import com.pvfusion.application.port.out.zone.LoadZonePort;
import com.pvfusion.domain.analysis.AnalysisJob;
import com.pvfusion.domain.analysis.AnalysisJobStatus;
import com.pvfusion.domain.common.TargetType;
import com.pvfusion.domain.defect.DetectedDefect;
import com.pvfusion.domain.image.InspectionImage;
import com.pvfusion.domain.inspection.Inspection;
import com.pvfusion.domain.result.ActionCandidate;
import com.pvfusion.domain.result.AnalysisResult;
import com.pvfusion.domain.review.ResultReviewHistory;
import com.pvfusion.domain.review.ReviewStatus;
import com.pvfusion.domain.zone.Zone;
import com.pvfusion.global.error.BusinessException;
import com.pvfusion.global.error.ErrorCode;
import com.pvfusion.global.error.UnauthorizedException;
import com.pvfusion.global.response.PageResponse;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AnalysisResultService implements
        SaveAnalysisResultUseCase,
        QueryAnalysisResultUseCase,
        GetAnalysisResultUseCase,
        GetResultVisualizationUseCase,
        UpdateResultActionCandidateUseCase,
        ChangeResultReviewStatusUseCase,
        QueryDetectedDefectUseCase,
        GetDetectedDefectUseCase,
        QueryResultReviewHistoryUseCase {

    private static final String VISUALIZATION_BBOX = "bbox";
    private static final String VISUALIZATION_HEATMAP = "heatmap";
    private static final String VISUALIZATION_MASK = "mask";

    private final LoadAnalysisResultPort loadAnalysisResultPort;
    private final SaveAnalysisResultPort saveAnalysisResultPort;
    private final UpdateAnalysisResultPort updateAnalysisResultPort;
    private final LoadDetectedDefectPort loadDetectedDefectPort;
    private final SaveDetectedDefectPort saveDetectedDefectPort;
    private final LoadResultReviewHistoryPort loadResultReviewHistoryPort;
    private final SaveResultReviewHistoryPort saveResultReviewHistoryPort;
    private final LoadAnalysisJobPort loadAnalysisJobPort;
    private final LoadImagePort loadImagePort;
    private final LoadInspectionPort loadInspectionPort;
    private final GenerateImageAccessUrlPort generateImageAccessUrlPort;
    private final AccessChecker accessChecker;
    private final Optional<LoadZonePort> loadZonePort;
    private final CurrentUserPort currentUserPort;

    @Override
    @Transactional
    public AnalysisResultResponse execute(SaveAnalysisResultCommand command) {
        Long currentUserId = requireCurrentUserId();
        validateRequired(command.analysisJobId(), "analysisJobId");
        validateText(command.modelName(), "modelName");
        validateText(command.modelVersion(), "modelVersion");
        validateText(command.modelFormat(), "modelFormat");
        validateText(command.runtime(), "runtime");
        validateRequired(command.inputSize(), "inputSize");
        validateRequired(command.threshold(), "threshold");
        validateRequired(command.resultStatus(), "resultStatus");
        validateRequired(command.anomalyCount(), "anomalyCount");
        validateRequired(command.severityLevel(), "severityLevel");
        validateRequired(command.actionCandidate(), "actionCandidate");
        validateRequired(command.priorityLevel(), "priorityLevel");

        AnalysisJob job = loadAnalysisJob(command.analysisJobId());
        ensureAllowed(accessChecker.checkAnalysisJobAccess(currentUserId, command.analysisJobId()));

        if (loadAnalysisResultPort.loadAnalysisResultByAnalysisJobId(command.analysisJobId()).isPresent()) {
            throw new BusinessException(ErrorCode.DUPLICATE_RESOURCE, "AnalysisResult already exists for job: " + command.analysisJobId());
        }

        AnalysisResult saved = saveAnalysisResultPort.saveAnalysisResult(new AnalysisResult(
                null,
                command.analysisJobId(),
                job.getModelType(),
                command.modelName(),
                command.modelVersion(),
                command.modelFormat(),
                command.runtime(),
                command.inputSize(),
                command.threshold(),
                command.resultStatus(),
                command.anomalyCount(),
                command.maxConfidence(),
                command.areaRatio(),
                command.severityScore(),
                command.severityLevel(),
                command.actionCandidate(),
                command.priorityLevel(),
                ReviewStatus.UNCHECKED,
                command.bboxBucketName(),
                command.bboxObjectKey(),
                command.bboxFileUrl(),
                command.heatmapBucketName(),
                command.heatmapObjectKey(),
                command.heatmapFileUrl(),
                command.maskBucketName(),
                command.maskObjectKey(),
                command.maskFileUrl(),
                command.analyzedAt(),
                null,
                null
        ));

        saveDetectedDefects(saved.getId(), command.defects());
        return toResponse(saved);
    }

    @Override
    public PageResponse<AnalysisResultSummaryResponse> execute(AnalysisResultListQuery query) {
        Long currentUserId = requireCurrentUserId();
        validatePage(query.page(), query.size());
        AnalysisResultListQuery execQuery = scopeListQuery(currentUserId, query);

        List<AnalysisResult> results = loadAnalysisResultPort.loadAnalysisResults(execQuery);
        long totalElements = loadAnalysisResultPort.countAnalysisResults(execQuery);
        List<AnalysisResultSummaryResponse> content = results.stream()
                .map(this::toSummaryResponse)
                .toList();
        int totalPages = query.size() == 0 ? 0 : (int) Math.ceil((double) totalElements / query.size());
        boolean hasNext = (long) (query.page() + 1) * query.size() < totalElements;
        return PageResponse.of(content, query.page(), query.size(), totalElements, totalPages, hasNext);
    }

    @Override
    public AnalysisResultResponse execute(GetAnalysisResultQuery query) {
        Long currentUserId = requireCurrentUserId();
        validateRequired(query.resultId(), "resultId");

        AnalysisResult result = loadAnalysisResult(query.resultId());
        ensureAllowed(accessChecker.checkResultAccess(currentUserId, query.resultId()));
        return toResponse(result);
    }

    @Override
    @Transactional
    public AnalysisResultResponse execute(UpdateResultActionCandidateCommand command) {
        Long currentUserId = requireCurrentUserId();
        validateRequired(command.resultId(), "resultId");

        AnalysisResult existing = loadAnalysisResult(command.resultId());
        ensureAllowed(accessChecker.checkResultAccess(currentUserId, command.resultId()));

        ActionCandidate newActionCandidate = command.actionCandidate() != null
                ? command.actionCandidate()
                : existing.getActionCandidate();
        if (newActionCandidate == null) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "actionCandidate is required.");
        }
        if (isBlank(command.memo()) && newActionCandidate == existing.getActionCandidate()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "No result fields were changed.");
        }

        AnalysisResult updated = updateAnalysisResultPort.updateAnalysisResult(copyResult(
                existing,
                newActionCandidate,
                existing.getReviewStatus()
        ));

        saveResultReviewHistoryPort.saveResultReviewHistory(new ResultReviewHistory(
                null,
                existing.getId(),
                currentUserId,
                existing.getReviewStatus(),
                existing.getReviewStatus(),
                existing.getActionCandidate(),
                newActionCandidate,
                normalizeMemo(command.memo()),
                null,
                null
        ));

        return toResponse(updated);
    }

    @Override
    @Transactional
    public AnalysisResultResponse execute(ChangeResultReviewStatusCommand command) {
        Long currentUserId = requireCurrentUserId();
        validateRequired(command.resultId(), "resultId");
        validateRequired(command.reviewStatus(), "reviewStatus");

        AnalysisResult existing = loadAnalysisResult(command.resultId());
        ensureAllowed(accessChecker.checkResultAccess(currentUserId, command.resultId()));

        ActionCandidate newActionCandidate = command.actionCandidate() != null
                ? command.actionCandidate()
                : existing.getActionCandidate();
        AnalysisResult updated = updateAnalysisResultPort.updateAnalysisResult(copyResult(
                existing,
                newActionCandidate,
                command.reviewStatus()
        ));

        saveResultReviewHistoryPort.saveResultReviewHistory(new ResultReviewHistory(
                null,
                existing.getId(),
                currentUserId,
                existing.getReviewStatus(),
                command.reviewStatus(),
                existing.getActionCandidate(),
                newActionCandidate,
                normalizeMemo(command.memo()),
                null,
                null
        ));

        return toResponse(updated);
    }

    @Override
    public ResultVisualizationResponse execute(GetResultVisualizationQuery query) {
        Long currentUserId = requireCurrentUserId();
        validateRequired(query.resultId(), "resultId");
        validateText(query.type(), "type");

        AnalysisResult result = loadAnalysisResult(query.resultId());
        ensureAllowed(accessChecker.checkResultAccess(currentUserId, query.resultId()));

        VisualizationTarget target = resolveVisualizationTarget(result, query.type());
        if (!isBlank(target.bucketName()) && !isBlank(target.objectKey())) {
            var accessUrl = generateImageAccessUrlPort.generate(new ImageAccessUrlRequest(target.bucketName(), target.objectKey()));
            return new ResultVisualizationResponse(target.type(), accessUrl.accessUrl(), accessUrl.expiresAt());
        }
        if (!isBlank(target.fileUrl())) {
            return new ResultVisualizationResponse(target.type(), target.fileUrl(), null);
        }
        throw new BusinessException(ErrorCode.VISUALIZATION_NOT_FOUND, "Visualization not found for type: " + query.type());
    }

    @Override
    public List<DetectedDefectSummaryResponse> execute(DetectedDefectListQuery query) {
        Long currentUserId = requireCurrentUserId();
        validateRequired(query.analysisResultId(), "analysisResultId");

        ensureAllowed(accessChecker.checkResultAccess(currentUserId, query.analysisResultId()));
        return loadDetectedDefectPort.loadDetectedDefects(query).stream()
                .map(this::toDefectSummaryResponse)
                .toList();
    }

    @Override
    public DetectedDefectResponse execute(GetDetectedDefectQuery query) {
        Long currentUserId = requireCurrentUserId();
        validateRequired(query.defectId(), "defectId");

        DetectedDefect defect = loadDetectedDefectPort.loadDetectedDefect(query.defectId())
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "DetectedDefect not found: " + query.defectId()));
        ensureAllowed(accessChecker.checkResultAccess(currentUserId, defect.getAnalysisResultId()));
        return toDefectResponse(defect);
    }

    @Override
    public List<ResultReviewHistorySummaryResponse> execute(ResultReviewHistoryQuery query) {
        Long currentUserId = requireCurrentUserId();
        validateRequired(query.analysisResultId(), "analysisResultId");

        ensureAllowed(accessChecker.checkResultAccess(currentUserId, query.analysisResultId()));
        return loadResultReviewHistoryPort.loadResultReviewHistories(query).stream()
                .map(this::toReviewHistorySummaryResponse)
                .toList();
    }

    private void saveDetectedDefects(Long analysisResultId, List<SaveDetectedDefectCommand> commands) {
        if (commands == null || commands.isEmpty()) {
            return;
        }

        for (SaveDetectedDefectCommand defect : commands) {
            validateRequired(defect.defectType(), "defectType");
            validateRequired(defect.defectSource(), "defectSource");
            validateRequired(defect.severityLevel(), "severityLevel");
            validateRequired(defect.actionCandidate(), "actionCandidate");

            saveDetectedDefectPort.saveDetectedDefect(new DetectedDefect(
                    null,
                    analysisResultId,
                    defect.defectType(),
                    defect.defectSource(),
                    defect.confidence(),
                    defect.areaRatio(),
                    defect.bboxX(),
                    defect.bboxY(),
                    defect.bboxWidth(),
                    defect.bboxHeight(),
                    defect.maskBucketName(),
                    defect.maskObjectKey(),
                    defect.maskFileUrl(),
                    defect.severityScore(),
                    defect.severityLevel(),
                    defect.actionCandidate(),
                    defect.modelClassId(),
                    defect.modelClassName(),
                    null,
                    null
            ));
        }
    }

    private AnalysisResultResponse toResponse(AnalysisResult result) {
        ResultContext context = resolveContext(result);
        return new AnalysisResultResponse(
                result.getId(),
                result.getAnalysisJobId(),
                context.plantId(),
                context.zoneId(),
                context.inspectionId(),
                context.imageId(),
                context.targetType(),
                context.equipmentId(),
                context.inputType(),
                result.getModelType(),
                result.getResultStatus(),
                result.getAnomalyCount(),
                result.getMaxConfidence(),
                result.getAreaRatio(),
                result.getSeverityScore(),
                result.getSeverityLevel(),
                result.getActionCandidate(),
                result.getPriorityLevel(),
                result.getReviewStatus(),
                result.getBboxBucketName(),
                result.getBboxObjectKey(),
                result.getBboxFileUrl(),
                result.getHeatmapBucketName(),
                result.getHeatmapObjectKey(),
                result.getHeatmapFileUrl(),
                result.getMaskBucketName(),
                result.getMaskObjectKey(),
                result.getMaskFileUrl(),
                result.getAnalyzedAt(),
                result.getCreatedAt(),
                result.getUpdatedAt(),
                loadDetectedDefectPort.loadDetectedDefects(new DetectedDefectListQuery(null, result.getId())).stream()
                        .map(this::toDefectResponse)
                        .toList(),
                loadResultReviewHistoryPort.loadResultReviewHistories(new ResultReviewHistoryQuery(null, result.getId())).stream()
                        .map(this::toReviewHistoryResponse)
                        .toList(),
                null,
                null,
                null,
                new ModelInfoResponse(
                        result.getModelName(),
                        result.getModelVersion(),
                        result.getModelFormat(),
                        result.getRuntime(),
                        result.getInputSize(),
                        result.getThreshold()
                )
        );
    }

    private AnalysisResultSummaryResponse toSummaryResponse(AnalysisResult result) {
        ResultContext context = resolveContext(result);
        return new AnalysisResultSummaryResponse(
                result.getId(),
                result.getAnalysisJobId(),
                context.plantId(),
                context.zoneId(),
                context.inspectionId(),
                context.targetType(),
                context.equipmentId(),
                context.inputType(),
                result.getModelType(),
                context.jobStatus(),
                result.getResultStatus(),
                result.getAnomalyCount(),
                result.getSeverityScore(),
                result.getSeverityLevel(),
                result.getActionCandidate(),
                result.getPriorityLevel(),
                result.getReviewStatus(),
                result.getAnalyzedAt()
        );
    }

    private DetectedDefectResponse toDefectResponse(DetectedDefect defect) {
        return new DetectedDefectResponse(
                defect.getId(),
                defect.getAnalysisResultId(),
                defect.getDefectType(),
                defect.getDefectSource(),
                defect.getConfidence(),
                defect.getAreaRatio(),
                defect.getBboxX(),
                defect.getBboxY(),
                defect.getBboxWidth(),
                defect.getBboxHeight(),
                null,
                null,
                null,
                defect.getSeverityScore(),
                defect.getSeverityLevel(),
                defect.getActionCandidate(),
                defect.getModelClassId(),
                defect.getModelClassName(),
                defect.getCreatedAt(),
                defect.getUpdatedAt()
        );
    }

    private DetectedDefectSummaryResponse toDefectSummaryResponse(DetectedDefect defect) {
        return new DetectedDefectSummaryResponse(
                defect.getId(),
                defect.getDefectType(),
                defect.getDefectSource(),
                defect.getConfidence(),
                defect.getAreaRatio(),
                defect.getSeverityLevel(),
                defect.getActionCandidate()
        );
    }

    private ResultReviewHistoryResponse toReviewHistoryResponse(ResultReviewHistory history) {
        return new ResultReviewHistoryResponse(
                history.getId(),
                history.getAnalysisResultId(),
                history.getReviewerUserId(),
                history.getPreviousReviewStatus(),
                history.getNewReviewStatus(),
                history.getPreviousActionCandidate(),
                history.getNewActionCandidate(),
                history.getMemo(),
                history.getCreatedAt(),
                history.getUpdatedAt()
        );
    }

    private ResultReviewHistorySummaryResponse toReviewHistorySummaryResponse(ResultReviewHistory history) {
        return new ResultReviewHistorySummaryResponse(
                history.getId(),
                history.getAnalysisResultId(),
                history.getReviewerUserId(),
                history.getPreviousReviewStatus(),
                history.getNewReviewStatus(),
                history.getPreviousActionCandidate(),
                history.getNewActionCandidate(),
                history.getCreatedAt()
        );
    }

    private AnalysisResult copyResult(AnalysisResult existing, ActionCandidate actionCandidate, ReviewStatus reviewStatus) {
        return new AnalysisResult(
                existing.getId(),
                existing.getAnalysisJobId(),
                existing.getModelType(),
                existing.getModelName(),
                existing.getModelVersion(),
                existing.getModelFormat(),
                existing.getRuntime(),
                existing.getInputSize(),
                existing.getThreshold(),
                existing.getResultStatus(),
                existing.getAnomalyCount(),
                existing.getMaxConfidence(),
                existing.getAreaRatio(),
                existing.getSeverityScore(),
                existing.getSeverityLevel(),
                actionCandidate,
                existing.getPriorityLevel(),
                reviewStatus,
                existing.getBboxBucketName(),
                existing.getBboxObjectKey(),
                existing.getBboxFileUrl(),
                existing.getHeatmapBucketName(),
                existing.getHeatmapObjectKey(),
                existing.getHeatmapFileUrl(),
                existing.getMaskBucketName(),
                existing.getMaskObjectKey(),
                existing.getMaskFileUrl(),
                existing.getAnalyzedAt(),
                existing.getCreatedAt(),
                existing.getUpdatedAt()
        );
    }

    private ResultContext resolveContext(AnalysisResult result) {
        AnalysisJob job = loadAnalysisJobPort.loadAnalysisJob(result.getAnalysisJobId()).orElse(null);
        if (job == null) {
            return new ResultContext(null, null, null, null, null, null, null, null);
        }

        Long inspectionId;
        Long equipmentId;
        TargetType targetType;
        InspectionImage image = loadImagePort.loadImage(job.getImageId()).orElse(null);
        if (image == null) {
            return new ResultContext(null, null, null, job.getImageId(), null, null, job.getInputType(), job.getJobStatus());
        }
        inspectionId = image.getInspectionId();
        equipmentId = image.getEquipmentId();
        targetType = image.getTargetType();

        Inspection inspection = inspectionId != null ? loadInspectionPort.loadInspection(inspectionId).orElse(null) : null;
        if (inspection == null) {
            return new ResultContext(inspectionId, null, null, image.getId(), equipmentId, targetType, job.getInputType(), job.getJobStatus());
        }
        if (loadZonePort.isEmpty()) {
            return new ResultContext(inspectionId, inspection.getZoneId(), null, image.getId(), equipmentId, targetType, job.getInputType(), job.getJobStatus());
        }
        Zone zone = loadZonePort.get().loadZone(inspection.getZoneId()).orElse(null);
        return new ResultContext(
                inspectionId,
                inspection.getZoneId(),
                zone != null ? zone.getPlantId() : null,
                image.getId(),
                equipmentId,
                targetType,
                job.getInputType(),
                job.getJobStatus()
        );
    }

    private VisualizationTarget resolveVisualizationTarget(AnalysisResult result, String type) {
        String normalized = type.trim().toLowerCase();
        return switch (normalized) {
            case VISUALIZATION_BBOX -> new VisualizationTarget(
                    VISUALIZATION_BBOX,
                    result.getBboxBucketName(),
                    result.getBboxObjectKey(),
                    result.getBboxFileUrl()
            );
            case VISUALIZATION_HEATMAP -> new VisualizationTarget(
                    VISUALIZATION_HEATMAP,
                    result.getHeatmapBucketName(),
                    result.getHeatmapObjectKey(),
                    result.getHeatmapFileUrl()
            );
            case VISUALIZATION_MASK -> new VisualizationTarget(
                    VISUALIZATION_MASK,
                    result.getMaskBucketName(),
                    result.getMaskObjectKey(),
                    result.getMaskFileUrl()
            );
            default -> throw new BusinessException(ErrorCode.INVALID_INPUT, "Unsupported visualization type: " + type);
        };
    }

    private AnalysisResultListQuery scopeListQuery(Long currentUserId, AnalysisResultListQuery query) {
        boolean admin = accessChecker.isAdmin(currentUserId);

        if (query.plantId() != null) {
            ensureAllowed(accessChecker.checkPlantAccess(currentUserId, query.plantId()));
        }
        if (query.zoneId() != null) {
            ensureAllowed(accessChecker.checkZoneAccess(currentUserId, query.zoneId()));
        }
        if (query.inspectionId() != null) {
            ensureAllowed(accessChecker.checkInspectionAccess(currentUserId, query.inspectionId()));
        }
        if (query.equipmentId() != null) {
            ensureAllowed(accessChecker.checkEquipmentAccess(currentUserId, query.equipmentId()));
        }

        boolean noScope = query.plantId() == null && query.zoneId() == null
                && query.inspectionId() == null && query.equipmentId() == null;
        if (!admin && noScope) {
            // non-admin, no explicit scope: auto-filter by plant membership
            return new AnalysisResultListQuery(
                    currentUserId,
                    query.plantId(), query.zoneId(), query.inspectionId(),
                    query.targetType(), query.equipmentId(), query.inputType(), query.modelType(),
                    query.jobStatus(), query.resultStatus(), query.actionCandidate(), query.severityLevel(),
                    query.reviewStatus(), query.from(), query.to(), query.page(), query.size()
            );
        }
        return query;
    }

    private AnalysisResult loadAnalysisResult(Long resultId) {
        return loadAnalysisResultPort.loadAnalysisResult(resultId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "AnalysisResult not found: " + resultId));
    }

    private AnalysisJob loadAnalysisJob(Long jobId) {
        return loadAnalysisJobPort.loadAnalysisJob(jobId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "AnalysisJob not found: " + jobId));
    }

    private void ensureAllowed(boolean allowed) {
        if (!allowed) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
    }

    private Long requireCurrentUserId() {
        return currentUserPort.getCurrentUserId()
                .orElseThrow(UnauthorizedException::new);
    }

    private void validateRequired(Object value, String fieldName) {
        if (value == null) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, fieldName + " is required.");
        }
    }

    private void validateText(String value, String fieldName) {
        if (isBlank(value)) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, fieldName + " is required.");
        }
    }

    private void validatePage(int page, int size) {
        if (page < 0 || size <= 0) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "page and size must be valid.");
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private String normalizeMemo(String memo) {
        return isBlank(memo) ? null : memo.trim();
    }

    private record VisualizationTarget(String type, String bucketName, String objectKey, String fileUrl) {
    }

    private record ResultContext(
            Long inspectionId,
            Long zoneId,
            Long plantId,
            Long imageId,
            Long equipmentId,
            TargetType targetType,
            com.pvfusion.domain.analysis.AnalysisInputType inputType,
            AnalysisJobStatus jobStatus
    ) {
    }
}
