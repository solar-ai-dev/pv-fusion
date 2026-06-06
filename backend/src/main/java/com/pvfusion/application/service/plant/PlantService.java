package com.pvfusion.application.service.plant;

import com.pvfusion.application.dto.plant.CreatePlantCommand;
import com.pvfusion.application.dto.plant.DeactivatePlantCommand;
import com.pvfusion.application.dto.plant.GetPlantQuery;
import com.pvfusion.application.dto.plant.PlantListQuery;
import com.pvfusion.application.dto.plant.PlantResponse;
import com.pvfusion.application.dto.plant.PlantSummaryResponse;
import com.pvfusion.application.dto.plant.UpdatePlantCommand;
import com.pvfusion.application.dto.operation.RecordOperationLogCommand;
import com.pvfusion.application.port.in.operation.RecordOperationLogUseCase;
import com.pvfusion.application.port.in.plant.CreatePlantUseCase;
import com.pvfusion.application.port.in.plant.DeactivatePlantUseCase;
import com.pvfusion.application.port.in.plant.GetPlantUseCase;
import com.pvfusion.application.port.in.plant.QueryPlantUseCase;
import com.pvfusion.application.port.in.plant.UpdatePlantUseCase;
import com.pvfusion.application.port.out.auth.CurrentUserPort;
import com.pvfusion.application.port.out.plant.PlantMemberRepositoryPort;
import com.pvfusion.application.port.out.plant.PlantRepositoryPort;
import com.pvfusion.application.port.out.user.UserRepositoryPort;
import com.pvfusion.domain.common.ResourceStatus;
import com.pvfusion.domain.operation.OperationEventCategory;
import com.pvfusion.domain.operation.OperationEventType;
import com.pvfusion.domain.plant.Plant;
import com.pvfusion.domain.plant.PlantMember;
import com.pvfusion.domain.plant.PlantMemberRole;
import com.pvfusion.domain.user.User;
import com.pvfusion.global.error.ApprovalRequiredException;
import com.pvfusion.global.error.BusinessException;
import com.pvfusion.global.error.DuplicateResourceException;
import com.pvfusion.global.error.ErrorCode;
import com.pvfusion.global.error.ForbiddenException;
import com.pvfusion.global.error.NotFoundException;
import com.pvfusion.global.error.UnauthorizedException;
import com.pvfusion.global.error.UserDeactivatedException;
import com.pvfusion.global.response.PageResponse;
import java.time.OffsetDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PlantService implements CreatePlantUseCase, QueryPlantUseCase,
        GetPlantUseCase, UpdatePlantUseCase, DeactivatePlantUseCase {

    private final CurrentUserPort currentUserPort;
    private final UserRepositoryPort userRepositoryPort;
    private final PlantRepositoryPort plantRepositoryPort;
    private final PlantMemberRepositoryPort plantMemberRepositoryPort;
    private final RecordOperationLogUseCase recordOperationLogUseCase;

    @Override
    public PlantResponse execute(CreatePlantCommand command) {
        User currentUser = requireApprovedUser();
        validatePlantName(command.name());

        OffsetDateTime now = OffsetDateTime.now();
        Plant savedPlant = plantRepositoryPort.save(new Plant(
                null,
                command.name().trim(),
                command.location(),
                command.description(),
                ResourceStatus.ACTIVE,
                currentUser.getId(),
                now,
                now
        ));

        plantMemberRepositoryPort.save(new PlantMember(
                null,
                savedPlant.getId(),
                currentUser.getId(),
                PlantMemberRole.OWNER,
                ResourceStatus.ACTIVE,
                now,
                now
        ));

        recordOperationLogUseCase.execute(new RecordOperationLogCommand(
                currentUser.getId(),
                OperationEventCategory.ADMIN,
                OperationEventType.PLANT_CREATED,
                "plants",
                savedPlant.getId(),
                savedPlant.getId(),
                null,
                null,
                null,
                null,
                null,
                null,
                "Plant created.",
                null,
                null,
                "name=" + savedPlant.getName()
        ));

        return toResponse(savedPlant);
    }

    @Override
    public PageResponse<PlantSummaryResponse> execute(PlantListQuery query) {
        User currentUser = requireApprovedUser();
        PlantListQuery effectiveQuery = currentUser.isAdmin()
                ? new PlantListQuery(null, query.keyword(), query.status(), query.page(), query.size())
                : new PlantListQuery(currentUser.getId(), query.keyword(), query.status(), query.page(), query.size());

        return plantRepositoryPort.findAll(effectiveQuery);
    }

    @Override
    public PlantResponse execute(GetPlantQuery query) {
        User currentUser = requireApprovedUser();
        Plant plant = getPlant(query.plantId());

        requirePlantAccess(currentUser, plant.getId());
        return toResponse(plant);
    }

    @Override
    public PlantResponse execute(UpdatePlantCommand command) {
        User currentUser = requireApprovedUser();
        Plant plant = getPlant(command.plantId());

        if (plant.isInactive()) {
            throw new DuplicateResourceException("비활성화된 발전소는 수정할 수 없습니다.");
        }

        requirePlantManagePermission(currentUser, plant.getId());
        validatePlantName(command.name());

        Plant savedPlant = plantRepositoryPort.save(plant.update(
                command.name().trim(),
                command.location(),
                command.description()
        ));
        recordOperationLogUseCase.execute(new RecordOperationLogCommand(
                currentUser.getId(),
                OperationEventCategory.ADMIN,
                OperationEventType.PLANT_UPDATED,
                "plants",
                savedPlant.getId(),
                savedPlant.getId(),
                null,
                null,
                null,
                null,
                null,
                null,
                "Plant updated.",
                null,
                null,
                "name=" + savedPlant.getName()
        ));
        return toResponse(savedPlant);
    }

    @Override
    public PlantResponse execute(DeactivatePlantCommand command) {
        User currentUser = requireApprovedUser();
        Plant plant = getPlant(command.plantId());

        requirePlantManagePermission(currentUser, plant.getId());

        if (plant.isInactive()) {
            throw new DuplicateResourceException("이미 비활성화된 발전소입니다.");
        }

        Plant savedPlant = plantRepositoryPort.save(plant.deactivate());
        recordOperationLogUseCase.execute(new RecordOperationLogCommand(
                currentUser.getId(),
                OperationEventCategory.ADMIN,
                OperationEventType.PLANT_DEACTIVATED,
                "plants",
                savedPlant.getId(),
                savedPlant.getId(),
                null,
                null,
                null,
                null,
                null,
                null,
                "Plant deactivated.",
                null,
                null,
                "status=ACTIVE->INACTIVE"
        ));
        return toResponse(savedPlant);
    }

    private User requireApprovedUser() {
        Long currentUserId = currentUserPort.getCurrentUserId()
                .orElseThrow(UnauthorizedException::new);

        User currentUser = userRepositoryPort.findById(currentUserId)
                .orElseThrow(() -> new UnauthorizedException("현재 인증된 사용자 정보를 찾을 수 없습니다."));

        if (currentUser.isInactive()) {
            throw new UserDeactivatedException();
        }
        if (currentUser.isPending()) {
            throw new ApprovalRequiredException();
        }

        return currentUser;
    }

    private Plant getPlant(Long plantId) {
        return plantRepositoryPort.findById(plantId)
                .orElseThrow(() -> new NotFoundException("발전소를 찾을 수 없습니다."));
    }

    private void requirePlantAccess(User currentUser, Long plantId) {
        if (currentUser.isAdmin()) {
            return;
        }

        PlantMember plantMember = getActivePlantMember(plantId, currentUser.getId());
        if (!plantMember.isActive()) {
            throw new ForbiddenException("해당 발전소에 접근할 수 없습니다.");
        }
    }

    private void requirePlantManagePermission(User currentUser, Long plantId) {
        if (currentUser.isAdmin()) {
            return;
        }

        PlantMember plantMember = getActivePlantMember(plantId, currentUser.getId());
        if (!plantMember.hasManageRole()) {
            throw new ForbiddenException("해당 발전소를 관리할 권한이 없습니다.");
        }
    }

    private PlantMember getActivePlantMember(Long plantId, Long userId) {
        PlantMember plantMember = plantMemberRepositoryPort.findByPlantIdAndUserId(plantId, userId)
                .orElseThrow(() -> new ForbiddenException("해당 발전소에 접근할 수 없습니다."));

        if (plantMember.isInactive()) {
            throw new ForbiddenException("비활성화된 발전소 멤버 권한입니다.");
        }

        return plantMember;
    }

    private void validatePlantName(String name) {
        if (name == null || name.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "name is required.");
        }
    }

    private PlantResponse toResponse(Plant plant) {
        return new PlantResponse(
                plant.getId(),
                plant.getName(),
                plant.getLocation(),
                plant.getDescription(),
                plant.getStatus(),
                plant.getCreatedByUserId(),
                plantRepositoryPort.countZonesByPlantId(plant.getId()),
                plantRepositoryPort.findLatestInspectionAtByPlantId(plant.getId()),
                plant.getCreatedAt(),
                plant.getUpdatedAt()
        );
    }
}
