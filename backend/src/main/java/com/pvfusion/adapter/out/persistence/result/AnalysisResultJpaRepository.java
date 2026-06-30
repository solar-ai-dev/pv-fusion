package com.pvfusion.adapter.out.persistence.result;

import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AnalysisResultJpaRepository extends JpaRepository<AnalysisResultJpaEntity, Long> {

    Optional<AnalysisResultJpaEntity> findByAnalysisJobId(Long analysisJobId);

    @Query(
            value = """
                    SELECT ar.*
                    FROM analysis_results ar
                    JOIN analysis_jobs aj ON aj.id = ar.analysis_job_id
                    JOIN inspection_images ii ON ii.id = aj.image_id
                    LEFT JOIN inspections i ON i.id = ii.inspection_id
                    LEFT JOIN zones z ON z.id = i.zone_id
                    WHERE (:plantId IS NULL OR z.plant_id = :plantId)
                      AND (:zoneId IS NULL OR i.zone_id = :zoneId)
                      AND (:inspectionId IS NULL OR i.id = :inspectionId)
                      AND (:targetType IS NULL OR ii.target_type = :targetType)
                      AND (:equipmentId IS NULL OR ii.equipment_id = :equipmentId)
                      AND (:inputType IS NULL OR aj.input_type = :inputType)
                      AND (:modelType IS NULL OR ar.model_type = :modelType)
                      AND (:jobStatus IS NULL OR aj.job_status = :jobStatus)
                      AND (:resultStatus IS NULL OR ar.result_status = :resultStatus)
                      AND (:actionCandidate IS NULL OR ar.action_candidate = :actionCandidate)
                      AND (:severityLevel IS NULL OR ar.severity_level = :severityLevel)
                      AND (:reviewStatus IS NULL OR ar.review_status = :reviewStatus)
                      AND (:analysisJobId IS NULL OR ar.analysis_job_id = :analysisJobId)
                    ORDER BY COALESCE(ar.analyzed_at, ar.created_at) DESC, ar.id DESC
                    """,
            countQuery = """
                    SELECT COUNT(*)
                    FROM analysis_results ar
                    JOIN analysis_jobs aj ON aj.id = ar.analysis_job_id
                    JOIN inspection_images ii ON ii.id = aj.image_id
                    LEFT JOIN inspections i ON i.id = ii.inspection_id
                    LEFT JOIN zones z ON z.id = i.zone_id
                    WHERE (:plantId IS NULL OR z.plant_id = :plantId)
                      AND (:zoneId IS NULL OR i.zone_id = :zoneId)
                      AND (:inspectionId IS NULL OR i.id = :inspectionId)
                      AND (:targetType IS NULL OR ii.target_type = :targetType)
                      AND (:equipmentId IS NULL OR ii.equipment_id = :equipmentId)
                      AND (:inputType IS NULL OR aj.input_type = :inputType)
                      AND (:modelType IS NULL OR ar.model_type = :modelType)
                      AND (:jobStatus IS NULL OR aj.job_status = :jobStatus)
                      AND (:resultStatus IS NULL OR ar.result_status = :resultStatus)
                      AND (:actionCandidate IS NULL OR ar.action_candidate = :actionCandidate)
                      AND (:severityLevel IS NULL OR ar.severity_level = :severityLevel)
                      AND (:reviewStatus IS NULL OR ar.review_status = :reviewStatus)
                      AND (:analysisJobId IS NULL OR ar.analysis_job_id = :analysisJobId)
                    """,
            nativeQuery = true
    )
    Page<AnalysisResultJpaEntity> search(
            @Param("plantId") Long plantId,
            @Param("zoneId") Long zoneId,
            @Param("inspectionId") Long inspectionId,
            @Param("targetType") String targetType,
            @Param("equipmentId") Long equipmentId,
            @Param("inputType") String inputType,
            @Param("modelType") String modelType,
            @Param("jobStatus") String jobStatus,
            @Param("resultStatus") String resultStatus,
            @Param("actionCandidate") String actionCandidate,
            @Param("severityLevel") String severityLevel,
            @Param("reviewStatus") String reviewStatus,
            @Param("analysisJobId") Long analysisJobId,
            Pageable pageable
    );
}
