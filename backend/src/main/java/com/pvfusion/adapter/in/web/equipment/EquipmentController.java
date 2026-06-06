package com.pvfusion.adapter.in.web.equipment;

import com.pvfusion.application.dto.equipment.CreateEquipmentCommand;
import com.pvfusion.application.dto.equipment.DeactivateEquipmentCommand;
import com.pvfusion.application.dto.equipment.EquipmentListQuery;
import com.pvfusion.application.dto.equipment.EquipmentResponse;
import com.pvfusion.application.dto.equipment.EquipmentTreeResponse;
import com.pvfusion.application.dto.equipment.GetEquipmentQuery;
import com.pvfusion.application.dto.equipment.UpdateEquipmentCommand;
import com.pvfusion.application.port.in.equipment.CreateEquipmentUseCase;
import com.pvfusion.application.port.in.equipment.DeactivateEquipmentUseCase;
import com.pvfusion.application.port.in.equipment.GetEquipmentUseCase;
import com.pvfusion.application.port.in.equipment.QueryEquipmentUseCase;
import com.pvfusion.application.port.in.equipment.UpdateEquipmentUseCase;
import com.pvfusion.domain.common.ResourceStatus;
import com.pvfusion.domain.equipment.EquipmentType;
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
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class EquipmentController {

    private final CreateEquipmentUseCase createEquipmentUseCase;
    private final QueryEquipmentUseCase queryEquipmentUseCase;
    private final GetEquipmentUseCase getEquipmentUseCase;
    private final UpdateEquipmentUseCase updateEquipmentUseCase;
    private final DeactivateEquipmentUseCase deactivateEquipmentUseCase;

    @GetMapping("/zones/{zoneId}/equipments")
    public ResponseEntity<ApiResponse<List<EquipmentTreeResponse>>> getEquipments(
            @PathVariable Long zoneId,
            @RequestParam(required = false) EquipmentType equipmentType,
            @RequestParam(required = false) ResourceStatus status
    ) {
        List<EquipmentTreeResponse> response = queryEquipmentUseCase.execute(
                new EquipmentListQuery(zoneId, equipmentType, status)
        );
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/zones/{zoneId}/equipments")
    public ResponseEntity<ApiResponse<EquipmentResponse>> createEquipment(
            @PathVariable Long zoneId,
            @Valid @RequestBody CreateEquipmentRequest request
    ) {
        EquipmentResponse response = createEquipmentUseCase.execute(
                new CreateEquipmentCommand(
                        zoneId,
                        request.parentEquipmentId(),
                        request.equipmentType(),
                        request.name(),
                        request.positionCode()
                )
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @GetMapping("/equipments/{equipmentId}")
    public ResponseEntity<ApiResponse<EquipmentResponse>> getEquipment(
            @PathVariable Long equipmentId
    ) {
        EquipmentResponse response = getEquipmentUseCase.execute(new GetEquipmentQuery(equipmentId));
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PatchMapping("/equipments/{equipmentId}")
    public ResponseEntity<ApiResponse<EquipmentResponse>> updateEquipment(
            @PathVariable Long equipmentId,
            @Valid @RequestBody UpdateEquipmentRequest request
    ) {
        EquipmentResponse response = updateEquipmentUseCase.execute(
                new UpdateEquipmentCommand(
                        equipmentId,
                        request.parentEquipmentId(),
                        request.equipmentType(),
                        request.name(),
                        request.positionCode()
                )
        );
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PatchMapping("/equipments/{equipmentId}/deactivate")
    public ResponseEntity<ApiResponse<EquipmentResponse>> deactivateEquipment(
            @PathVariable Long equipmentId
    ) {
        EquipmentResponse response = deactivateEquipmentUseCase.execute(
                new DeactivateEquipmentCommand(equipmentId)
        );
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
