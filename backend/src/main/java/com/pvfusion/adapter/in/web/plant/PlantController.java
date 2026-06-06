package com.pvfusion.adapter.in.web.plant;

import com.pvfusion.application.dto.plant.CreatePlantCommand;
import com.pvfusion.application.dto.plant.DeactivatePlantCommand;
import com.pvfusion.application.dto.plant.GetPlantQuery;
import com.pvfusion.application.dto.plant.PlantListQuery;
import com.pvfusion.application.dto.plant.PlantResponse;
import com.pvfusion.application.dto.plant.PlantSummaryResponse;
import com.pvfusion.application.dto.plant.UpdatePlantCommand;
import com.pvfusion.application.port.in.plant.CreatePlantUseCase;
import com.pvfusion.application.port.in.plant.DeactivatePlantUseCase;
import com.pvfusion.application.port.in.plant.GetPlantUseCase;
import com.pvfusion.application.port.in.plant.QueryPlantUseCase;
import com.pvfusion.application.port.in.plant.UpdatePlantUseCase;
import com.pvfusion.domain.common.ResourceStatus;
import com.pvfusion.global.response.ApiResponse;
import com.pvfusion.global.response.PageResponse;
import jakarta.validation.Valid;
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
@RequestMapping("/api/v1/plants")
@RequiredArgsConstructor
public class PlantController {

    private static final String ACTOR_USER_ID_HEADER = "X-Actor-User-Id";

    private final CreatePlantUseCase createPlantUseCase;
    private final QueryPlantUseCase queryPlantUseCase;
    private final GetPlantUseCase getPlantUseCase;
    private final UpdatePlantUseCase updatePlantUseCase;
    private final DeactivatePlantUseCase deactivatePlantUseCase;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<PlantSummaryResponse>>> getPlants(
            @RequestHeader(ACTOR_USER_ID_HEADER) Long actorUserId,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) ResourceStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        PageResponse<PlantSummaryResponse> response = queryPlantUseCase.execute(
                new PlantListQuery(actorUserId, keyword, status, page, size)
        );
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<PlantResponse>> createPlant(
            @RequestHeader(ACTOR_USER_ID_HEADER) Long actorUserId,
            @Valid @RequestBody CreatePlantRequest request
    ) {
        PlantResponse response = createPlantUseCase.execute(
                new CreatePlantCommand(actorUserId, request.name(), request.location(), request.description())
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @GetMapping("/{plantId}")
    public ResponseEntity<ApiResponse<PlantResponse>> getPlant(
            @RequestHeader(ACTOR_USER_ID_HEADER) Long actorUserId,
            @PathVariable Long plantId
    ) {
        PlantResponse response = getPlantUseCase.execute(new GetPlantQuery(actorUserId, plantId));
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PatchMapping("/{plantId}")
    public ResponseEntity<ApiResponse<PlantResponse>> updatePlant(
            @RequestHeader(ACTOR_USER_ID_HEADER) Long actorUserId,
            @PathVariable Long plantId,
            @Valid @RequestBody UpdatePlantRequest request
    ) {
        PlantResponse response = updatePlantUseCase.execute(
                new UpdatePlantCommand(actorUserId, plantId, request.name(), request.location(), request.description())
        );
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PatchMapping("/{plantId}/deactivate")
    public ResponseEntity<ApiResponse<PlantResponse>> deactivatePlant(
            @RequestHeader(ACTOR_USER_ID_HEADER) Long actorUserId,
            @PathVariable Long plantId
    ) {
        PlantResponse response = deactivatePlantUseCase.execute(new DeactivatePlantCommand(actorUserId, plantId));
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
