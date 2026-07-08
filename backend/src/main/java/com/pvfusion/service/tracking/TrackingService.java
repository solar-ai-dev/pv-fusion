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
import com.pvfusion.application.port.out.auth.CurrentUserPort;
import com.pvfusion.application.port.out.result.LoadAnalysisResultPort;
import com.pvfusion.application.port.out.tracking.LoadInspectionComparisonPort;
import com.pvfusion.application.port.out.tracking.LoadTrackingPort;
import com.pvfusion.global.error.BusinessException;
import com.pvfusion.global.error.ErrorCode;
import com.pvfusion.global.error.UnauthorizedException;
import java.time.LocalDate;
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
    private final CurrentUserPort currentUserPort;

    @Override
    public TrackingResponse execute(TrackingQuery query) {
        Long currentUserId = requireCurrentUserId();
        validateDateRange(query.from(), query.to());
        TrackingQuery execQuery = applyTrackingScope(currentUserId, query);
        return new TrackingResponse(loadTrackingPort.loadTracking(execQuery));
    }

    @Override
    public InspectionCompareResponse execute(InspectionCompareQuery query) {
        Long currentUserId = requireCurrentUserId();
        validateRequired(query.currentResultId(), "currentResultId");

        ensureResultExists(query.currentResultId());
        ensureAllowed(accessChecker.checkResultAccess(currentUserId, query.currentResultId()));

        if (query.previousResultId() != null) {
            ensureResultExists(query.previousResultId());
            ensureAllowed(accessChecker.checkResultAccess(currentUserId, query.previousResultId()));
        }

        return loadInspectionComparisonPort.loadInspectionComparison(query)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Tracking comparison not found."));
    }

    @Override
    public List<RepeatedAnomalyResponse> execute(RepeatedAnomalyQuery query) {
        Long currentUserId = requireCurrentUserId();
        validateDateRange(query.from(), query.to());
        RepeatedAnomalyQuery execQuery = applyTrackingScope(currentUserId, query);
        return loadTrackingPort.loadRepeatedAnomalies(execQuery);
    }

    private TrackingQuery applyTrackingScope(Long actorUserId, TrackingQuery query) {
        boolean admin = accessChecker.isAdmin(actorUserId);
        if (query.plantId() != null) {
            ensureAllowed(accessChecker.checkPlantAccess(actorUserId, query.plantId()));
        } else if (query.zoneId() != null) {
            ensureAllowed(accessChecker.checkZoneAccess(actorUserId, query.zoneId()));
        } else if (query.equipmentId() != null) {
            ensureAllowed(accessChecker.checkEquipmentAccess(actorUserId, query.equipmentId()));
        } else if (!admin) {
            // non-admin, no explicit scope: auto-filter by plant membership
            return new TrackingQuery(actorUserId, query.plantId(), query.zoneId(), query.equipmentId(),
                    query.targetType(), query.from(), query.to(), query.inputType(), query.modelType(),
                    query.actionCandidate(), query.priorityLevel(), query.severityLevel());
        }
        return query;
    }

    private RepeatedAnomalyQuery applyTrackingScope(Long actorUserId, RepeatedAnomalyQuery query) {
        boolean admin = accessChecker.isAdmin(actorUserId);
        if (query.plantId() != null) {
            ensureAllowed(accessChecker.checkPlantAccess(actorUserId, query.plantId()));
        } else if (query.zoneId() != null) {
            ensureAllowed(accessChecker.checkZoneAccess(actorUserId, query.zoneId()));
        } else if (query.equipmentId() != null) {
            ensureAllowed(accessChecker.checkEquipmentAccess(actorUserId, query.equipmentId()));
        } else if (!admin) {
            return new RepeatedAnomalyQuery(actorUserId, query.plantId(), query.zoneId(), query.equipmentId(),
                    query.targetType(), query.from(), query.to());
        }
        return query;
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

    private Long requireCurrentUserId() {
        return currentUserPort.getCurrentUserId()
                .orElseThrow(UnauthorizedException::new);
    }

    private void validateDateRange(LocalDate from, LocalDate to) {
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
