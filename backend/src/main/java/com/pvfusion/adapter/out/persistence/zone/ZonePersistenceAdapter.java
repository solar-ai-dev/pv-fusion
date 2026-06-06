package com.pvfusion.adapter.out.persistence.zone;

import com.pvfusion.application.dto.zone.ZoneListQuery;
import com.pvfusion.application.dto.zone.ZoneSummaryResponse;
import com.pvfusion.application.port.out.zone.LoadZonePort;
import com.pvfusion.application.port.out.zone.ZoneRepositoryPort;
import com.pvfusion.domain.zone.Zone;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ZonePersistenceAdapter implements ZoneRepositoryPort, LoadZonePort {

    private final ZoneJpaRepository zoneJpaRepository;
    private final ZonePersistenceMapper zonePersistenceMapper;

    @Override
    public List<ZoneSummaryResponse> findAll(ZoneListQuery query) {
        return zoneJpaRepository.findActiveByPlantId(query.plantId()).stream()
                .map(this::toSummaryResponse)
                .toList();
    }

    @Override
    public Optional<Zone> findById(Long zoneId) {
        return zoneJpaRepository.findById(zoneId).map(zonePersistenceMapper::toDomain);
    }

    @Override
    public Optional<Zone> loadZone(Long zoneId) {
        return findById(zoneId);
    }

    @Override
    public List<Zone> findByPlantId(Long plantId) {
        return zoneJpaRepository.findByPlantIdOrderByIdDesc(plantId).stream()
                .map(zonePersistenceMapper::toDomain)
                .toList();
    }

    @Override
    public List<Zone> loadZones(ZoneListQuery query) {
        return zoneJpaRepository.findByPlantIdOrderByIdDesc(query.plantId()).stream()
                .map(zonePersistenceMapper::toDomain)
                .toList();
    }

    @Override
    @Transactional
    public Zone save(Zone zone) {
        ZoneJpaEntity entity = zone.getId() == null
                ? zonePersistenceMapper.toEntity(zone)
                : zoneJpaRepository.findById(zone.getId())
                        .map(existing -> zonePersistenceMapper.updateEntity(zone, existing))
                        .orElseGet(() -> zonePersistenceMapper.toEntity(zone));

        return zonePersistenceMapper.toDomain(zoneJpaRepository.save(entity));
    }

    private ZoneSummaryResponse toSummaryResponse(ZoneJpaEntity entity) {
        return new ZoneSummaryResponse(
                entity.getId(),
                entity.getPlantId(),
                entity.getName(),
                0L,
                0L,
                null,
                0L,
                null,
                null
        );
    }
}
