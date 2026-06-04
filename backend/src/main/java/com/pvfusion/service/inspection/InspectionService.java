package com.pvfusion.service.inspection;

import com.pvfusion.application.dto.image.ImageSummaryResponse;
import com.pvfusion.application.dto.imagepair.ImagePairSummaryResponse;
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
import com.pvfusion.application.port.out.access.AccessChecker;
import com.pvfusion.application.port.out.inspection.LoadInspectionPort;
import com.pvfusion.application.port.out.inspection.SaveInspectionPort;
import com.pvfusion.application.port.out.inspection.UpdateInspectionPort;
import com.pvfusion.application.port.out.zone.LoadZonePort;
import com.pvfusion.domain.inspection.Inspection;
import com.pvfusion.domain.inspection.InspectionStatus;
import com.pvfusion.domain.zone.Zone;
import com.pvfusion.global.error.BusinessException;
import com.pvfusion.global.error.ErrorCode;
import com.pvfusion.global.response.PageResponse;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InspectionService implements
        CreateInspectionUseCase,
        QueryInspectionUseCase,
        GetInspectionUseCase,
        UpdateInspectionUseCase {

    private final LoadInspectionPort loadInspectionPort;
    private final SaveInspectionPort saveInspectionPort;
    private final UpdateInspectionPort updateInspectionPort;
    private final LoadZonePort loadZonePort;
    private final AccessChecker accessChecker;

    @Override
    @Transactional
    public InspectionResponse execute(CreateInspectionCommand command) {
        validateActorUserId(command.actorUserId());
        validateZoneId(command.zoneId());
        validateInspectionName(command.name());
        validateRequired(command.captureMethod(), "captureMethod");

        accessChecker.checkZoneAccess(command.actorUserId(), command.zoneId());
        Zone zone = loadZone(command.zoneId());

        Inspection inspection = new Inspection(
                null,
                command.zoneId(),
                command.name().trim(),
                command.capturedAt(),
                command.captureMethod(),
                normalizeText(command.inspectorName()),
                normalizeText(command.memo()),
                InspectionStatus.READY,
                command.actorUserId(),
                null,
                null
        );

        return toResponse(saveInspectionPort.saveInspection(inspection), zone);
    }

    @Override
    public PageResponse<InspectionSummaryResponse> execute(InspectionListQuery query) {
        validateActorUserId(query.actorUserId());
        validatePage(query.page(), query.size());

        boolean admin = accessChecker.isAdmin(query.actorUserId());
        if (!admin) {
            if (query.zoneId() == null) {
                throw new BusinessException(ErrorCode.FORBIDDEN, "Non-admin inspection queries require zoneId.");
            }
            accessChecker.checkZoneAccess(query.actorUserId(), query.zoneId());
        }

        List<Inspection> inspections = loadInspectionPort.loadInspections(query);
        long totalElements = loadInspectionPort.countInspections(query);
        Map<Long, Zone> zoneMap = loadZones(inspections);

        List<InspectionSummaryResponse> content = inspections.stream()
                .map(inspection -> toSummaryResponse(inspection, zoneMap.get(inspection.getZoneId())))
                .toList();

        int totalPages = query.size() == 0 ? 0 : (int) Math.ceil((double) totalElements / query.size());
        boolean hasNext = (long) (query.page() + 1) * query.size() < totalElements;

        return PageResponse.of(content, query.page(), query.size(), totalElements, totalPages, hasNext);
    }

    @Override
    public InspectionResponse execute(GetInspectionQuery query) {
        validateActorUserId(query.actorUserId());
        validateInspectionId(query.inspectionId());

        accessChecker.checkInspectionAccess(query.actorUserId(), query.inspectionId());
        Inspection inspection = loadInspection(query.inspectionId());
        Zone zone = loadZone(inspection.getZoneId());
        return toResponse(inspection, zone);
    }

    @Override
    @Transactional
    public InspectionResponse execute(UpdateInspectionCommand command) {
        validateActorUserId(command.actorUserId());
        validateInspectionId(command.inspectionId());

        accessChecker.checkInspectionAccess(command.actorUserId(), command.inspectionId());
        Inspection existing = loadInspection(command.inspectionId());
        Zone zone = loadZone(existing.getZoneId());

        Inspection updated = new Inspection(
                existing.getId(),
                existing.getZoneId(),
                mergeName(existing.getName(), command.name()),
                command.capturedAt() != null ? command.capturedAt() : existing.getCapturedAt(),
                command.captureMethod() != null ? command.captureMethod() : existing.getCaptureMethod(),
                mergeText(existing.getInspectorName(), command.inspectorName()),
                mergeText(existing.getMemo(), command.memo()),
                existing.getInspectionStatus(),
                existing.getCreatedByUserId(),
                existing.getCreatedAt(),
                existing.getUpdatedAt()
        );

        return toResponse(updateInspectionPort.updateInspection(updated), zone);
    }

    private Inspection loadInspection(Long inspectionId) {
        return loadInspectionPort.loadInspection(inspectionId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Inspection not found: " + inspectionId));
    }

    private Zone loadZone(Long zoneId) {
        return loadZonePort.loadZone(zoneId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Zone not found: " + zoneId));
    }

    private Map<Long, Zone> loadZones(List<Inspection> inspections) {
        Map<Long, Zone> zoneMap = new HashMap<>();
        for (Inspection inspection : inspections) {
            zoneMap.computeIfAbsent(inspection.getZoneId(), this::loadZone);
        }
        return zoneMap;
    }

    private InspectionResponse toResponse(Inspection inspection, Zone zone) {
        return new InspectionResponse(
                inspection.getId(),
                inspection.getZoneId(),
                zone.getPlantId(),
                inspection.getName(),
                inspection.getCapturedAt(),
                inspection.getCaptureMethod(),
                inspection.getInspectorName(),
                inspection.getMemo(),
                inspection.getInspectionStatus(),
                inspection.getCreatedByUserId(),
                inspection.getCreatedAt(),
                inspection.getUpdatedAt(),
                Collections.<ImageSummaryResponse>emptyList(),
                Collections.<ImagePairSummaryResponse>emptyList(),
                Collections.<Long>emptyList()
        );
    }

    private InspectionSummaryResponse toSummaryResponse(Inspection inspection, Zone zone) {
        return new InspectionSummaryResponse(
                inspection.getId(),
                inspection.getZoneId(),
                zone != null ? zone.getPlantId() : null,
                inspection.getName(),
                inspection.getCapturedAt(),
                inspection.getCaptureMethod(),
                inspection.getInspectionStatus(),
                inspection.getCreatedAt()
        );
    }

    private String mergeName(String currentValue, String nextValue) {
        if (nextValue == null) {
            return currentValue;
        }
        validateInspectionName(nextValue);
        return nextValue.trim();
    }

    private String mergeText(String currentValue, String nextValue) {
        return nextValue != null ? normalizeText(nextValue) : currentValue;
    }

    private String normalizeText(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private void validateActorUserId(Long actorUserId) {
        validateRequired(actorUserId, "actorUserId");
    }

    private void validateZoneId(Long zoneId) {
        validateRequired(zoneId, "zoneId");
    }

    private void validateInspectionId(Long inspectionId) {
        validateRequired(inspectionId, "inspectionId");
    }

    private void validateRequired(Object value, String fieldName) {
        if (value == null) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, fieldName + " is required.");
        }
    }

    private void validateInspectionName(String name) {
        if (name == null || name.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "name is required.");
        }
    }

    private void validatePage(int page, int size) {
        if (page < 0 || size <= 0) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "page and size must be valid.");
        }
    }
}
