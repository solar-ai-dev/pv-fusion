package com.pvfusion.adapter.out.persistence.analysis;

import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AnalysisJobJpaRepository extends JpaRepository<AnalysisJobJpaEntity, Long> {

    @Query(
            value = """
                    SELECT aj.*
                    FROM analysis_jobs aj
                    LEFT JOIN inspection_images ii ON ii.id = aj.image_id
                    LEFT JOIN image_pairs ip ON ip.id = aj.image_pair_id
                    LEFT JOIN inspections i ON i.id = COALESCE(ii.inspection_id, ip.inspection_id)
                    LEFT JOIN zones z ON z.id = i.zone_id
                    WHERE (:plantId IS NULL OR z.plant_id = :plantId)
                      AND (:zoneId IS NULL OR i.zone_id = :zoneId)
                      AND (:inspectionId IS NULL OR i.id = :inspectionId)
                      AND (:jobStatus IS NULL OR aj.job_status = :jobStatus)
                      AND (:inputType IS NULL OR aj.input_type = :inputType)
                      AND (:modelType IS NULL OR aj.model_type = :modelType)
                    """,
            countQuery = """
                    SELECT COUNT(*)
                    FROM analysis_jobs aj
                    LEFT JOIN inspection_images ii ON ii.id = aj.image_id
                    LEFT JOIN image_pairs ip ON ip.id = aj.image_pair_id
                    LEFT JOIN inspections i ON i.id = COALESCE(ii.inspection_id, ip.inspection_id)
                    LEFT JOIN zones z ON z.id = i.zone_id
                    WHERE (:plantId IS NULL OR z.plant_id = :plantId)
                      AND (:zoneId IS NULL OR i.zone_id = :zoneId)
                      AND (:inspectionId IS NULL OR i.id = :inspectionId)
                      AND (:jobStatus IS NULL OR aj.job_status = :jobStatus)
                      AND (:inputType IS NULL OR aj.input_type = :inputType)
                      AND (:modelType IS NULL OR aj.model_type = :modelType)
                    """,
            nativeQuery = true
    )
    Page<AnalysisJobJpaEntity> search(
            @Param("plantId") Long plantId,
            @Param("zoneId") Long zoneId,
            @Param("inspectionId") Long inspectionId,
            @Param("jobStatus") String jobStatus,
            @Param("inputType") String inputType,
            @Param("modelType") String modelType,
            Pageable pageable
    );

    List<AnalysisJobJpaEntity> findByImageIdAndJobStatusIn(Long imageId, List<String> statuses);

    List<AnalysisJobJpaEntity> findByImagePairIdAndJobStatusIn(Long imagePairId, List<String> statuses);
}
