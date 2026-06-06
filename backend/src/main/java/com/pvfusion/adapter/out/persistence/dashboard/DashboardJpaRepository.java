package com.pvfusion.adapter.out.persistence.dashboard;

import com.pvfusion.adapter.out.persistence.result.AnalysisResultJpaEntity;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

public interface DashboardJpaRepository extends Repository<AnalysisResultJpaEntity, Long> {

    @Query(
            value = """
                    SELECT
                        (SELECT COUNT(DISTINCT z.plant_id)
                         FROM inspections i
                         JOIN zones z ON z.id = i.zone_id
                         WHERE (:plantId IS NULL OR z.plant_id = :plantId)
                           AND (:zoneId IS NULL OR i.zone_id = :zoneId)
                           AND (:fromDate IS NULL OR CAST(COALESCE(i.captured_at, i.created_at) AS date) >= :fromDate)
                           AND (:toDate IS NULL OR CAST(COALESCE(i.captured_at, i.created_at) AS date) <= :toDate)
                        ) AS totalPlantCount,
                        (SELECT COUNT(DISTINCT i.zone_id)
                         FROM inspections i
                         JOIN zones z ON z.id = i.zone_id
                         WHERE (:plantId IS NULL OR z.plant_id = :plantId)
                           AND (:zoneId IS NULL OR i.zone_id = :zoneId)
                           AND (:fromDate IS NULL OR CAST(COALESCE(i.captured_at, i.created_at) AS date) >= :fromDate)
                           AND (:toDate IS NULL OR CAST(COALESCE(i.captured_at, i.created_at) AS date) <= :toDate)
                        ) AS totalZoneCount,
                        (SELECT COUNT(*)
                         FROM inspections i
                         JOIN zones z ON z.id = i.zone_id
                         WHERE (:plantId IS NULL OR z.plant_id = :plantId)
                           AND (:zoneId IS NULL OR i.zone_id = :zoneId)
                           AND (:fromDate IS NULL OR CAST(COALESCE(i.captured_at, i.created_at) AS date) >= :fromDate)
                           AND (:toDate IS NULL OR CAST(COALESCE(i.captured_at, i.created_at) AS date) <= :toDate)
                        ) AS totalInspectionCount,
                        (SELECT COUNT(*)
                         FROM inspections i
                         JOIN zones z ON z.id = i.zone_id
                         WHERE (:plantId IS NULL OR z.plant_id = :plantId)
                           AND (:zoneId IS NULL OR i.zone_id = :zoneId)
                           AND i.inspection_status IN ('READY', 'UPLOADING', 'ANALYZING')
                           AND (:fromDate IS NULL OR CAST(COALESCE(i.captured_at, i.created_at) AS date) >= :fromDate)
                           AND (:toDate IS NULL OR CAST(COALESCE(i.captured_at, i.created_at) AS date) <= :toDate)
                        ) AS inProgressInspectionCount,
                        (SELECT COUNT(*)
                         FROM inspections i
                         JOIN zones z ON z.id = i.zone_id
                         WHERE (:plantId IS NULL OR z.plant_id = :plantId)
                           AND (:zoneId IS NULL OR i.zone_id = :zoneId)
                           AND i.inspection_status = 'COMPLETED'
                           AND (:fromDate IS NULL OR CAST(COALESCE(i.captured_at, i.created_at) AS date) >= :fromDate)
                           AND (:toDate IS NULL OR CAST(COALESCE(i.captured_at, i.created_at) AS date) <= :toDate)
                        ) AS completedInspectionCount,
                        (SELECT COUNT(*)
                         FROM inspection_images ii
                         JOIN inspections i ON i.id = ii.inspection_id
                         JOIN zones z ON z.id = i.zone_id
                         WHERE (:plantId IS NULL OR z.plant_id = :plantId)
                           AND (:zoneId IS NULL OR i.zone_id = :zoneId)
                           AND (:fromDate IS NULL OR CAST(COALESCE(i.captured_at, i.created_at) AS date) >= :fromDate)
                           AND (:toDate IS NULL OR CAST(COALESCE(i.captured_at, i.created_at) AS date) <= :toDate)
                        ) AS totalImageCount,
                        (SELECT COUNT(*)
                         FROM image_pairs ip
                         JOIN inspections i ON i.id = ip.inspection_id
                         JOIN zones z ON z.id = i.zone_id
                         WHERE (:plantId IS NULL OR z.plant_id = :plantId)
                           AND (:zoneId IS NULL OR i.zone_id = :zoneId)
                           AND (:fromDate IS NULL OR CAST(COALESCE(i.captured_at, i.created_at) AS date) >= :fromDate)
                           AND (:toDate IS NULL OR CAST(COALESCE(i.captured_at, i.created_at) AS date) <= :toDate)
                        ) AS totalImagePairCount,
                        (SELECT COUNT(*)
                         FROM analysis_jobs aj
                         LEFT JOIN inspection_images ii ON ii.id = aj.image_id
                         LEFT JOIN image_pairs ip ON ip.id = aj.image_pair_id
                         JOIN inspections i ON i.id = COALESCE(ii.inspection_id, ip.inspection_id)
                         JOIN zones z ON z.id = i.zone_id
                         WHERE (:plantId IS NULL OR z.plant_id = :plantId)
                           AND (:zoneId IS NULL OR i.zone_id = :zoneId)
                           AND (:fromDate IS NULL OR CAST(aj.requested_at AS date) >= :fromDate)
                           AND (:toDate IS NULL OR CAST(aj.requested_at AS date) <= :toDate)
                        ) AS totalAnalysisJobCount,
                        (SELECT COUNT(*) FROM analysis_jobs aj
                         LEFT JOIN inspection_images ii ON ii.id = aj.image_id
                         LEFT JOIN image_pairs ip ON ip.id = aj.image_pair_id
                         JOIN inspections i ON i.id = COALESCE(ii.inspection_id, ip.inspection_id)
                         JOIN zones z ON z.id = i.zone_id
                         WHERE (:plantId IS NULL OR z.plant_id = :plantId)
                           AND (:zoneId IS NULL OR i.zone_id = :zoneId)
                           AND aj.job_status = 'QUEUED'
                           AND (:fromDate IS NULL OR CAST(aj.requested_at AS date) >= :fromDate)
                           AND (:toDate IS NULL OR CAST(aj.requested_at AS date) <= :toDate)
                        ) AS queuedJobCount,
                        (SELECT COUNT(*) FROM analysis_jobs aj
                         LEFT JOIN inspection_images ii ON ii.id = aj.image_id
                         LEFT JOIN image_pairs ip ON ip.id = aj.image_pair_id
                         JOIN inspections i ON i.id = COALESCE(ii.inspection_id, ip.inspection_id)
                         JOIN zones z ON z.id = i.zone_id
                         WHERE (:plantId IS NULL OR z.plant_id = :plantId)
                           AND (:zoneId IS NULL OR i.zone_id = :zoneId)
                           AND aj.job_status = 'RUNNING'
                           AND (:fromDate IS NULL OR CAST(aj.requested_at AS date) >= :fromDate)
                           AND (:toDate IS NULL OR CAST(aj.requested_at AS date) <= :toDate)
                        ) AS runningJobCount,
                        (SELECT COUNT(*) FROM analysis_jobs aj
                         LEFT JOIN inspection_images ii ON ii.id = aj.image_id
                         LEFT JOIN image_pairs ip ON ip.id = aj.image_pair_id
                         JOIN inspections i ON i.id = COALESCE(ii.inspection_id, ip.inspection_id)
                         JOIN zones z ON z.id = i.zone_id
                         WHERE (:plantId IS NULL OR z.plant_id = :plantId)
                           AND (:zoneId IS NULL OR i.zone_id = :zoneId)
                           AND aj.job_status = 'SUCCEEDED'
                           AND (:fromDate IS NULL OR CAST(aj.requested_at AS date) >= :fromDate)
                           AND (:toDate IS NULL OR CAST(aj.requested_at AS date) <= :toDate)
                        ) AS succeededJobCount,
                        (SELECT COUNT(*) FROM analysis_jobs aj
                         LEFT JOIN inspection_images ii ON ii.id = aj.image_id
                         LEFT JOIN image_pairs ip ON ip.id = aj.image_pair_id
                         JOIN inspections i ON i.id = COALESCE(ii.inspection_id, ip.inspection_id)
                         JOIN zones z ON z.id = i.zone_id
                         WHERE (:plantId IS NULL OR z.plant_id = :plantId)
                           AND (:zoneId IS NULL OR i.zone_id = :zoneId)
                           AND aj.job_status = 'FAILED'
                           AND (:fromDate IS NULL OR CAST(aj.requested_at AS date) >= :fromDate)
                           AND (:toDate IS NULL OR CAST(aj.requested_at AS date) <= :toDate)
                        ) AS failedJobCount,
                        (SELECT COUNT(*)
                         FROM analysis_results ar
                         JOIN analysis_jobs aj ON aj.id = ar.analysis_job_id
                         LEFT JOIN inspection_images ii ON ii.id = aj.image_id
                         LEFT JOIN image_pairs ip ON ip.id = aj.image_pair_id
                         JOIN inspections i ON i.id = COALESCE(ii.inspection_id, ip.inspection_id)
                         JOIN zones z ON z.id = i.zone_id
                         WHERE (:plantId IS NULL OR z.plant_id = :plantId)
                           AND (:zoneId IS NULL OR i.zone_id = :zoneId)
                           AND (:fromDate IS NULL OR CAST(COALESCE(ar.analyzed_at, ar.created_at) AS date) >= :fromDate)
                           AND (:toDate IS NULL OR CAST(COALESCE(ar.analyzed_at, ar.created_at) AS date) <= :toDate)
                        ) AS totalAnalysisResultCount,
                        (SELECT COUNT(*) FROM analysis_results ar
                         JOIN analysis_jobs aj ON aj.id = ar.analysis_job_id
                         LEFT JOIN inspection_images ii ON ii.id = aj.image_id
                         LEFT JOIN image_pairs ip ON ip.id = aj.image_pair_id
                         JOIN inspections i ON i.id = COALESCE(ii.inspection_id, ip.inspection_id)
                         JOIN zones z ON z.id = i.zone_id
                         WHERE (:plantId IS NULL OR z.plant_id = :plantId)
                           AND (:zoneId IS NULL OR i.zone_id = :zoneId)
                           AND ar.result_status = 'NORMAL'
                           AND (:fromDate IS NULL OR CAST(COALESCE(ar.analyzed_at, ar.created_at) AS date) >= :fromDate)
                           AND (:toDate IS NULL OR CAST(COALESCE(ar.analyzed_at, ar.created_at) AS date) <= :toDate)
                        ) AS normalResultCount,
                        (SELECT COUNT(*) FROM analysis_results ar
                         JOIN analysis_jobs aj ON aj.id = ar.analysis_job_id
                         LEFT JOIN inspection_images ii ON ii.id = aj.image_id
                         LEFT JOIN image_pairs ip ON ip.id = aj.image_pair_id
                         JOIN inspections i ON i.id = COALESCE(ii.inspection_id, ip.inspection_id)
                         JOIN zones z ON z.id = i.zone_id
                         WHERE (:plantId IS NULL OR z.plant_id = :plantId)
                           AND (:zoneId IS NULL OR i.zone_id = :zoneId)
                           AND ar.result_status = 'ANOMALY'
                           AND (:fromDate IS NULL OR CAST(COALESCE(ar.analyzed_at, ar.created_at) AS date) >= :fromDate)
                           AND (:toDate IS NULL OR CAST(COALESCE(ar.analyzed_at, ar.created_at) AS date) <= :toDate)
                        ) AS anomalyResultCount,
                        (SELECT COUNT(*) FROM analysis_results ar
                         JOIN analysis_jobs aj ON aj.id = ar.analysis_job_id
                         LEFT JOIN inspection_images ii ON ii.id = aj.image_id
                         LEFT JOIN image_pairs ip ON ip.id = aj.image_pair_id
                         JOIN inspections i ON i.id = COALESCE(ii.inspection_id, ip.inspection_id)
                         JOIN zones z ON z.id = i.zone_id
                         WHERE (:plantId IS NULL OR z.plant_id = :plantId)
                           AND (:zoneId IS NULL OR i.zone_id = :zoneId)
                           AND ar.result_status = 'LOW_CONFIDENCE'
                           AND (:fromDate IS NULL OR CAST(COALESCE(ar.analyzed_at, ar.created_at) AS date) >= :fromDate)
                           AND (:toDate IS NULL OR CAST(COALESCE(ar.analyzed_at, ar.created_at) AS date) <= :toDate)
                        ) AS lowConfidenceResultCount,
                        (SELECT COUNT(DISTINCT i.zone_id)
                         FROM analysis_results ar
                         JOIN analysis_jobs aj ON aj.id = ar.analysis_job_id
                         LEFT JOIN inspection_images ii ON ii.id = aj.image_id
                         LEFT JOIN image_pairs ip ON ip.id = aj.image_pair_id
                         JOIN inspections i ON i.id = COALESCE(ii.inspection_id, ip.inspection_id)
                         JOIN zones z ON z.id = i.zone_id
                         WHERE (:plantId IS NULL OR z.plant_id = :plantId)
                           AND (:zoneId IS NULL OR i.zone_id = :zoneId)
                           AND ar.result_status = 'ANOMALY'
                           AND (:fromDate IS NULL OR CAST(COALESCE(ar.analyzed_at, ar.created_at) AS date) >= :fromDate)
                           AND (:toDate IS NULL OR CAST(COALESCE(ar.analyzed_at, ar.created_at) AS date) <= :toDate)
                        ) AS anomalyZoneCount,
                        (SELECT COUNT(*)
                         FROM analysis_results ar
                         JOIN analysis_jobs aj ON aj.id = ar.analysis_job_id
                         LEFT JOIN inspection_images ii ON ii.id = aj.image_id
                         LEFT JOIN image_pairs ip ON ip.id = aj.image_pair_id
                         JOIN inspections i ON i.id = COALESCE(ii.inspection_id, ip.inspection_id)
                         JOIN zones z ON z.id = i.zone_id
                         WHERE (:plantId IS NULL OR z.plant_id = :plantId)
                           AND (:zoneId IS NULL OR i.zone_id = :zoneId)
                           AND ar.priority_level IN ('HIGH', 'URGENT')
                           AND (:fromDate IS NULL OR CAST(COALESCE(ar.analyzed_at, ar.created_at) AS date) >= :fromDate)
                           AND (:toDate IS NULL OR CAST(COALESCE(ar.analyzed_at, ar.created_at) AS date) <= :toDate)
                        ) AS highPriorityCount,
                        (SELECT COUNT(*)
                         FROM analysis_results ar
                         JOIN analysis_jobs aj ON aj.id = ar.analysis_job_id
                         LEFT JOIN inspection_images ii ON ii.id = aj.image_id
                         LEFT JOIN image_pairs ip ON ip.id = aj.image_pair_id
                         JOIN inspections i ON i.id = COALESCE(ii.inspection_id, ip.inspection_id)
                         JOIN zones z ON z.id = i.zone_id
                         WHERE (:plantId IS NULL OR z.plant_id = :plantId)
                           AND (:zoneId IS NULL OR i.zone_id = :zoneId)
                           AND ar.review_status = 'UNCHECKED'
                           AND (:fromDate IS NULL OR CAST(COALESCE(ar.analyzed_at, ar.created_at) AS date) >= :fromDate)
                           AND (:toDate IS NULL OR CAST(COALESCE(ar.analyzed_at, ar.created_at) AS date) <= :toDate)
                        ) AS pendingReviewCount
                    """,
            nativeQuery = true
    )
    DashboardSummaryProjection loadDashboardSummary(
            @Param("plantId") Long plantId,
            @Param("zoneId") Long zoneId,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate
    );

