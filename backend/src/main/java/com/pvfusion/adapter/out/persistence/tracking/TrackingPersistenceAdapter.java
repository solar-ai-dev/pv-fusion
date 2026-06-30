package com.pvfusion.adapter.out.persistence.tracking;

import com.pvfusion.adapter.out.persistence.defect.DetectedDefectJpaEntity;
import com.pvfusion.adapter.out.persistence.defect.DetectedDefectJpaRepository;
import com.pvfusion.application.dto.tracking.AreaChangeResponse;
import com.pvfusion.application.dto.tracking.DefectChangeResponse;
import com.pvfusion.application.dto.tracking.InspectionCompareQuery;
import com.pvfusion.application.dto.tracking.InspectionCompareResponse;
import com.pvfusion.application.dto.tracking.RepeatedAnomalyQuery;
import com.pvfusion.application.dto.tracking.RepeatedAnomalyResponse;
import com.pvfusion.application.dto.tracking.SeverityChangeResponse;
import com.pvfusion.application.dto.tracking.TrackingQuery;
import com.pvfusion.application.dto.tracking.TrackingSummaryResponse;
import com.pvfusion.application.port.out.tracking.LoadInspectionComparisonPort;
import com.pvfusion.application.port.out.tracking.LoadTrackingPort;
import com.pvfusion.domain.analysis.AnalysisInputType;
import com.pvfusion.domain.analysis.AnalysisModelType;
import com.pvfusion.domain.common.TargetType;
import com.pvfusion.domain.defect.DefectType;
import com.pvfusion.domain.result.ActionCandidate;
import com.pvfusion.domain.result.PriorityLevel;
import com.pvfusion.domain.result.SeverityLevel;
import com.pvfusion.domain.review.ReviewStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class TrackingPersistenceAdapter implements LoadTrackingPort, LoadInspectionComparisonPort {

    private final TrackingJpaRepository trackingJpaRepository;
    private final DetectedDefectJpaRepository detectedDefectJpaRepository;

    @Override
    public List<TrackingSummaryResponse> loadTracking(TrackingQuery query) {
        return trackingJpaRepository.searchTracking(
                        query.plantId(),
                        query.zoneId(),
                        query.equipmentId(),
                        enumName(query.targetType()),
                        query.from(),
                        query.to(),
                        enumName(query.inputType()),
                        enumName(query.modelType()),
                        enumName(query.actionCandidate()),
                        enumName(query.priorityLevel()),
                        enumName(query.severityLevel())
                ).stream()
                .map(this::toTrackingSummary)
                .toList();
    }

    @Override
    public List<RepeatedAnomalyResponse> loadRepeatedAnomalies(RepeatedAnomalyQuery query) {
        return trackingJpaRepository.searchTracking(
                        query.plantId(),
                        query.zoneId(),
                        query.equipmentId(),
                        enumName(query.targetType()),
                        query.from(),
                        query.to(),
                        null,
                        null,
                        null,
                        null,
                        null
                ).stream()
                .map(this::buildComparison)
                .filter(comparison -> comparison.repeatedCount() > 0)
                .map(comparison -> new RepeatedAnomalyResponse(
                        comparison.current().plantId(),
                        comparison.current().zoneId(),
                        comparison.current().equipmentId(),
                        comparison.current().targetType(),
                        comparison.current().inspectionId(),
                        comparison.previous() != null ? comparison.previous().inspectionId() : null,
                        comparison.current().resultId(),
                        comparison.previous() != null ? comparison.previous().resultId() : null,
                        comparison.repeatedCount(),
                        true,
                        comparison.current().analyzedAt()
                ))
                .toList();
    }

    @Override
    public Optional<InspectionCompareResponse> loadInspectionComparison(InspectionCompareQuery query) {
        Optional<TrackingResultProjection> currentOptional = trackingJpaRepository.findTrackingResultByResultId(query.currentResultId());
        if (currentOptional.isEmpty()) {
            return Optional.empty();
        }

        TrackingResultProjection current = currentOptional.get();
        TrackingResultProjection previous = query.previousResultId() != null
                ? trackingJpaRepository.findTrackingResultByResultId(query.previousResultId()).orElse(null)
                : resolvePrevious(current).orElse(null);

        Comparison comparison = buildComparison(current, previous);
        return Optional.of(new InspectionCompareResponse(
                comparison.current().resultId(),
                comparison.previous() != null ? comparison.previous().resultId() : null,
                toTrackingSummary(comparison.current(), comparison.previous(), comparison),
                comparison.previous() != null ? toTrackingSummary(comparison.previous(), null, buildComparison(previous, null)) : null,
                new AreaChangeResponse(
                        comparison.current().areaRatio(),
                        comparison.previous() != null ? comparison.previous().areaRatio() : null,
                        diff(comparison.current().areaRatio(), comparison.previous() != null ? comparison.previous().areaRatio() : null)
                ),
                new SeverityChangeResponse(
                        comparison.current().severityScore(),
                        comparison.previous() != null ? comparison.previous().severityScore() : null,
                        diff(comparison.current().severityScore(), comparison.previous() != null ? comparison.previous().severityScore() : null),
                        comparison.worsenedBySeverity()
                ),
                comparison.defectChange(),
                comparison.repeatedCount() > 0,
                comparison.worsened(),
                comparison.priorityReason()
        ));
    }

    private TrackingSummaryResponse toTrackingSummary(TrackingResultProjection current) {
        Comparison comparison = buildComparison(current);
        return toTrackingSummary(comparison.current(), comparison.previous(), comparison);
    }

    private TrackingSummaryResponse toTrackingSummary(TrackingRow current, TrackingRow previous, Comparison comparison) {
        return new TrackingSummaryResponse(
                current.inspectionId(),
                previous != null ? previous.inspectionId() : null,
                current.resultId(),
                previous != null ? previous.resultId() : null,
                current.plantId(),
                current.zoneId(),
                current.equipmentId(),
                current.targetType(),
                current.inputType(),
                current.modelType(),
                current.anomalyCount(),
                comparison.repeatedCount(),
                current.areaRatio(),
                previous != null ? previous.areaRatio() : null,
                current.severityScore(),
                previous != null ? previous.severityScore() : null,
                current.actionCandidate(),
                current.priorityLevel(),
                current.severityLevel(),
                comparison.repeatedCount() > 0,
                comparison.worsened(),
                current.analyzedAt()
        );
    }

    private Comparison buildComparison(TrackingResultProjection current) {
        return buildComparison(current, resolvePrevious(current).orElse(null));
    }

    private Comparison buildComparison(TrackingResultProjection current, TrackingResultProjection previous) {
        List<DetectedDefectJpaEntity> currentDefects = loadDefects(current.getResultId());
        List<DetectedDefectJpaEntity> previousDefects = previous != null ? loadDefects(previous.getResultId()) : List.of();

        Set<DefectType> currentTypes = toDefectTypes(currentDefects);
        Set<DefectType> previousTypes = toDefectTypes(previousDefects);
        List<DefectType> persistentTypes = currentTypes.stream()
                .filter(previousTypes::contains)
                .toList();
        List<DefectType> newTypes = currentTypes.stream()
                .filter(type -> !previousTypes.contains(type))
                .toList();
        List<DefectType> resolvedTypes = previousTypes.stream()
                .filter(type -> !currentTypes.contains(type))
                .toList();

        TrackingRow currentRow = mapProjection(current);
        TrackingRow previousRow = previous != null ? mapProjection(previous) : null;

        boolean worsenedBySeverity = previousRow != null && compareSeverity(currentRow.severityLevel(), previousRow.severityLevel()) > 0;
        boolean worsenedByScore = diff(currentRow.severityScore(), previousRow != null ? previousRow.severityScore() : null) != null
                && diff(currentRow.severityScore(), previousRow.severityScore()).signum() > 0;
        boolean worsenedByCount = previousRow != null && safeInt(currentRow.anomalyCount()) > safeInt(previousRow.anomalyCount());
        boolean newHighSeverityDefect = currentDefects.stream()
                .filter(defect -> !previousTypes.contains(defect.getDefectType()))
                .anyMatch(defect -> isHighSeverity(defect.getSeverityLevel()));
        boolean worsened = worsenedBySeverity || worsenedByScore || worsenedByCount || newHighSeverityDefect;

        return new Comparison(
                currentRow,
                previousRow,
                persistentTypes.size(),
                worsened,
                worsenedBySeverity,
                new DefectChangeResponse(
                        currentDefects.size(),
                        previousDefects.size(),
                        currentDefects.size() - previousDefects.size(),
                        newTypes,
                        resolvedTypes,
                        persistentTypes
                ),
                buildPriorityReason(worsenedBySeverity, worsenedByScore, worsenedByCount, newHighSeverityDefect)
        );
    }

    private Optional<TrackingResultProjection> resolvePrevious(TrackingResultProjection current) {
        return trackingJpaRepository.findPreviousTrackingResult(
                current.getZoneId(),
                current.getTargetType(),
                current.getEquipmentId(),
                current.getInputType(),
                current.getAnalyzedAt(),
                current.getResultId()
        );
    }

    private List<DetectedDefectJpaEntity> loadDefects(Long resultId) {
        return detectedDefectJpaRepository.findByAnalysisResultIdOrderByCreatedAtAscIdAsc(resultId);
    }

    private Set<DefectType> toDefectTypes(List<DetectedDefectJpaEntity> defects) {
        return defects.stream()
                .map(DetectedDefectJpaEntity::getDefectType)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private TrackingRow mapProjection(TrackingResultProjection projection) {
        return new TrackingRow(
                projection.getResultId(),
                projection.getPlantId(),
                projection.getZoneId(),
                projection.getInspectionId(),
                projection.getEquipmentId(),
                enumValue(TargetType.class, projection.getTargetType()),
                enumValue(AnalysisInputType.class, projection.getInputType()),
                enumValue(AnalysisModelType.class, projection.getModelType()),
                projection.getAnomalyCount(),
                projection.getAreaRatio(),
                projection.getSeverityScore(),
                enumValue(ActionCandidate.class, projection.getActionCandidate()),
                enumValue(PriorityLevel.class, projection.getPriorityLevel()),
                enumValue(SeverityLevel.class, projection.getSeverityLevel()),
                enumValue(ReviewStatus.class, projection.getReviewStatus()),
                toOffsetDateTime(projection.getAnalyzedAt())
        );
    }

    private OffsetDateTime toOffsetDateTime(Instant value) {
        return value != null ? OffsetDateTime.ofInstant(value, ZoneOffset.UTC) : null;
    }

    private boolean isHighSeverity(SeverityLevel severityLevel) {
        return severityLevel == SeverityLevel.HIGH || severityLevel == SeverityLevel.CRITICAL;
    }

    private int compareSeverity(SeverityLevel current, SeverityLevel previous) {
        if (current == null || previous == null) {
            return 0;
        }
        return Integer.compare(current.ordinal(), previous.ordinal());
    }

    private Integer safeInt(Integer value) {
        return value != null ? value : 0;
    }

    private BigDecimal diff(BigDecimal current, BigDecimal previous) {
        if (current == null || previous == null) {
            return null;
        }
        return current.subtract(previous);
    }

    private String buildPriorityReason(
            boolean worsenedBySeverity,
            boolean worsenedByScore,
            boolean worsenedByCount,
            boolean newHighSeverityDefect
    ) {
        List<String> reasons = new java.util.ArrayList<>();
        if (worsenedBySeverity) {
            reasons.add("severity level increased");
        }
        if (worsenedByScore) {
            reasons.add("severity score increased");
        }
        if (worsenedByCount) {
            reasons.add("anomaly count increased");
        }
        if (newHighSeverityDefect) {
            reasons.add("new high severity defect detected");
        }
        return reasons.isEmpty() ? "no priority escalation" : String.join("; ", reasons);
    }

    private String enumName(Enum<?> value) {
        return value != null ? value.name() : null;
    }

    private <T extends Enum<T>> T enumValue(Class<T> enumType, String value) {
        return value != null ? Enum.valueOf(enumType, value) : null;
    }

    private record TrackingRow(
            Long resultId,
            Long plantId,
            Long zoneId,
            Long inspectionId,
            Long equipmentId,
            TargetType targetType,
            AnalysisInputType inputType,
            AnalysisModelType modelType,
            Integer anomalyCount,
            BigDecimal areaRatio,
            BigDecimal severityScore,
            ActionCandidate actionCandidate,
            PriorityLevel priorityLevel,
            SeverityLevel severityLevel,
            ReviewStatus reviewStatus,
            OffsetDateTime analyzedAt
    ) {
    }

    private record Comparison(
            TrackingRow current,
            TrackingRow previous,
            Integer repeatedCount,
            boolean worsened,
            boolean worsenedBySeverity,
            DefectChangeResponse defectChange,
            String priorityReason
    ) {
    }
}
