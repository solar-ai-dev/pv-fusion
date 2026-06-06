package com.pvfusion.adapter.in.web.plant;

import jakarta.validation.constraints.NotBlank;

public record UpdatePlantRequest(
        @NotBlank String name,
        String location,
        String description
) {
}
