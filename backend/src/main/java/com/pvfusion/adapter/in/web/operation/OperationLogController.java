package com.pvfusion.adapter.in.web.operation;

import com.pvfusion.application.dto.operation.OperationLogQuery;
import com.pvfusion.application.dto.operation.OperationLogSummaryResponse;
import com.pvfusion.application.port.in.operation.QueryOperationLogUseCase;
import com.pvfusion.domain.operation.OperationEventCategory;
import com.pvfusion.domain.operation.OperationEventType;
import com.pvfusion.global.response.ApiResponse;
import com.pvfusion.global.response.PageResponse;
import java.time.OffsetDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/operation-logs")
@RequiredArgsConstructor
public class OperationLogController {

    private static final String ACTOR_USER_ID_HEADER = "X-Actor-User-Id";

    private final QueryOperationLogUseCase queryOperationLogUseCase;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<OperationLogSummaryResponse>>> getOperationLogs(
            @RequestHeader(ACTOR_USER_ID_HEADER) Long actorUserIdHeader,
            @RequestParam(required = false) Long actorUserId,
            @RequestParam(required = false) OperationEventCategory eventCategory,
            @RequestParam(required = false) OperationEventType eventType,
            @RequestParam(required = false) Long plantId,
            @RequestParam(required = false) Long zoneId,
            @RequestParam(required = false) Long inspectionId,
            @RequestParam(required = false) Long imageId,
            @RequestParam(required = false) Long imagePairId,
            @RequestParam(required = false) Long analysisJobId,
            @RequestParam(required = false) Long analysisResultId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime to,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String sort
    ) {
        PageResponse<OperationLogSummaryResponse> response = queryOperationLogUseCase.execute(
                new OperationLogQuery(
                        actorUserId,
                        actorUserIdHeader,
                        eventCategory,
                        eventType,
                        plantId,
                        zoneId,
                        inspectionId,
                        imageId,
                        imagePairId,
                        analysisJobId,
                        analysisResultId,
                        from,
                        to,
                        keyword,
                        page,
                        size,
                        sort
                )
        );
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
