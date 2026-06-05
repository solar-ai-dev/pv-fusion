package com.pvfusion.adapter.out.persistence.plant;

import com.pvfusion.application.dto.user.PlantMemberListQuery;
import com.pvfusion.application.dto.user.PlantMemberResponse;
import com.pvfusion.application.port.out.plant.PlantMemberRepositoryPort;
import com.pvfusion.domain.common.ResourceStatus;
import com.pvfusion.domain.plant.PlantMember;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PlantMemberPersistenceAdapter implements PlantMemberRepositoryPort {

    private final PlantMemberJpaRepository plantMemberJpaRepository;
    private final PlantMemberPersistenceMapper plantMemberPersistenceMapper;

    @Override
    public List<PlantMemberResponse> findAll(PlantMemberListQuery query) {
        return plantMemberJpaRepository.search(
                        query.plantId(),
                        query.userId(),
                        query.memberRole(),
                        query.status()
                )
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public Optional<PlantMember> findById(Long plantMemberId) {
        return plantMemberJpaRepository.findById(plantMemberId).map(plantMemberPersistenceMapper::toDomain);
    }

    @Override
    public Optional<PlantMember> findByPlantIdAndUserId(Long plantId, Long userId) {
        return plantMemberJpaRepository.findByPlantIdAndUserId(plantId, userId)
                .map(plantMemberPersistenceMapper::toDomain);
    }

    @Override
    public boolean existsActiveByPlantIdAndUserId(Long plantId, Long userId) {
        return plantMemberJpaRepository.existsByPlantIdAndUserIdAndStatus(plantId, userId, ResourceStatus.ACTIVE);
    }

    @Override
    @Transactional
    public PlantMember save(PlantMember plantMember) {
        PlantMemberJpaEntity entity = plantMember.getId() == null
                ? plantMemberPersistenceMapper.toEntity(plantMember)
                : plantMemberJpaRepository.findById(plantMember.getId())
                        .map(existing -> plantMemberPersistenceMapper.updateEntity(plantMember, existing))
                        .orElseGet(() -> plantMemberPersistenceMapper.toEntity(plantMember));

        return plantMemberPersistenceMapper.toDomain(plantMemberJpaRepository.save(entity));
    }

    private PlantMemberResponse toResponse(PlantMemberJpaEntity entity) {
        return new PlantMemberResponse(
                entity.getId(),
                entity.getPlantId(),
                entity.getUserId(),
                entity.getMemberRole(),
                entity.getStatus(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
