package com.pvfusion.adapter.in.web.equipment;

import com.pvfusion.domain.equipment.EquipmentType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record UpdateEquipmentRequest(
        Long parentEquipmentId,
        @NotNull EquipmentType equipmentType,
        @NotBlank String name,
        String positionCode
) {
}
