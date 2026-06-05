package com.pvfusion.adapter.out.persistence.imagepair;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ImagePairJpaRepository extends JpaRepository<ImagePairJpaEntity, Long> {

    @Query(
            value = """
                    SELECT ip.*
                    FROM image_pairs ip
                    WHERE ip.inspection_id = :inspectionId
                      AND (:targetType IS NULL OR ip.target_type = :targetType)
                      AND ((:equipmentId IS NULL AND ip.equipment_id IS NULL) OR ip.equipment_id = :equipmentId)
                    ORDER BY ip.created_at DESC, ip.id DESC
                    """,
            nativeQuery = true
    )
    List<ImagePairJpaEntity> search(
            @Param("inspectionId") Long inspectionId,
            @Param("targetType") String targetType,
            @Param("equipmentId") Long equipmentId
    );

    @Query(
            value = """
                    SELECT ip.*
                    FROM image_pairs ip
                    WHERE ip.rgb_image_id = :rgbImageId
                      AND ip.thermal_image_id = :thermalImageId
                    ORDER BY ip.id DESC
                    LIMIT 1
                    """,
            nativeQuery = true
    )
    Optional<ImagePairJpaEntity> findPair(
            @Param("rgbImageId") Long rgbImageId,
            @Param("thermalImageId") Long thermalImageId
    );

    @Query(
            value = """
                    SELECT ip.*
                    FROM image_pairs ip
                    WHERE ip.inspection_id = :inspectionId
                      AND ip.target_type = :targetType
                      AND ((:equipmentId IS NULL AND ip.equipment_id IS NULL) OR ip.equipment_id = :equipmentId)
                      AND ip.status = :status
                    ORDER BY ip.id DESC
                    LIMIT 1
                    """,
            nativeQuery = true
    )
    Optional<ImagePairJpaEntity> findActivePair(
            @Param("inspectionId") Long inspectionId,
            @Param("targetType") String targetType,
            @Param("equipmentId") Long equipmentId,
            @Param("status") String status
    );

    @Query(
            value = """
                    SELECT ip.*
                    FROM image_pairs ip
                    WHERE ip.inspection_id = :inspectionId
                      AND ip.status = :status
                    ORDER BY ip.created_at DESC, ip.id DESC
                    """,
            nativeQuery = true
    )
    List<ImagePairJpaEntity> findByInspectionIdAndStatus(
            @Param("inspectionId") Long inspectionId,
            @Param("status") String status
    );
}
