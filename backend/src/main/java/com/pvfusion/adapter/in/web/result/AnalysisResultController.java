package com.pvfusion.adapter.in.web.result;

import com.pvfusion.application.dto.defect.SaveDetectedDefectCommand;
import com.pvfusion.application.dto.result.AnalysisResultListQuery;
import com.pvfusion.application.dto.result.AnalysisResultResponse;
import com.pvfusion.application.dto.result.AnalysisResultSummaryResponse;
import com.pvfusion.application.dto.result.GetAnalysisResultQuery;
import com.pvfusion.application.dto.result.GetResultVisualizationQuery;
import com.pvfusion.application.dto.result.ResultVisualizationResponse;
import com.pvfusion.application.dto.result.SaveAnalysisResultCommand;
import com.pvfusion.application.dto.result.UpdateResultActionCandidateCommand;
import com.pvfusion.application.dto.review.ChangeResultReviewStatusCommand;
import com.pvfusion.application.port.in.result.GetAnalysisResultUseCase;
import com.pvfusion.application.port.in.result.GetResultVisualizationUseCase;
import com.pvfusion.application.port.in.result.QueryAnalysisResultUseCase;
import com.pvfusion.application.port.in.result.SaveAnalysisResultUseCase;
import com.pvfusion.application.port.in.result.UpdateResultActionCandidateUseCase;
import com.pvfusion.application.port.in.review.ChangeResultReviewStatusUseCase;
import com.pvfusion.domain.analysis.AnalysisInputType;
import com.pvfusion.domain.analysis.AnalysisJobStatus;
import com.pvfusion.domain.analysis.AnalysisModelType;
import com.pvfusion.domain.common.TargetType;
import com.pvfusion.domain.result.ActionCandidate;
import com.pvfusion.domain.result.AnalysisResultStatus;
import com.pvfusion.domain.result.SeverityLevel;
import com.pvfusion.domain.review.ReviewStatus;
import com.pvfusion.global.response.ApiResponse;
import com.pvfusion.global.response.PageResponse;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/analysis-results")
@RequiredArgsConstructor
public class AnalysisResultController {

    private final SaveAnalysisResultUseCase saveAnalysisResultUseCase;
    private final QueryAnalysisResultUseCase queryAnalysisResultUseCase;
    private final GetAnalysisResultUseCase getAnalysisResultUseCase;
    private final UpdateResultActionCandidateUseCase updateResultActionCandidateUseCase;
    private final ChangeResultReviewStatusUseCase changeResultReviewStatusUseCase;
    private final GetResultVisualizationUseCase getResultVisualizationUseCase;

    @PostMapping
    public ResponseEntity<ApiResponse<AnalysisResultResponse>> saveAnalysisResult(
            @Valid @RequestBody SaveAnalysisResultRequest request
    ) {
        AnalysisResultResponse response = saveAnalysisResultUseCase.execute(new SaveAnalysisResultCommand(
                null,
                request.analysisJobId(),
                request.modelName(),
                request.modelVersion(),
                request.modelFormat(),
                request.runtime(),
                request.inputSize(),
                request.threshold(),
                request.resultStatus(),
                request.anomalyCount(),
                request.maxConfidence(),
                request.areaRatio(),
                request.severityScore(),
                request.severityLevel(),
                request.actionCandidate(),
                request.priorityLevel(),
                request.bboxBucketName(),
                request.bboxObjectKey(),
                request.bboxFileUrl(),
                request.heatmapBucketName(),
                request.heatmapObjectKey(),
                request.heatmapFileUrl(),
                request.maskBucketName(),
                request.maskObjectKey(),
                request.maskFileUrl(),
                request.analyzedAt(),
                mapDefects(request.defects())
        ));
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<AnalysisResultSummaryResponse>>> queryAnalysisResults(
            @RequestParam(required = false) Long plantId,
            @RequestParam(required = false) Long zoneId,
            @RequestParam(required = false) Long inspectionId,
            @RequestParam(required = false) TargetType targetType,
            @RequestParam(required = false) Long equipmentId,
            @RequestParam(required = false) AnalysisInputType inputType,
            @RequestParam(required = false) AnalysisModelType modelType,
            @RequestParam(required = false) AnalysisJobStatus jobStatus,
            @RequestParam(required = false) AnalysisResultStatus resultStatus,
            @RequestParam(required = false) ActionCandidate actionCandidate,
            @RequestParam(required = false) SeverityLevel severityLevel,
            @RequestParam(required = false) ReviewStatus reviewStatus,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        PageResponse<AnalysisResultSummaryResponse> response = queryAnalysisResultUseCase.execute(new AnalysisResultListQuery(
                null,
                plantId,
                zoneId,
                inspectionId,
                targetType,
                equipmentId,
                inputType,
                modelType,
                jobStatus,
                resultStatus,
                actionCandidate,
                severityLevel,
                reviewStatus,
                page,
                size
        ));
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/{resultId}")
    public ResponseEntity<ApiResponse<AnalysisResultResponse>> getAnalysisResult(
            @PathVariable Long resultId
    ) {
        AnalysisResultResponse response = getAnalysisResultUseCase.execute(new GetAnalysisResultQuery(resultId));
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PatchMapping("/{resultId}")
    public ResponseEntity<ApiResponse<AnalysisResultResponse>> updateAnalysisResult(
            @PathVariable Long resultId,
            @Valid @RequestBody UpdateAnalysisResultRequest request
    ) {
        AnalysisResultResponse response = updateResultActionCandidateUseCase.execute(new UpdateResultActionCandidateCommand(
                resultId,
                request.actionCandidate(),
                request.memo()
        ));
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PatchMapping("/{resultId}/review")
    public ResponseEntity<ApiResponse<AnalysisResultResponse>> changeReviewStatus(
            @PathVariable Long resultId,
            @Valid @RequestBody ReviewAnalysisResultRequest request
    ) {
        AnalysisResultResponse response = changeResultReviewStatusUseCase.execute(new ChangeResultReviewStatusCommand(
                resultId,
                request.reviewStatus(),
                request.actionCandidate(),
                request.memo()
        ));
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/{resultId}/visualization")
    public ResponseEntity<ApiResponse<ResultVisualizationResponse>> getVisualization(
            @PathVariable Long resultId,
            @RequestParam String type,
            @RequestParam(required = false) String mode
    ) {
        ResultVisualizationResponse response = getResultVisualizationUseCase.execute(
                new GetResultVisualizationQuery(resultId, type, mode)
        );
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    private List<SaveDetectedDefectCommand> mapDefects(List<SaveDetectedDefectRequest> defects) {
        if (defects == null) {
            return List.of();
        }
        return defects.stream()
                .map(defect -> new SaveDetectedDefectCommand(
                        null,
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
                        defect.actionCandidate()
                ))
                .toList();
    }
}
