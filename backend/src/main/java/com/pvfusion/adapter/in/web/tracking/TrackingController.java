package com.pvfusion.adapter.in.web.tracking;

import com.pvfusion.application.dto.tracking.InspectionCompareQuery;
import com.pvfusion.application.dto.tracking.InspectionCompareResponse;
import com.pvfusion.application.dto.tracking.TrackingQuery;
import com.pvfusion.application.dto.tracking.TrackingResponse;
import com.pvfusion.application.port.in.tracking.CompareInspectionResultUseCase;
import com.pvfusion.application.port.in.tracking.QueryTrackingUseCase;
import com.pvfusion.domain.analysis.AnalysisInputType;
import com.pvfusion.domain.analysis.AnalysisModelType;
import com.pvfusion.domain.common.TargetType;
import com.pvfusion.domain.result.ActionCandidate;
import com.pvfusion.domain.result.PriorityLevel;
import com.pvfusion.domain.result.SeverityLevel;
import com.pvfusion.global.response.ApiResponse;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/tracking")
@RequiredArgsConstructor
public class TrackingController {

    private final QueryTrackingUseCase queryTrackingUseCase;
    private final CompareInspectionResultUseCase compareInspectionResultUseCase;

    @GetMapping
    public ResponseEntity<ApiResponse<TrackingResponse>> queryTracking(
            @RequestParam(required = false) Long plantId,
            @RequestParam(required = false) Long zoneId,
            @RequestParam(required = false) Long equipmentId,
            @RequestParam(required = false) TargetType targetType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) AnalysisInputType inputType,
            @RequestParam(required = false) AnalysisModelType modelType,
            @RequestParam(required = false) ActionCandidate actionCandidate,
            @RequestParam(required = false) PriorityLevel priorityLevel,
            @RequestParam(required = false) SeverityLevel severityLevel
    ) {
        TrackingResponse response = queryTrackingUseCase.execute(new TrackingQuery(
                plantId,
                zoneId,
                equipmentId,
                targetType,
                from,
                to,
                inputType,
                modelType,
                actionCandidate,
                priorityLevel,
                severityLevel
        ));
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/compare")
    public ResponseEntity<ApiResponse<InspectionCompareResponse>> compareTracking(
            @RequestParam Long currentResultId,
            @RequestParam(required = false) Long previousResultId
    ) {
        InspectionCompareResponse response = compareInspectionResultUseCase.execute(
                new InspectionCompareQuery(currentResultId, previousResultId)
        );
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
