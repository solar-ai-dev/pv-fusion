package com.pvfusion.adapter.out.persistence.plant;

import com.pvfusion.domain.common.ResourceStatus;
import com.pvfusion.domain.plant.PlantMemberRole;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PlantMemberJpaRepository extends JpaRepository<PlantMemberJpaEntity, Long> {

    Optional<PlantMemberJpaEntity> findByPlantIdAndUserId(Long plantId, Long userId);

    boolean existsByPlantIdAndUserIdAndStatus(Long plantId, Long userId, ResourceStatus status);

    @Query("""
            select pm
            from PlantMemberJpaEntity pm
            where (:plantId is null or pm.plantId = :plantId)
              and (:userId is null or pm.userId = :userId)
              and (:memberRole is null or pm.memberRole = :memberRole)
              and (:status is null or pm.status = :status)
            order by pm.id desc
            """)
    List<PlantMemberJpaEntity> search(
            @Param("plantId") Long plantId,
            @Param("userId") Long userId,
            @Param("memberRole") PlantMemberRole memberRole,
            @Param("status") ResourceStatus status
    );
}
