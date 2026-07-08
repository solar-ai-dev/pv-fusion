package com.pvfusion.adapter.out.persistence.image;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface InspectionImageJpaRepository extends JpaRepository<InspectionImageJpaEntity, Long> {

    @Query(
            value = """
                    SELECT ii.*
                    FROM inspection_images ii
                    JOIN inspections i ON i.id = ii.inspection_id
                    JOIN zones z ON z.id = i.zone_id
                    WHERE (:plantId IS NULL OR z.plant_id = :plantId)
                      AND (:zoneId IS NULL OR i.zone_id = :zoneId)
                      AND (:inspectionId IS NULL OR ii.inspection_id = :inspectionId)
                      AND (:equipmentId IS NULL OR ii.equipment_id = :equipmentId)
                      AND (:imageType IS NULL OR ii.image_type = :imageType)
                      AND (:targetType IS NULL OR ii.target_type = :targetType)
                      AND (:status IS NULL OR ii.status = :status)
                    ORDER BY ii.created_at DESC, ii.id DESC
                    """,
            nativeQuery = true
    )
    List<InspectionImageJpaEntity> search(
            @Param("plantId") Long plantId,
            @Param("zoneId") Long zoneId,
            @Param("inspectionId") Long inspectionId,
            @Param("equipmentId") Long equipmentId,
            @Param("imageType") String imageType,
            @Param("targetType") String targetType,
            @Param("status") String status
    );

    @Query(
            value = """
                    SELECT ii.*
                    FROM inspection_images ii
                    WHERE ii.inspection_id = :inspectionId
                      AND ii.original_filename = :originalFilename
                      AND ii.status = :status
                    ORDER BY ii.id DESC
                    LIMIT 1
                    """,
            nativeQuery = true
    )
    Optional<InspectionImageJpaEntity> findLatestByInspectionIdAndOriginalFilename(
            @Param("inspectionId") Long inspectionId,
            @Param("originalFilename") String originalFilename,
            @Param("status") String status
    );
}
