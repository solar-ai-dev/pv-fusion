package com.pvfusion.application.service.plant;

import com.pvfusion.application.dto.user.ChangePlantMemberRoleCommand;
import com.pvfusion.application.dto.user.DeactivatePlantMemberCommand;
import com.pvfusion.application.dto.user.GrantPlantAccessCommand;
import com.pvfusion.application.dto.user.PlantMemberListQuery;
import com.pvfusion.application.dto.user.PlantMemberResponse;
import com.pvfusion.application.port.in.user.ChangePlantMemberRoleUseCase;
import com.pvfusion.application.port.in.user.DeactivatePlantMemberUseCase;
import com.pvfusion.application.port.in.user.GrantPlantAccessUseCase;
import com.pvfusion.application.port.in.user.QueryPlantMemberUseCase;
import com.pvfusion.application.port.out.auth.CurrentUserPort;
import com.pvfusion.application.port.out.plant.PlantMemberRepositoryPort;
import com.pvfusion.application.port.out.plant.PlantRepositoryPort;
import com.pvfusion.application.port.out.user.UserRepositoryPort;
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
import java.time.OffsetDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PlantMemberService implements QueryPlantMemberUseCase,
        GrantPlantAccessUseCase, ChangePlantMemberRoleUseCase, DeactivatePlantMemberUseCase {

    private final CurrentUserPort currentUserPort;
    private final UserRepositoryPort userRepositoryPort;
    private final PlantRepositoryPort plantRepositoryPort;
    private final PlantMemberRepositoryPort plantMemberRepositoryPort;

    @Override
    public List<PlantMemberResponse> execute(PlantMemberListQuery query) {
        User currentUser = requireApprovedUser();
        Plant plant = getPlant(query.plantId());

        requirePlantManagePermission(currentUser, plant.getId());
        return plantMemberRepositoryPort.findAll(query);
    }

    @Override
    public PlantMemberResponse execute(GrantPlantAccessCommand command) {
        User currentUser = requireApprovedUser();
        Plant plant = getPlant(command.plantId());

        if (plant.isInactive()) {
            throw new DuplicateResourceException("비활성화된 발전소에는 접근 권한을 부여할 수 없습니다.");
        }

        requirePlantManagePermission(currentUser, plant.getId());
        validateMemberRole(command.memberRole());

        User targetUser = userRepositoryPort.findById(command.userId())
                .orElseThrow(() -> new NotFoundException("사용자를 찾을 수 없습니다."));

        if (targetUser.isInactive()) {
            throw new UserDeactivatedException("비활성화된 사용자에게는 접근 권한을 부여할 수 없습니다.");
        }

        PlantMember existingMember = plantMemberRepositoryPort.findByPlantIdAndUserId(command.plantId(), command.userId())
                .orElse(null);

        if (existingMember != null && existingMember.isActive()) {
            throw new DuplicateResourceException("이미 활성화된 발전소 멤버입니다.");
        }

        OffsetDateTime now = OffsetDateTime.now();
        PlantMember savedMember = existingMember == null
                ? plantMemberRepositoryPort.save(new PlantMember(
                        null,
                        command.plantId(),
                        command.userId(),
                        command.memberRole(),
                        com.pvfusion.domain.common.ResourceStatus.ACTIVE,
                        now,
                        now
                ))
                : plantMemberRepositoryPort.save(existingMember.activate(command.memberRole()));

        return toResponse(savedMember);
    }

    @Override
    public PlantMemberResponse execute(ChangePlantMemberRoleCommand command) {
        User currentUser = requireApprovedUser();
        Plant plant = getPlant(command.plantId());

        if (plant.isInactive()) {
            throw new DuplicateResourceException("비활성화된 발전소의 멤버 권한은 변경할 수 없습니다.");
        }

        requirePlantManagePermission(currentUser, plant.getId());
        validateMemberRole(command.memberRole());

        PlantMember plantMember = getPlantMember(command.plantId(), command.userId());

        if (plantMember.isInactive()) {
            throw new DuplicateResourceException("비활성화된 발전소 멤버의 권한은 변경할 수 없습니다.");
        }
        if (plantMember.getMemberRole() == command.memberRole()) {
            throw new DuplicateResourceException("동일한 멤버 권한으로 변경할 수 없습니다.");
        }
        if (isSelf(currentUser, plantMember) && plantMember.hasManageRole() && !isManageRole(command.memberRole())) {
            throw new ForbiddenException("자기 자신의 발전소 관리 권한은 강등할 수 없습니다.");
        }

        return toResponse(plantMemberRepositoryPort.save(plantMember.changeRole(command.memberRole())));
    }

    @Override
    public PlantMemberResponse execute(DeactivatePlantMemberCommand command) {
        User currentUser = requireApprovedUser();
        Plant plant = getPlant(command.plantId());

        if (plant.isInactive()) {
            throw new DuplicateResourceException("비활성화된 발전소의 멤버는 비활성화할 수 없습니다.");
        }

        requirePlantManagePermission(currentUser, plant.getId());
        PlantMember plantMember = getPlantMember(command.plantId(), command.userId());

        if (plantMember.isInactive()) {
            throw new DuplicateResourceException("이미 비활성화된 발전소 멤버입니다.");
        }
        if (isSelf(currentUser, plantMember)) {
            throw new ForbiddenException("자기 자신의 발전소 멤버 권한은 제거할 수 없습니다.");
        }

        return toResponse(plantMemberRepositoryPort.save(plantMember.deactivate()));
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

    private PlantMember getPlantMember(Long plantId, Long userId) {
        return plantMemberRepositoryPort.findByPlantIdAndUserId(plantId, userId)
                .orElseThrow(() -> new NotFoundException("발전소 멤버를 찾을 수 없습니다."));
    }

    private void requirePlantManagePermission(User currentUser, Long plantId) {
        if (currentUser.isAdmin()) {
            return;
        }

        PlantMember plantMember = plantMemberRepositoryPort.findByPlantIdAndUserId(plantId, currentUser.getId())
                .orElseThrow(() -> new ForbiddenException("해당 발전소를 관리할 권한이 없습니다."));

        if (plantMember.isInactive()) {
            throw new ForbiddenException("비활성화된 발전소 멤버 권한입니다.");
        }
        if (!plantMember.hasManageRole()) {
            throw new ForbiddenException("해당 발전소를 관리할 권한이 없습니다.");
        }
    }

    private void validateMemberRole(PlantMemberRole memberRole) {
        if (memberRole == null) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "memberRole is required.");
        }
    }

    private boolean isManageRole(PlantMemberRole memberRole) {
        return memberRole == PlantMemberRole.OWNER || memberRole == PlantMemberRole.MANAGER;
    }

    private boolean isSelf(User currentUser, PlantMember plantMember) {
        return currentUser.getId() != null && currentUser.getId().equals(plantMember.getUserId());
    }

    private PlantMemberResponse toResponse(PlantMember plantMember) {
        return new PlantMemberResponse(
                plantMember.getId(),
                plantMember.getPlantId(),
                plantMember.getUserId(),
                plantMember.getMemberRole(),
                plantMember.getStatus(),
                plantMember.getCreatedAt(),
                plantMember.getUpdatedAt()
        );
    }
}
