package com.pvfusion.adapter.out.persistence.tracking;

import com.pvfusion.adapter.out.persistence.result.AnalysisResultJpaEntity;
import java.time.Instant;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

public interface TrackingJpaRepository extends Repository<AnalysisResultJpaEntity, Long> {

    @Query(
            value = """
                    SELECT ar.id AS resultId,
                           ar.analysis_job_id AS analysisJobId,
                           z.plant_id AS plantId,
                           i.zone_id AS zoneId,
                           i.id AS inspectionId,
                           ii.equipment_id AS equipmentId,
                           ii.target_type AS targetType,
                           aj.input_type AS inputType,
                           ar.model_type AS modelType,
                           ar.anomaly_count AS anomalyCount,
                           ar.area_ratio AS areaRatio,
                           ar.severity_score AS severityScore,
                           ar.action_candidate AS actionCandidate,
                           ar.priority_level AS priorityLevel,
                           ar.severity_level AS severityLevel,
                           ar.review_status AS reviewStatus,
                           COALESCE(ar.analyzed_at, ar.created_at) AS analyzedAt
                    FROM analysis_results ar
                    JOIN analysis_jobs aj ON aj.id = ar.analysis_job_id
                    JOIN inspection_images ii ON ii.id = aj.image_id
                    LEFT JOIN inspections i ON i.id = ii.inspection_id
                    LEFT JOIN zones z ON z.id = i.zone_id
                    WHERE (:plantId IS NULL OR z.plant_id = :plantId)
                      AND (:zoneId IS NULL OR i.zone_id = :zoneId)
                      AND (:equipmentId IS NULL OR ii.equipment_id = :equipmentId)
                      AND (:targetType IS NULL OR ii.target_type = :targetType)
                      AND (CAST(:fromDate AS date) IS NULL OR CAST(COALESCE(ar.analyzed_at, ar.created_at) AS date) >= CAST(:fromDate AS date))
                      AND (CAST(:toDate AS date) IS NULL OR CAST(COALESCE(ar.analyzed_at, ar.created_at) AS date) <= CAST(:toDate AS date))
                      AND (:inputType IS NULL OR aj.input_type = :inputType)
                      AND (:modelType IS NULL OR ar.model_type = :modelType)
                      AND (:actionCandidate IS NULL OR ar.action_candidate = :actionCandidate)
                      AND (:priorityLevel IS NULL OR ar.priority_level = :priorityLevel)
                      AND (:severityLevel IS NULL OR ar.severity_level = :severityLevel)
                      AND (:actorUserId IS NULL
                           OR EXISTS (
                               SELECT 1 FROM plant_members pm
                               WHERE pm.plant_id = z.plant_id
                                 AND pm.user_id = :actorUserId
                                 AND pm.status = 'ACTIVE'
                           ))
                    ORDER BY COALESCE(ar.analyzed_at, ar.created_at) DESC, ar.id DESC
                    """,
            nativeQuery = true
    )
    List<TrackingResultProjection> searchTracking(
            @Param("actorUserId") Long actorUserId,
            @Param("plantId") Long plantId,
            @Param("zoneId") Long zoneId,
            @Param("equipmentId") Long equipmentId,
            @Param("targetType") String targetType,
            @Param("fromDate") String fromDate,
            @Param("toDate") String toDate,
            @Param("inputType") String inputType,
            @Param("modelType") String modelType,
            @Param("actionCandidate") String actionCandidate,
            @Param("priorityLevel") String priorityLevel,
            @Param("severityLevel") String severityLevel
    );

    @Query(
            value = """
                    SELECT ar.id AS resultId,
                           ar.analysis_job_id AS analysisJobId,
                           z.plant_id AS plantId,
                           i.zone_id AS zoneId,
                           i.id AS inspectionId,
                           ii.equipment_id AS equipmentId,
                           ii.target_type AS targetType,
                           aj.input_type AS inputType,
                           ar.model_type AS modelType,
                           ar.anomaly_count AS anomalyCount,
                           ar.area_ratio AS areaRatio,
                           ar.severity_score AS severityScore,
                           ar.action_candidate AS actionCandidate,
                           ar.priority_level AS priorityLevel,
                           ar.severity_level AS severityLevel,
                           ar.review_status AS reviewStatus,
                           COALESCE(ar.analyzed_at, ar.created_at) AS analyzedAt
                    FROM analysis_results ar
                    JOIN analysis_jobs aj ON aj.id = ar.analysis_job_id
                    JOIN inspection_images ii ON ii.id = aj.image_id
                    LEFT JOIN inspections i ON i.id = ii.inspection_id
                    LEFT JOIN zones z ON z.id = i.zone_id
                    WHERE ar.id = :resultId
                    """,
            nativeQuery = true
    )
    Optional<TrackingResultProjection> findTrackingResultByResultId(@Param("resultId") Long resultId);

    @Query(
            value = """
                    SELECT ar.id AS resultId,
                           ar.analysis_job_id AS analysisJobId,
                           z.plant_id AS plantId,
                           i.zone_id AS zoneId,
                           i.id AS inspectionId,
                           ii.equipment_id AS equipmentId,
                           ii.target_type AS targetType,
                           aj.input_type AS inputType,
                           ar.model_type AS modelType,
                           ar.anomaly_count AS anomalyCount,
                           ar.area_ratio AS areaRatio,
                           ar.severity_score AS severityScore,
                           ar.action_candidate AS actionCandidate,
                           ar.priority_level AS priorityLevel,
                           ar.severity_level AS severityLevel,
                           ar.review_status AS reviewStatus,
                           COALESCE(ar.analyzed_at, ar.created_at) AS analyzedAt
                    FROM analysis_results ar
                    JOIN analysis_jobs aj ON aj.id = ar.analysis_job_id
                    JOIN inspection_images ii ON ii.id = aj.image_id
                    LEFT JOIN inspections i ON i.id = ii.inspection_id
                    LEFT JOIN zones z ON z.id = i.zone_id
                    WHERE i.zone_id = :zoneId
                      AND ii.target_type = :targetType
                      AND ((:equipmentId IS NULL AND ii.equipment_id IS NULL)
                        OR ii.equipment_id = :equipmentId)
                      AND aj.input_type = :inputType
                      AND (
                           COALESCE(ar.analyzed_at, ar.created_at) < :analyzedAt
                           OR (COALESCE(ar.analyzed_at, ar.created_at) = :analyzedAt AND ar.id < :currentResultId)
                      )
                    ORDER BY COALESCE(ar.analyzed_at, ar.created_at) DESC, ar.id DESC
                    LIMIT 1
                    """,
            nativeQuery = true
    )
    Optional<TrackingResultProjection> findPreviousTrackingResult(
            @Param("zoneId") Long zoneId,
            @Param("targetType") String targetType,
            @Param("equipmentId") Long equipmentId,
            @Param("inputType") String inputType,
            @Param("analyzedAt") Instant analyzedAt,
            @Param("currentResultId") Long currentResultId
    );
}
