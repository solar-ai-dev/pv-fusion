package com.pvfusion.adapter.in.web.analysis;

import com.pvfusion.application.dto.analysis.AnalysisJobListQuery;
import com.pvfusion.application.dto.analysis.AnalysisJobResponse;
import com.pvfusion.application.dto.analysis.AnalysisJobSummaryResponse;
import com.pvfusion.application.dto.analysis.GetAnalysisJobQuery;
import com.pvfusion.application.dto.analysis.RequestAnalysisCommand;
import com.pvfusion.application.dto.analysis.RetryAnalysisJobCommand;
import com.pvfusion.application.port.in.analysis.GetAnalysisJobUseCase;
import com.pvfusion.application.port.in.analysis.QueryAnalysisJobUseCase;
import com.pvfusion.application.port.in.analysis.RequestAnalysisUseCase;
import com.pvfusion.application.port.in.analysis.RetryAnalysisJobUseCase;
import com.pvfusion.domain.analysis.AnalysisInputType;
import com.pvfusion.domain.analysis.AnalysisJobStatus;
import com.pvfusion.domain.analysis.AnalysisModelType;
import com.pvfusion.global.response.ApiResponse;
import com.pvfusion.global.response.PageResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/analysis-jobs")
@RequiredArgsConstructor
public class AnalysisJobController {

    private static final String ACTOR_USER_ID_HEADER = "X-Actor-User-Id";

    private final RequestAnalysisUseCase requestAnalysisUseCase;
    private final QueryAnalysisJobUseCase queryAnalysisJobUseCase;
    private final GetAnalysisJobUseCase getAnalysisJobUseCase;
    private final RetryAnalysisJobUseCase retryAnalysisJobUseCase;

    @PostMapping
    public ResponseEntity<ApiResponse<AnalysisJobResponse>> requestAnalysis(
            @RequestHeader(ACTOR_USER_ID_HEADER) Long actorUserId,
            @Valid @RequestBody RequestAnalysisJobRequest request
    ) {
        AnalysisJobResponse response = requestAnalysisUseCase.execute(new RequestAnalysisCommand(
                actorUserId,
                request.imageId(),
                request.imagePairId(),
                request.inputType(),
                request.requestedModelType(),
                request.traceId()
        ));
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<AnalysisJobSummaryResponse>>> queryAnalysisJobs(
            @RequestHeader(ACTOR_USER_ID_HEADER) Long actorUserId,
            @RequestParam(required = false) Long plantId,
            @RequestParam(required = false) Long zoneId,
            @RequestParam(required = false) Long inspectionId,
            @RequestParam(required = false) AnalysisJobStatus jobStatus,
            @RequestParam(required = false) AnalysisInputType inputType,
            @RequestParam(required = false) AnalysisModelType modelType,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        PageResponse<AnalysisJobSummaryResponse> response = queryAnalysisJobUseCase.execute(new AnalysisJobListQuery(
                actorUserId,
                plantId,
                zoneId,
                inspectionId,
                jobStatus,
                inputType,
                modelType,
                page,
                size
        ));
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/{jobId}")
    public ResponseEntity<ApiResponse<AnalysisJobResponse>> getAnalysisJob(
            @RequestHeader(ACTOR_USER_ID_HEADER) Long actorUserId,
            @PathVariable Long jobId
    ) {
        AnalysisJobResponse response = getAnalysisJobUseCase.execute(new GetAnalysisJobQuery(actorUserId, jobId));
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/{jobId}/retry")
    public ResponseEntity<ApiResponse<AnalysisJobResponse>> retryAnalysisJob(
            @RequestHeader(ACTOR_USER_ID_HEADER) Long actorUserId,
            @PathVariable Long jobId,
            @RequestBody(required = false) RetryAnalysisJobRequest request
    ) {
        AnalysisJobResponse response = retryAnalysisJobUseCase.execute(new RetryAnalysisJobCommand(
                actorUserId,
                jobId,
                request != null ? request.traceId() : null
        ));
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