    @Query(
            value = """
                    SELECT ar.id AS resultId,
                           i.id AS inspectionId,
                           p.id AS plantId,
                           z.id AS zoneId,
                           COALESCE(ii.equipment_id, ip.equipment_id) AS equipmentId,
                           p.name AS plantName,
                           z.name AS zoneName,
                           i.name AS inspectionName,
                           ar.action_candidate AS actionCandidate,
                           ar.severity_level AS severityLevel,
                           ar.priority_level AS priorityLevel,
                           COALESCE(ar.analyzed_at, ar.created_at) AS analyzedAt
                    FROM analysis_results ar
                    JOIN analysis_jobs aj ON aj.id = ar.analysis_job_id
                    LEFT JOIN inspection_images ii ON ii.id = aj.image_id
                    LEFT JOIN image_pairs ip ON ip.id = aj.image_pair_id
                    JOIN inspections i ON i.id = COALESCE(ii.inspection_id, ip.inspection_id)
                    JOIN zones z ON z.id = i.zone_id
                    JOIN plants p ON p.id = z.plant_id
                    WHERE (:plantId IS NULL OR p.id = :plantId)
                      AND (:zoneId IS NULL OR z.id = :zoneId)
                      AND (:fromDate IS NULL OR CAST(COALESCE(ar.analyzed_at, ar.created_at) AS date) >= :fromDate)
                      AND (:toDate IS NULL OR CAST(COALESCE(ar.analyzed_at, ar.created_at) AS date) <= :toDate)
                    ORDER BY COALESCE(ar.analyzed_at, ar.created_at) DESC, ar.id DESC
                    """,
            nativeQuery = true
    )
    List<RecentResultProjection> loadRecentResults(
            @Param("plantId") Long plantId,
            @Param("zoneId") Long zoneId,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            Pageable pageable
    );

