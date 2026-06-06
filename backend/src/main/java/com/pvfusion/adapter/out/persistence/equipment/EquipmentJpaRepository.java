package com.pvfusion.adapter.out.persistence.equipment;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EquipmentJpaRepository extends JpaRepository<EquipmentJpaEntity, Long> {

    List<EquipmentJpaEntity> findByZoneIdOrderByIdDesc(Long zoneId);
}
