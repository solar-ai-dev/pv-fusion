package com.pvfusion.adapter.in.web.plant;

import com.pvfusion.application.dto.user.ChangePlantMemberRoleCommand;
import com.pvfusion.application.dto.user.DeactivatePlantMemberCommand;
import com.pvfusion.application.dto.user.GrantPlantAccessCommand;
import com.pvfusion.application.dto.user.PlantMemberListQuery;
import com.pvfusion.application.dto.user.PlantMemberResponse;
import com.pvfusion.application.port.in.user.ChangePlantMemberRoleUseCase;
import com.pvfusion.application.port.in.user.DeactivatePlantMemberUseCase;
import com.pvfusion.application.port.in.user.GrantPlantAccessUseCase;
import com.pvfusion.application.port.in.user.QueryPlantMemberUseCase;
import com.pvfusion.domain.common.ResourceStatus;
import com.pvfusion.domain.plant.PlantMemberRole;
import com.pvfusion.global.response.ApiResponse;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/plants/{plantId}/members")
@RequiredArgsConstructor
public class PlantMemberController {

    private static final String ACTOR_USER_ID_HEADER = "X-Actor-User-Id";

    private final QueryPlantMemberUseCase queryPlantMemberUseCase;
    private final GrantPlantAccessUseCase grantPlantAccessUseCase;
    private final ChangePlantMemberRoleUseCase changePlantMemberRoleUseCase;
    private final DeactivatePlantMemberUseCase deactivatePlantMemberUseCase;

    @GetMapping
    public ResponseEntity<ApiResponse<List<PlantMemberResponse>>> getPlantMembers(
            @RequestHeader(ACTOR_USER_ID_HEADER) Long actorUserId,
            @PathVariable Long plantId,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) PlantMemberRole memberRole,
            @RequestParam(required = false) ResourceStatus status
    ) {
        List<PlantMemberResponse> response = queryPlantMemberUseCase.execute(
                new PlantMemberListQuery(actorUserId, plantId, userId, memberRole, status)
        );
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<PlantMemberResponse>> grantPlantAccess(
            @RequestHeader(ACTOR_USER_ID_HEADER) Long actorUserId,
            @PathVariable Long plantId,
            @Valid @RequestBody GrantPlantAccessRequest request
    ) {
        PlantMemberResponse response = grantPlantAccessUseCase.execute(
                new GrantPlantAccessCommand(actorUserId, plantId, request.userId(), request.memberRole())
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @PatchMapping("/{userId}/role")
    public ResponseEntity<ApiResponse<PlantMemberResponse>> changePlantMemberRole(
            @RequestHeader(ACTOR_USER_ID_HEADER) Long actorUserId,
            @PathVariable Long plantId,
            @PathVariable Long userId,
            @Valid @RequestBody ChangePlantMemberRoleRequest request
    ) {
        PlantMemberResponse response = changePlantMemberRoleUseCase.execute(
                new ChangePlantMemberRoleCommand(actorUserId, plantId, userId, request.memberRole())
        );
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PatchMapping("/{userId}/deactivate")
    public ResponseEntity<ApiResponse<PlantMemberResponse>> deactivatePlantMember(
            @RequestHeader(ACTOR_USER_ID_HEADER) Long actorUserId,
            @PathVariable Long plantId,
            @PathVariable Long userId
    ) {
        PlantMemberResponse response = deactivatePlantMemberUseCase.execute(
                new DeactivatePlantMemberCommand(actorUserId, plantId, userId)
        );
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