    @Query(
            value = """
                    SELECT ar.action_candidate AS category, COUNT(*) AS count
                    FROM analysis_results ar
                    JOIN analysis_jobs aj ON aj.id = ar.analysis_job_id
                    LEFT JOIN inspection_images ii ON ii.id = aj.image_id
                    LEFT JOIN image_pairs ip ON ip.id = aj.image_pair_id
                    JOIN inspections i ON i.id = COALESCE(ii.inspection_id, ip.inspection_id)
                    JOIN zones z ON z.id = i.zone_id
                    WHERE (:plantId IS NULL OR z.plant_id = :plantId)
                      AND (:zoneId IS NULL OR i.zone_id = :zoneId)
                      AND (:fromDate IS NULL OR CAST(COALESCE(ar.analyzed_at, ar.created_at) AS date) >= :fromDate)
                      AND (:toDate IS NULL OR CAST(COALESCE(ar.analyzed_at, ar.created_at) AS date) <= :toDate)
                    GROUP BY ar.action_candidate
                    """,
            nativeQuery = true
    )
    List<EnumCountProjection> loadActionStats(
            @Param("plantId") Long plantId,
            @Param("zoneId") Long zoneId,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate
    );

    @Query(
            value = """
                    SELECT ar.severity_level AS category, COUNT(*) AS count
                    FROM analysis_results ar
                    JOIN analysis_jobs aj ON aj.id = ar.analysis_job_id
                    LEFT JOIN inspection_images ii ON ii.id = aj.image_id
                    LEFT JOIN image_pairs ip ON ip.id = aj.image_pair_id
                    JOIN inspections i ON i.id = COALESCE(ii.inspection_id, ip.inspection_id)
                    JOIN zones z ON z.id = i.zone_id
                    WHERE (:plantId IS NULL OR z.plant_id = :plantId)
                      AND (:zoneId IS NULL OR i.zone_id = :zoneId)
                      AND (:fromDate IS NULL OR CAST(COALESCE(ar.analyzed_at, ar.created_at) AS date) >= :fromDate)
                      AND (:toDate IS NULL OR CAST(COALESCE(ar.analyzed_at, ar.created_at) AS date) <= :toDate)
                    GROUP BY ar.severity_level
                    """,
            nativeQuery = true
    )
    List<EnumCountProjection> loadSeverityStats(
            @Param("plantId") Long plantId,
            @Param("zoneId") Long zoneId,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate
    );

