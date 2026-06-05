package com.pvfusion.adapter.out.persistence.plant;

import com.pvfusion.domain.common.ResourceStatus;
import java.time.OffsetDateTime;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PlantJpaRepository extends JpaRepository<PlantJpaEntity, Long> {

    @Query(
            value = """
                    select p
                    from PlantJpaEntity p
                    where (:keyword is null
                        or lower(p.name) like lower(concat('%', :keyword, '%')))
                      and (:status is null or p.status = :status)
                      and (:actorUserId is null or exists (
                          select pm.id
                          from PlantMemberJpaEntity pm
                          where pm.plantId = p.id
                            and pm.userId = :actorUserId
                            and pm.status = com.pvfusion.domain.common.ResourceStatus.ACTIVE
                      ))
                    """,
            countQuery = """
                    select count(p)
                    from PlantJpaEntity p
                    where (:keyword is null
                        or lower(p.name) like lower(concat('%', :keyword, '%')))
                      and (:status is null or p.status = :status)
                      and (:actorUserId is null or exists (
                          select pm.id
                          from PlantMemberJpaEntity pm
                          where pm.plantId = p.id
                            and pm.userId = :actorUserId
                            and pm.status = com.pvfusion.domain.common.ResourceStatus.ACTIVE
                      ))
                    """
    )
    Page<PlantJpaEntity> search(
            @Param("keyword") String keyword,
            @Param("status") ResourceStatus status,
            @Param("actorUserId") Long actorUserId,
            Pageable pageable
    );

    @Query(value = "select count(*) from zones where plant_id = :plantId", nativeQuery = true)
    long countZonesByPlantId(@Param("plantId") Long plantId);

    @Query(
            value = """
                    select max(i.captured_at)
                    from inspections i
                    join zones z on z.id = i.zone_id
                    where z.plant_id = :plantId
                    """,
            nativeQuery = true
    )
    OffsetDateTime findLatestInspectionAtByPlantId(@Param("plantId") Long plantId);
}
