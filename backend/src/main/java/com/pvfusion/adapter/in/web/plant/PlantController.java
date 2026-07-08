package com.pvfusion.adapter.in.web.plant;

import com.pvfusion.application.dto.plant.CreatePlantCommand;
import com.pvfusion.application.dto.deletion.DeleteImpactResponse;
import com.pvfusion.application.dto.deletion.DeleteResourceResponse;
import com.pvfusion.application.dto.plant.DeactivatePlantCommand;
import com.pvfusion.application.dto.plant.GetPlantQuery;
import com.pvfusion.application.dto.plant.PlantListQuery;
import com.pvfusion.application.dto.plant.PlantResponse;
import com.pvfusion.application.dto.plant.PlantSummaryResponse;
import com.pvfusion.application.dto.plant.UpdatePlantCommand;
import com.pvfusion.application.port.in.plant.CreatePlantUseCase;
import com.pvfusion.application.port.in.plant.DeactivatePlantUseCase;
import com.pvfusion.application.port.in.plant.GetPlantUseCase;
import com.pvfusion.application.port.in.plant.ManagePlantDeletionUseCase;
import com.pvfusion.application.port.in.plant.QueryPlantUseCase;
import com.pvfusion.application.port.in.plant.UpdatePlantUseCase;
import com.pvfusion.domain.common.ResourceStatus;
import com.pvfusion.global.response.ApiResponse;
import com.pvfusion.global.response.PageResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/plants")
@RequiredArgsConstructor
public class PlantController {

    private final CreatePlantUseCase createPlantUseCase;
    private final QueryPlantUseCase queryPlantUseCase;
    private final GetPlantUseCase getPlantUseCase;
    private final UpdatePlantUseCase updatePlantUseCase;
    private final DeactivatePlantUseCase deactivatePlantUseCase;
    private final ManagePlantDeletionUseCase managePlantDeletionUseCase;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<PlantSummaryResponse>>> getPlants(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) ResourceStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        PageResponse<PlantSummaryResponse> response = queryPlantUseCase.execute(
                new PlantListQuery(keyword, status, page, size)
        );
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<PlantResponse>> createPlant(
            @Valid @RequestBody CreatePlantRequest request
    ) {
        PlantResponse response = createPlantUseCase.execute(
                new CreatePlantCommand(request.name(), request.location(), request.description())
        );
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "발전소가 등록되었습니다."));
    }

    @GetMapping("/{plantId}")
    public ResponseEntity<ApiResponse<PlantResponse>> getPlant(
            @PathVariable Long plantId
    ) {
        PlantResponse response = getPlantUseCase.execute(new GetPlantQuery(plantId));
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PatchMapping("/{plantId}")
    public ResponseEntity<ApiResponse<PlantResponse>> updatePlant(
            @PathVariable Long plantId,
            @Valid @RequestBody UpdatePlantRequest request
    ) {
        PlantResponse response = updatePlantUseCase.execute(
                new UpdatePlantCommand(plantId, request.name(), request.location(), request.description())
        );
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PatchMapping("/{plantId}/deactivate")
    public ResponseEntity<ApiResponse<PlantResponse>> deactivatePlant(
            @PathVariable Long plantId
    ) {
        PlantResponse response = deactivatePlantUseCase.execute(new DeactivatePlantCommand(plantId));
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/{plantId}/delete-impact")
    public ResponseEntity<ApiResponse<DeleteImpactResponse>> getPlantDeleteImpact(
            @PathVariable Long plantId
    ) {
        DeleteImpactResponse response = managePlantDeletionUseCase.getPlantDeleteImpact(plantId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @DeleteMapping("/{plantId}")
    public ResponseEntity<ApiResponse<DeleteResourceResponse>> deletePlant(
            @PathVariable Long plantId
    ) {
        DeleteResourceResponse response = managePlantDeletionUseCase.deletePlant(plantId);
        return ResponseEntity.ok(ApiResponse.success(response, "발전소가 삭제되었습니다."));
    }
}
