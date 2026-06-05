package com.pvfusion.adapter.out.persistence.plant;

import com.pvfusion.application.dto.plant.PlantListQuery;
import com.pvfusion.application.dto.plant.PlantSummaryResponse;
import com.pvfusion.application.port.out.plant.PlantRepositoryPort;
import com.pvfusion.domain.plant.Plant;
import com.pvfusion.global.response.PageResponse;
import java.time.OffsetDateTime;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PlantPersistenceAdapter implements PlantRepositoryPort {

    private static final int DEFAULT_PAGE_SIZE = 20;

    private final PlantJpaRepository plantJpaRepository;
    private final PlantPersistenceMapper plantPersistenceMapper;

    @Override
    public PageResponse<PlantSummaryResponse> findAll(PlantListQuery query) {
        PageRequest pageable = PageRequest.of(
                Math.max(query.page(), 0),
                query.size() > 0 ? query.size() : DEFAULT_PAGE_SIZE,
                Sort.by(Sort.Direction.DESC, "id")
        );

        Page<PlantSummaryResponse> page = plantJpaRepository.search(
                        normalizeKeyword(query.keyword()),
                        query.status(),
                        query.actorUserId(),
                        pageable
                )
                .map(this::toSummaryResponse);

        return PageResponse.from(page);
    }

    @Override
    public Optional<Plant> findById(Long plantId) {
        return plantJpaRepository.findById(plantId).map(plantPersistenceMapper::toDomain);
    }

    @Override
    public long countZonesByPlantId(Long plantId) {
        return plantJpaRepository.countZonesByPlantId(plantId);
    }

    @Override
    public OffsetDateTime findLatestInspectionAtByPlantId(Long plantId) {
        return plantJpaRepository.findLatestInspectionAtByPlantId(plantId);
    }

    @Override
    @Transactional
    public Plant save(Plant plant) {
        PlantJpaEntity entity = plant.getId() == null
                ? plantPersistenceMapper.toEntity(plant)
                : plantJpaRepository.findById(plant.getId())
                        .map(existing -> plantPersistenceMapper.updateEntity(plant, existing))
                        .orElseGet(() -> plantPersistenceMapper.toEntity(plant));

        return plantPersistenceMapper.toDomain(plantJpaRepository.save(entity));
    }

    private PlantSummaryResponse toSummaryResponse(PlantJpaEntity entity) {
        return new PlantSummaryResponse(
                entity.getId(),
                entity.getName(),
                entity.getLocation(),
                entity.getStatus(),
                plantJpaRepository.countZonesByPlantId(entity.getId()),
                plantJpaRepository.findLatestInspectionAtByPlantId(entity.getId())
        );
    }

    private String normalizeKeyword(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return null;
        }
        return keyword.trim();
    }
}
