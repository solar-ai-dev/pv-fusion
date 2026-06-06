package com.pvfusion.adapter.in.web.zone;

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
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class ZoneController {

    private static final String ACTOR_USER_ID_HEADER = "X-Actor-User-Id";

    private final CreateZoneUseCase createZoneUseCase;
    private final QueryZoneUseCase queryZoneUseCase;
    private final GetZoneUseCase getZoneUseCase;
    private final UpdateZoneUseCase updateZoneUseCase;
    private final DeactivateZoneUseCase deactivateZoneUseCase;

    @GetMapping("/plants/{plantId}/zones")
    public ResponseEntity<ApiResponse<List<ZoneSummaryResponse>>> getZones(
            @RequestHeader(ACTOR_USER_ID_HEADER) Long actorUserId,
            @PathVariable Long plantId
    ) {
        List<ZoneSummaryResponse> response = queryZoneUseCase.execute(new ZoneListQuery(actorUserId, plantId));
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/plants/{plantId}/zones")
    public ResponseEntity<ApiResponse<ZoneResponse>> createZone(
            @RequestHeader(ACTOR_USER_ID_HEADER) Long actorUserId,
            @PathVariable Long plantId,
            @Valid @RequestBody CreateZoneRequest request
    ) {
        ZoneResponse response = createZoneUseCase.execute(
                new CreateZoneCommand(actorUserId, plantId, request.name(), request.location(), request.description())
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @GetMapping("/zones/{zoneId}")
    public ResponseEntity<ApiResponse<ZoneResponse>> getZone(
            @RequestHeader(ACTOR_USER_ID_HEADER) Long actorUserId,
            @PathVariable Long zoneId
    ) {
        ZoneResponse response = getZoneUseCase.execute(new GetZoneQuery(actorUserId, zoneId));
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PatchMapping("/zones/{zoneId}")
    public ResponseEntity<ApiResponse<ZoneResponse>> updateZone(
            @RequestHeader(ACTOR_USER_ID_HEADER) Long actorUserId,
            @PathVariable Long zoneId,
            @Valid @RequestBody UpdateZoneRequest request
    ) {
        ZoneResponse response = updateZoneUseCase.execute(
                new UpdateZoneCommand(actorUserId, zoneId, request.name(), request.location(), request.description())
        );
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PatchMapping("/zones/{zoneId}/deactivate")
    public ResponseEntity<ApiResponse<ZoneResponse>> deactivateZone(
            @RequestHeader(ACTOR_USER_ID_HEADER) Long actorUserId,
            @PathVariable Long zoneId
    ) {
        ZoneResponse response = deactivateZoneUseCase.execute(new DeactivateZoneCommand(actorUserId, zoneId));
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
