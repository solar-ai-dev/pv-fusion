package com.pvfusion.application.service.zone;

import com.pvfusion.application.dto.zone.CreateZoneCommand;
import com.pvfusion.application.dto.zone.DeactivateZoneCommand;
import com.pvfusion.application.dto.zone.GetZoneQuery;
import com.pvfusion.application.dto.zone.UpdateZoneCommand;
import com.pvfusion.application.dto.zone.ZoneListQuery;
import com.pvfusion.application.dto.zone.ZoneResponse;
import com.pvfusion.application.dto.zone.ZoneSummaryResponse;
import com.pvfusion.application.port.in.zone.CreateZoneUseCase;
import com.pvfusion.application.port.in.zone.DeactivateZoneUseCase;
import com.pvfusion.application.port.in.zone.GetZoneUseCase;
import com.pvfusion.application.port.in.zone.QueryZoneUseCase;
import com.pvfusion.application.port.in.zone.UpdateZoneUseCase;
import com.pvfusion.application.port.out.auth.CurrentUserPort;
import com.pvfusion.application.port.out.plant.PlantMemberRepositoryPort;
import com.pvfusion.application.port.out.plant.PlantRepositoryPort;
import com.pvfusion.application.port.out.user.UserRepositoryPort;
import com.pvfusion.application.port.out.zone.ZoneRepositoryPort;
import com.pvfusion.domain.common.ResourceStatus;
import com.pvfusion.domain.plant.Plant;
import com.pvfusion.domain.plant.PlantMember;
import com.pvfusion.domain.user.User;
import com.pvfusion.domain.zone.Zone;
import com.pvfusion.global.error.ApprovalRequiredException;
import com.pvfusion.global.error.BusinessException;
import com.pvfusion.global.error.DuplicateResourceException;
import com.pvfusion.global.error.ErrorCode;
import com.pvfusion.global.error.ForbiddenException;
import com.pvfusion.global.error.NotFoundException;
import com.pvfusion.global.error.UnauthorizedException;
import com.pvfusion.global.error.UserDeactivatedException;
import java.time.OffsetDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ZoneService implements CreateZoneUseCase, QueryZoneUseCase,
        GetZoneUseCase, UpdateZoneUseCase, DeactivateZoneUseCase {

    private final CurrentUserPort currentUserPort;
    private final UserRepositoryPort userRepositoryPort;
    private final PlantRepositoryPort plantRepositoryPort;
    private final PlantMemberRepositoryPort plantMemberRepositoryPort;
    private final ZoneRepositoryPort zoneRepositoryPort;

    @Override
    public ZoneResponse execute(CreateZoneCommand command) {
        User currentUser = requireApprovedUser();
        Plant plant = getPlant(command.plantId());

        if (plant.isInactive()) {
            throw new DuplicateResourceException("Inactive plant cannot accept new zones.");
        }

        requirePlantManagePermission(currentUser, plant.getId());
        validateZoneName(command.name());
        ensureActiveZoneNameAvailable(plant.getId(), command.name().trim(), null);

        OffsetDateTime now = OffsetDateTime.now();
        Zone savedZone = zoneRepositoryPort.save(new Zone(
                null,
                plant.getId(),
                command.name().trim(),
                normalizeText(command.location()),
                normalizeText(command.description()),
                ResourceStatus.ACTIVE,
                currentUser.getId(),
                now,
                now
        ));

        return toResponse(savedZone);
    }

    @Override
    public List<ZoneSummaryResponse> execute(ZoneListQuery query) {
        User currentUser = requireApprovedUser();
        Plant plant = getPlant(query.plantId());

        requirePlantAccess(currentUser, plant.getId());
        return zoneRepositoryPort.findAll(new ZoneListQuery(currentUser.getId(), plant.getId()));
    }

    @Override
    public ZoneResponse execute(GetZoneQuery query) {
        User currentUser = requireApprovedUser();
        Zone zone = getZone(query.zoneId());

        requirePlantAccess(currentUser, zone.getPlantId());
        return toResponse(zone);
    }

    @Override
    public ZoneResponse execute(UpdateZoneCommand command) {
        User currentUser = requireApprovedUser();
        Zone zone = getZone(command.zoneId());

        if (zone.isInactive()) {
            throw new DuplicateResourceException("Inactive zone cannot be updated.");
        }

        Plant plant = getPlant(zone.getPlantId());
        if (plant.isInactive()) {
            throw new DuplicateResourceException("Zone in inactive plant cannot be updated.");
        }

        requirePlantManagePermission(currentUser, zone.getPlantId());
        validateZoneName(command.name());
        ensureActiveZoneNameAvailable(zone.getPlantId(), command.name().trim(), zone.getId());

        return toResponse(zoneRepositoryPort.save(zone.update(
                command.name().trim(),
                normalizeText(command.location()),
                normalizeText(command.description())
        )));
    }

    @Override
    public ZoneResponse execute(DeactivateZoneCommand command) {
        User currentUser = requireApprovedUser();
        Zone zone = getZone(command.zoneId());

        requirePlantManagePermission(currentUser, zone.getPlantId());

        if (zone.isInactive()) {
            throw new DuplicateResourceException("Zone is already inactive.");
        }

        Plant plant = getPlant(zone.getPlantId());
        if (plant.isInactive()) {
            throw new DuplicateResourceException("Zone in inactive plant cannot be deactivated again.");
        }

        return toResponse(zoneRepositoryPort.save(zone.deactivate()));
    }

    private User requireApprovedUser() {
        Long currentUserId = currentUserPort.getCurrentUserId()
                .orElseThrow(UnauthorizedException::new);

        User currentUser = userRepositoryPort.findById(currentUserId)
                .orElseThrow(() -> new UnauthorizedException("Current authenticated user was not found."));

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
                .orElseThrow(() -> new NotFoundException("Plant was not found."));
    }

    private Zone getZone(Long zoneId) {
        return zoneRepositoryPort.findById(zoneId)
                .orElseThrow(() -> new NotFoundException("Zone was not found."));
    }

    private void requirePlantAccess(User currentUser, Long plantId) {
        if (currentUser.isAdmin()) {
            return;
        }

        PlantMember plantMember = getActivePlantMember(plantId, currentUser.getId(), "Plant access is denied.");
        if (!plantMember.isActive()) {
            throw new ForbiddenException("Plant access is denied.");
        }
    }

    private void requirePlantManagePermission(User currentUser, Long plantId) {
        if (currentUser.isAdmin()) {
            return;
        }

        PlantMember plantMember = getActivePlantMember(plantId, currentUser.getId(), "Plant manage permission is denied.");
        if (!plantMember.hasManageRole()) {
            throw new ForbiddenException("Plant manage permission is denied.");
        }
    }

    private PlantMember getActivePlantMember(Long plantId, Long userId, String deniedMessage) {
        PlantMember plantMember = plantMemberRepositoryPort.findByPlantIdAndUserId(plantId, userId)
                .orElseThrow(() -> new ForbiddenException(deniedMessage));

        if (plantMember.isInactive()) {
            throw new ForbiddenException("Inactive plant membership cannot be used.");
        }

        return plantMember;
    }

    private void validateZoneName(String name) {
        if (name == null || name.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "name is required.");
        }
    }

    private void ensureActiveZoneNameAvailable(Long plantId, String name, Long currentZoneId) {
        boolean duplicateExists = zoneRepositoryPort.findByPlantId(plantId).stream()
                .filter(Zone::isActive)
                .filter(zone -> currentZoneId == null || !zone.getId().equals(currentZoneId))
                .anyMatch(zone -> zone.getName() != null && zone.getName().equalsIgnoreCase(name));

        if (duplicateExists) {
            throw new DuplicateResourceException("Zone name already exists in the plant.");
        }
    }

    private String normalizeText(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private ZoneResponse toResponse(Zone zone) {
        return new ZoneResponse(
                zone.getId(),
                zone.getPlantId(),
                zone.getName(),
                zone.getLocation(),
                zone.getDescription(),
                zone.getStatus(),
                zone.getCreatedByUserId(),
                0L,
                0L,
                null,
                0L,
                null,
                null,
                zone.getCreatedAt(),
                zone.getUpdatedAt()
        );
    }
}
