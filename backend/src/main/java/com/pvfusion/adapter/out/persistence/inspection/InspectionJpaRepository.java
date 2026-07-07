package com.pvfusion.adapter.out.persistence.inspection;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface InspectionJpaRepository extends JpaRepository<InspectionJpaEntity, Long> {

    @Query(
            value = """
                    SELECT i.*
                    FROM inspections i
                    JOIN zones z ON z.id = i.zone_id
                    WHERE (:plantId IS NULL OR z.plant_id = :plantId)
                      AND (:zoneId IS NULL OR i.zone_id = :zoneId)
                      AND (:inspectionStatus IS NULL OR i.inspection_status = :inspectionStatus)
                      AND (CAST(:fromDate AS date) IS NULL OR CAST(i.captured_at AS date) >= CAST(:fromDate AS date))
                      AND (CAST(:toDate AS date) IS NULL OR CAST(i.captured_at AS date) <= CAST(:toDate AS date))
                      AND (:actorUserId IS NULL
                           OR EXISTS (
                               SELECT 1 FROM plant_members pm
                               WHERE pm.plant_id = z.plant_id
                                 AND pm.user_id = :actorUserId
                                 AND pm.status = 'ACTIVE'
                           ))
                    ORDER BY i.created_at DESC, i.id DESC
                    """,
            countQuery = """
                    SELECT COUNT(*)
                    FROM inspections i
                    JOIN zones z ON z.id = i.zone_id
                    WHERE (:plantId IS NULL OR z.plant_id = :plantId)
                      AND (:zoneId IS NULL OR i.zone_id = :zoneId)
                      AND (:inspectionStatus IS NULL OR i.inspection_status = :inspectionStatus)
                      AND (CAST(:fromDate AS date) IS NULL OR CAST(i.captured_at AS date) >= CAST(:fromDate AS date))
                      AND (CAST(:toDate AS date) IS NULL OR CAST(i.captured_at AS date) <= CAST(:toDate AS date))
                      AND (:actorUserId IS NULL
                           OR EXISTS (
                               SELECT 1 FROM plant_members pm
                               WHERE pm.plant_id = z.plant_id
                                 AND pm.user_id = :actorUserId
                                 AND pm.status = 'ACTIVE'
                           ))
                    """,
            nativeQuery = true
    )
    Page<InspectionJpaEntity> search(
            @Param("actorUserId") Long actorUserId,
            @Param("plantId") Long plantId,
            @Param("zoneId") Long zoneId,
            @Param("inspectionStatus") String inspectionStatus,
            @Param("fromDate") String fromDate,
            @Param("toDate") String toDate,
            Pageable pageable
    );
}
