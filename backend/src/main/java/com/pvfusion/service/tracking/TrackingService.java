package com.pvfusion.service.tracking;

import com.pvfusion.application.dto.tracking.InspectionCompareQuery;
import com.pvfusion.application.dto.tracking.InspectionCompareResponse;
import com.pvfusion.application.dto.tracking.RepeatedAnomalyQuery;
import com.pvfusion.application.dto.tracking.RepeatedAnomalyResponse;
import com.pvfusion.application.dto.tracking.TrackingQuery;
import com.pvfusion.application.dto.tracking.TrackingResponse;
import com.pvfusion.application.port.in.access.AccessChecker;
import com.pvfusion.application.port.in.tracking.CompareInspectionResultUseCase;
import com.pvfusion.application.port.in.tracking.QueryRepeatedAnomalyUseCase;
import com.pvfusion.application.port.in.tracking.QueryTrackingUseCase;
import com.pvfusion.application.port.out.result.LoadAnalysisResultPort;
import com.pvfusion.application.port.out.tracking.LoadInspectionComparisonPort;
import com.pvfusion.application.port.out.tracking.LoadTrackingPort;
import com.pvfusion.global.error.BusinessException;
import com.pvfusion.global.error.ErrorCode;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TrackingService implements
        QueryTrackingUseCase,
        CompareInspectionResultUseCase,
        QueryRepeatedAnomalyUseCase {

    private final LoadTrackingPort loadTrackingPort;
    private final LoadInspectionComparisonPort loadInspectionComparisonPort;
    private final LoadAnalysisResultPort loadAnalysisResultPort;
    private final AccessChecker accessChecker;

    @Override
    public TrackingResponse execute(TrackingQuery query) {
        validateActorUserId(query.actorUserId());
        validateDateRange(query.from(), query.to());
        validateTrackingScope(query.actorUserId(), query.plantId(), query.zoneId(), query.equipmentId());
        return new TrackingResponse(loadTrackingPort.loadTracking(query));
    }

    @Override
    public InspectionCompareResponse execute(InspectionCompareQuery query) {
        validateActorUserId(query.actorUserId());
        validateRequired(query.currentResultId(), "currentResultId");

        ensureResultExists(query.currentResultId());
        ensureAllowed(accessChecker.checkResultAccess(query.actorUserId(), query.currentResultId()));

        if (query.previousResultId() != null) {
            ensureResultExists(query.previousResultId());
            ensureAllowed(accessChecker.checkResultAccess(query.actorUserId(), query.previousResultId()));
        }

        return loadInspectionComparisonPort.loadInspectionComparison(query)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Tracking comparison not found."));
    }

    @Override
    public List<RepeatedAnomalyResponse> execute(RepeatedAnomalyQuery query) {
        validateActorUserId(query.actorUserId());
        validateDateRange(query.from(), query.to());
        validateTrackingScope(query.actorUserId(), query.plantId(), query.zoneId(), query.equipmentId());
        return loadTrackingPort.loadRepeatedAnomalies(query);
    }

    private void validateTrackingScope(Long actorUserId, Long plantId, Long zoneId, Long equipmentId) {
        boolean admin = accessChecker.isAdmin(actorUserId);
        if (!admin && plantId == null && zoneId == null && equipmentId == null) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "Non-admin tracking queries require scoped filters.");
        }

        if (plantId != null) {
            ensureAllowed(accessChecker.checkPlantAccess(actorUserId, plantId));
        }
        if (zoneId != null) {
            ensureAllowed(accessChecker.checkZoneAccess(actorUserId, zoneId));
        }
        if (equipmentId != null) {
            ensureAllowed(accessChecker.checkEquipmentAccess(actorUserId, equipmentId));
        }
    }

    private void ensureResultExists(Long resultId) {
        loadAnalysisResultPort.loadAnalysisResult(resultId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "AnalysisResult not found: " + resultId));
    }

    private void ensureAllowed(boolean allowed) {
        if (!allowed) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
    }

    private void validateActorUserId(Long actorUserId) {
        validateRequired(actorUserId, "actorUserId");
    }

    private void validateDateRange(java.time.LocalDate from, java.time.LocalDate to) {
        if (from != null && to != null && from.isAfter(to)) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "from must be before or equal to to.");
        }
    }

    private void validateRequired(Object value, String fieldName) {
        if (value == null) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, fieldName + " is required.");
        }
    }
}
