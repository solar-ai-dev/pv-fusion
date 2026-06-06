package com.pvfusion.adapter.in.web.plant;

import jakarta.validation.constraints.NotBlank;

public record CreatePlantRequest(
        @NotBlank String name,
        String location,
        String description
) {
}