    @Query(
            value = """
                    SELECT CAST(COALESCE(i.captured_at, i.created_at) AS date) AS trendDate, COUNT(*) AS count
                    FROM inspections i
                    JOIN zones z ON z.id = i.zone_id
                    WHERE (:plantId IS NULL OR z.plant_id = :plantId)
                      AND (:zoneId IS NULL OR i.zone_id = :zoneId)
                      AND (:fromDate IS NULL OR CAST(COALESCE(i.captured_at, i.created_at) AS date) >= :fromDate)
                      AND (:toDate IS NULL OR CAST(COALESCE(i.captured_at, i.created_at) AS date) <= :toDate)
                    GROUP BY CAST(COALESCE(i.captured_at, i.created_at) AS date)
                    ORDER BY trendDate ASC
                    """,
            nativeQuery = true
    )
    List<TrendCountProjection> loadInspectionTrends(
            @Param("plantId") Long plantId,
            @Param("zoneId") Long zoneId,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate
    );

    @Query(
            value = """
                    SELECT CAST(COALESCE(ar.analyzed_at, ar.created_at) AS date) AS trendDate, COUNT(*) AS count
                    FROM analysis_results ar
                    JOIN analysis_jobs aj ON aj.id = ar.analysis_job_id
                    LEFT JOIN inspection_images ii ON ii.id = aj.image_id
                    LEFT JOIN image_pairs ip ON ip.id = aj.image_pair_id
                    JOIN inspections i ON i.id = COALESCE(ii.inspection_id, ip.inspection_id)
                    JOIN zones z ON z.id = i.zone_id
                    WHERE (:plantId IS NULL OR z.plant_id = :plantId)
                      AND (:zoneId IS NULL OR i.zone_id = :zoneId)
                      AND ar.result_status = 'ANOMALY'
                      AND (:fromDate IS NULL OR CAST(COALESCE(ar.analyzed_at, ar.created_at) AS date) >= :fromDate)
                      AND (:toDate IS NULL OR CAST(COALESCE(ar.analyzed_at, ar.created_at) AS date) <= :toDate)
                    GROUP BY CAST(COALESCE(ar.analyzed_at, ar.created_at) AS date)
                    ORDER BY trendDate ASC
                    """,
            nativeQuery = true
    )
    List<TrendCountProjection> loadAnomalyTrends(
            @Param("plantId") Long plantId,
            @Param("zoneId") Long zoneId,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate
    );

    @Query(value = "SELECT COUNT(*) FROM users", nativeQuery = true)
    long countUsers();
}
