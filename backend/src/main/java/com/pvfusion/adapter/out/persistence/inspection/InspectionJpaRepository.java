package com.pvfusion.adapter.out.persistence.inspection;

import java.time.LocalDate;
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
                      AND (:fromDate IS NULL OR CAST(i.captured_at AS date) >= :fromDate)
                      AND (:toDate IS NULL OR CAST(i.captured_at AS date) <= :toDate)
                    ORDER BY i.created_at DESC, i.id DESC
                    """,
            countQuery = """
                    SELECT COUNT(*)
                    FROM inspections i
                    JOIN zones z ON z.id = i.zone_id
                    WHERE (:plantId IS NULL OR z.plant_id = :plantId)
                      AND (:zoneId IS NULL OR i.zone_id = :zoneId)
                      AND (:inspectionStatus IS NULL OR i.inspection_status = :inspectionStatus)
                      AND (:fromDate IS NULL OR CAST(i.captured_at AS date) >= :fromDate)
                      AND (:toDate IS NULL OR CAST(i.captured_at AS date) <= :toDate)
                    """,
            nativeQuery = true
    )
    Page<InspectionJpaEntity> search(
            @Param("plantId") Long plantId,
            @Param("zoneId") Long zoneId,
            @Param("inspectionStatus") String inspectionStatus,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            Pageable pageable
    );
}
