package com.pvfusion.adapter.out.persistence.zone;

import com.pvfusion.domain.common.ResourceStatus;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ZoneJpaRepository extends JpaRepository<ZoneJpaEntity, Long> {

    @Query("""
            select z
            from ZoneJpaEntity z
            where z.plantId = :plantId
              and z.status = com.pvfusion.domain.common.ResourceStatus.ACTIVE
            order by z.id desc
            """)
    List<ZoneJpaEntity> findActiveByPlantId(@Param("plantId") Long plantId);

    List<ZoneJpaEntity> findByPlantIdOrderByIdDesc(Long plantId);

    long countByPlantIdAndStatus(Long plantId, ResourceStatus status);
}
