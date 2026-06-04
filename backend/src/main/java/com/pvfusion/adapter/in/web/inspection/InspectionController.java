package com.pvfusion.adapter.in.web.inspection;

import com.pvfusion.application.dto.inspection.CreateInspectionCommand;
import com.pvfusion.application.dto.inspection.GetInspectionQuery;
import com.pvfusion.application.dto.inspection.InspectionListQuery;
import com.pvfusion.application.dto.inspection.InspectionResponse;
import com.pvfusion.application.dto.inspection.InspectionSummaryResponse;
import com.pvfusion.application.dto.inspection.UpdateInspectionCommand;
import com.pvfusion.application.port.in.inspection.CreateInspectionUseCase;
import com.pvfusion.application.port.in.inspection.GetInspectionUseCase;
import com.pvfusion.application.port.in.inspection.QueryInspectionUseCase;
import com.pvfusion.application.port.in.inspection.UpdateInspectionUseCase;
import com.pvfusion.domain.inspection.InspectionStatus;
import com.pvfusion.global.response.ApiResponse;
import com.pvfusion.global.response.PageResponse;
import jakarta.validation.Valid;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/inspections")
@RequiredArgsConstructor
public class InspectionController {

    private static final String ACTOR_USER_ID_HEADER = "X-Actor-User-Id";

    private final CreateInspectionUseCase createInspectionUseCase;
    private final QueryInspectionUseCase queryInspectionUseCase;
    private final GetInspectionUseCase getInspectionUseCase;
    private final UpdateInspectionUseCase updateInspectionUseCase;

    @PostMapping
    public ResponseEntity<ApiResponse<InspectionResponse>> createInspection(
            @RequestHeader(ACTOR_USER_ID_HEADER) Long actorUserId,
            @Valid @RequestBody CreateInspectionRequest request
    ) {
        InspectionResponse response = createInspectionUseCase.execute(new CreateInspectionCommand(
                actorUserId,
                request.zoneId(),
                request.name(),
                request.capturedAt(),
                request.captureMethod(),
                request.inspectorName(),
                request.memo()
        ));

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<InspectionSummaryResponse>>> queryInspections(
            @RequestHeader(ACTOR_USER_ID_HEADER) Long actorUserId,
            @RequestParam(required = false) Long plantId,
            @RequestParam(required = false) Long zoneId,
            @RequestParam(required = false) InspectionStatus inspectionStatus,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        PageResponse<InspectionSummaryResponse> response = queryInspectionUseCase.execute(new InspectionListQuery(
                actorUserId,
                plantId,
                zoneId,
                inspectionStatus,
                from,
                to,
                page,
                size
        ));

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/{inspectionId}")
    public ResponseEntity<ApiResponse<InspectionResponse>> getInspection(
            @RequestHeader(ACTOR_USER_ID_HEADER) Long actorUserId,
            @PathVariable Long inspectionId
    ) {
        InspectionResponse response = getInspectionUseCase.execute(new GetInspectionQuery(actorUserId, inspectionId));
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PatchMapping("/{inspectionId}")
    public ResponseEntity<ApiResponse<InspectionResponse>> updateInspection(
            @RequestHeader(ACTOR_USER_ID_HEADER) Long actorUserId,
            @PathVariable Long inspectionId,
            @Valid @RequestBody UpdateInspectionRequest request
    ) {
        InspectionResponse response = updateInspectionUseCase.execute(new UpdateInspectionCommand(
                actorUserId,
                inspectionId,
                request.name(),
                request.capturedAt(),
                request.captureMethod(),
                request.inspectorName(),
                request.memo()
        ));

        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
